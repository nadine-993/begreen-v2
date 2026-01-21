using BeGreen.Api.Data;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using System.Threading.Tasks;

namespace BeGreen.Api.Middleware
{
    public class LicenseMiddleware
    {
        private readonly RequestDelegate _next;

        public LicenseMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, MongoDbContext dbContext)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";

            // Allow Auth, License Status, and License Activation (if IT) to bypass
            if (path.Contains("/api/auth") || 
                path.Contains("/api/license/status") || 
                (path.Contains("/api/license/activate")))
            {
                await _next(context);
                return;
            }

            // Check license
            var license = await dbContext.Licenses.Find(l => l.IsActive).SortByDescending(l => l.CreatedAt).FirstOrDefaultAsync();

            if (license == null || license.ExpiryDate <= DateTime.UtcNow)
            {
                // If license expired, still allow user to logout or check profile if needed?
                // For now, block everything else
                context.Response.StatusCode = 402; // Payment Required
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new { 
                    error = "License Expired", 
                    message = "The system license has expired. Please contact IT to renew.",
                    expired = true
                });
                return;
            }

            await _next(context);
        }
    }
}
