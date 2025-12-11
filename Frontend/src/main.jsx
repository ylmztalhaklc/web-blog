// ========================================
// REACT UYGULAMASININ GİRİŞ NOKTASI
// ========================================
// Bu dosya React uygulamasının başlatıldığı ilk dosyadır

// React'in Strict Mode özelliği - geliştirme sırasında uyarılar verir
import { StrictMode } from 'react'
// React DOM'u oluşturma fonksiyonu
import { createRoot } from 'react-dom/client'
// Global CSS stilleri
import './index.css'
// Ana uygulama bileşeni
import App from './App.jsx'

// HTML'deki 'root' elementini bulup React uygulamasını ona bağlar
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Ana App bileşenini render et */}
    <App />
  </StrictMode>,
)
