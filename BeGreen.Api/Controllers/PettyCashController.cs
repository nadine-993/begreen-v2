using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using BeGreen.Api.Models;
using MongoDB.Driver;
using System.Security.Claims;

namespace BeGreen.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PettyCashController : ControllerBase
    {
        private readonly MongoDbContext _context;

        public PettyCashController(MongoDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PettyCash>>> GetRequests()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var userDept = User.FindFirst("department")?.Value;
            var userDiv = User.FindFirst("division")?.Value;

            FilterDefinition<PettyCash> filter = Builders<PettyCash>.Filter.Empty;

            if (userRole == "Admin" || userRole == "General Cashier")
            {
                filter = Builders<PettyCash>.Filter.Empty;
            }
            else if (userRole == "Head of Division")
            {
                filter = Builders<PettyCash>.Filter.Eq(r => r.Division, userDiv);
            }
            else if (userRole == "Head of Department" || userRole == "Supervisor")
            {
                filter = Builders<PettyCash>.Filter.And(
                    Builders<PettyCash>.Filter.Eq(r => r.Department, userDept),
                    Builders<PettyCash>.Filter.Eq(r => r.Division, userDiv)
                );
            }
            else // standard user
            {
                filter = Builders<PettyCash>.Filter.Eq(r => r.UserId, userId);
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
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value;
                
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
                Console.WriteLine($"[PettyCashController] Error creating request: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}/approve")]
        public async Task<IActionResult> ApproveRequest(string id, [FromBody] string? note)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value;
                if (string.IsNullOrEmpty(userId)) return Unauthorized();

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
                return Ok(request);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PettyCashController] Error approving request: {ex.Message}");
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
