using Microsoft.AspNetCore.Identity;

namespace NotFacebook.Core.Entities
{
    /// <summary>
    /// Kullanıcı Entity Sınıfı
    /// ASP.NET Identity'nin IdentityUser sınıfından türer
    /// Identity özellikleri: Id, UserName, Email, PasswordHash, vb.
    /// </summary>
    public class User : IdentityUser
    {
        // Kullanıcının adı
        public string FirstName { get; set; } = default!;
        
        // Kullanıcının soyadı
        public string LastName  { get; set; } = default!;
        
        // Doğum tarihi (opsiyonel)
        public DateTime? BirthDate { get; set; }
        
        // Cinsiyet (opsiyonel - örn: "Male", "Female", "Other")
        public string? Gender { get; set; }
    }
}
