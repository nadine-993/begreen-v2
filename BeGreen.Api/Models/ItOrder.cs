using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BeGreen.Api.Models
{
    [BsonIgnoreExtraElements]
    public class ItOrder
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("sqlId")]
        public int SqlId { get; set; }

        [BsonElement("requestor")]
        public string Requestor { get; set; } = null!;

        [BsonElement("department")]
        public string Department { get; set; } = null!;

        [BsonElement("type")]
        public string Type { get; set; } = null!;

        [BsonElement("systemName")]
        public string SystemName { get; set; } = null!;

        [BsonElement("description")]
        public string Description { get; set; } = null!;

        [BsonElement("requestDate")]
        public DateTime RequestDate { get; set; } = DateTime.UtcNow;

        [BsonElement("status")]
        public string Status { get; set; } = "Open";

        [BsonElement("history")]
        public List<HistoryRecord> History { get; set; } = new();
    }
}
