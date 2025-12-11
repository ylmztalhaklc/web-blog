using System;

namespace NotFacebook.Core.Entities
{
    /// <summary>
    /// Mesaj Entity Sınıfı
    /// Kullanıcılar arası mesajları temsil eder
    /// </summary>
    public class Message
    {
        // Benzersiz mesaj ID'si (Primary Key)
        public int Id { get; set; }

        // Mesajı gönderen kullanıcının ID'si (Foreign Key)
        public string SenderId { get; set; } = default!;
        // Mesajı gönderen kullanıcı (Navigation Property)
        public User Sender { get; set; } = default!;

        // Mesajı alan kullanıcının ID'si (Foreign Key)
        public string ReceiverId { get; set; } = default!;
        // Mesajı alan kullanıcı (Navigation Property)
        public User Receiver { get; set; } = default!;

        // Mesaj içeriği (metin)
        public string Content { get; set; } = string.Empty;

        // Resim içeriği (Base64 formatında string - opsiyonel)
        public string? ImageBase64 { get; set; }

        // Mesajın gönderilme zamanı (UTC)
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        // Mesaj okundu mu?
        public bool IsRead { get; set; } = false;
        
        // Mesajın okunma zamanı (UTC - opsiyonel)
        public DateTime? ReadAtUtc { get; set; }

        // ========================================
        // Mesaj Düzenleme Alanları
        // ========================================
        // Mesaj düzenlendi mi? (WhatsApp benzeri düzenleme özelliği)
        public bool IsEdited { get; set; } = false;
        
        // Mesajın son düzenlenme zamanı (UTC - opsiyonel)
        // Kullanıcıya "(düzenlendi)" etiketi göstermek için kullanılır
        public DateTime? EditedAtUtc { get; set; }

        // ========================================
        // Mesaj Silme Alanları (Soft Delete)
        // ========================================
        // Mesaj silindi mi? (Veritabanından fiziksel olarak silinmez, sadece işaretlenir)
        public bool IsDeleted { get; set; } = false;
        
        // Mesajın silinme zamanı (UTC - opsiyonel)
        // Audit trail (denetim izi) için saklanır
        public DateTime? DeletedAtUtc { get; set; }

        // Silinmeden önceki orijinal içerik (log/denetim için)
        // Mesaj silindikten sonra "Bu mesaj silindi" gösterilir ama orijinal içerik loglanır
        public string? OriginalContentBeforeDelete { get; set; }
    }
}
