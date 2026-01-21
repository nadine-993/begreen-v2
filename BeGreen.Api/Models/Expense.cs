using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BeGreen.Api.Models
{
    [BsonIgnoreExtraElements]
    public class Expense
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

        [BsonElement("description")]
        public string? Description { get; set; }

        [BsonElement("amount")]
        public decimal Amount { get; set; }

        [BsonElement("currency")]
        public string Currency { get; set; } = "SYP";

        [BsonElement("status")]
        public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, PAID, REJECTED

        [BsonElement("currentApproverUserId")]
        public string? CurrentApproverUserId { get; set; }

        [BsonElement("currentApproverName")]
        public string? CurrentApproverName { get; set; }

        [BsonElement("approveOrder")]
        public int ApproveOrder { get; set; } = 1;

        [BsonElement("attachment")]
        public string? Attachment { get; set; } // Base64 string

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("history")]
        public List<HistoryRecord> History { get; set; } = new();
    }
}
