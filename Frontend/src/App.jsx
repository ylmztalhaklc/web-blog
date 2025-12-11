// ========================================
// ANA UYGULAMA BİLEŞENİ (App Component)
// ========================================
// Bu dosya uygulamanın tüm sayfa yönlendirmelerini (routing) yönetir

// ========================================
// CSS Dosyaları
// ========================================
// Kimlik doğrulama sayfası stilleri
import "./styles/auth.css";
// Ana sayfa (feed) stilleri
import "./styles/home.css";

// ========================================
// React Router - Sayfa Yönlendirme
// ========================================
import { BrowserRouter, Routes, Route } from "react-router-dom";

// ========================================
// Sayfa Bileşenleri
// ========================================
// Giriş ve kayıt sayfası
import AuthPage from "./pages/AuthPage";
// Ana sayfa (feed, gönderiler)
import HomePage from "./pages/HomePage";
// Kullanıcı profil sayfası
import UserProfilePage from "./pages/UserProfilePage";

function App() {
  return (
    // BrowserRouter: Tarayıcı URL'lerini yönetir
    <BrowserRouter>
      {/* Routes: Farklı URL'ler için hangi sayfaların gösterileceğini tanımlar */}
      <Routes>
        {/* Kök URL (/) - İlk açılışta giriş/kayıt sayfası */}
        <Route path="/" element={<AuthPage />} />

        {/* /home URL'si - Giriş yapıldıktan sonra ana sayfa */}
        <Route path="/home" element={<HomePage />} />

        {/* /profile/:userId - Kullanıcı profil sayfası */}
        <Route path="/profile/:userId" element={<UserProfilePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
