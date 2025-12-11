// Gerekli kütüphaneler
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using NotFacebook.Core.Entities;

namespace NotFacebook.Api.Controllers
{
    /// <summary>
    /// Kullanıcı hesap yönetimi controller'ı
    /// Kayıt, giriş ve kullanıcı bilgileri işlemlerini yönetir
    /// </summary>
    [ApiController]
    [Route("api/account")]
    public class AccountController : ControllerBase
    {
        private readonly UserManager<User> _userManager; // Identity kullanıcı yöneticisi
        private readonly IConfiguration _config; // Uygulama yapılandırma ayarları

        // Constructor - Dependency Injection ile servisler enjekte edilir
        public AccountController(UserManager<User> userManager, IConfiguration config)
        {
            _userManager = userManager;
            _config = config;
        }

        // ========================================
        // DTO Sınıfları (Data Transfer Objects)
        // ========================================
        // API isteklerinde veri taşımak için kullanılan model sınıfları

        /// <summary>
        /// Kayıt işlemi için gerekli kullanıcı bilgileri
        /// </summary>
        public class RegisterDto
        {
            public string Email { get; set; } = default!;
            public string FirstName { get; set; } = default!; // Ad
            public string LastName { get; set; } = default!; // Soyad
            public string BirthDate { get; set; } = default!; // Doğum tarihi
            public string Gender { get; set; } = default!; // Cinsiyet
            public string Password { get; set; } = default!; // Şifre
            public string ConfirmPassword { get; set; } = default!; // Şifre tekrarı
        }

        /// <summary>
        /// Giriş işlemi için gerekli bilgiler
        /// </summary>
        public class LoginDto
        {
            public string Email { get; set; } = default!;
            public string Password { get; set; } = default!;
        }

        // ========================================
        // Kayıt Olma (Register)
        // ========================================
        /// <summary>
        /// Yeni kullanıcı kayıt işlemi
        /// POST api/account/register
        /// </summary>
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto model)
        {
            // Şifre ve şifre tekrarının aynı olup olmadığını kontrol et
            if (model.Password != model.ConfirmPassword)
                return BadRequest(new { errors = new[] { "Passwords do not match." } });

            // Doğum tarihini string'den DateTime'a dönüştür
            DateTime? parsedBirthDate = null;

            if (!string.IsNullOrEmpty(model.BirthDate))
            {
                if (DateTime.TryParse(model.BirthDate, out var dt))
                    parsedBirthDate = dt;
            }

            // Yeni kullanıcı nesnesi oluştur
            var user = new User
            {
                UserName = model.Email,
                Email = model.Email,
                FirstName = model.FirstName,
                LastName = model.LastName,
                BirthDate = parsedBirthDate,
                Gender = model.Gender
            };

            // Kullanıcıyı Identity sistemine kaydet
            var result = await _userManager.CreateAsync(user, model.Password);

            // Kayıt başarısız olursa hata mesajlarını döndür
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).ToArray();
                return BadRequest(new { errors });
            }

            // Kayıt başarılıysa JWT token oluştur
            var token = GenerateJwtToken(user);

            // Token ve kullanıcı bilgilerini döndür
            return Ok(new
            {
                token,
                user = new
                {
                    user.Id,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    user.BirthDate,
                    user.Gender
                }
            });
        }

        // ========================================
        // Giriş Yapma (Login)
        // ========================================
        /// <summary>
        /// Kullanıcı giriş işlemi
        /// POST api/account/login
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            // Email'e göre kullanıcıyı bul
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
                return Unauthorized(new { message = "Invalid credentials" });

            // Şifrenin doğruluğunu kontrol et
            var isPasswordValid = await _userManager.CheckPasswordAsync(user, model.Password);
            if (!isPasswordValid)
                return Unauthorized(new { message = "Invalid credentials" });

            // Giriş başarılıysa JWT token oluştur
            var token = GenerateJwtToken(user);

            // Token ve kullanıcı bilgilerini döndür
            return Ok(new
            {
                token,
                user = new
                {
                    user.Id,
                    user.Email,
                    user.FirstName,
                    user.LastName,
                    user.BirthDate,
                    user.Gender
                }
            });
        }

        // ========================================
        // Mevcut Kullanıcı Bilgisi (Me)
        // ========================================
        /// <summary>
        /// Token'daki kullanıcının bilgilerini getirir
        /// GET api/account/me
        /// Yetkilendirme gerektirir (Authorize)
        /// </summary>
        [Authorize] // Bu endpoint'e erişim için geçerli JWT token gerekli
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            // Token'dan kullanıcının email'ini al
            var email = User.FindFirstValue(ClaimTypes.Email);
            if (email == null) return Unauthorized();

            // Email'e göre kullanıcıyı bul
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) return Unauthorized();

            // Kullanıcı bilgilerini döndür
            return Ok(new
            {
                user.Id,
                user.Email,
                user.FirstName,
                user.LastName,
                user.BirthDate,
                user.Gender
            });
        }

        // ========================================
        // Tüm Kullanıcıları Listele
        // ========================================
        /// <summary>
        /// Sistemdeki tüm kullanıcıları listeler
        /// GET api/account/users
        /// Yetkilendirme gerektirir
        /// </summary>
        [Authorize]
        [HttpGet("users")]
        public IActionResult GetUsers()
        {
            // Veritabanındaki tüm kullanıcıları çek ve belirli alanları seç
            var users = _userManager.Users
                .Select(u => new
                {
                    u.Id,
                    u.Email,
                    u.FirstName,
                    u.LastName,
                    u.Gender,
                    u.BirthDate
                })
                .ToList();

            return Ok(users);
        }

        // ========================================
        // JWT Token Oluşturucu (Private Method)
        // ========================================
        /// <summary>
        /// Kullanıcı için JWT token oluşturur
        /// </summary>
        /// <param name="user">Token oluşturulacak kullanıcı</param>
        /// <returns>JWT token string</returns>
        private string GenerateJwtToken(User user)
        {
            // JWT ayarlarını yapılandırmadan al
            var jwtSettings = _config.GetSection("Jwt");
            // İmzalama anahtarını oluştur
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));

            // Token içinde taşınacak bilgiler (claims)
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id), // Kullanıcı ID
                new Claim(JwtRegisteredClaimNames.Email, user.Email!), // Email
                new Claim(ClaimTypes.Email, user.Email!), // Email (alternatif claim)
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()) // Benzersiz token ID
            };

            // Token imzalama bilgilerini oluştur
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Token'un son kullanma tarihini hesapla
            var expires = DateTime.UtcNow.AddMinutes(
                double.Parse(jwtSettings["ExpiresInMinutes"] ?? "60")
            );

            // JWT token'ı oluştur
            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"], // Token veren
                audience: jwtSettings["Audience"], // Token alıcısı
                claims: claims, // Kullanıcı bilgileri
                expires: expires, // Geçerlilik süresi
                signingCredentials: creds // İmza bilgisi
            );

            // Token'ı string'e çevir ve döndür
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
