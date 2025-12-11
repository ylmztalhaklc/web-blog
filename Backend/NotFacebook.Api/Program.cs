// Gerekli kütüphaneler ve namespace'ler
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NotFacebook.Core.Entities;
using NotFacebook.Infrastructure.Data;

// ASP.NET Core uygulaması için builder nesnesi oluşturuluyor
var builder = WebApplication.CreateBuilder(args);

// ========================================
// 1) Veritabanı Yapılandırması (DbContext)
// ========================================
// Veritabanı bağlantı dizesi appsettings.json'dan okunuyor, yoksa varsayılan SQLite dosyası kullanılıyor
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                      ?? "Data Source=notfacebook.db";

// Entity Framework Core ile SQLite veritabanı kullanımı ayarlanıyor
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlite(connectionString);
});

// ========================================
// 2) Kimlik Doğrulama Sistemi (Identity)
// ========================================
// ASP.NET Identity kullanıcı yönetim sistemi yapılandırılıyor
builder.Services.AddIdentity<User, IdentityRole>(options =>
    {
        // Şifre kuralları belirleniyor
        options.Password.RequiredLength = 6; // Minimum 6 karakter
        options.Password.RequireNonAlphanumeric = false; // Özel karakter zorunlu değil
        options.Password.RequireUppercase = false; // Büyük harf zorunlu değil
    })
    .AddEntityFrameworkStores<AppDbContext>() // Identity verilerini Entity Framework ile yönet
    .AddDefaultTokenProviders(); // Varsayılan token sağlayıcılarını ekle

// ========================================
// 3) JWT Token Kimlik Doğrulama
// ========================================
// JWT ayarları appsettings.json'dan okunuyor
var jwtSettings = builder.Configuration.GetSection("Jwt");
// JWT imzalama için gizli anahtar oluşturuluyor
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));

// JWT Bearer authentication ekleniyor
builder.Services.AddAuthentication(options =>
{
    // Varsayılan kimlik doğrulama şeması JWT olarak ayarlanıyor
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // JWT token doğrulama parametreleri belirleniyor
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, // Token'ı kimin verdiğini kontrol et
        ValidateAudience = true, // Token'ın kimin için olduğunu kontrol et
        ValidateLifetime = true, // Token'ın süresinin dolup dolmadığını kontrol et
        ValidateIssuerSigningKey = true, // İmza anahtarını doğrula
        ValidIssuer = jwtSettings["Issuer"], // Geçerli token veren
        ValidAudience = jwtSettings["Audience"], // Geçerli token alıcısı
        IssuerSigningKey = key // İmza anahtarı
    };
});

// ========================================
// 4) CORS (Cross-Origin Resource Sharing)
// ========================================
// Frontend React uygulamasından API'ye erişim izni için CORS yapılandırması
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend",
        policy =>
        {
            policy
                .WithOrigins("http://localhost:5173") // React dev sunucusu (Vite)
                .AllowAnyHeader() // Tüm HTTP header'larına izin ver
                .AllowAnyMethod() // Tüm HTTP metotlarına (GET, POST, vb.) izin ver
                .AllowCredentials(); // Cookie ve credential'lara izin ver
        });
});

// API Controller'larını servis olarak ekle
builder.Services.AddControllers();
// API endpoint'lerini keşfet (Swagger için)
builder.Services.AddEndpointsApiExplorer();
// Swagger/OpenAPI dokümantasyon aracını ekle
builder.Services.AddSwaggerGen();

// Web uygulaması oluşturuluyor
var app = builder.Build();

// ========================================
// Veritabanı Migration'ları Otomatik Uygula
// ========================================
// Uygulama başlatıldığında bekleyen migration'ları otomatik olarak veritabanına uygular
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate(); // Pending migration'ları uygula
}

// ========================================
// HTTP Request Pipeline (Middleware)
// ========================================
// Development ortamında Swagger UI'ı etkinleştir
if (app.Environment.IsDevelopment())
{
    app.UseSwagger(); // Swagger JSON endpoint'i
    app.UseSwaggerUI(); // Swagger kullanıcı arayüzü
}

// HTTP isteklerini HTTPS'e yönlendir
app.UseHttpsRedirection();
// CORS politikasını uygula
app.UseCors("Frontend");
// Kimlik doğrulama middleware'ini etkinleştir
app.UseAuthentication();
// Yetkilendirme middleware'ini etkinleştir
app.UseAuthorization();

// Controller'ları route'lara bağla
app.MapControllers();

// Uygulamayı başlat
app.Run();
