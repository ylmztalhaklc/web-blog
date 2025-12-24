// ========================================
// RESİM MODAL COMPONENT (ImageModal)
// ========================================
// Gönderi, yorum veya mesajlardaki resimleri tam ekran önizlemede gösterir
// Overlay tıklaması veya X butonu ile kapatılabilir

import "../styles/imageModal.css";

/**
 * Image Modal Component
 * @param {String} imageUrl - Gösterilecek resmin URL'i (base64 veya http URL)
 * @param {Function} onClose - Modal'ı kapatma fonksiyonu
 */
function ImageModal({ imageUrl, onClose }) {
  // Resim URL'i yoksa modal'ı gösterme
  if (!imageUrl) return null;

  return (
    // ========================================
    // OVERLAY - Arka planı karartır, tıklandığında modal kapanır
    // ========================================
    <div className="image-modal-overlay" onClick={onClose}>
      
      {/* Modal içeriği - İçine tıklandığında kapanmaz (event propagation durdurulur) */}
      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Kapatma butonu - Sağ üst köşede X işareti */}
        <button className="image-modal-close" onClick={onClose}>
          ✕
        </button>
        
        {/* Tam boyut resim - Responsive, ekrana sığacak şekilde otomatik boyutlandırılır */}
        <img src={imageUrl} alt="Full size" className="image-modal-img" />
      </div>
    </div>
  );
}

export default ImageModal;
