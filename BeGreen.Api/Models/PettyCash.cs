using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BeGreen.Api.Models
{
    [BsonIgnoreExtraElements]
    public class PettyCash
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

        [BsonElement("total")]
        public decimal Total { get; set; }

        [BsonElement("currency")]
        public string Currency { get; set; } = "SYP";

        [BsonElement("status")]
        public string Status { get; set; } = "PENDING";

        [BsonElement("currentApproverUserId")]
        public string? CurrentApproverUserId { get; set; }

        [BsonElement("currentApproverName")]
        public string? CurrentApproverName { get; set; }

        [BsonElement("approveOrder")]
        public int ApproveOrder { get; set; } = 1;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("details")]
        public List<PettyCashDetail> Details { get; set; } = new();

        [BsonElement("history")]
        public List<HistoryRecord> History { get; set; } = new();
    }

    public class PettyCashDetail
    {
        [BsonElement("itemId")]
        public int ItemId { get; set; }

        [BsonElement("glCode")]
        public string? GlCode { get; set; }

        [BsonElement("requestor")]
        public string? Requestor { get; set; }

        [BsonElement("currency")]
        public string Currency { get; set; } = "SYP";

        [BsonElement("amount")]
        public decimal? Amount { get; set; }

        [BsonElement("description")]
        public string? Description { get; set; }

        [BsonElement("date")]
        public DateTime Date { get; set; } = DateTime.UtcNow;
    }

    public class HistoryRecord
    {
        [BsonElement("userId")]
        public string? UserId { get; set; }

        [BsonElement("userName")]
        public string? UserName { get; set; }

        [BsonElement("action")]
        public string? Action { get; set; }

        [BsonElement("date")]
        public DateTime Date { get; set; } = DateTime.UtcNow;

        [BsonElement("note")]
        public string? Note { get; set; }
    }
}
