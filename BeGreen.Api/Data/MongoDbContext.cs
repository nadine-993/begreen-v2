using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoDB.Bson;
using BeGreen.Api.Models;

namespace BeGreen.Api.Data
{
    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } = null!;
        public string DatabaseName { get; set; } = null!;
    }

    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            _database = client.GetDatabase(settings.Value.DatabaseName);
        }

        public IMongoCollection<User> Users => _database.GetCollection<User>("users");
        public IMongoCollection<GlCode> GlCodes => _database.GetCollection<GlCode>("glcodes");
        public IMongoCollection<PettyCash> PettyCashRequests => _database.GetCollection<PettyCash>("pettycashes");
        public IMongoCollection<CashAdvance> CashAdvances => _database.GetCollection<CashAdvance>("cashadvances");
        public IMongoCollection<EngineeringOrder> EngineeringOrders => _database.GetCollection<EngineeringOrder>("engineeringorders");
        public IMongoCollection<ItOrder> ItOrders => _database.GetCollection<ItOrder>("itorders");
        public IMongoCollection<Glitch> Glitches => _database.GetCollection<Glitch>("glitches");
        public IMongoCollection<Beo> Beos => _database.GetCollection<Beo>("beos");
        public IMongoCollection<TaxiOrder> TaxiOrders => _database.GetCollection<TaxiOrder>("taxiorders");
        public IMongoCollection<UpgradeRequest> UpgradeRequests => _database.GetCollection<UpgradeRequest>("upgraderequests");
        public IMongoCollection<Expense> Expenses => _database.GetCollection<Expense>("expenses");
        public IMongoCollection<Department> Departments => _database.GetCollection<Department>("departments");
        public IMongoCollection<Division> Divisions => _database.GetCollection<Division>("divisions");
        public IMongoCollection<Role> Roles => _database.GetCollection<Role>("roles");
        public IMongoCollection<SystemLicense> Licenses => _database.GetCollection<SystemLicense>("licenses");
        public IMongoCollection<BsonDocument> OutgoingRecords => _database.GetCollection<BsonDocument>("outgoingrecords");
        
        // Helper to get any collection by name
        public IMongoCollection<T> GetCollection<T>(string name) => _database.GetCollection<T>(name);
    }
}
