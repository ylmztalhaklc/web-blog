using System;

namespace NotFacebook.Core.Entities
{
    /// <summary>
    /// Gönderi Beğeni Entity Sınıfı
    /// Bir kullanıcının bir gönderiyi beğenmesini temsil eder
    /// </summary>
    public class PostLike
    {
        // Benzersiz beğeni ID'si (Primary Key)
        public int Id { get; set; }

        // Beğenilen gönderinin ID'si (Foreign Key)
        public int PostId { get; set; }
        // Beğenilen gönderi (Navigation Property)
        public Post Post { get; set; } = default!;

        // Beğenen kullanıcının ID'si (Foreign Key)
        public string UserId { get; set; } = default!;
        // Beğenen kullanıcı (Navigation Property)
        public User User { get; set; } = default!;

        // Beğeninin yapıldığı zaman (UTC)
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
