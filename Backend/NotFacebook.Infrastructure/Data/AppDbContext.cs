// Gerekli kütüphaneler
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using NotFacebook.Core.Entities;

namespace NotFacebook.Infrastructure.Data
{
    /// <summary>
    /// Uygulama Veritabanı Bağlamı (DbContext)
    /// Entity Framework Core ile veritabanı işlemlerini yönetir
    /// ASP.NET Identity tablolarını da içerir (IdentityDbContext'ten türer)
    /// </summary>
    public class AppDbContext : IdentityDbContext<User>
    {
        // Constructor - DbContext seçeneklerini alır
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        // ========================================
        // Veritabanı Tabloları (DbSet'ler)
        // ========================================
        
        // Gönderiler tablosu
        public DbSet<Post> Posts { get; set; } = default!;
        
        // Beğeniler tablosu
        public DbSet<PostLike> PostLikes { get; set; } = default!;
        
        // Yorumlar tablosu
        public DbSet<PostComment> PostComments { get; set; } = default!;
        
        // Takip ilişkileri tablosu
        public DbSet<Follow> Follows { get; set; } = default!;
        
        // Mesajlar tablosu
        public DbSet<Message> Messages { get; set; } = default!;

        /// <summary>
        /// Model oluşturma yapılandırması
        /// Entity'ler arası ilişkileri ve kısıtlamaları tanımlar
        /// </summary>
        protected override void OnModelCreating(ModelBuilder builder)
        {
            // Identity tabloları için temel yapılandırma
            base.OnModelCreating(builder);

            // ========================================
            // Follow Entity Yapılandırması
            // ========================================
            // Bir kullanıcı başka bir kullanıcıyı sadece bir kez takip edebilir
            // (FollowerId + FollowedId kombinasyonu benzersiz olmalı)
            builder.Entity<Follow>()
                .HasIndex(f => new { f.FollowerId, f.FollowedId })
                .IsUnique();

            // ========================================
            // Post Entity İlişkileri
            // ========================================
            // Post → User ilişkisi (Bir gönderi bir kullanıcıya aittir)
            builder.Entity<Post>()
                .HasOne(p => p.User)           // Her gönderinin bir sahibi var
                .WithMany()                     // Bir kullanıcının birçok gönderisi olabilir
                .HasForeignKey(p => p.UserId)   // Foreign Key: UserId
                .OnDelete(DeleteBehavior.Cascade); // Kullanıcı silinirse gönderileri de silinir

            // ========================================
            // PostLike Entity İlişkileri
            // ========================================
            // Like → Post ilişkisi (Bir beğeni bir gönderiye aittir)
            builder.Entity<PostLike>()
                .HasOne(l => l.Post)            // Her beğeni bir gönderiye aittir
                .WithMany(p => p.Likes)         // Bir gönderinin birçok beğenisi olabilir
                .HasForeignKey(l => l.PostId)   // Foreign Key: PostId
                .OnDelete(DeleteBehavior.Cascade); // Gönderi silinirse beğenileri de silinir

            // Like → User ilişkisi (Bir beğeni bir kullanıcı tarafından yapılır)
            builder.Entity<PostLike>()
                .HasOne(l => l.User)            // Her beğeni bir kullanıcıya aittir
                .WithMany()                     // Bir kullanıcının birçok beğenisi olabilir
                .HasForeignKey(l => l.UserId)   // Foreign Key: UserId
                .OnDelete(DeleteBehavior.Cascade); // Kullanıcı silinirse beğenileri de silinir

            // ========================================
            // PostComment Entity İlişkileri
            // ========================================
            // Comment → Post ilişkisi (Bir yorum bir gönderiye aittir)
            builder.Entity<PostComment>()
                .HasOne(c => c.Post)            // Her yorum bir gönderiye aittir
                .WithMany(p => p.Comments)      // Bir gönderinin birçok yorumu olabilir
                .HasForeignKey(c => c.PostId)   // Foreign Key: PostId
                .OnDelete(DeleteBehavior.Cascade); // Gönderi silinirse yorumları da silinir

            // Comment → User ilişkisi (Bir yorum bir kullanıcı tarafından yapılır)
            builder.Entity<PostComment>()
                .HasOne(c => c.User)            // Her yorum bir kullanıcıya aittir
                .WithMany()                     // Bir kullanıcının birçok yorumu olabilir
                .HasForeignKey(c => c.UserId)   // Foreign Key: UserId
                .OnDelete(DeleteBehavior.Cascade); // Kullanıcı silinirse yorumları da silinir

            // ========================================
            // Message Entity İlişkileri
            // ========================================
            // Message → Sender (Gönderen) ilişkisi
            builder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany()
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict); // Kullanıcı silinirse mesajlar kalsın (referans bozulmasın)

            // Message → Receiver (Alıcı) ilişkisi
            builder.Entity<Message>()
                .HasOne(m => m.Receiver)
                .WithMany()
                .HasForeignKey(m => m.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict); // Kullanıcı silinirse mesajlar kalsın (referans bozulmasın)

            // Mesajlar için index - hızlı sorgulama için
            builder.Entity<Message>()
                .HasIndex(m => new { m.SenderId, m.ReceiverId, m.CreatedAtUtc });
        }
    }
}
