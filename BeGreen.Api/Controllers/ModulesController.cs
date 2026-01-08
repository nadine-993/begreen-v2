using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BeGreen.Api.Data;
using MongoDB.Driver;
using MongoDB.Bson;

namespace BeGreen.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ModulesController : ControllerBase
    {
        private readonly MongoDbContext _context;

        public ModulesController(MongoDbContext context)
        {
            _context = context;
        }

        [HttpGet("stats")]
        public async Task<ActionResult<object>> GetStats()
        {
            var stats = new Dictionary<string, long>
            {
                { "pettycashes", await _context.PettyCashRequests.CountDocumentsAsync(_ => true) },
                { "cashadvances", await _context.CashAdvances.CountDocumentsAsync(_ => true) },
                { "engineering", await _context.EngineeringOrders.CountDocumentsAsync(_ => true) },
                { "itorders", await _context.ItOrders.CountDocumentsAsync(_ => true) },
                { "glitches", await _context.Glitches.CountDocumentsAsync(_ => true) },
                { "beos", await _context.Beos.CountDocumentsAsync(_ => true) },
                { "taxiorders", await _context.TaxiOrders.CountDocumentsAsync(_ => true) },
                { "expenses", await _context.Expenses.CountDocumentsAsync(_ => true) }
            };
            return Ok(stats);
        }

        [HttpGet("{collectionName}")]
        public async Task<ActionResult<IEnumerable<object>>> GetModuleData(string collectionName)
        {
            try
            {
                // Normalize collection name
                string mongoCollectionName = NormalizeCollectionName(collectionName);
                Console.WriteLine($"[ModulesController] Fetching data for: {mongoCollectionName}");
                
                var collection = _context.GetCollection<BsonDocument>(mongoCollectionName);
                
                // --- Role-based Filtering ---
                FilterDefinition<BsonDocument> filter = Builders<BsonDocument>.Filter.Empty;

                if (mongoCollectionName == "pettycashes")
                {
                    var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                    var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                    var userDept = User.FindFirst("department")?.Value;
                    var userDiv = User.FindFirst("division")?.Value;

                    if (userRole == "Admin" || userRole == "General Cashier")
                    {
                        filter = Builders<BsonDocument>.Filter.Empty;
                    }
                    else if (userRole == "Head of Division")
                    {
                        filter = Builders<BsonDocument>.Filter.Eq("division", userDiv);
                    }
                    else if (userRole == "Head of Department" || userRole == "Supervisor")
                    {
                        filter = Builders<BsonDocument>.Filter.And(
                            Builders<BsonDocument>.Filter.Eq("department", userDept),
                            Builders<BsonDocument>.Filter.Eq("division", userDiv)
                        );
                    }
                    else // standard user
                    {
                        filter = Builders<BsonDocument>.Filter.Eq("userId", userId);
                    }
                }

                // Try to sort by createdAt (new model) or requestDate (old model)
                var sort = Builders<BsonDocument>.Sort.Descending("createdAt");
                if (mongoCollectionName != "pettycashes") {
                    sort = Builders<BsonDocument>.Sort.Descending("requestDate");
                }
                
                var documents = await collection.Find(filter)
                    .Sort(sort)
                    .Limit(100)
                    .ToListAsync();

                Console.WriteLine($"[ModulesController] Found {documents.Count} documents in {mongoCollectionName}");

                // Convert BsonDocument to a friendly dictionary for JSON serialization
                var results = documents.Select(doc => {
                    var dict = new Dictionary<string, object>();
                    foreach (var element in doc)
                    {
                        dict[element.Name] = BsonTypeMapper.MapToDotNetValue(element.Value);
                    }
                    
                    if (doc.Contains("_id"))
                    {
                        dict["id"] = doc["_id"].ToString();
                    }
                    
                    return dict;
                });

                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error fetching data for {collectionName}: {ex.Message}");
            }
        }

        private string NormalizeCollectionName(string name)
        {
            string clean = name.ToLower().Replace("-", "").Replace("_", "");
            
            // If it already ends with 's', and it's not 'glitches', it might already be pluralized
            string normalized = clean switch
            {
                "pettycash" or "pettycashes" => "pettycashes",
                "cashadvance" or "cashadvances" => "cashadvances",
                "itorder" or "itorders" => "itorders",
                "engineering" or "engineeringorder" or "engineeringorders" => "engineeringorders",
                "glitch" or "glitches" => "glitches",
                "beo" or "beos" => "beos",
                "taxiorder" or "taxiorders" => "taxiorders",
                "expense" or "expenses" => "expenses",
                _ => clean
            };

            Console.WriteLine($"[ModulesController] Normalized '{name}' to '{normalized}'");
            return normalized;
        }
    }
}
