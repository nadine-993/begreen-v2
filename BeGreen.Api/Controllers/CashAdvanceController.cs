using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using BeGreen.Api.Models;
using MongoDB.Driver;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;
using BeGreen.Api.Services;

namespace BeGreen.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CashAdvanceController : ControllerBase
    {
        private readonly MongoDbContext _context;
        private readonly IEmailService _emailService;

        public CashAdvanceController(MongoDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CashAdvance>>> GetRequests()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
            var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value)
                            .Concat(User.FindAll("role").Select(c => c.Value))
                            .ToList();
            
            var userDept = (User.FindFirst("department")?.Value ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("department"))?.Value ?? "").Trim();
            var userDiv = (User.FindFirst("division")?.Value ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("division"))?.Value ?? "").Trim();

            FilterDefinition<CashAdvance> filter = Builders<CashAdvance>.Filter.Empty;
            var ownRequests = Builders<CashAdvance>.Filter.Eq(r => r.UserId, userId);

            if (roles.Any(r => string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase)) || 
                roles.Any(r => string.Equals(r, "General Cashier", StringComparison.OrdinalIgnoreCase)))
            {
                filter = Builders<CashAdvance>.Filter.Empty;
            }
            else if (roles.Any(r => string.Equals(r, "Head of Division", StringComparison.OrdinalIgnoreCase)))
            {
                var regexPattern = $"^\\s*{Regex.Escape(userDiv)}\\s*$";
                var divisionFilter = Builders<CashAdvance>.Filter.Regex(r => r.Division, new MongoDB.Bson.BsonRegularExpression(regexPattern, "i"));
                filter = Builders<CashAdvance>.Filter.Or(ownRequests, divisionFilter);
            }
            else if (roles.Any(r => string.Equals(r, "Head of Department", StringComparison.OrdinalIgnoreCase)) || 
                     roles.Any(r => string.Equals(r, "Supervisor", StringComparison.OrdinalIgnoreCase)))
            {
                var regexPattern = $"^\\s*{Regex.Escape(userDept)}\\s*$";
                var deptFilter = Builders<CashAdvance>.Filter.Regex(r => r.Department, new MongoDB.Bson.BsonRegularExpression(regexPattern, "i"));
                filter = Builders<CashAdvance>.Filter.Or(ownRequests, deptFilter);
            }
            else
            {
                filter = ownRequests;
            }

            var requests = await _context.CashAdvances.Find(filter).SortByDescending(r => r.CreatedAt).ToListAsync();
            return Ok(requests);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CashAdvance>> GetRequest(string id)
        {
            var request = await _context.CashAdvances.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (request == null) return NotFound();
            return Ok(request);
        }

        [HttpPost]
        public async Task<ActionResult<CashAdvance>> CreateRequest(CashAdvance request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("unique_name")?.Value ?? User.FindFirst("name")?.Value;
                
                if (string.IsNullOrEmpty(userId)) 
                {
                    return Unauthorized();
                }

                var user = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null) return BadRequest("User not found");

                request.Id = null;
                request.UserId = userId;
                request.UserName = userName ?? user.Name;
                request.Department = user.Department ?? "Unknown";
                request.Division = user.Division ?? "Unknown";
                request.CreatedAt = DateTime.UtcNow;
                request.Status = "PENDING";
                request.ApproveOrder = 1;

                request.History = new List<HistoryRecord> {
                    new HistoryRecord {
                        UserId = userId,
                        UserName = request.UserName,
                        Action = "Created",
                        Date = DateTime.UtcNow,
                        Note = "Cash Advance request submitted"
                    }
                };

                await SetNextApprover(request);

                await _context.CashAdvances.InsertOneAsync(request);
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

                // Fallback for userName
                if (string.IsNullOrEmpty(userName) && !string.IsNullOrEmpty(userId))
                {
                    var currentUser = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                    userName = currentUser?.Name;
                }

                var request = await _context.CashAdvances.Find(r => r.Id == id).FirstOrDefaultAsync();
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

                request.ApproveOrder++;
                await SetNextApprover(request);

                await _context.CashAdvances.ReplaceOneAsync(r => r.Id == id, request);

                // Send email if status is PAID
                if (request.Status == "PAID")
                {
                    _ = Task.Run(async () => {
                        var user = await _context.Users.Find(u => u.Id == request.UserId).FirstOrDefaultAsync();
                        if (user != null && !string.IsNullOrEmpty(user.Email))
                        {
                            await _emailService.SendPaidNotificationAsync(user.Email, user.Name, "Cash Advance", request.Total, request.Currency);
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

                // Fallback for userName
                if (string.IsNullOrEmpty(userName) && !string.IsNullOrEmpty(userId))
                {
                    var currentUser = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                    userName = currentUser?.Name;
                }

                var request = await _context.CashAdvances.Find(r => r.Id == id).FirstOrDefaultAsync();
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
                    Note = note
                });

                await _context.CashAdvances.ReplaceOneAsync(r => r.Id == id, request);

                // Send email notification
                _ = Task.Run(async () => {
                    var user = await _context.Users.Find(u => u.Id == request.UserId).FirstOrDefaultAsync();
                    if (user != null && !string.IsNullOrEmpty(user.Email))
                    {
                        await _emailService.SendRejectedNotificationAsync(user.Email, user.Name, "Cash Advance", userName ?? "Approver", note ?? "No reason provided");
                    }
                });

                return Ok(request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        private async Task SetNextApprover(CashAdvance request)
        {
            var dept = await _context.Departments.Find(d => d.Name == request.Department).FirstOrDefaultAsync();
            var div = await _context.Divisions.Find(d => d.Name == request.Division).FirstOrDefaultAsync();

            string? nextApproverId = null;
            string? nextApproverName = null;

            // Sequence: 1:Supervisor, 2:Head of Department, 3:Head of Division Approver 1, 4:Head of Division Approver 2
            while (request.ApproveOrder <= 4)
            {
                string? candidateName = null;

                if (request.ApproveOrder == 1 && dept != null) { candidateName = dept.ApproverOne; } // Supervisor
                else if (request.ApproveOrder == 2 && dept != null) { candidateName = dept.ApproverTwo; } // Head of Department
                else if (request.ApproveOrder == 3 && div != null) { candidateName = div.HeadOfDivisionApproverOne; }
                else if (request.ApproveOrder == 4 && div != null) { candidateName = div.HeadOfDivisionApproverTwo; }

                if (!string.IsNullOrEmpty(candidateName))
                {
                    var apprUser = await _context.Users.Find(u => u.Name == candidateName).FirstOrDefaultAsync();
                    if (apprUser != null)
                    {
                        if (apprUser.Id == request.UserId)
                        {
                            request.History.Add(new HistoryRecord {
                                UserId = apprUser.Id,
                                UserName = candidateName,
                                Action = "Auto-Approved",
                                Date = DateTime.UtcNow,
                                Note = "Self-approval skip"
                            });
                            request.ApproveOrder++;
                            continue;
                        }

                        nextApproverId = apprUser.Id;
                        nextApproverName = candidateName;
                        break;
                    }
                }
                request.ApproveOrder++;
            }

            if (nextApproverId != null)
            {
                request.CurrentApproverUserId = nextApproverId;
                request.CurrentApproverName = nextApproverName;
                request.Status = "PENDING";
            }
            else
            {
                // Final stage: General Cashier
                var cashier = await _context.Users.Find(u => u.Role == "General Cashier").FirstOrDefaultAsync();
                
                // If we haven't reached the cashier yet, or the current approver is NOT the cashier
                if (cashier != null && request.CurrentApproverUserId != cashier.Id && request.Status == "PENDING")
                {
                    request.ApproveOrder = 5;
                    request.CurrentApproverUserId = cashier.Id;
                    request.CurrentApproverName = cashier.Name;
                    
                    // Case where the cashier is the requester
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
                else
                {
                    // Either it was already at the cashier and they approved, or no cashier found
                    request.Status = "PAID";
                    request.CurrentApproverUserId = null;
                    request.CurrentApproverName = null;
                }
            }
        }
    }
}
