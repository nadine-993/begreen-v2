using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using MongoDB.Driver;
using MongoDB.Bson;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace BeGreen.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly MongoDbContext _context;

        public DashboardController(MongoDbContext context)
        {
            _context = context;
        }

        [HttpGet("ping")]
        [AllowAnonymous]
        public IActionResult Ping() => Ok("Dashboard API is alive");

        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetSummary()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("nameid")?.Value;
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
                var userDept = (User.FindFirst("department")?.Value ?? "").Trim();
                var userDiv = (User.FindFirst("division")?.Value ?? "").Trim();

                if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(userRole))
                {
                    return Unauthorized();
                }

                var modules = new[] 
                { 
                    "pettycashes", "cashadvances", "engineeringorders", 
                    "itorders", "glitches", "beos", "taxiorders", "expenses" 
                };

                var summary = new Dictionary<string, object>();

                foreach (var module in modules)
                {
                    summary[module] = await GetModuleStats(module, userId, userRole, userDept, userDiv);
                }

                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error generating dashboard summary: {ex.Message}");
            }
        }

        private async Task<object> GetModuleStats(string collectionName, string userId, string userRole, string userDept, string userDiv)
        {
            var collection = _context.GetCollection<BsonDocument>(collectionName);
            FilterDefinition<BsonDocument> baseFilter = Builders<BsonDocument>.Filter.Empty;

            // Visibility Rules (Matching ModulesController logic)
            bool isGlobalView = userRole == "Admin" || userRole == "General Cashier" || 
                               collectionName == "glitches" || collectionName == "beos" ||
                               (collectionName == "taxiorders" && string.Equals(userDept, "Security", StringComparison.OrdinalIgnoreCase)) ||
                               (collectionName == "engineeringorders" && string.Equals(userDept, "Engineering", StringComparison.OrdinalIgnoreCase)) ||
                               (collectionName == "itorders" && string.Equals(userDept, "Information Technology", StringComparison.OrdinalIgnoreCase));

            if (isGlobalView)
            {
                baseFilter = Builders<BsonDocument>.Filter.Empty;
            }
            else if (userRole == "Head of Division")
            {
                baseFilter = Builders<BsonDocument>.Filter.Or(
                    Builders<BsonDocument>.Filter.Eq("userId", userId),
                    Builders<BsonDocument>.Filter.Regex("division", new BsonRegularExpression($"^\\s*{Regex.Escape(userDiv)}\\s*$", "i"))
                );
            }
            else if (userRole == "Head of Department" || userRole == "Supervisor")
            {
                baseFilter = Builders<BsonDocument>.Filter.Or(
                    Builders<BsonDocument>.Filter.Eq("userId", userId),
                    Builders<BsonDocument>.Filter.Regex("department", new BsonRegularExpression($"^\\s*{Regex.Escape(userDept)}\\s*$", "i"))
                );
            }
            else
            {
                baseFilter = Builders<BsonDocument>.Filter.Eq("userId", userId);
            }

            if (collectionName == "beos")
            {
                var now = DateTime.UtcNow;
                var pastFilter = Builders<BsonDocument>.Filter.And(baseFilter, Builders<BsonDocument>.Filter.Lt("dateTo", now));
                var currentFilter = Builders<BsonDocument>.Filter.And(
                    baseFilter, 
                    Builders<BsonDocument>.Filter.Lte("dateFrom", now),
                    Builders<BsonDocument>.Filter.Gte("dateTo", now)
                );
                var futureFilter = Builders<BsonDocument>.Filter.And(baseFilter, Builders<BsonDocument>.Filter.Gt("dateFrom", now));

                var pastTask = collection.CountDocumentsAsync(pastFilter);
                var currentTask = collection.CountDocumentsAsync(currentFilter);
                var futureTask = collection.CountDocumentsAsync(futureFilter);
                var totalTask = collection.CountDocumentsAsync(baseFilter);

                await Task.WhenAll(pastTask, currentTask, futureTask, totalTask);

                return new {
                    total = (int)totalTask.Result,
                    breakdown = new Dictionary<string, int>
                    {
                        { "past", (int)pastTask.Result },
                        { "current", (int)currentTask.Result },
                        { "future", (int)futureTask.Result }
                    }
                };
            }

            var pendingTask = collection.CountDocumentsAsync(Builders<BsonDocument>.Filter.And(baseFilter, Builders<BsonDocument>.Filter.Regex("status", new BsonRegularExpression("pending", "i"))));
            var approvedTask = collection.CountDocumentsAsync(Builders<BsonDocument>.Filter.And(baseFilter, Builders<BsonDocument>.Filter.Or(
                Builders<BsonDocument>.Filter.Regex("status", new BsonRegularExpression("paid", "i")),
                Builders<BsonDocument>.Filter.Regex("status", new BsonRegularExpression("approved", "i"))
            )));
            var rejectedTask = collection.CountDocumentsAsync(Builders<BsonDocument>.Filter.And(baseFilter, Builders<BsonDocument>.Filter.Regex("status", new BsonRegularExpression("rejected", "i"))));
            var openTask = collection.CountDocumentsAsync(Builders<BsonDocument>.Filter.And(baseFilter, Builders<BsonDocument>.Filter.Or(
                Builders<BsonDocument>.Filter.Regex("status", new BsonRegularExpression("open", "i")),
                Builders<BsonDocument>.Filter.Regex("status", new BsonRegularExpression("active", "i")),
                Builders<BsonDocument>.Filter.Regex("status", new BsonRegularExpression("partially", "i"))
            )));
            var closedTask = collection.CountDocumentsAsync(Builders<BsonDocument>.Filter.And(baseFilter, Builders<BsonDocument>.Filter.Regex("status", new BsonRegularExpression("close", "i"))));
            var totalTaskStandard = collection.CountDocumentsAsync(baseFilter);

            await Task.WhenAll(pendingTask, approvedTask, rejectedTask, openTask, closedTask, totalTaskStandard);

            return new {
                total = (int)totalTaskStandard.Result,
                breakdown = new Dictionary<string, int>
                {
                    { "pending", (int)pendingTask.Result },
                    { "approved", (int)approvedTask.Result },
                    { "rejected", (int)rejectedTask.Result },
                    { "open", (int)openTask.Result },
                    { "closed", (int)closedTask.Result }
                }
            };
        }
    }
}
