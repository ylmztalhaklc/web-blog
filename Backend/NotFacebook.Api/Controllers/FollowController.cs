// Gerekli kütüphaneler
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotFacebook.Core.Entities;
using NotFacebook.Infrastructure.Data;
using System.Security.Claims;

namespace NotFacebook.Api.Controllers
{
    /// <summary>
    /// Takip (follow) yönetimi controller'ı
    /// Kullanıcıların birbirini takip etme/takipten çıkma işlemlerini yönetir
    /// </summary>
    [ApiController]
    [Route("api/[controller]")] // api/follow
    [Authorize] // Tüm endpoint'ler için kimlik doğrulama gerekli
    public class FollowController : ControllerBase
    {
        private readonly AppDbContext _db; // Veritabanı bağlamı

        // Constructor - Dependency Injection
        public FollowController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// Token'dan mevcut kullanıcının ID'sini alır
        /// </summary>
        private string? GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }

        // ========================================
        // Takip Edilenleri Getir
        // ========================================
        /// <summary>
        /// Kullanıcının takip ettiği kişilerin ID listesini döndürür
        /// GET api/follow/following
        /// </summary>
        [HttpGet("following")]
        public async Task<IActionResult> GetFollowing()
        {
            // Mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Bu kullanıcının takip ettiği kişilerin ID'lerini al
            var ids = await _db.Follows
                .Where(f => f.FollowerId == userId) // FollowerId = ben
                .Select(f => f.FollowedId) // Takip edilen kişilerin ID'leri
                .ToListAsync();

            return Ok(ids);
        }

        // ========================================
        // Takipçileri Getir
        // ========================================
        /// <summary>
        /// Kullanıcıyı takip eden kişilerin listesini döndürür
        /// GET api/follow/followers
        /// </summary>
        [HttpGet("followers")]
        public async Task<ActionResult<List<SimpleUserDto>>> GetFollowers()
        {
            // Mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Beni takip edenleri bul (FollowedId = ben olan kayıtlar)
            var followers = await _db.Follows
                .Where(f => f.FollowedId == userId) // FollowedId = ben
                .Include(f => f.Follower) // Takip eden kullanıcı bilgilerini yükle
                .Select(f => new SimpleUserDto(
                    f.FollowerId,
                    f.Follower.FirstName,
                    f.Follower.LastName,
                    f.Follower.Gender
                ))
                .ToListAsync();

            return Ok(followers);
        }

        /// <summary>
        /// Belirli bir kullanıcının takipçilerini döndürür
        /// GET api/follow/followers/{userId}
        /// </summary>
        [HttpGet("followers/{userId}")]
        public async Task<ActionResult<List<SimpleUserDto>>> GetUserFollowers(string userId)
        {
            var followers = await _db.Follows
                .Where(f => f.FollowedId == userId)
                .Include(f => f.Follower)
                .Select(f => new SimpleUserDto(
                    f.FollowerId,
                    f.Follower.FirstName,
                    f.Follower.LastName,
                    f.Follower.Gender
                ))
                .ToListAsync();

            return Ok(followers);
        }

        // ========================================
        // Takip Et/Takipten Çık (Toggle)
        // ========================================
        /// <summary>
        /// Bir kullanıcıyı takip eder veya takipten çıkar
        /// POST api/follow/{targetUserId}
        /// </summary>
        [HttpPost("{targetUserId}")]
        public async Task<IActionResult> ToggleFollow(string targetUserId)
        {
            // Mevcut kullanıcının ID'sini al
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            // Kullanıcı kendini takip edemez
            if (userId == targetUserId)
                return BadRequest("You cannot follow yourself.");

            // Bu takip ilişkisi daha önce var mı?
            var existing = await _db.Follows
                .FirstOrDefaultAsync(f =>
                    f.FollowerId == userId && f.FollowedId == targetUserId);

            bool isFollowing;

            if (existing != null)
            {
                // Varsa takipten çık
                _db.Follows.Remove(existing);
                isFollowing = false;
            }
            else
            {
                // Yoksa takip et
                _db.Follows.Add(new Follow
                {
                    FollowerId = userId, // Takip eden = ben
                    FollowedId = targetUserId, // Takip edilen = hedef kullanıcı
                    CreatedAtUtc = DateTime.UtcNow
                });
                isFollowing = true;
            }

            // Değişiklikleri kaydet
            await _db.SaveChangesAsync();
            return Ok(new { isFollowing });
        }
    }

    /// <summary>
    /// Basitleştirilmiş kullanıcı bilgileri DTO'su
    /// Takipçi listelerinde kullanılır
    /// </summary>
    public record SimpleUserDto(
        string Id,           // Kullanıcı ID
        string FirstName,    // Ad
        string LastName,     // Soyad
        string? Gender       // Cinsiyet (opsiyonel)
    );
}
