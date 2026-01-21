using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using BeGreen.Api.Models;
using MongoDB.Driver;
using System.Security.Claims;
using BeGreen.Api.Services;

namespace BeGreen.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class GlitchController : ControllerBase
    {
        private readonly MongoDbContext _context;
        private readonly IEmailService _emailService;

        public GlitchController(MongoDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Glitch>>> GetRequests()
        {
            // Visibility Rule: Everyone can see all glitches
            var requests = await _context.Glitches.Find(_ => true).SortByDescending(r => r.CreatedAt).ToListAsync();
            return Ok(requests);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Glitch>> GetRequest(string id)
        {
            var request = await _context.Glitches.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (request == null) return NotFound();
            return Ok(request);
        }

        [HttpPost]
        public async Task<ActionResult<Glitch>> CreateRequest(Glitch request)
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
                        Note = "Glitch reported"
                    }
                };

                await _context.Glitches.InsertOneAsync(request);
                return CreatedAtAction(nameof(GetRequest), new { id = request.Id }, request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}/note")]
        public async Task<IActionResult> AddNote(string id, [FromBody] string note)
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

                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                var glitch = await _context.Glitches.Find(r => r.Id == id).FirstOrDefaultAsync();
                if (glitch == null) return NotFound();

                if (glitch.Status == "Close") return BadRequest("Cannot add notes to a closed glitch.");

                glitch.Notes = note;
                glitch.History.Add(new HistoryRecord {
                    UserId = userId,
                    UserName = userName,
                    Action = "Note Added",
                    Date = DateTime.UtcNow,
                    Note = note
                });

                await _context.Glitches.ReplaceOneAsync(r => r.Id == id, glitch);
                return Ok(glitch);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{id}/close")]
        public async Task<IActionResult> CloseGlitch(string id, [FromBody] string? note)
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

                // Validation: Only Room service department can close
                if (!string.Equals(userDept, "Room service", StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(403, "Only members of the Room service department can close glitches.");
                }

                var glitch = await _context.Glitches.Find(r => r.Id == id).FirstOrDefaultAsync();
                if (glitch == null) return NotFound();

                if (glitch.Status == "Close") return BadRequest("Glitch is already closed.");

                glitch.Status = "Close";
                glitch.History.Add(new HistoryRecord {
                    UserId = userId,
                    UserName = userName,
                    Action = "Closed",
                    Date = DateTime.UtcNow,
                    Note = note ?? "Glitch marked as resolved"
                });

                await _context.Glitches.ReplaceOneAsync(r => r.Id == id, glitch);

                // Send email notification
                _ = Task.Run(async () => {
                    var user = await _context.Users.Find(u => u.Id == glitch.UserId).FirstOrDefaultAsync();
                    if (user != null && !string.IsNullOrEmpty(user.Email))
                    {
                        await _emailService.SendClosedNotificationAsync(user.Email, user.Name, "Glitch Report", note ?? "Glitch marked as resolved");
                    }
                });

                return Ok(glitch);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
