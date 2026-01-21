using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using BeGreen.Api.Models;
using MongoDB.Driver;
using System.Security.Claims;
using System.Text.RegularExpressions;
using BeGreen.Api.Services;

namespace BeGreen.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class EngineeringOrderController : ControllerBase
    {
        private readonly MongoDbContext _context;
        private readonly IEmailService _emailService;

        public EngineeringOrderController(MongoDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EngineeringOrder>>> GetRequests()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
            var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value)
                            .Concat(User.FindAll("role").Select(c => c.Value))
                            .ToList();
            
            var userDept = (User.FindFirst("department")?.Value ?? "").Trim();
            var userDiv = (User.FindFirst("division")?.Value ?? "").Trim();

            FilterDefinition<EngineeringOrder> filter = Builders<EngineeringOrder>.Filter.Empty;
            var ownRequests = Builders<EngineeringOrder>.Filter.Eq(r => r.UserId, userId);

            // Visibility Rules
            if (roles.Any(r => string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase)) || 
                roles.Any(r => string.Equals(r, "General Cashier", StringComparison.OrdinalIgnoreCase)) ||
                string.Equals(userDept, "Engineering", StringComparison.OrdinalIgnoreCase))
            {
                // Full visibility for Admin, Cashier, and ALL Engineering department users
                filter = Builders<EngineeringOrder>.Filter.Empty;
            }
            else if (roles.Any(r => string.Equals(r, "Head of Division", StringComparison.OrdinalIgnoreCase)))
            {
                var regexPattern = $"^\\s*{Regex.Escape(userDiv)}\\s*$";
                var divisionFilter = Builders<EngineeringOrder>.Filter.Regex(r => r.Division, new MongoDB.Bson.BsonRegularExpression(regexPattern, "i"));
                filter = Builders<EngineeringOrder>.Filter.Or(ownRequests, divisionFilter);
            }
            else if (roles.Any(r => string.Equals(r, "Head of Department", StringComparison.OrdinalIgnoreCase)) || 
                     roles.Any(r => string.Equals(r, "Supervisor", StringComparison.OrdinalIgnoreCase)))
            {
                var regexPattern = $"^\\s*{Regex.Escape(userDept)}\\s*$";
                var deptFilter = Builders<EngineeringOrder>.Filter.Regex(r => r.Department, new MongoDB.Bson.BsonRegularExpression(regexPattern, "i"));
                filter = Builders<EngineeringOrder>.Filter.Or(ownRequests, deptFilter);
            }
            else
            {
                filter = ownRequests;
            }

            var requests = await _context.EngineeringOrders.Find(filter).SortByDescending(r => r.CreatedAt).ToListAsync();
            return Ok(requests);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<EngineeringOrder>> GetRequest(string id)
        {
            var request = await _context.EngineeringOrders.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (request == null) return NotFound();
            return Ok(request);
        }

        [HttpPost]
        public async Task<ActionResult<EngineeringOrder>> CreateRequest(EngineeringOrder request)
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
                request.Status = "Open";

                request.History = new List<HistoryRecord> {
                    new HistoryRecord {
                        UserId = userId,
                        UserName = request.UserName,
                        Action = "Created",
                        Date = DateTime.UtcNow,
                        Note = "Engineering Order created"
                    }
                };

                await _context.EngineeringOrders.InsertOneAsync(request);
                return CreatedAtAction(nameof(GetRequest), new { id = request.Id }, request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}/close")]
        public async Task<IActionResult> CloseOrder(string id, [FromBody] string? note)
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

                var userDept = (User.FindFirst("department")?.Value ?? "").Trim();

                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                // Validation: Only Engineering department can close
                if (!string.Equals(userDept, "Engineering", StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(403, "Only members of the Engineering department can close orders.");
                }

                var request = await _context.EngineeringOrders.Find(r => r.Id == id).FirstOrDefaultAsync();
                if (request == null) return NotFound();

                if (request.Status == "Close") return BadRequest("Order is already closed.");

                request.Status = "Close";
                request.History.Add(new HistoryRecord {
                    UserId = userId,
                    UserName = userName,
                    Action = "Closed",
                    Date = DateTime.UtcNow,
                    Note = note ?? "Order closed by Engineering department"
                });

                await _context.EngineeringOrders.ReplaceOneAsync(r => r.Id == id, request);

                // Send email notification
                _ = Task.Run(async () => {
                    var user = await _context.Users.Find(u => u.Id == request.UserId).FirstOrDefaultAsync();
                    if (user != null && !string.IsNullOrEmpty(user.Email))
                    {
                        await _emailService.SendClosedNotificationAsync(user.Email, user.Name, "Engineering Order", note ?? "Order closed by Engineering department");
                    }
                });

                return Ok(request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
