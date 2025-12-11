// Gerekli kütüphaneler
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
    /// Post (gönderi) yönetimi controller'ı
    /// Gönderi oluşturma, listeleme, beğenme ve yorum yapma işlemlerini yönetir
    /// </summary>
    [ApiController]
    [Route("api/[controller]")] // api/posts
    [Authorize] // Tüm endpoint'ler için kimlik doğrulama gerekli
    public class PostsController : ControllerBase
    {
        private readonly AppDbContext _db; // Veritabanı bağlamı
        private readonly UserManager<User> _userManager; // Kullanıcı yöneticisi

        // Constructor - Dependency Injection
        public PostsController(AppDbContext db, UserManager<User> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        /// <summary>
        /// Token'dan mevcut kullanıcının ID'sini alır
        /// JWT token'dan Claims içindeki NameIdentifier claim'ini çeker
        /// </summary>
        private string? GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }

        /// <summary>
        /// Dosya yükler ve base64 string döner
        /// Güvenlik: Dosya formatı ve boyut kontrolü yapar
        /// Desteklenen formatlar: jpg, jpeg, png, gif, webp
        /// Maksimum boyut: 5MB
        /// </summary>
        private async Task<string?> SaveImageAsBase64(IFormFile? file)
        {
            if (file == null || file.Length == 0) return null;

            // Güvenlik kontrolü: İzin verilen resim formatları
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            
            if (!allowedExtensions.Contains(extension))
                throw new InvalidOperationException("Invalid image format. Allowed: jpg, jpeg, png, gif, webp");

            // Güvenlik kontrolü: Maksimum dosya boyutu 5MB (büyük dosyalar sunucuyu yavaşlatır)
            if (file.Length > 5 * 1024 * 1024)
                throw new InvalidOperationException("Image size cannot exceed 5MB");

            // Dosyayı Base64 string'e dönüştür (veritabanında saklamak için)
            // Not: Büyük projelerde AWS S3, Azure Blob gibi cloud storage tercih edilmelidir
            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            var imageBytes = memoryStream.ToArray();
            var base64String = Convert.ToBase64String(imageBytes);
            
            // Data URI formatında döndür (HTML'de direkt kullanılabilir: <img src="data:image/png;base64,...">)
            var mimeType = file.ContentType;
            return $"data:{mimeType};base64,{base64String}";
        }

        // ========================================
        // DTO Sınıfları
        // ========================================
        
        /// <summary>
        /// Yeni gönderi oluşturma için gerekli veriler
        /// </summary>
        public class CreatePostDto
        {
            public string? Content { get; set; } // Gönderi metni (opsiyonel, resim varsa boş olabilir)
            public string? ImageBase64 { get; set; } // Opsiyonel resim (Base64 formatında - mobil uygulamalar için)
            public IFormFile? ImageFile { get; set; } // Opsiyonel resim dosyası (web uygulamalar için multipart/form-data)
        }

        /// <summary>
        /// Gönderi düzenleme için gerekli veriler
        /// Kullanıcılar sadece kendi gönderilerini düzenleyebilir
        /// </summary>
        public class UpdatePostDto
        {
            public string? Content { get; set; } // Güncellenmiş gönderi metni (opsiyonel, resim varsa boş olabilir)
            public string? ImageBase64 { get; set; } // Güncellenmiş resim (Base64 formatında)
            public IFormFile? ImageFile { get; set; } // Güncellenmiş resim dosyası
        }

        /// <summary>
        /// Yorum ekleme için gerekli veriler
        /// </summary>
        public class CommentDto
        {
            public string? Text { get; set; } // Yorum metni (opsiyonel)
            public string? ImageBase64 { get; set; } // Yorum resmi (Base64, opsiyonel)
            public IFormFile? ImageFile { get; set; } // Yorum resmi dosya (web için)
        }

        // ========================================
        // Yeni Gönderi Oluştur
        // ========================================
        /// <summary>
        /// Yeni bir gönderi oluşturur
        /// POST api/posts
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreatePost([FromForm] CreatePostDto dto)
        {
            // Mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            try
            {
                // Dosya yüklendiyse base64'e çevir
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
                else if (!string.IsNullOrWhiteSpace(dto.ImageBase64))
                {
                    imageData = dto.ImageBase64;
                }

                // Gönderi içeriği ve resim tamamen boş olamaz
                if (string.IsNullOrWhiteSpace(dto.Content) && string.IsNullOrWhiteSpace(imageData))
                {
                    return BadRequest("Post can't be completely empty.");
                }

                // Yeni gönderi nesnesi oluştur
                var post = new Post
                {
                    UserId = userId,
                    Content = dto.Content?.Trim() ?? string.Empty,
                    ImageBase64 = imageData,
                    CreatedAtUtc = DateTime.UtcNow,
                };

                // Veritabanına ekle ve kaydet
                _db.Posts.Add(post);
                await _db.SaveChangesAsync();

                // Gönderiyi ilişkili verilerle birlikte yeniden yükle
                // (kullanıcı, beğeniler ve yorumlar dahil)
                post = await _db.Posts
                    .Include(p => p.User) // Gönderi sahibi
                    .Include(p => p.Likes).ThenInclude(l => l.User) // Beğeniler ve beğenen kullanıcılar
                    .Include(p => p.Comments).ThenInclude(c => c.User) // Yorumlar ve yorum yapan kullanıcılar
                    .FirstOrDefaultAsync(p => p.Id == post.Id) ?? post;

                // Gönderiyi DTO formatına dönüştür ve döndür
                var result = await MapPostDto(post, userId);
                return Ok(result);
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
        // Gönderi Akışını Getir (Feed)
        // ========================================
        /// <summary>
        /// Kullanıcının takip ettiği kişilerin ve kendi gönderilerini listeler
        /// GET api/posts/feed
        /// </summary>
        [HttpGet("feed")]
        public async Task<IActionResult> GetFeed()
        {
            // Mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Kullanıcının takip ettiği kişilerin ID'lerini al
            var followingIds = await _db.Follows
                .Where(f => f.FollowerId == userId)
                .Select(f => f.FollowedId)
                .ToListAsync();

            // Kendi ID'sini de ekle (kendi gönderilerini de görmeli)
            followingIds.Add(userId);

            // Takip edilen kişilerin ve kendi gönderilerini çek
            var posts = await _db.Posts
                .Where(p => followingIds.Contains(p.UserId)) // Sadece takip edilenlerin gönderileri
                .Include(p => p.User) // Gönderi sahibi bilgileri
                .Include(p => p.Likes).ThenInclude(l => l.User) // Beğeni bilgileri
                .Include(p => p.Comments).ThenInclude(c => c.User) // Yorum bilgileri
                .OrderByDescending(p => p.UpdatedAtUtc ?? p.CreatedAtUtc) // Düzenleme zamanına göre sırala
                .ToListAsync();

            // Her gönderiyi DTO formatına dönüştür
            var result = new List<object>();
            foreach (var p in posts)
            {
                result.Add(await MapPostDto(p, userId));
            }

            return Ok(result);
        }

        // ========================================
        // Belirli Kullanıcının Postlarını Getir
        // ========================================
        /// <summary>
        /// Belirli bir kullanıcının tüm postlarını getirir
        /// GET api/posts/user/{userId}
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserPosts(string userId)
        {
            var currentUserId = GetUserId();
            if (currentUserId == null) return Unauthorized();

            var posts = await _db.Posts
                .Where(p => p.UserId == userId && !p.IsDeleted)
                .Include(p => p.User)
                .Include(p => p.Likes).ThenInclude(l => l.User)
                .Include(p => p.Comments).ThenInclude(c => c.User)
                .OrderByDescending(p => p.UpdatedAtUtc ?? p.CreatedAtUtc)
                .ToListAsync();

            var result = new List<object>();
            foreach (var p in posts)
            {
                result.Add(await MapPostDto(p, currentUserId));
            }

            return Ok(result);
        }

        // ========================================
        // Gönderi Güncelle
        // ========================================
        /// <summary>
        /// Mevcut bir gönderiyi günceller (sadece gönderi sahibi)
        /// Yetkilendirme: Sadece gönderinin sahibi düzenleyebilir
        /// PUT api/posts/{id}
        /// </summary>
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdatePost(int id, [FromForm] UpdatePostDto dto)
        {
            // JWT token'dan mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            try
            {
                // Gönderiyi bul
                var post = await _db.Posts
                    .Include(p => p.User)
                    .Include(p => p.Likes).ThenInclude(l => l.User)
                    .Include(p => p.Comments).ThenInclude(c => c.User)
                    .FirstOrDefaultAsync(p => p.Id == id);

                if (post == null) return NotFound("Post not found.");

                // Silinmiş postlar düzenlenemez
                if (post.IsDeleted)
                    return BadRequest("Cannot edit a deleted post.");

                // Güvenlik kontrolü - sadece gönderi sahibi düzenleyebilir
                // Başka kullanıcıların gönderilerini düzenlenmesini engeller
                if (post.UserId != userId)
                    return Forbid("You can only edit your own posts.");

                // Resim işleme: Yeni resim yüklendiyse onu kullan, yoksa mevcut resmi koru
                string? imageData = post.ImageBase64; // Varsayılan: mevcut resim
                if (dto.ImageFile != null)
                {
                    // Web'den yeni dosya yüklendi
                    imageData = await SaveImageAsBase64(dto.ImageFile);
                }
                else if (dto.ImageBase64 != null)
                {
                    // Mobil'den base64 olarak geldi
                    imageData = dto.ImageBase64;
                }

                // İçerik ve resim tamamen boş olamaz
                if (string.IsNullOrWhiteSpace(dto.Content) && string.IsNullOrWhiteSpace(imageData))
                {
                    return BadRequest("Post can't be completely empty.");
                }

                // Gönderi verilerini güncelle
                post.Content = dto.Content?.Trim() ?? string.Empty;
                post.ImageBase64 = imageData;
                post.UpdatedAtUtc = DateTime.UtcNow; // Düzenlenme zamanını kaydet (UI'da "edited" göstermek için)

                // Değişiklikleri veritabanına kaydet
                await _db.SaveChangesAsync();

                // Güncel gönderiyi DTO formatında döndür
                var result = await MapPostDto(post, userId);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // ========================================
        // Gönderi Sil (Soft Delete)
        // ========================================
        /// <summary>
        /// Bir gönderiyi soft delete ile siler (sadece gönderi sahibi)
        /// Soft Delete: Gönderi "Bu post silindi" mesajı ile değiştirilir ve IsDeleted = true işaretlenir
        /// Orijinal içerik OriginalContentBeforeDelete alanında saklanır
        /// Yetkilendirme: Sadece gönderinin sahibi silebilir
        /// DELETE api/posts/{id}
        /// </summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeletePost(int id)
        {
            // JWT token'dan mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Silinecek gönderiyi bul
            var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == id);

            if (post == null) return NotFound("Post not found.");

            // Zaten silinmiş post tekrar silinemez
            if (post.IsDeleted)
                return BadRequest("Post is already deleted.");

            // Güvenlik kontrolü - sadece gönderi sahibi silebilir
            // Başka kullanıcıların gönderilerini silmesini engeller
            if (post.UserId != userId)
                return Forbid("You can only delete your own posts.");

            // Soft Delete: Gönderiyi "silindi" mesajı ile değiştir
            // Orijinal içeriği yedekle
            post.OriginalContentBeforeDelete = post.Content;
            post.Content = "Bu post silindi";
            post.ImageBase64 = null; // Resmi de kaldır
            post.IsDeleted = true;
            post.DeletedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new { message = "Post deleted successfully." });
        }

        // ========================================
        // Gönderi Beğeni/Beğeni Kaldır (Toggle)
        // ========================================
        /// <summary>
        /// Bir gönderiyi beğenir veya beğeniyi kaldırır
        /// POST api/posts/{id}/like
        /// </summary>
        [HttpPost("{id:int}/like")]
        public async Task<IActionResult> ToggleLike(int id)
        {
            // Mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Gönderiyi beğenileriyle birlikte çek
            var post = await _db.Posts
                .Include(p => p.Likes)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (post == null) return NotFound();
            
            // Silinmiş postlar beğenilemez
            if (post.IsDeleted) return BadRequest("Cannot like a deleted post.");

            // Kullanıcı bu gönderiyi daha önce beğenmiş mi?
            var existing = post.Likes.FirstOrDefault(l => l.UserId == userId);

            if (existing != null)
            {
                // Varsa beğeniyi kaldır
                _db.PostLikes.Remove(existing);
            }
            else
            {
                // Yoksa yeni beğeni ekle
                _db.PostLikes.Add(new PostLike
                {
                    PostId = id,
                    UserId = userId,
                    CreatedAtUtc = DateTime.UtcNow
                });
            }

            // Değişiklikleri kaydet
            await _db.SaveChangesAsync();

            // Güncel gönderiyi tüm ilişkili verilerle birlikte yeniden yükle
            post = await _db.Posts
                .Include(p => p.User)
                .Include(p => p.Likes).ThenInclude(l => l.User)
                .Include(p => p.Comments).ThenInclude(c => c.User)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (post == null) return NotFound();

            // Güncel gönderiyi DTO formatında döndür
            var dto = await MapPostDto(post, userId);
            return Ok(dto);
        }

        // ========================================
        // Gönderiye Yorum Ekle
        // ========================================
        /// <summary>
        /// Bir gönderiye yorum ekler
        /// POST api/posts/{id}/comments
        /// </summary>
        [HttpPost("{id:int}/comments")]
        public async Task<IActionResult> AddComment(int id, [FromForm] CommentDto dto)
        {
            // Mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Resim işleme
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
            else if (!string.IsNullOrWhiteSpace(dto.ImageBase64))
            {
                imageData = dto.ImageBase64;
            }

            // Yorum metni veya resim olmalı
            if (string.IsNullOrWhiteSpace(dto.Text) && string.IsNullOrWhiteSpace(imageData))
                return BadRequest("Comment can't be empty.");

            // Gönderi mevcut mu ve silinmiş mi kontrol et
            var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post == null) return NotFound();
            if (post.IsDeleted) return BadRequest("Cannot comment on a deleted post.");

            // Yeni yorum nesnesi oluştur
            var comment = new PostComment
            {
                PostId = id,
                UserId = userId,
                Text = dto.Text?.Trim() ?? string.Empty,
                ImageBase64 = imageData,
                CreatedAtUtc = DateTime.UtcNow
            };

            // Yorumu veritabanına ekle ve kaydet
            _db.PostComments.Add(comment);
            await _db.SaveChangesAsync();

            // Güncel gönderiyi tüm ilişkili verilerle birlikte yeniden yükle
            post = await _db.Posts
                .Include(p => p.User)
                .Include(p => p.Likes).ThenInclude(l => l.User)
                .Include(p => p.Comments).ThenInclude(c => c.User)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (post == null) return NotFound();

            // Güncel gönderiyi DTO formatında döndür
            var postDto = await MapPostDto(post, userId);
            return Ok(postDto);
        }

        // ========================================
        // Yorum Düzenle
        // ========================================
        /// <summary>
        /// Bir yorumu düzenler (sadece yorum sahibi)
        /// Yetkilendirme: Sadece yorumun sahibi düzenleyebilir
        /// PUT api/posts/comments/{id}
        /// </summary>
        [HttpPut("comments/{id:int}")]
        public async Task<IActionResult> EditComment(int id, [FromBody] CommentDto dto)
        {
            // JWT token'dan mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Yorum metni boş olamaz
            if (string.IsNullOrWhiteSpace(dto.Text))
                return BadRequest("Comment can't be empty.");

            // Düzenlenecek yorumu bul
            var comment = await _db.PostComments
                .Include(c => c.Post)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (comment == null) return NotFound("Comment not found.");

            // Güvenlik kontrolü - sadece yorum sahibi düzenleyebilir
            if (comment.UserId != userId)
                return Forbid("You can only edit your own comments.");

            // Yorum metnini güncelle
            comment.Text = dto.Text.Trim();
            comment.IsEdited = true;
            comment.EditedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            // Güncel gönderiyi tüm ilişkili verilerle birlikte yeniden yükle
            var post = await _db.Posts
                .Include(p => p.User)
                .Include(p => p.Likes).ThenInclude(l => l.User)
                .Include(p => p.Comments).ThenInclude(c => c.User)
                .FirstOrDefaultAsync(p => p.Id == comment.PostId);

            if (post == null) return NotFound();

            // Güncel gönderiyi DTO formatında döndür
            var postDto = await MapPostDto(post, userId);
            return Ok(postDto);
        }

        // ========================================
        // Post Entity'yi DTO'ya Dönüştürme (Private Helper)
        // ========================================
        /// <summary>
        /// Veritabanından gelen Post entity'sini frontend için uygun formata dönüştürür
        /// </summary>
        private Task<object> MapPostDto(Post p, string currentUserId)
        {
            // Beğeni ve yorumları al (null ise boş liste)
            var likes = p.Likes ?? new List<PostLike>();
            var comments = p.Comments ?? new List<PostComment>();

            // Gönderi sahibinin adını oluştur
            var authorFirst = p.User?.FirstName ?? "Unknown";
            var authorLast = p.User?.LastName ?? "User";
            var authorName = $"{authorFirst} {authorLast}";
            var authorGender = p.User?.Gender;

            // Frontend için uygun formatta DTO oluştur
            var dto = new
            {
                // Gönderi temel bilgileri
                id = p.Id,
                content = p.Content,
                imageBase64 = p.ImageBase64, // Data URI formatında (data:image/png;base64,...)
                createdAt = p.CreatedAtUtc,
                updatedAt = p.UpdatedAtUtc, // Null ise hiç düzenlenmemiş

                // Gönderi sahibi bilgileri
                author = new
                {
                    id = p.UserId,
                    name = authorName,
                    gender = authorGender // Avatar seçimi için kullanılır
                },
                
                // Yetki kontrolü - mevcut kullanıcı bu gönderinin sahibi mi?
                // true ise UI'da Edit ve Delete butonları gösterilir
                isOwner = p.UserId == currentUserId,

                // Silme durumu - soft delete için
                isDeleted = p.IsDeleted,
                deletedAt = p.DeletedAtUtc,

                // İstatistikler
                likeCount = likes.Count, // Toplam beğeni sayısı
                commentCount = comments.Count, // Toplam yorum sayısı
                isLikedByCurrentUser = likes.Any(l => l.UserId == currentUserId), // Mevcut kullanıcı beğendi mi?

                // Beğenen kullanıcılar listesi
                likes = likes.Select(l =>
                {
                    var u = l.User;
                    var first = u?.FirstName ?? "Unknown";
                    var last = u?.LastName ?? "User";
                    return new
                    {
                        userId = l.UserId,
                        name = $"{first} {last}",
                        gender = u?.Gender
                    };
                }),

                // Yorumlar listesi (eskiden yeniye sıralı)
                comments = comments
                    .OrderBy(c => c.CreatedAtUtc)
                    .Select(c =>
                    {
                        var u = c.User;
                        var first = u?.FirstName ?? "Unknown";
                        var last = u?.LastName ?? "User";
                        return new
                        {
                            id = c.Id, // Yorum ID'si (düzenleme için gerekli)
                            userId = c.UserId,
                            name = $"{first} {last}",
                            gender = u?.Gender,
                            text = c.Text,
                            imageBase64 = c.ImageBase64, // Yorum resmi
                            createdAt = c.CreatedAtUtc,
                            isEdited = c.IsEdited, // Yorum düzenlendi mi?
                            editedAt = c.EditedAtUtc, // Düzenlenme zamanı
                            isOwner = c.UserId == currentUserId // Mevcut kullanıcı bu yorumun sahibi mi?
                        };
                    })
            };

            return Task.FromResult<object>(dto);
        }
    }
}
