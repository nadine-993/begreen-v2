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
    public class BeoController : ControllerBase
    {
        private readonly MongoDbContext _context;

        public BeoController(MongoDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Beo>>> GetRequests()
        {
            // Visibility Rule: Global visibility (Everyone can see all BEOs)
            var requests = await _context.Beos.Find(_ => true).SortByDescending(r => r.CreatedAt).ToListAsync();
            return Ok(requests);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Beo>> GetRequest(string id)
        {
            var request = await _context.Beos.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (request == null) return NotFound();
            return Ok(request);
        }

        [HttpPost]
        public async Task<ActionResult<Beo>> CreateRequest(Beo request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                            ?? User.FindFirst("nameid")?.Value 
                            ?? User.FindFirst("sub")?.Value;
                
                var userName = User.FindFirst(ClaimTypes.Name)?.Value 
                             ?? User.FindFirst("name")?.Value;
                
                var userDept = (User.FindFirst("department")?.Value 
                               ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("department"))?.Value 
                               ?? "").Trim();

                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                var allowedDepts = new[] { "Sales", "Marketing", "Catering", "Social Media" };
                if (!allowedDepts.Any(d => string.Equals(d, userDept, StringComparison.OrdinalIgnoreCase)))
                {
                    return StatusCode(403, "Only members of the Sales, Marketing, Catering, or Social Media departments can create BEO orders.");
                }

                var user = await _context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
                if (user == null) return BadRequest("User not found");

                request.Id = null;
                request.UserId = userId;
                request.UserName = userName ?? user.Name;
                request.CreatedAt = DateTime.UtcNow;

                request.History = new List<HistoryRecord> {
                    new HistoryRecord {
                        UserId = userId,
                        UserName = request.UserName,
                        Action = "Created",
                        Date = DateTime.UtcNow,
                        Note = "BEO Order created"
                    }
                };

                await _context.Beos.InsertOneAsync(request);
                return CreatedAtAction(nameof(GetRequest), new { id = request.Id }, request);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
