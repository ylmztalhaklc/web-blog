using System;

namespace NotFacebook.Core.Entities
{
    /// <summary>
    /// Takip Entity Sınıfı
    /// Bir kullanıcının başka bir kullanıcıyı takip etmesini temsil eder
    /// </summary>
    public class Follow
    {
        // Benzersiz takip ID'si (Primary Key)
        public int Id { get; set; }

        // Takip eden kullanıcının ID'si (Foreign Key)
        public string FollowerId { get; set; } = default!;
        // Takip eden kullanıcı (Navigation Property)
        public User Follower { get; set; } = default!;

        // Takip edilen kullanıcının ID'si (Foreign Key)
        public string FollowedId { get; set; } = default!;
        // Takip edilen kullanıcı (Navigation Property)
        public User Followed { get; set; } = default!;

        // Takip ilişkisinin başladığı zaman (UTC)
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
