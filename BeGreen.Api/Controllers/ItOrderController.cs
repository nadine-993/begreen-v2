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
    public class ItOrderController : ControllerBase
    {
        private readonly MongoDbContext _context;
        private readonly IEmailService _emailService;

        public ItOrderController(MongoDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet("ping")]
        [AllowAnonymous]
        public IActionResult Ping() => Ok("IT Order Controller is active");

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ItOrder>>> GetRequests()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
            
            var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value)
                            .Concat(User.FindAll("role").Select(c => c.Value))
                            .ToList();
            
            var userDept = (User.FindFirst("department")?.Value 
                           ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("department"))?.Value 
                           ?? "").Trim();
            
            var userDiv = (User.FindFirst("division")?.Value 
                          ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("division"))?.Value 
                          ?? "").Trim();

            FilterDefinition<ItOrder> filter = Builders<ItOrder>.Filter.Empty;
            var ownRequests = Builders<ItOrder>.Filter.Eq(r => r.UserId, userId);

            // Visibility Rules
            if (roles.Any(r => string.Equals(r, "Admin", StringComparison.OrdinalIgnoreCase)) || 
                roles.Any(r => string.Equals(r, "General Cashier", StringComparison.OrdinalIgnoreCase)) ||
                string.Equals(userDept, "Information Technology", StringComparison.OrdinalIgnoreCase))
            {
                // Full visibility for Admin, Cashier, and ALL IT department users
                filter = Builders<ItOrder>.Filter.Empty;
            }
            else if (roles.Any(r => string.Equals(r, "Head of Division", StringComparison.OrdinalIgnoreCase)))
            {
                var regexPattern = $"^\\s*{Regex.Escape(userDiv)}\\s*$";
                var divisionFilter = Builders<ItOrder>.Filter.Regex(r => r.Division, new MongoDB.Bson.BsonRegularExpression(regexPattern, "i"));
                filter = Builders<ItOrder>.Filter.Or(ownRequests, divisionFilter);
            }
            else if (roles.Any(r => string.Equals(r, "Head of Department", StringComparison.OrdinalIgnoreCase)) || 
                     roles.Any(r => string.Equals(r, "Supervisor", StringComparison.OrdinalIgnoreCase)))
            {
                var regexPattern = $"^\\s*{Regex.Escape(userDept)}\\s*$";
                var deptFilter = Builders<ItOrder>.Filter.Regex(r => r.Department, new MongoDB.Bson.BsonRegularExpression(regexPattern, "i"));
                filter = Builders<ItOrder>.Filter.Or(ownRequests, deptFilter);
            }
            else
            {
                filter = ownRequests;
            }

            var requests = await _context.ItOrders.Find(filter).SortByDescending(r => r.CreatedAt).ToListAsync();
            return Ok(requests);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ItOrder>> GetRequest(string id)
        {
            var request = await _context.ItOrders.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (request == null) return NotFound();
            return Ok(request);
        }

        [HttpPost]
        public async Task<ActionResult<ItOrder>> CreateRequest(ItOrder request)
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

                if (string.IsNullOrEmpty(userId)) 
                {
                    return BadRequest(new { error = "Unauthorized: No User ID found in token claims." });
                }

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
                        Note = "IT Order created"
                    }
                };

                await _context.ItOrders.InsertOneAsync(request);
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

                var userDept = (User.FindFirst("department")?.Value 
                               ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("department"))?.Value 
                               ?? "").Trim();

                if (string.IsNullOrEmpty(userId)) 
                {
                    return BadRequest(new { error = "Unauthorized: No User ID found in token claims." });
                }

                // Validation: Only IT department can close
                if (!string.Equals(userDept, "Information Technology", StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(403, "Only members of the IT department can close orders.");
                }

                var request = await _context.ItOrders.Find(r => r.Id == id).FirstOrDefaultAsync();
                if (request == null) return NotFound();

                if (request.Status == "Close") return BadRequest("Order is already closed.");

                request.Status = "Close";
                request.History.Add(new HistoryRecord {
                    UserId = userId,
                    UserName = userName,
                    Action = "Closed",
                    Date = DateTime.UtcNow,
                    Note = note ?? "Order closed by IT department"
                });

                await _context.ItOrders.ReplaceOneAsync(r => r.Id == id, request);

                // Send email notification
                _ = Task.Run(async () => {
                    var user = await _context.Users.Find(u => u.Id == request.UserId).FirstOrDefaultAsync();
                    if (user != null && !string.IsNullOrEmpty(user.Email))
                    {
                        await _emailService.SendClosedNotificationAsync(user.Email, user.Name, "IT Order", note ?? "Order closed by IT department");
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
