using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotFacebook.Core.Entities;
using NotFacebook.Infrastructure.Data;
using System.Security.Claims;

namespace NotFacebook.Api.Controllers
{
    /// <summary>
    /// Mesajlaşma controller'ı
    /// Kullanıcılar arası mesajlaşma işlemlerini yönetir
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MessagesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly UserManager<User> _userManager;

        public MessagesController(AppDbContext db, UserManager<User> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        private string? GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }

        /// <summary>
        /// Resim dosyasını base64'e çevirir
        /// </summary>
        private async Task<string?> SaveImageAsBase64(IFormFile? file)
        {
            if (file == null || file.Length == 0) return null;

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            
            if (!allowedExtensions.Contains(extension))
                throw new InvalidOperationException("Invalid image format.");

            if (file.Length > 5 * 1024 * 1024)
                throw new InvalidOperationException("Image size cannot exceed 5MB");

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            var imageBytes = memoryStream.ToArray();
            var base64String = Convert.ToBase64String(imageBytes);
            
            var mimeType = file.ContentType;
            return $"data:{mimeType};base64,{base64String}";
        }

        // ========================================
        // DTO Sınıfları
        // ========================================
        public class SendMessageDto
        {
            public string ReceiverId { get; set; } = string.Empty;
            public string? Content { get; set; } // Opsiyonel, resim varsa boş olabilir
            public IFormFile? ImageFile { get; set; }
        }

        public class EditMessageDto
        {
            public string? Content { get; set; } // Opsiyonel
            public string? ImageBase64 { get; set; } // Opsiyonel (Base64)
            public IFormFile? ImageFile { get; set; } // Opsiyonel (dosya)
        }

        // ========================================
        // Okunmamış Mesaj Sayıları
        // ========================================
        /// <summary>
        /// Tüm kullanıcılar için okunmamış mesaj sayılarını döndürür
        /// GET api/messages/unread-counts
        /// </summary>
        [HttpGet("unread-counts")]
        public async Task<IActionResult> GetUnreadCounts()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Kullanıcının aldığı okunmamış mesajları al ve gönderene göre grupla
            var unreadCounts = await _db.Messages
                .Where(m => m.ReceiverId == userId && !m.IsRead)
                .GroupBy(m => m.SenderId)
                .Select(g => new
                {
                    userId = g.Key,
                    count = g.Count()
                })
                .ToListAsync();

            // Dictionary olarak döndür: { "userId1": 5, "userId2": 3 }
            var result = unreadCounts.ToDictionary(x => x.userId, x => x.count);

