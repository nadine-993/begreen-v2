using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using BeGreen.Api.Models;
using MongoDB.Driver;
using System.Security.Cryptography;
using System.Text;

namespace BeGreen.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LicenseController : ControllerBase
    {
        private readonly MongoDbContext _context;
        private readonly IConfiguration _config;
        private readonly string _secretKey;

        public LicenseController(MongoDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
            _secretKey = _config["LicenseSettings:SecretKey"] ?? "STAY-GREEN-DEFAULT-SECRET";
        }

        [HttpGet("status")]
        [AllowAnonymous]
        public async Task<ActionResult<object>> GetStatus()
        {
            var license = await _context.Licenses.Find(l => l.IsActive).SortByDescending(l => l.CreatedAt).FirstOrDefaultAsync();
            
            if (license == null)
            {
                return Ok(new { isLicensed = false, message = "No active license found." });
            }

            var daysLeft = (license.ExpiryDate - DateTime.UtcNow).TotalDays;
            
            return Ok(new 
            { 
                isLicensed = daysLeft > 0,
                expiryDate = license.ExpiryDate,
                issuedTo = license.IssuedTo,
                daysRemaining = Math.Max(0, (int)daysLeft),
                isNearExpiry = daysLeft > 0 && daysLeft <= 30
            });
        }

        [Authorize(Policy = "ITOnly")]
        [HttpPost("activate")]
        public async Task<ActionResult> Activate([FromBody] string licenseKey)
        {
            if (string.IsNullOrEmpty(licenseKey)) return BadRequest("License key is required.");

            // Basic validation logic: Key format "NAME-YYYYMMDD-HEX"
            // Example: BEGREEN-20270101-ABCD
            var parts = licenseKey.Split('-');
            if (parts.Length != 3) return BadRequest("Invalid license key format.");

            if (!DateTime.TryParseExact(parts[1], "yyyyMMdd", null, System.Globalization.DateTimeStyles.None, out var expiryDate))
            {
                return BadRequest("Invalid expiry date in key.");
            }

            if (expiryDate <= DateTime.UtcNow)
            {
                return BadRequest("This license key has already expired.");
            }

            // Cryptographic Verification
            var payload = $"{parts[0]}-{parts[1]}";
            var expectedSignature = GenerateSignature(payload, _secretKey);

            if (parts[2] != expectedSignature)
            {
                return BadRequest("Invalid license signature. The key may have been tampered with.");
            }

            // Deactivate old licenses
            await _context.Licenses.UpdateManyAsync(l => l.IsActive, Builders<SystemLicense>.Update.Set(l => l.IsActive, false));

            var newLicense = new SystemLicense
            {
                LicenseKey = licenseKey,
                ExpiryDate = expiryDate,
                IssuedTo = parts[0],
                IsActive = true,
                ActivatedAt = DateTime.UtcNow
            };

            await _context.Licenses.InsertOneAsync(newLicense);

            return Ok(new { message = "License activated successfully.", expiryDate = newLicense.ExpiryDate });
        }

        private string GenerateSignature(string payload, string key)
        {
            using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key)))
            {
                var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
                return BitConverter.ToString(hash).Replace("-", "").ToUpper().Substring(0, 16); // Shortened for readability
            }
        }
    }
}
