using System;
using System.Collections.Generic;

namespace NotFacebook.Core.Entities
{
    /// <summary>
    /// Gönderi (Post) Entity Sınıfı
    /// Kullanıcıların paylaştığı içerikleri temsil eder
    /// </summary>
    public class Post
    {
        // Benzersiz gönderi ID'si (Primary Key)
        public int Id { get; set; }

        // Gönderiyi oluşturan kullanıcının ID'si (Foreign Key)
        public string UserId { get; set; } = default!;
        // Gönderi sahibi kullanıcı (Navigation Property)
        public User User { get; set; } = default!;

        // Gönderi içeriği (metin)
        public string Content { get; set; } = string.Empty;
        // Görsel içerik (Base64 formatında string - opsiyonel)
        public string? ImageBase64 { get; set; }

        // Gönderinin oluşturulma zamanı (UTC)
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        
        // ========================================
        // Post Düzenleme Özelliği
        // ========================================
        // Gönderinin son güncellenme zamanı (UTC - opsiyonel)
        // Null ise post hiç düzenlenmemiştir
        // Dolu ise UI'da "(edited)" etiketi gösterilir
        public DateTime? UpdatedAtUtc { get; set; }

        // ========================================
        // Post Silme Özelliği (Soft Delete)
        // ========================================
        // Post silindi mi?
        public bool IsDeleted { get; set; } = false;
        // Silinme zamanı
        public DateTime? DeletedAtUtc { get; set; }
        // Silinmeden önceki orijinal içerik (log için)
        public string? OriginalContentBeforeDelete { get; set; }

        // Bu gönderiye yapılan beğeniler (Navigation Property)
        public ICollection<PostLike> Likes { get; set; } = new List<PostLike>();
        // Bu gönderiye yapılan yorumlar (Navigation Property)
        public ICollection<PostComment> Comments { get; set; } = new List<PostComment>();
    }
}
