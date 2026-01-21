using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using BeGreen.Api.Models;
using BeGreen.Api.Services;
using MongoDB.Driver;

namespace BeGreen.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly MongoDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _config;

        public SettingsController(MongoDbContext context, IEmailService emailService, IConfiguration config)
        {
            _context = context;
            _emailService = emailService;
            _config = config;
        }

        // --- Divisions ---
        [HttpGet("divisions")]
        public async Task<ActionResult<IEnumerable<Division>>> GetDivisions()
        {
            return await _context.Divisions.Find(_ => true).ToListAsync();
        }

        [Authorize(Policy = "ITOnly")]
        [HttpPost("divisions")]
        public async Task<ActionResult<Division>> CreateDivision(Division division)
        {
            await _context.Divisions.InsertOneAsync(division);
            return Ok(division);
        }

        [Authorize(Policy = "ITOnly")]
        [HttpPut("divisions/{id}")]
        public async Task<IActionResult> UpdateDivision(string id, Division division)
        {
            await _context.Divisions.ReplaceOneAsync(d => d.Id == id, division);
            return NoContent();
        }

        [Authorize(Policy = "ITOnly")]
        [HttpDelete("divisions/{id}")]
        public async Task<IActionResult> DeleteDivision(string id)
        {
            await _context.Divisions.DeleteOneAsync(d => d.Id == id);
            return NoContent();
        }

        // --- Departments ---
        [HttpGet("departments")]
        public async Task<ActionResult<IEnumerable<Department>>> GetDepartments()
        {
            return await _context.Departments.Find(_ => true).ToListAsync();
        }

        [Authorize(Policy = "ITOnly")]
        [HttpPost("departments")]
        public async Task<ActionResult<Department>> CreateDepartment(Department department)
        {
            await _context.Departments.InsertOneAsync(department);
            return Ok(department);
        }

        [Authorize(Policy = "ITOnly")]
        [HttpPut("departments/{id}")]
        public async Task<IActionResult> UpdateDepartment(string id, Department department)
        {
            await _context.Departments.ReplaceOneAsync(d => d.Id == id, department);
            return NoContent();
        }

        [Authorize(Policy = "ITOnly")]
        [HttpDelete("departments/{id}")]
        public async Task<IActionResult> DeleteDepartment(string id)
        {
            await _context.Departments.DeleteOneAsync(d => d.Id == id);
            return NoContent();
        }

        // --- Roles ---
        [HttpGet("roles")]
        public async Task<ActionResult<IEnumerable<Role>>> GetRoles()
        {
            return await _context.Roles.Find(_ => true).ToListAsync();
        }

        [Authorize(Policy = "ITOnly")]
        [HttpPost("roles")]
        public async Task<ActionResult<Role>> CreateRole(Role role)
        {
            await _context.Roles.InsertOneAsync(role);
            return Ok(role);
        }

        [Authorize(Policy = "ITOnly")]
        [HttpPut("roles/{id}")]
        public async Task<IActionResult> UpdateRole(string id, Role role)
        {
            var existing = await _context.Roles.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (existing != null && existing.Name.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("The Admin role is a system role and cannot be modified.");
            }
            await _context.Roles.ReplaceOneAsync(r => r.Id == id, role);
            return NoContent();
        }

        [Authorize(Policy = "ITOnly")]
        [HttpDelete("roles/{id}")]
        public async Task<IActionResult> DeleteRole(string id)
        {
            var existing = await _context.Roles.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (existing != null && existing.Name.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("The Admin role is a system role and cannot be deleted.");
            }
            await _context.Roles.DeleteOneAsync(r => r.Id == id);
            return NoContent();
        }

        // --- Users ---
        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return await _context.Users.Find(_ => true).ToListAsync();
        }

        [Authorize(Policy = "ITOnly")]
        [HttpPost("users")]
        public async Task<ActionResult<User>> CreateUser(User user)
        {
            if (user.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            {
                var requesterRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                if (requesterRole == null || !requesterRole.Equals("Admin", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest("Only Admin users can assign the Admin role.");
                }
            }

            if (!string.IsNullOrEmpty(user.Password))
            {
                user.Password = BCrypt.Net.BCrypt.HashPassword(user.Password);
            }
            await _context.Users.InsertOneAsync(user);
            return Ok(user);
        }

        [Authorize(Policy = "ITOnly")]
        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(string id, User user)
        {
            var existingUser = await _context.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
            if (existingUser == null) return NotFound();

            if (existingUser.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Users with the Admin role cannot be modified via the Settings interface.");
            }

            if (user.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase) && !existingUser.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            {
                var requesterRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                if (requesterRole == null || !requesterRole.Equals("Admin", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest("Only Admin users can assign the Admin role.");
                }
            }

            if (!string.IsNullOrEmpty(user.Password) && user.Password != existingUser.Password)
            {
                user.Password = BCrypt.Net.BCrypt.HashPassword(user.Password);
            }
            else
            {
                user.Password = existingUser.Password;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _context.Users.ReplaceOneAsync(u => u.Id == id, user);
            return NoContent();
        }

        [Authorize(Policy = "ITOnly")]
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var existingUser = await _context.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
            if (existingUser == null) return NotFound();

            if (existingUser.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Users with the Admin role cannot be deleted via the Settings interface.");
            }

            await _context.Users.DeleteOneAsync(u => u.Id == id);
            return NoContent();
        }

        [Authorize(Policy = "ITOnly")]
        [HttpPut("users/{id}/toggle-status")]
        public async Task<IActionResult> ToggleUserStatus(string id)
        {
            var user = await _context.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
            if (user == null) return NotFound();

            if (user.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Admin users cannot be disabled.");
            }

            user.IsDisabled = !user.IsDisabled;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.Users.ReplaceOneAsync(u => u.Id == id, user);
            return Ok(new { id = user.Id, isDisabled = user.IsDisabled });
        }

        [Authorize(Policy = "ITOnly")]
        [HttpPost("users/{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(string id)
        {
            var user = await _context.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
            if (user == null) return NotFound();

            // Generate a secure random token
            var token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
            user.ResetToken = token;
            user.ResetTokenExpiry = DateTime.UtcNow.AddHours(1);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.Users.ReplaceOneAsync(u => u.Id == id, user);

            // Construct reset link
            var frontendUrl = _config["FrontendUrl"] ?? "http://localhost:4200";
            var resetLink = $"{frontendUrl}/reset-password?token={token}";

            await _emailService.SendPasswordResetEmailAsync(user.Email, user.Name, resetLink);

            return Ok(new { message = "Password reset email sent." });
        }

        [HttpPost("users/signatures")]
        public async Task<ActionResult<IEnumerable<object>>> GetSignatures([FromBody] List<string> userIds)
        {
            if (userIds == null || !userIds.Any()) return Ok(new List<object>());

            var filter = Builders<User>.Filter.In(u => u.Id, userIds);
            var users = await _context.Users.Find(filter).ToListAsync();

            var result = users.Select(u => new
            {
                u.Id,
                u.Name,
                u.Signature,
                u.Role
            });

            return Ok(result);
        }
    }
}
