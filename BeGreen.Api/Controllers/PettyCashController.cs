using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using BeGreen.Api.Models;
using MongoDB.Driver;
using System.Linq;
using System.Security.Claims;
using BeGreen.Api.Services;

namespace BeGreen.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PettyCashController : ControllerBase
    {
        private readonly MongoDbContext _context;
        private readonly IEmailService _emailService;

        public PettyCashController(MongoDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PettyCash>>> GetRequests()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
            var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value)
                            .Concat(User.FindAll("role").Select(c => c.Value))
                            .ToList();
            
            var userDept = (User.FindFirst("department")?.Value ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("department"))?.Value ?? "").Trim();
            var userDiv = (User.FindFirst("division")?.Value ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("division"))?.Value ?? "").Trim();

            FilterDefinition<PettyCash> filter = Builders<PettyCash>.Filter.Empty;
            var ownRequests = Builders<PettyCash>.Filter.Eq(r => r.UserId, userId);

            if (roles.Any(r => string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase)) || 
                roles.Any(r => string.Equals(r, "General Cashier", StringComparison.OrdinalIgnoreCase)))
            {
                filter = Builders<PettyCash>.Filter.Empty;
            }
            else if (roles.Any(r => string.Equals(r, "Head of Division", StringComparison.OrdinalIgnoreCase)))
            {
                // Case-insensitive match for Division using Regex, handling potential whitespace
                var regexPattern = $"^\\s*{System.Text.RegularExpressions.Regex.Escape(userDiv)}\\s*$";
                var divisionFilter = Builders<PettyCash>.Filter.Regex(r => r.Division, new MongoDB.Bson.BsonRegularExpression(regexPattern, "i"));
                filter = Builders<PettyCash>.Filter.Or(ownRequests, divisionFilter);
            }
            else if (roles.Any(r => string.Equals(r, "Head of Department", StringComparison.OrdinalIgnoreCase)) || 
                     roles.Any(r => string.Equals(r, "Supervisor", StringComparison.OrdinalIgnoreCase)))
            {
                // Case-insensitive match for Department using Regex, handling potential whitespace
                var regexPattern = $"^\\s*{System.Text.RegularExpressions.Regex.Escape(userDept)}\\s*$";
                var deptFilter = Builders<PettyCash>.Filter.Regex(r => r.Department, new MongoDB.Bson.BsonRegularExpression(regexPattern, "i"));
                filter = Builders<PettyCash>.Filter.Or(ownRequests, deptFilter);
            }
            else
            {
                filter = ownRequests;
            }

            var requests = await _context.PettyCashRequests.Find(filter).SortByDescending(r => r.CreatedAt).ToListAsync();
            return Ok(requests);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PettyCash>> GetRequest(string id)
        {
            var request = await _context.PettyCashRequests.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (request == null) return NotFound();
            return Ok(request);
        }

        [HttpPost]
        public async Task<ActionResult<PettyCash>> CreateRequest(PettyCash request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("unique_name")?.Value ?? User.FindFirst("name")?.Value;
                
                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                var user = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null) return BadRequest("User not found");

                request.Id = null;
                request.UserId = userId;
                request.UserName = userName ?? user.Name;
                request.Department = user.Department ?? "Unknown";
                request.Division = user.Division ?? "Unknown";
                request.CreatedAt = DateTime.UtcNow;
                request.Status = "PENDING";
                
                // Calculate total and set currency from items
                request.Total = request.Details?.Sum(d => d.Amount ?? 0) ?? 0;
                request.Currency = request.Details?.FirstOrDefault()?.Currency ?? "SYP";

                request.History = new List<HistoryRecord> {
                    new HistoryRecord {
                        UserId = userId,
                        UserName = request.UserName,
                        Action = "Created",
                        Date = DateTime.UtcNow,
                        Note = "Request submitted"
                    }
                };

                await SetNextApprover(request, user);

                await _context.PettyCashRequests.InsertOneAsync(request);
                return CreatedAtAction(nameof(GetRequest), new { id = request.Id }, request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}/approve")]
        public async Task<IActionResult> ApproveRequest(string id, [FromBody] string? note)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("unique_name")?.Value ?? User.FindFirst("name")?.Value;
                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                // Fallback for userName if claims are incomplete
                if (string.IsNullOrEmpty(userName) && !string.IsNullOrEmpty(userId))
                {
                    var currentUser = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                    userName = currentUser?.Name;
                }

                var request = await _context.PettyCashRequests.Find(r => r.Id == id).FirstOrDefaultAsync();
                if (request == null) return NotFound();

                if (request.Status != "PENDING" || request.CurrentApproverUserId != userId)
                {
                    return BadRequest("Not authorized to approve this request in its current state.");
                }

                request.History.Add(new HistoryRecord {
                    UserId = userId,
                    UserName = userName,
                    Action = "Approved",
                    Date = DateTime.UtcNow,
                    Note = note
                });

                // Increment order to find the next approver
                request.ApproveOrder++;

                var requester = await _context.Users.Find(u => u.Id == request.UserId).FirstOrDefaultAsync();
                await SetNextApprover(request, requester);

                await _context.PettyCashRequests.ReplaceOneAsync(r => r.Id == id, request);

                // Send email if status is PAID
                if (request.Status == "PAID")
                {
                    _ = Task.Run(async () => {
                        var user = await _context.Users.Find(u => u.Id == request.UserId).FirstOrDefaultAsync();
                        if (user != null && !string.IsNullOrEmpty(user.Email))
                        {
                            await _emailService.SendPaidNotificationAsync(user.Email, user.Name, "Petty Cash", request.Total, request.Currency);
                        }
                    });
                }

                return Ok(request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}/reject")]
        public async Task<IActionResult> RejectRequest(string id, [FromBody] string? note)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("unique_name")?.Value ?? User.FindFirst("name")?.Value;
                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                // Fallback for userName if claims are incomplete
                if (string.IsNullOrEmpty(userName) && !string.IsNullOrEmpty(userId))
                {
                    var currentUser = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                    userName = currentUser?.Name;
                }

                var request = await _context.PettyCashRequests.Find(r => r.Id == id).FirstOrDefaultAsync();
                if (request == null) return NotFound();

                if (request.Status != "PENDING" || request.CurrentApproverUserId != userId)
                {
                    return BadRequest("Not authorized to reject this request.");
                }

                request.Status = "REJECTED";
                request.CurrentApproverUserId = null;
                request.CurrentApproverName = null;

                request.History.Add(new HistoryRecord {
                    UserId = userId,
                    UserName = userName,
                    Action = "Rejected",
                    Date = DateTime.UtcNow,
                    Note = note ?? "Request rejected"
                });

                await _context.PettyCashRequests.ReplaceOneAsync(r => r.Id == id, request);

                // Send email notification
                _ = Task.Run(async () => {
                    var user = await _context.Users.Find(u => u.Id == request.UserId).FirstOrDefaultAsync();
                    if (user != null && !string.IsNullOrEmpty(user.Email))
                    {
                        await _emailService.SendRejectedNotificationAsync(user.Email, user.Name, "Petty Cash", userName ?? "Approver", note ?? "No reason provided");
                    }
                });

                return Ok(request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        private async Task SetNextApprover(PettyCash request, User? requester)
        {
            var dept = await _context.Departments.Find(d => d.Name == request.Department).FirstOrDefaultAsync();
            var div = await _context.Divisions.Find(d => d.Name == request.Division).FirstOrDefaultAsync();

            string? nextApproverId = null;
            string? nextApproverName = null;

            // sequence: 1:Dept1, 2:Dept2, 3:Div1, 4:Div2, 5:Cashier
            while (request.ApproveOrder <= 4)
            {
                string? candidateId = null;
                string? candidateName = null;

                if (request.ApproveOrder == 1 && dept != null) { candidateName = dept.ApproverOne; }
                else if (request.ApproveOrder == 2 && dept != null) { candidateName = dept.ApproverTwo; }
                else if (request.ApproveOrder == 3 && div != null) { candidateName = div.HeadOfDivisionApproverOne; }
                else if (request.ApproveOrder == 4 && div != null) { candidateName = div.HeadOfDivisionApproverTwo; }

                if (!string.IsNullOrEmpty(candidateName))
                {
                    var apprUser = await _context.Users.Find(u => u.Name == candidateName).FirstOrDefaultAsync();
                    if (apprUser != null)
                    {
                        candidateId = apprUser.Id;
                        
                        // Rule: If approver is the requester, auto-approve
                        if (candidateId == request.UserId)
                        {
                            request.History.Add(new HistoryRecord {
                                UserId = candidateId,
                                UserName = candidateName,
                                Action = "Auto-Approved",
                                Date = DateTime.UtcNow,
                                Note = "Self-approval skip"
                            });
                            request.ApproveOrder++;
                            continue;
                        }

                        nextApproverId = candidateId;
                        nextApproverName = candidateName;
                        break;
                    }
                }
                
                // If empty or user not found, skip
                request.ApproveOrder++;
            }

            if (nextApproverId != null)
            {
                request.CurrentApproverUserId = nextApproverId;
                request.CurrentApproverName = nextApproverName;
            }
            else
            {
                // Final stage: General Cashier
                var cashier = await _context.Users.Find(u => u.Role == "General Cashier").FirstOrDefaultAsync();
                if (cashier != null && request.CurrentApproverUserId != cashier.Id)
                {
                    request.ApproveOrder = 5;
                    request.CurrentApproverUserId = cashier.Id;
                    request.CurrentApproverName = cashier.Name;
                    
                    // Rule: If requester is the cashier, auto-pay
                    if (cashier.Id == request.UserId)
                    {
                        request.Status = "PAID";
                        request.CurrentApproverUserId = null;
                        request.CurrentApproverName = null;
                        request.History.Add(new HistoryRecord {
                            UserId = cashier.Id,
                            UserName = cashier.Name,
                            Action = "Auto-Paid",
                            Date = DateTime.UtcNow,
                            Note = "Self-settlement"
                        });
                    }
                }
                else if (request.ApproveOrder == 5)
                {
                    // If already at cashier and they just approved
                    request.Status = "PAID";
                    request.CurrentApproverUserId = null;
                    request.CurrentApproverName = null;
                }
                else
                {
                    // Fallback if no cashier found
                    request.Status = "PAID"; // Or some error state? Assuming paid for now if no more approvers
                    request.CurrentApproverUserId = null;
                    request.CurrentApproverName = null;
                }
            }
        }
    }
}
