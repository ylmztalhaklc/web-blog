using System;

namespace NotFacebook.Core.Entities
{
    /// <summary>
    /// Gönderi Yorum Entity Sınıfı
    /// Bir kullanıcının bir gönderiye yaptığı yorumu temsil eder
    /// </summary>
    public class PostComment
    {
        // Benzersiz yorum ID'si (Primary Key)
        public int Id { get; set; }

        // Yorumun yapıldığı gönderinin ID'si (Foreign Key)
        public int PostId { get; set; }
        // Yorumun yapıldığı gönderi (Navigation Property)
        public Post Post { get; set; } = default!;

        // Yorumu yapan kullanıcının ID'si (Foreign Key)
        public string UserId { get; set; } = default!;
        // Yorumu yapan kullanıcı (Navigation Property)
        public User User { get; set; } = default!;

        // Yorum metni
        public string Text { get; set; } = string.Empty;

        // Yorum resmi (Base64 Data URI formatında)
        public string? ImageBase64 { get; set; }

        // Yorumun yapıldığı zaman (UTC)
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        // Yorum düzenlendi mi?
        public bool IsEdited { get; set; } = false;
        // Son düzenlenme zamanı
        public DateTime? EditedAtUtc { get; set; }
    }
}
