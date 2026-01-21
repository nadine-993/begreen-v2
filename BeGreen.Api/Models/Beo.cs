using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BeGreen.Api.Models
{
    [BsonIgnoreExtraElements]
    public class Beo
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("userId")]
        public string? UserId { get; set; }

        [BsonElement("userName")]
        public string? UserName { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("dateFrom")]
        public DateTime? DateFrom { get; set; }

        [BsonElement("dateTo")]
        public DateTime? DateTo { get; set; }

        [BsonElement("notes")]
        public string? Notes { get; set; }

        [BsonElement("attachment")]
        public string? Attachment { get; set; } // Base64 or URL

        [BsonElement("status")]
        public string Status { get; set; } = "Active";

        [BsonElement("history")]
        public List<HistoryRecord> History { get; set; } = new();
    }
}
