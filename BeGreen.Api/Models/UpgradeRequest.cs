using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BeGreen.Api.Models
{
    [BsonIgnoreExtraElements]
    public class UpgradeRequest
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

        [BsonElement("guestName")]
        public string GuestName { get; set; } = null!;

        [BsonElement("roomNumber")]
        public string RoomNumber { get; set; } = null!;

        [BsonElement("description")]
        public string Description { get; set; } = null!;

        [BsonElement("currentRoomType")]
        public string CurrentRoomType { get; set; } = null!;

        [BsonElement("upgradedRoomType")]
        public string UpgradedRoomType { get; set; } = null!;

        [BsonElement("rate")]
        public decimal Rate { get; set; }

        [BsonElement("requestDate")]
        public DateTime RequestDate { get; set; } = DateTime.UtcNow;

        [BsonElement("status")]
        public string Status { get; set; } = "Requested";

        [BsonElement("approver")]
        public string? Approver { get; set; }

        [BsonElement("approveOrder")]
        public int ApproveOrder { get; set; }

        [BsonElement("history")]
        public List<HistoryRecord> History { get; set; } = new();
    }
}
