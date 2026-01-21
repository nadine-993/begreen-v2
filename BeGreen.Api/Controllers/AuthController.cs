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
                var user = await _context.Users.Find(u => u.Email.ToLower() == loginDto.Email.ToLower()).FirstOrDefaultAsync();

                if (user == null) return Unauthorized("Invalid email");
                if (user.IsDisabled) return Unauthorized("This user is disabled, please contact your IT administrator");
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
    }

    public class ResetPasswordDto
    {
        public string Token { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
    }
}
