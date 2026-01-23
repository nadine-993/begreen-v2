using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using BeGreen.Api.DTOs;
using BeGreen.Api.Models;
using BeGreen.Api.Services;
using MongoDB.Driver;

namespace BeGreen.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly MongoDbContext _context;
        private readonly ITokenService _tokenService;

        public AuthController(MongoDbContext context, ITokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
        }

        [HttpPost("login")]
        public async Task<ActionResult<UserDto>> Login(LoginDto loginDto)
        {
            try
            {
                // Search by Login ID (username) OR Email (backward compatibility)
                var user = await _context.Users.Find(u => 
                    u.Login.ToLower() == loginDto.Email.ToLower() || 
                    u.Email.ToLower() == loginDto.Email.ToLower()).FirstOrDefaultAsync();

                if (user == null) return Unauthorized("Invalid username or email");
                if (user.IsDisabled) return Unauthorized("This user is disabled, please contact your IT administrator");
                
                // Allow login if registration is complete OR if they are a legacy user (already have a password set)
                bool isLegacyUser = !string.IsNullOrEmpty(user.Password) && !user.IsRegistrationComplete;
                if (!user.IsRegistrationComplete && !isLegacyUser) return Unauthorized("Registration not complete. Please check your email for the invitation link.");
                
                if (string.IsNullOrEmpty(user.Password)) return Unauthorized("User has no password set");

                bool isPasswordValid = false;
                try
                {
                    isPasswordValid = BCrypt.Net.BCrypt.Verify(loginDto.Password, user.Password);
                }
                catch (Exception ex)
                {
                    return Unauthorized($"Invalid password format: {ex.Message}");
                }

                if (!isPasswordValid) return Unauthorized("Invalid password");

                return new UserDto
                {
                    Id = user.Id!,
                    Email = user.Email,
                    Name = user.Name,
                    Role = user.Role,
                    Department = user.Department,
                    Token = _tokenService.CreateToken(user)
                };
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [AllowAnonymous]
        [HttpGet("verify-reset-token")]
        public async Task<IActionResult> VerifyResetToken([FromQuery] string token)
        {
            var user = await _context.Users.Find(u => u.ResetToken == token && u.ResetTokenExpiry > DateTime.UtcNow).FirstOrDefaultAsync();
            if (user == null) return BadRequest("Invalid or expired reset token.");
            return Ok(new { name = user.Name });
        }

        [AllowAnonymous]
        [HttpPost("complete-reset")]
        public async Task<IActionResult> CompleteReset([FromBody] ResetPasswordDto resetDto)
        {
            var user = await _context.Users.Find(u => u.ResetToken == resetDto.Token && u.ResetTokenExpiry > DateTime.UtcNow).FirstOrDefaultAsync();
            if (user == null) return BadRequest("Invalid or expired reset token.");

            user.Password = BCrypt.Net.BCrypt.HashPassword(resetDto.NewPassword);
            user.ResetToken = null;
            user.ResetTokenExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.Users.ReplaceOneAsync(u => u.Id == user.Id, user);
            return Ok(new { message = "Password has been reset successfully." });
        }

        [AllowAnonymous]
        [HttpPost("complete-registration")]
        public async Task<IActionResult> CompleteRegistration([FromBody] CompleteRegistrationDto registrationDto)
        {
            var user = await _context.Users.Find(u => u.ResetToken == registrationDto.Token && u.ResetTokenExpiry > DateTime.UtcNow).FirstOrDefaultAsync();
            if (user == null) return BadRequest("Invalid or expired registration token.");

            // Verify that the provided Login ID matches the record (requirement: user must use this LogID)
            if (user.Login.ToLower() != registrationDto.Login.ToLower())
            {
                return BadRequest("The Login ID provided does not match our records. Please use the Login ID sent to your email.");
            }

            user.Password = BCrypt.Net.BCrypt.HashPassword(registrationDto.Password);
            user.IsRegistrationComplete = true;
            user.ResetToken = null;
            user.ResetTokenExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.Users.ReplaceOneAsync(u => u.Id == user.Id, user);
            return Ok(new { message = "Registration completed successfully. You can now log in." });
        }
    }

    public class CompleteRegistrationDto
    {
        public string Token { get; set; } = null!;
        public string Login { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    public class ResetPasswordDto
    {
        public string Token { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
    }
}
