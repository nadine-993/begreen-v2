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

        [BsonElement("sqlId")]
        public int SqlId { get; set; }

        [BsonElement("requestor")]
        public string Requestor { get; set; } = null!;

        [BsonElement("requestDate")]
        public DateTime RequestDate { get; set; } = DateTime.UtcNow;

        [BsonElement("dateFrom")]
        public DateTime? DateFrom { get; set; }

        [BsonElement("dateTo")]
        public DateTime? DateTo { get; set; }

        [BsonElement("notes")]
        public string Notes { get; set; } = null!;

        [BsonElement("hasAttachment")]
        public string HasAttachment { get; set; } = "NO";

        [BsonElement("history")]
        public List<HistoryRecord> History { get; set; } = new();
    }
}
