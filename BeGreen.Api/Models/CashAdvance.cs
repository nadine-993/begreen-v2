using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BeGreen.Api.Models
{
    [BsonIgnoreExtraElements]
    public class CashAdvance
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("sqlId")]
        public int SqlId { get; set; }

        [BsonElement("reqAccount")]
        public string ReqAccount { get; set; } = null!;

        [BsonElement("requestor")]
        public string Requestor { get; set; } = null!;

        [BsonElement("department")]
        public string Department { get; set; } = null!;

        [BsonElement("description")]
        public string Description { get; set; } = null!;

        [BsonElement("amount")]
        public decimal Amount { get; set; }

        [BsonElement("currency")]
        public string Currency { get; set; } = "SYP";

        [BsonElement("requestDate")]
        public DateTime RequestDate { get; set; } = DateTime.UtcNow;

        [BsonElement("approver")]
        public string? Approver { get; set; }

        [BsonElement("approveOrder")]
        public int ApproveOrder { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "Requested";

        [BsonElement("notes")]
        public List<CashAdvanceNote> Notes { get; set; } = new();

        [BsonElement("history")]
        public List<HistoryRecord> History { get; set; } = new();
    }

    public class CashAdvanceNote
    {
        [BsonElement("note")]
        public string Note { get; set; } = null!;

        [BsonElement("user")]
        public string User { get; set; } = null!;

        [BsonElement("date")]
        public DateTime Date { get; set; } = DateTime.UtcNow;
    }
}
