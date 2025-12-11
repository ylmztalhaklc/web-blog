// ========================================
// GİRİŞ VE KAYIT SAYFASI (AuthPage)
// ========================================
// Bu sayfa kullanıcıların giriş yapmasını veya yeni hesap oluşturmasını sağlar
// Login ve Register formları arasında geçiş yapar

// React Hooks
import { useState } from "react"; // State (durum) yönetimi için
import { useNavigate } from "react-router-dom"; // Sayfa yönlendirmesi için

// ========================================
// Arka Plan Görselleri
// ========================================
import leftBg from "../../Pages/PageBackgroundPics/Log_RegBackgroundLeft.jpg";
import rightBg from "../../Pages/PageBackgroundPics/Log_RegBackgroundRight.jpg";

// ========================================
// Form İkonları
// ========================================
import emailIcon from "../../icons/id-card.png";
import passwordIcon from "../../icons/locked-computer.png";
import userIcon from "../../icons/user (1).png";
import calendarIcon from "../../icons/calendar.png";
import genderIcon from "../../icons/gender.png";

// ========================================
// API Servisi
// ========================================
import api from "../api/api";

function AuthPage() {
  // ========================================
  // STATE TANIMLARI
  // ========================================
  
  // Login/Register form arası geçiş kontrolü (true = Login, false = Register)
  const [isLogin, setIsLogin] = useState(true);

  // Giriş formu verileri
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  // Kayıt formu verileri
  const [registerForm, setRegisterForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "",
    password: "",
    confirmPassword: "",
  });

  // Hata mesajları listesi
  const [errors, setErrors] = useState([]);

  // Doğum tarihi input tipi kontrolü
  // Başta "Birthday" placeholder'lı text, focus olunca date picker'a dönüşür
  const [birthInputType, setBirthInputType] = useState("text");

  // Sayfa yönlendirme fonksiyonu
  const navigate = useNavigate();

  // ========================================
  // YAŞ HESAPLAMA FONKSİYONU
  // ========================================
  // Doğum tarihinden yaşı hesaplar (18 yaş kontrolü için kullanılır)
  const calculateAge = (birthDate) => {
    const today = new Date(); // Bugünün tarihi
    const dob = new Date(birthDate); // Doğum tarihi

    // Yıl farkını hesapla
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();

    // Eğer doğum ayı henüz gelmediyse veya doğum günü henüz geçmediyse yaşı 1 azalt
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return age;
  };

  // ========================================
  // KAYIT FORMU VALIDASYON FONKSİYONU
  // ========================================
  // Backend'e göndermeden önce form verilerini kontrol eder
  const validateRegister = () => {
    const newErrors = [];
    const {
      email,
      firstName,
      lastName,
      birthDate,
      gender,
      password,
      confirmPassword,
    } = registerForm;

    // Zorunlu alan kontrolleri
    if (!email.trim()) newErrors.push("Email is required.");
    if (!firstName.trim()) newErrors.push("Name is required.");
    if (!lastName.trim()) newErrors.push("Surname is required.");

    // Doğum tarihi ve yaş kontrolü
    if (!birthDate) {
      newErrors.push("Birthday is required.");
    } else {
      const age = calculateAge(birthDate);
      if (age < 18) {
        newErrors.push("You must be at least 18 years old.");
      }
    }

    // Cinsiyet kontrolü
    if (!gender) newErrors.push("Gender is required.");

    // Şifre kuralları kontrolü
    if (password.length < 8)
      newErrors.push("Password must be at least 8 characters.");
    if (!/[A-Z]/.test(password))
      newErrors.push("Password must contain at least one uppercase letter.");
    if (!/[0-9]/.test(password))
      newErrors.push("Password must contain at least one number.");

    // Şifre eşleşme kontrolü
    if (password !== confirmPassword)
      newErrors.push("Passwords do not match.");

    return newErrors;
  };

  // ========================================
  // GİRİŞ İŞLEMİ (LOGIN)
  // ========================================
  // POST /api/account/login endpoint'ine istek gönderir
  const handleLoginSubmit = async (e) => {
    e.preventDefault(); // Sayfa yenilenmesini engelle

    try {
      // Önceki hataları temizle
      setErrors([]);

      // Backend'e giriş isteği gönder
      const response = await api.post("/account/login", loginForm);

      console.log("LOGIN SUCCESS:", response.data);

      // Backend'den gelen JWT token'ı localStorage'a kaydet
      localStorage.setItem("token", response.data.token);

      // Başarılı giriş sonrası ana sayfaya yönlendir
      navigate("/home");
    } catch (error) {
      // Hata durumunda konsola yazdır
      console.error("LOGIN ERROR:", error);

      // Hata mesajını kullanıcıya göster
      if (error.response?.data) {
        setErrors(["Login failed: " + JSON.stringify(error.response.data)]);
      } else {
        setErrors(["Invalid email or password."]);
      }
    }
  };

  // ========================================
  // KAYIT İŞLEMİ (REGISTER)
  // ========================================
  // POST /api/account/register endpoint'ine istek gönderir
  const handleRegisterSubmit = async (e) => {
    e.preventDefault(); // Sayfa yenilenmesini engelle
    
    // Önce frontend validasyonunu çalıştır
    const validationErrors = validateRegister();

    // Validasyon hatası varsa backend'e gitmeden hataları göster
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      // Önceki hataları temizle
      setErrors([]);

      // Backend'e kayıt isteği gönder
      const response = await api.post("/account/register", registerForm);

      console.log("REGISTER SUCCESS:", response.data);

      // Başarılı kayıt sonrası kullanıcıyı bilgilendir ve login formuna yönlendir
      alert("Registration successful! You can now log in.");
      setIsLogin(true);
    } catch (error) {
      // Hata durumunda konsola yazdır
      console.error("REGISTER ERROR:", error);

      if (error.response) {
        console.log("RESPONSE DATA:", error.response.data);

        // Backend'den gelen hata formatlarını parse et
        // Format 1: { errors: [...] } şeklinde döndürülmüşse
        if (error.response.data?.errors && Array.isArray(error.response.data.errors)) {
          setErrors(error.response.data.errors);
        }
        // Format 2: Identity default format [ { code, description }, ... ]
        else if (Array.isArray(error.response.data)) {
          const identityErrors = error.response.data.map(
            (e) => e.description || JSON.stringify(e)
          );
          setErrors(identityErrors);
        } 
        // Format 3: Diğer hata formatları
        else {
          setErrors(["Registration failed: " + JSON.stringify(error.response.data)]);
        }
      } else {
        // Network hatası vs.
        setErrors(["Registration failed."]);
      }
    }
  };

  // ========================================
  // COMPONENT RENDER (JSX)
  // ========================================
  return (
    <div className="auth-root">
      {/* ========================================
          SOL TARAF - Dekoratif Arka Plan Görseli
          ======================================== */}
      <div
        className="auth-left"
        style={{ backgroundImage: `url(${leftBg})` }}
      >
        {/* Koyu overlay katmanı */}
        <div className="auth-left-overlay" />
      </div>

      {/* ========================================
          SAĞ TARAF - Form Alanı
          ======================================== */}
      <div
        className="auth-right"
        style={{ backgroundImage: `url(${rightBg})` }}
      >
        {/* Form kartı */}
        <div className="auth-card">
          {/* Uygulama başlığı */}
          <h1 className="auth-title">notFacebook</h1>

          {/* isLogin state'ine göre Login veya Register formu gösterilir */}
          {isLogin ? (
            // ========================================
            // GİRİŞ FORMU (LOGIN FORM)
            // ========================================
            <form onSubmit={handleLoginSubmit}>
              {/* Email input alanı */}
              <div className="auth-input-group">
                <img
                  src={emailIcon}
                  alt="email"
                  className="auth-input-icon"
                />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="Email"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  required
                />
              </div>

              {/* Şifre input alanı */}
              <div className="auth-input-group">
                <img
                  src={passwordIcon}
                  alt="password"
                  className="auth-input-icon"
                />
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  required
                />
              </div>

              {/* Hata mesajları - varsa göster */}
              {errors.length > 0 && (
                <div className="auth-error-box">
                  {errors.map((err, idx) => (
                    <p key={idx}>{err}</p>
                  ))}
                </div>
              )}

              {/* Login butonu */}
              <button type="submit" className="auth-button auth-button-primary">
                Login
              </button>

              {/* Ayırıcı */}
              <div className="auth-or">Or</div>

              {/* Register formuna geçiş butonu */}
              <button
                type="button"
                className="auth-button auth-button-secondary"
                onClick={() => {
                  setIsLogin(false); // Register formuna geç
                  setErrors([]); // Hataları temizle
                }}
              >
                Sign up
              </button>
            </form>
          ) : (
            // ========================================
            // KAYIT FORMU (REGISTER FORM)
            // ========================================
            <form onSubmit={handleRegisterSubmit}>
              {/* Email input alanı */}
              <div className="auth-input-group">
                <img src={emailIcon} alt="email" className="auth-input-icon" />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="Email"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      email: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {/* Ad (First Name) input alanı */}
              <div className="auth-input-group">
                <img src={userIcon} alt="name" className="auth-input-icon" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Name"
                  value={registerForm.firstName}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      firstName: e.target.value,
                    })
                  }
                />
              </div>

              {/* SURNAME */}
              <div className="auth-input-group">
                <img src={userIcon} alt="surname" className="auth-input-icon" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Surname"
                  value={registerForm.lastName}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      lastName: e.target.value,
                    })
                  }
                />
              </div>

              {/* BIRTHDAY */}
              <div className="auth-input-group">
                <img
                  src={calendarIcon}
                  alt="birthday"
                  className="auth-input-icon"
                />
                <input
                  type={birthInputType}
                  className="auth-input"
                  placeholder="Birthday"
                  value={registerForm.birthDate}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      birthDate: e.target.value,
                    })
                  }
                  onFocus={() => setBirthInputType("date")}
                  onBlur={(e) => {
                    if (!e.target.value) {
                      setBirthInputType("text");
                    }
                  }}
                />
              </div>

              {/* GENDER */}
              <div className="auth-input-group">
                <img
                  src={genderIcon}
                  alt="gender"
                  className="auth-input-icon"
                />
                <select
                  className="auth-input auth-select"
                  value={registerForm.gender}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      gender: e.target.value,
                    })
                  }
                  style={registerForm.gender ? {} : { color: "#7f9bb8" }}
                >
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* PASSWORD */}
              <div className="auth-input-group">
                <img
                  src={passwordIcon}
                  alt="password"
                  className="auth-input-icon"
                />
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Password"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password: e.target.value,
                    })
                  }
                />
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="auth-input-group">
                <img
                  src={passwordIcon}
                  alt="confirm password"
                  className="auth-input-icon"
                />
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Confirm Password"
                  value={registerForm.confirmPassword}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>

              {errors.length > 0 && (
                <div className="auth-error-box">
                  {errors.map((err, idx) => (
                    <p key={idx}>{err}</p>
                  ))}
                </div>
              )}

              <button type="submit" className="auth-button auth-button-secondary">
                Sign up
              </button>

              <div className="auth-or">Or</div>

              <button
                type="button"
                className="auth-button auth-button-primary"
                onClick={() => {
                  setIsLogin(true);
                  setErrors([]);
                }}
              >
                Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
