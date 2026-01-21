using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BeGreen.Api.Models
{
    [BsonIgnoreExtraElements]
    public class TaxiOrder
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("userId")]
        public string? UserId { get; set; }

        [BsonElement("userName")]
        public string? UserName { get; set; }

        [BsonElement("department")]
        public string? Department { get; set; }

        [BsonElement("division")]
        public string? Division { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("status")]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected

        [BsonElement("attachment")]
        public string? Attachment { get; set; } // Base64 Excel

        [BsonElement("passengers")]
        public List<Passenger> Passengers { get; set; } = new();

        [BsonElement("history")]
        public List<HistoryRecord> History { get; set; } = new();
    }

    public class Passenger
    {
        [BsonElement("fullName")]
        public string FullName { get; set; } = "";

        [BsonElement("department")]
        public string Department { get; set; } = "";

        [BsonElement("phoneNumber")]
        public string PhoneNumber { get; set; } = "";

        [BsonElement("pickUpFrom")]
        public string PickUpFrom { get; set; } = "";

        [BsonElement("destination")]
        public string Destination { get; set; } = "";

        [BsonElement("pickupTime")]
        public string PickupTime { get; set; } = "";

        [BsonElement("status")]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    }
}
