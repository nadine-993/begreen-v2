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
    public class TaxiOrderController : ControllerBase
    {
        private readonly MongoDbContext _context;

        public TaxiOrderController(MongoDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaxiOrder>>> GetRequests()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
            
            var userDept = (User.FindFirst("department")?.Value 
                           ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("department"))?.Value 
                           ?? "").Trim();

            FilterDefinition<TaxiOrder> filter;
            
            // Rule: Security department see all. Others see their own.
            if (string.Equals(userDept, "Security", StringComparison.OrdinalIgnoreCase) || 
                User.IsInRole("Admin"))
            {
                filter = Builders<TaxiOrder>.Filter.Empty;
            }
            else
            {
                filter = Builders<TaxiOrder>.Filter.Eq(r => r.UserId, userId);
            }

            var requests = await _context.TaxiOrders.Find(filter).SortByDescending(r => r.CreatedAt).ToListAsync();
            return Ok(requests);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TaxiOrder>> GetRequest(string id)
        {
            var request = await _context.TaxiOrders.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (request == null) return NotFound();
            return Ok(request);
        }

        [HttpPost]
        public async Task<ActionResult<TaxiOrder>> CreateRequest(TaxiOrder request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
                
                var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("unique_name")?.Value ?? User.FindFirst("name")?.Value;
                
                var userDept = (User.FindFirst("department")?.Value 
                               ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("department"))?.Value 
                               ?? "").Trim();
                
                var userDiv = (User.FindFirst("division")?.Value 
                               ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("division"))?.Value 
                               ?? "").Trim();

                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                var user = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null) return BadRequest("User not found");

                request.Id = null;
                request.UserId = userId;
                request.UserName = userName ?? user.Name;
                request.Department = userDept;
                request.Division = userDiv;
                request.CreatedAt = DateTime.UtcNow;
                request.Status = "Pending";

                request.History = new List<HistoryRecord> {
                    new HistoryRecord {
                        UserId = userId,
                        UserName = request.UserName,
                        Action = "Submitted",
                        Date = DateTime.UtcNow,
                        Note = $"Taxi order submitted with {request.Passengers.Count} passengers"
                    }
                };

                await _context.TaxiOrders.InsertOneAsync(request);
                return CreatedAtAction(nameof(GetRequest), new { id = request.Id }, request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}/passengers/{index}/status")]
        public async Task<IActionResult> UpdatePassengerStatus(string id, int index, [FromBody] string status, [FromQuery] string? note)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("unique_name")?.Value ?? User.FindFirst("name")?.Value;
                var userDept = (User.FindFirst("department")?.Value 
                               ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("department"))?.Value 
                               ?? "").Trim();

                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                // Validation: Only Security department can approve/reject
                if (!string.Equals(userDept, "Security", StringComparison.OrdinalIgnoreCase) && !User.IsInRole("Admin"))
                {
                    return StatusCode(403, "Only members of the Security department can approve or reject taxi orders.");
                }

                var request = await _context.TaxiOrders.Find(r => r.Id == id).FirstOrDefaultAsync();
                if (request == null) return NotFound();

                if (index < 0 || index >= request.Passengers.Count) return BadRequest("Invalid passenger index.");

                var passenger = request.Passengers[index];
                passenger.Status = status;

                request.History.Add(new HistoryRecord {
                    UserId = userId,
                    UserName = userName,
                    Action = $"{status} Passenger: {passenger.FullName}",
                    Date = DateTime.UtcNow,
                    Note = note ?? $"Passenger {passenger.FullName} {status.ToLower()} by Security"
                });

                // Update overall status: If all passengers are processed (not Pending), set to Closed
                bool allProcessed = request.Passengers.All(p => p.Status != "Pending");
                
                if (allProcessed) request.Status = "Closed";
                else request.Status = "Partially Approved";

                await _context.TaxiOrders.ReplaceOneAsync(r => r.Id == id, request);
                return Ok(request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}/approve")]
        public async Task<IActionResult> ApproveOrder(string id, [FromBody] string? note)
        {
            return await UpdateStatus(id, "Approved", note);
        }

        [HttpPut("{id}/reject")]
        public async Task<IActionResult> RejectOrder(string id, [FromBody] string? note)
        {
            return await UpdateStatus(id, "Rejected", note);
        }

        private async Task<IActionResult> UpdateStatus(string id, string status, string? note)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
                var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("unique_name")?.Value ?? User.FindFirst("name")?.Value;

                // Fallback for userName
                if (string.IsNullOrEmpty(userName) && !string.IsNullOrEmpty(userId))
                {
                    var currentUser = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                    userName = currentUser?.Name;
                }

                var userDept = (User.FindFirst("department")?.Value 
                               ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("department"))?.Value 
                               ?? "").Trim();

                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                // Validation: Only Security department can approve/reject
                if (!string.Equals(userDept, "Security", StringComparison.OrdinalIgnoreCase) && !User.IsInRole("Admin"))
                {
                    return StatusCode(403, "Only members of the Security department can approve or reject taxi orders.");
                }

                var request = await _context.TaxiOrders.Find(r => r.Id == id).FirstOrDefaultAsync();
                if (request == null) return NotFound();

                if (request.Status != "Pending") return BadRequest($"Order is already {request.Status}.");

                request.Status = status;
                request.History.Add(new HistoryRecord {
                    UserId = userId,
                    UserName = userName,
                    Action = status,
                    Date = DateTime.UtcNow,
                    Note = note ?? $"Taxi order {status.ToLower()} by Security"
                });

                await _context.TaxiOrders.ReplaceOneAsync(r => r.Id == id, request);
                return Ok(request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