            return Ok(result);
        }

        /// <summary>
        /// Belirli bir kullanıcıdan gelen mesajları okundu olarak işaretle
        /// POST api/messages/mark-read/{otherUserId}
        /// </summary>
        [HttpPost("mark-read/{otherUserId}")]
        public async Task<IActionResult> MarkAsRead(string otherUserId)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Diğer kullanıcıdan gelen okunmamış mesajları bul ve okundu işaretle
            var unreadMessages = await _db.Messages
                .Where(m => m.SenderId == otherUserId && m.ReceiverId == userId && !m.IsRead)
                .ToListAsync();

            foreach (var msg in unreadMessages)
            {
                msg.IsRead = true;
                msg.ReadAtUtc = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            return Ok(new { markedCount = unreadMessages.Count });
        }

        // ========================================
        // Mesaj Gönder
        // ========================================
        /// <summary>
        /// Yeni bir mesaj gönderir
        /// POST api/messages
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SendMessage([FromForm] SendMessageDto dto)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.ReceiverId))
                return BadRequest("Receiver ID is required.");

            // Kendine mesaj gönderilemez
            if (dto.ReceiverId == userId)
                return BadRequest("You cannot send a message to yourself.");

            // Alıcı kullanıcı var mı kontrol et
            var receiver = await _userManager.FindByIdAsync(dto.ReceiverId);
            if (receiver == null)
                return NotFound("Receiver not found.");

            try
            {
                // Resim varsa işle
                string? imageData = null;
                if (dto.ImageFile != null)
                {
                    try
                    {
                        imageData = await SaveImageAsBase64(dto.ImageFile);
                    }
                    catch (Exception imgEx)
                    {
                        return BadRequest($"Image upload failed: {imgEx.Message}");
                    }
                }

                // İçerik ve resim tamamen boş olamaz
                if (string.IsNullOrWhiteSpace(dto.Content) && string.IsNullOrWhiteSpace(imageData))
                {
                    return BadRequest("Message cannot be empty.");
                }

                var message = new Message
                {
                    SenderId = userId,
                    ReceiverId = dto.ReceiverId,
                    Content = dto.Content?.Trim() ?? string.Empty,
                    ImageBase64 = imageData,
                    CreatedAtUtc = DateTime.UtcNow,
                    IsRead = false
                };

                _db.Messages.Add(message);
                await _db.SaveChangesAsync();

                // Mesajı ilişkili verilerle birlikte yeniden yükle
                message = await _db.Messages
                    .Include(m => m.Sender)
                    .Include(m => m.Receiver)
                    .FirstOrDefaultAsync(m => m.Id == message.Id) ?? message;

                return Ok(MapMessageDto(message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Server error: {ex.Message}");
            }
        }

        // ========================================
        // Konuşmaları Listele
        // ========================================
        /// <summary>
        /// Kullanıcının tüm konuşmalarını listeler
        /// GET api/messages/conversations
        /// </summary>
        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Kullanıcının gönderdiği veya aldığı tüm mesajları al
            var messages = await _db.Messages
                .Include(m => m.Sender)
                .Include(m => m.Receiver)
                .Where(m => m.SenderId == userId || m.ReceiverId == userId)
                .OrderByDescending(m => m.CreatedAtUtc)
                .ToListAsync();

            // Her konuşma için diğer kullanıcıyı ve son mesajı belirle
            var conversations = messages
                .GroupBy(m => m.SenderId == userId ? m.ReceiverId : m.SenderId)
                .Select(g =>
                {
                    var lastMessage = g.First();
                    var otherUserId = g.Key;
                    var otherUser = lastMessage.SenderId == otherUserId ? lastMessage.Sender : lastMessage.Receiver;
                    
                    // Okunmamış mesaj sayısı (sadece alınan mesajlar)
                    var unreadCount = g.Count(m => m.ReceiverId == userId && !m.IsRead);

                    return new
                    {
                        userId = otherUserId,
                        userName = $"{otherUser.FirstName} {otherUser.LastName}",
                        gender = otherUser.Gender,
                        lastMessage = new
                        {
                            content = lastMessage.Content,
                            createdAt = lastMessage.CreatedAtUtc,
                            isFromMe = lastMessage.SenderId == userId
                        },
                        unreadCount
                    };
                })
                .ToList();

            return Ok(conversations);
        }

        // ========================================
        // Belirli Bir Kullanıcı İle Mesajları Getir
        // ========================================
        /// <summary>
        /// Belirli bir kullanıcı ile olan tüm mesajları getirir
        /// GET api/messages/with/{userId}
        /// </summary>
        [HttpGet("with/{otherUserId}")]
        public async Task<IActionResult> GetMessagesWithUser(string otherUserId)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Mesajları çek (iki yönlü)
            var messages = await _db.Messages
                .Include(m => m.Sender)
                .Include(m => m.Receiver)
                .Where(m =>
                    (m.SenderId == userId && m.ReceiverId == otherUserId) ||
                    (m.SenderId == otherUserId && m.ReceiverId == userId))
                .OrderBy(m => m.CreatedAtUtc)
                .ToListAsync();

            // Okunmamış mesajları okundu olarak işaretle
            var unreadMessages = messages
                .Where(m => m.ReceiverId == userId && !m.IsRead)
                .ToList();

            foreach (var msg in unreadMessages)
            {
                msg.IsRead = true;
                msg.ReadAtUtc = DateTime.UtcNow;
            }

            if (unreadMessages.Any())
            {
                await _db.SaveChangesAsync();
            }

            var result = messages.Select(m => MapMessageDto(m)).ToList();
            return Ok(result);
        }

        // ========================================
        // Mesaj Düzenle
        // ========================================
        /// <summary>
        /// Gönderilen bir mesajı düzenler (sadece gönderen)
        /// WhatsApp benzeri düzenleme özelliği - mesaj içeriği değiştirilebilir
        /// PUT api/messages/{id}
        /// </summary>
        [HttpPut("{id:int}")]
        public async Task<IActionResult> EditMessage(int id, [FromForm] EditMessageDto dto)
        {
            // Mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Mesajı veritabanından çek (ilişkili kullanıcı bilgileriyle birlikte)
            var message = await _db.Messages
                .Include(m => m.Sender)
                .Include(m => m.Receiver)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (message == null) return NotFound("Message not found.");

            // Yetki kontrolü - sadece mesajı gönderen düzenleyebilir
            // Alıcı kendi aldığı mesajları düzenleyemez
            if (message.SenderId != userId)
                return Forbid("You can only edit your own messages.");

            // Güvenlik kontrolü - silinmiş mesaj düzenlenemez
            if (message.IsDeleted)
                return BadRequest("Deleted messages cannot be edited.");

            // Resim işleme
            string? imageData = message.ImageBase64; // Mevcut resmi koru
            if (dto.ImageFile != null)
            {
                try
                {
                    using var memoryStream = new MemoryStream();
                    await dto.ImageFile.CopyToAsync(memoryStream);
                    var imageBytes = memoryStream.ToArray();
                    var base64String = Convert.ToBase64String(imageBytes);
                    var mimeType = dto.ImageFile.ContentType;
                    imageData = $"data:{mimeType};base64,{base64String}";
                }
                catch (Exception imgEx)
                {
                    return BadRequest($"Image upload failed: {imgEx.Message}");
                }
            }
            else if (!string.IsNullOrWhiteSpace(dto.ImageBase64))
            {
                imageData = dto.ImageBase64;
            }

            // İçerik veya resim olmalı
            if (string.IsNullOrWhiteSpace(dto.Content) && string.IsNullOrWhiteSpace(imageData))
                return BadRequest("Message cannot be empty.");

            // Mesajı güncelle
            message.Content = dto.Content?.Trim() ?? string.Empty;
            message.ImageBase64 = imageData;
            message.IsEdited = true;
            message.EditedAtUtc = DateTime.UtcNow;

            // Değişiklikleri veritabanına kaydet
            await _db.SaveChangesAsync();

            // Güncellenmiş mesajı DTO formatında döndür
            return Ok(MapMessageDto(message));
        }

        // ========================================
        // Mesaj Sil
        // ========================================
        /// <summary>
        /// Bir mesajı siler (sadece gönderen) - Soft Delete yöntemi
        /// WhatsApp benzeri silme: Mesaj "Bu mesaj silindi" olarak görünür ama tamamen silinmez
        /// Orijinal içerik audit trail için saklanır
        /// DELETE api/messages/{id}
        /// </summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteMessage(int id)
        {
            // Mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Mesajı veritabanından çek (ilişkili kullanıcı bilgileriyle birlikte)
            var message = await _db.Messages
                .Include(m => m.Sender)
                .Include(m => m.Receiver)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (message == null) return NotFound("Message not found.");

            // Yetki kontrolü - sadece mesajı gönderen silebilir
            // Alıcı kendi aldığı mesajları silemez (WhatsApp benzeri davranış)
            if (message.SenderId != userId)
                return Forbid("You can only delete your own messages.");

            // Çift silme önleme - zaten silinmiş mesajı tekrar silmeye çalışıyorsa
            if (message.IsDeleted)
                return BadRequest("Message is already deleted.");

            // Soft Delete işlemi - mesaj veritabanından fiziksel olarak silinmez
            // Orijinal içeriği audit trail (denetim izi) için sakla
            message.OriginalContentBeforeDelete = message.Content;
            
            // Mesaj içeriğini "silindi" metniyle değiştir
            message.Content = "Bu mesaj silindi";
            
            // Resim varsa tamamen kaldır (güvenlik ve gizlilik için)
            message.ImageBase64 = null;
            
            // Silindi bayrağını set et
            message.IsDeleted = true;
            
            // Silinme zamanını kaydet
            message.DeletedAtUtc = DateTime.UtcNow;

            // Değişiklikleri veritabanına kaydet
            await _db.SaveChangesAsync();

            // Güncellenmiş mesajı DTO formatında döndür
            return Ok(MapMessageDto(message));
        }

        // ========================================
        // Helper - Message DTO Mapping
        // ========================================
        /// <summary>
        /// Message entity'sini frontend için uygun DTO formatına dönüştürür
        /// Kullanıcı bilgilerini, okuma durumunu, düzenleme ve silme bilgilerini içerir
        /// </summary>
        private object MapMessageDto(Message m)
        {
            // Mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            
            return new
            {
                // Temel mesaj bilgileri
                id = m.Id,
                senderId = m.SenderId,
                senderName = m.Sender != null ? $"{m.Sender.FirstName} {m.Sender.LastName}" : "Unknown",
                receiverId = m.ReceiverId,
                receiverName = m.Receiver != null ? $"{m.Receiver.FirstName} {m.Receiver.LastName}" : "Unknown",
                
                // Mesaj yönü kontrolü (UI'da sağ/sol gösterim için)
                isFromMe = m.SenderId == userId,
                
                // İçerik bilgileri
                content = m.Content, // Silinmişse "Bu mesaj silindi" olarak döner
                imageBase64 = m.ImageBase64, // Silinmişse null olur
                
                // Zaman bilgileri
                createdAt = m.CreatedAtUtc,
                
                // Okuma durumu
                isRead = m.IsRead,
                readAt = m.ReadAtUtc,
                
                // Düzenleme bilgileri (WhatsApp benzeri "(düzenlendi)" etiketi için)
                isEdited = m.IsEdited,
                editedAt = m.EditedAtUtc,
                
                // Silme bilgileri (UI'da farklı gösterim için)
                isDeleted = m.IsDeleted,
                deletedAt = m.DeletedAtUtc
            };
        }
    }
}
