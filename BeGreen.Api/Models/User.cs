using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BeGreen.Api.Models
{
    [BsonIgnoreExtraElements]
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("sqlId")]
        public int SqlId { get; set; }

        [BsonElement("email")]
        public string Email { get; set; } = null!;

        [BsonElement("name")]
        public string Name { get; set; } = null!;

        [BsonElement("login")]
        public string Login { get; set; } = null!;

        [BsonElement("password")]
        public string? Password { get; set; }

        [BsonElement("role")]
        public string Role { get; set; } = "user";

        [BsonElement("division")]
        public string? Division { get; set; }

        [BsonElement("department")]
        public string? Department { get; set; }

        [BsonElement("occupation")]
        public string? Occupation { get; set; }

        [BsonElement("signature")]
        public string? Signature { get; set; }

        [BsonElement("status")]
        public int Status { get; set; }

        [BsonElement("image")]
        public string? Image { get; set; }

        [BsonElement("isDisabled")]
        public bool IsDisabled { get; set; } = false;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("resetToken")]
        public string? ResetToken { get; set; }

        [BsonElement("resetTokenExpiry")]
        public DateTime? ResetTokenExpiry { get; set; }
    }
}
