using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using BeGreen.Api.Models;
using MongoDB.Driver;

namespace BeGreen.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class GlCodesController : ControllerBase
    {
        private readonly MongoDbContext _context;

        public GlCodesController(MongoDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<GlCode>>> GetGlCodes()
        {
            var codes = await _context.GlCodes.Find(_ => true)
                .SortBy(c => c.Code)
                .ToListAsync();
            return Ok(codes);
        }

        [AllowAnonymous]
        [HttpPost("seed")]
        public async Task<IActionResult> SeedGlCodes([FromBody] List<GlCode> codes)
        {
            if (codes == null || codes.Count == 0) return BadRequest("No codes provided");
            
            await _context.GlCodes.DeleteManyAsync(_ => true);
            await _context.GlCodes.InsertManyAsync(codes);
            
            return Ok(new { message = $"Successfully seeded {codes.Count} GL codes" });
        }

        [AllowAnonymous]
        [HttpPost("append")]
        public async Task<IActionResult> AppendGlCodes([FromBody] List<GlCode> codes)
        {
            if (codes == null || codes.Count == 0) return BadRequest("No codes provided");
            await _context.GlCodes.InsertManyAsync(codes);
            return Ok(new { message = $"Successfully appended {codes.Count} GL codes" });
        }
    }
}
