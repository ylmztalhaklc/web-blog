// ========================================
// EMOJİ SEÇİCİ COMPONENT (EmojiPicker)
// ========================================
// Kullanıcıların mesaj, gönderi ve yorumlara emoji eklemesini sağlar
// Modal overlay şeklinde açılır ve emoji seçimi yapar

import React from 'react';
import '../styles/EmojiPicker.css';

/**
 * Emoji Picker Component
 * @param {Function} onEmojiSelect - Emoji seçildiğinde çağrılan callback fonksiyonu
 * @param {Boolean} show - Modal'ın görünürlük durumu
 * @param {Function} onClose - Modal'ı kapatma fonksiyonu
 */
const EmojiPicker = ({ onEmojiSelect, show, onClose }) => {
  // ========================================
  // EMOJİ KOLEKSİYONU
  // ========================================
  // Kullanıcıya sunulan emoji listesi (yüz ifadeleri, kalpler, semboller)
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
    '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
    '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
    '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
    '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
    '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠',
    '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️',
    '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨',
    '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
    '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬',
    '👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '👏',
    '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦵',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
    '🔥', '✨', '💫', '⭐', '🌟', '💥', '💯', '✔️'
  ];

  // Modal kapalıysa hiçbir şey render etme
  if (!show) return null;

  return (
    // ========================================
    // OVERLAY - Dışarıya tıklandığında modal kapanır
    // ========================================
    <div className="emoji-picker-overlay" onClick={onClose}>
      
      {/* Modal içeriği - İçine tıklandığında kapanmaz (event propagation durdurulur) */}
      <div className="emoji-picker-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Başlık ve kapatma butonu */}
        <div className="emoji-picker-header">
          <span>Select Emoji</span>
          <button className="emoji-picker-close" onClick={onClose}>✕</button>
        </div>
        
        {/* Emoji grid - Tüm emojiler grid layout'ta gösterilir */}
        <div className="emoji-picker-grid">
          {emojis.map((emoji, index) => (
            <button
              key={index}
              className="emoji-button"
              onClick={() => {
                onEmojiSelect(emoji); // Seçilen emoji'yi parent component'e gönder
                onClose(); // Modal'ı kapat
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
