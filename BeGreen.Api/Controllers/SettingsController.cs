using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using BeGreen.Api.Models;
using MongoDB.Driver;

namespace BeGreen.Api.Controllers
{
    [Authorize(Policy = "ITOnly")]
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly MongoDbContext _context;

        public SettingsController(MongoDbContext context)
        {
            _context = context;
        }

        // --- Divisions ---
        [HttpGet("divisions")]
        public async Task<ActionResult<IEnumerable<Division>>> GetDivisions()
        {
            return await _context.Divisions.Find(_ => true).ToListAsync();
        }

        [HttpPost("divisions")]
        public async Task<ActionResult<Division>> CreateDivision(Division division)
        {
            await _context.Divisions.InsertOneAsync(division);
            return Ok(division);
        }

        [HttpPut("divisions/{id}")]
        public async Task<IActionResult> UpdateDivision(string id, Division division)
        {
            await _context.Divisions.ReplaceOneAsync(d => d.Id == id, division);
            return NoContent();
        }

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

        [HttpPost("departments")]
        public async Task<ActionResult<Department>> CreateDepartment(Department department)
        {
            await _context.Departments.InsertOneAsync(department);
            return Ok(department);
        }

        [HttpPut("departments/{id}")]
        public async Task<IActionResult> UpdateDepartment(string id, Department department)
        {
            await _context.Departments.ReplaceOneAsync(d => d.Id == id, department);
            return NoContent();
        }

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

        [HttpPost("roles")]
        public async Task<ActionResult<Role>> CreateRole(Role role)
        {
            await _context.Roles.InsertOneAsync(role);
            return Ok(role);
        }

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
    }
}
