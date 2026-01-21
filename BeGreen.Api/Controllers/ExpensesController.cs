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
    public class ExpensesController : ControllerBase
    {
        private readonly MongoDbContext _context;
        private readonly IEmailService _emailService;

        public ExpensesController(MongoDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Expense>>> GetRequests()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value ?? User.FindFirst("nameid")?.Value;
            var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value)
                            .Concat(User.FindAll("role").Select(c => c.Value))
                            .ToList();
            
            var userDept = (User.FindFirst("department")?.Value ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("department"))?.Value ?? "").Trim();
            var userDiv = (User.FindFirst("division")?.Value ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("division"))?.Value ?? "").Trim();

            FilterDefinition<Expense> filter = Builders<Expense>.Filter.Empty;
            var ownRequests = Builders<Expense>.Filter.Eq(r => r.UserId, userId);

            if (roles.Any(r => string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase)) || 
                roles.Any(r => string.Equals(r, "General Cashier", StringComparison.OrdinalIgnoreCase)))
            {
                filter = Builders<Expense>.Filter.Empty;
            }
            else if (roles.Any(r => string.Equals(r, "Head of Division", StringComparison.OrdinalIgnoreCase)))
            {
                var regexPattern = $"^\\s*{System.Text.RegularExpressions.Regex.Escape(userDiv)}\\s*$";
                var divisionFilter = Builders<Expense>.Filter.Regex(r => r.Division, new MongoDB.Bson.BsonRegularExpression(regexPattern, "i"));
                filter = Builders<Expense>.Filter.Or(ownRequests, divisionFilter);
            }
            else if (roles.Any(r => string.Equals(r, "Head of Department", StringComparison.OrdinalIgnoreCase)) || 
                     roles.Any(r => string.Equals(r, "Supervisor", StringComparison.OrdinalIgnoreCase)))
            {
                var regexPattern = $"^\\s*{System.Text.RegularExpressions.Regex.Escape(userDept)}\\s*$";
                var deptFilter = Builders<Expense>.Filter.Regex(r => r.Department, new MongoDB.Bson.BsonRegularExpression(regexPattern, "i"));
                filter = Builders<Expense>.Filter.Or(ownRequests, deptFilter);
            }
            else
            {
                filter = ownRequests;
            }

            var requests = await _context.Expenses.Find(filter).SortByDescending(r => r.CreatedAt).ToListAsync();
            return Ok(requests);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Expense>> GetRequest(string id)
        {
            var request = await _context.Expenses.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (request == null) return NotFound();
            return Ok(request);
        }

        [HttpPost]
        public async Task<ActionResult<Expense>> CreateRequest(Expense request)
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

                var user = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null) return BadRequest("User not found");

                request.Id = null;
                request.UserId = userId;
                request.UserName = userName ?? user.Name;
                request.Department = user.Department ?? "Unknown";
                request.Division = user.Division ?? "Unknown";
                request.CreatedAt = DateTime.UtcNow;
                request.Status = "PENDING";
                
                request.History = new List<HistoryRecord> {
                    new HistoryRecord {
                        UserId = userId,
                        UserName = request.UserName,
                        Action = "Created",
                        Date = DateTime.UtcNow,
                        Note = "Expense request submitted"
                    }
                };

                await SetNextApprover(request, user);

                await _context.Expenses.InsertOneAsync(request);
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

                var request = await _context.Expenses.Find(r => r.Id == id).FirstOrDefaultAsync();
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

                var requester = await _context.Users.Find(u => u.Id == request.UserId).FirstOrDefaultAsync();
                await SetNextApprover(request, requester);

                await _context.Expenses.ReplaceOneAsync(r => r.Id == id, request);

                // Send email if status is PAID
                if (request.Status == "PAID")
                {
                    _ = Task.Run(async () => {
                        var user = await _context.Users.Find(u => u.Id == request.UserId).FirstOrDefaultAsync();
                        if (user != null && !string.IsNullOrEmpty(user.Email))
                        {
                            await _emailService.SendPaidNotificationAsync(user.Email, user.Name, "Expense", request.Amount, request.Currency);
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

                var request = await _context.Expenses.Find(r => r.Id == id).FirstOrDefaultAsync();
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

                await _context.Expenses.ReplaceOneAsync(r => r.Id == id, request);

                // Send email notification
                _ = Task.Run(async () => {
                    var user = await _context.Users.Find(u => u.Id == request.UserId).FirstOrDefaultAsync();
                    if (user != null && !string.IsNullOrEmpty(user.Email))
                    {
                        await _emailService.SendRejectedNotificationAsync(user.Email, user.Name, "Expense", userName ?? "Approver", note ?? "No reason provided");
                    }
                });

                return Ok(request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        private async Task SetNextApprover(Expense request, User? requester)
        {
            var dept = await _context.Departments.Find(d => d.Name == request.Department).FirstOrDefaultAsync();
            var div = await _context.Divisions.Find(d => d.Name == request.Division).FirstOrDefaultAsync();

            string? nextApproverId = null;
            string? nextApproverName = null;

            while (request.ApproveOrder <= 4)
            {
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
                        if (apprUser.Id == request.UserId)
                        {
                            request.History.Add(new HistoryRecord {
                                UserId = apprUser.Id,
                                UserName = apprUser.Name,
                                Action = "Auto-Approved",
                                Date = DateTime.UtcNow,
                                Note = "Self-approval skip"
                            });
                            request.ApproveOrder++;
                            continue;
                        }

                        nextApproverId = apprUser.Id;
                        nextApproverName = apprUser.Name;
                        break;
                    }
                }
                request.ApproveOrder++;
            }

            if (nextApproverId != null)
            {
                request.CurrentApproverUserId = nextApproverId;
                request.CurrentApproverName = nextApproverName;
            }
            else
            {
                var cashier = await _context.Users.Find(u => u.Role == "General Cashier").FirstOrDefaultAsync();
                if (cashier != null && request.CurrentApproverUserId != cashier.Id)
                {
                    request.ApproveOrder = 5;
                    request.CurrentApproverUserId = cashier.Id;
                    request.CurrentApproverName = cashier.Name;
                    
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
                    request.Status = "PAID";
                    request.CurrentApproverUserId = null;
                    request.CurrentApproverName = null;
                }
                else
                {
                    request.Status = "PAID";
                    request.CurrentApproverUserId = null;
                    request.CurrentApproverName = null;
                }
            }
        }
    }
}
