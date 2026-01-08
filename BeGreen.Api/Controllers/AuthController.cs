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
    }
}
