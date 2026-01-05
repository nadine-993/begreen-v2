using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace BeGreen.Api.Models
{
    [BsonIgnoreExtraElements]
    public class Division
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("name")]
        public string Name { get; set; } = null!;
    }
}
