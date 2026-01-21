using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BeGreen.Api.Models
{
    [BsonIgnoreExtraElements]
    public class Glitch
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

        [BsonElement("guestName")]
        public string? GuestName { get; set; }

        [BsonElement("roomNumber")]
        public string? RoomNumber { get; set; }

        [BsonElement("description")]
        public string? Description { get; set; }

        [BsonElement("notes")]
        public string? Notes { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "Open";

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("history")]
        public List<HistoryRecord> History { get; set; } = new();
    }
}
