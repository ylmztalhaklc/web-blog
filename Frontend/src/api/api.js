// ========================================
// API İSTEK YÖNETİMİ (Axios Configuration)
// ========================================
// Bu dosya backend API'sine yapılacak tüm HTTP isteklerini yapılandırır

// Axios: HTTP istekleri için kullanılan kütüphane
import axios from "axios";

// ========================================
// Axios Instance Oluşturma
// ========================================
// Backend API'sinin temel URL'si ile önceden yapılandırılmış bir axios instance
const api = axios.create({
  baseURL: "http://localhost:5199/api", // Backend API adresi (ASP.NET Core)
});

// ========================================
// Request Interceptor - JWT Token Ekleme
// ========================================
// Her API isteğinden önce çalışır ve otomatik olarak JWT token ekler
api.interceptors.request.use((config) => {
  // LocalStorage'dan JWT token'ı al
  const token = localStorage.getItem("token");
  
  // Token varsa, isteğin header'ına Authorization olarak ekle
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Güncellenmiş config nesnesini döndür
  return config;
});

// Bu API instance'ını diğer dosyalarda kullanabilmek için export et
export default api;
