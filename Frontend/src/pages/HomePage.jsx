// ========================================
// ANA SAYFA (HomePage) - Feed ve Sosyal İnteraksiyon
// ========================================
// Bu sayfa giriş yapmış kullanıcıların gönderileri gördüğü,
// yorum ve beğeni yapabildiği, kullanıcıları takip edebildiği ana feed sayfasıdır

// React Hooks
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import EmojiPicker from "../components/EmojiPicker";
import ImageModal from "../components/ImageModal";

// ========================================
// Arka Plan Görseli
// ========================================
import pageBackground from "../../Pages/PageBackgroundPics/Log_RegBackgroundRight.jpg";

// ========================================
// Profil Avatar Görselleri
// ========================================
// Erkek kullanıcılar için avatar seçenekleri
import male1 from "../../PersonIcon/IconMale.jpg";
import male2 from "../../PersonIcon/IconMale2.jpg";
import male3 from "../../PersonIcon/IconMale3.jpg";
import male4 from "../../PersonIcon/IconMale4.jpg";
import male5 from "../../PersonIcon/IconMale5.jpg";
// Kadın kullanıcılar için avatar seçenekleri
import female1 from "../../PersonIcon/IconFemale.jpg";
import female2 from "../../PersonIcon/IconFemale2.jpg";

// ========================================
// UI İkonları - Unicode Emoji kullanıyoruz
// ========================================
// Modern görünüm için emoji karakterler kullanılıyor
import searchIcon from "../../icons/Search.jpg";

// Sayfa stilleri
import "../styles/home.css";

// ========================================
// Avatar Dizileri
// ========================================
const maleIcons = [male1, male2, male3, male4, male5];
const femaleIcons = [female1, female2];

// ========================================
// AVATAR SEÇİM FONKSİYONU
// ========================================
// Her kullanıcıya cinsiyet ve ID'sine göre tutarlı bir avatar atar
// Aynı kullanıcı her zaman aynı avatar'ı görür (hash bazlı seçim)
function getAvatarByGenderAndId(gender, id) {
  const g = (gender || "Other").toLowerCase();
  let icons = null;

  // Cinsiyete göre avatar dizisini seç
  if (g === "male") icons = maleIcons;
  else if (g === "female") icons = femaleIcons;
  else return null; // "Other" veya tanımsız → siyah boş avatar gösterilecek

  // Kullanıcı ID'sinden bir hash değeri oluştur
  let hash = 0;
  if (id) {
    for (let i = 0; i < id.length; i++) {
      hash = (hash + id.charCodeAt(i)) | 0;
    }
  }

  // Hash değerini kullanarak avatar dizisinden bir öğe seç
  const index = Math.abs(hash) % icons.length;
  return icons[index];
}

function HomePage() {
  // Sayfa yönlendirme fonksiyonu
  const navigate = useNavigate();

  // ========================================
  // STATE TANIMLARI
  // ========================================
  
  // Mevcut kullanıcı bilgileri
  const [currentUser, setCurrentUser] = useState(null);
  // Tüm kullanıcılar listesi (takip edilebilir kişiler)
  const [friends, setFriends] = useState([]);
  // Takipçiler listesi (beni takip edenler)
  const [followers, setFollowers] = useState([]);
  // Gönderiler (feed)
  const [posts, setPosts] = useState([]);

  // Yeni gönderi metni
  const [newPostText, setNewPostText] = useState("");
  
  // ========================================
  // POST RESİM YÜKLEME STATE'LERİ
  // ========================================
  // Yüklenen resim dosyası (File object)
  const [newPostImage, setNewPostImage] = useState(null);
  // Resim önizlemesi (data URL formatında)
  const [newPostImagePreview, setNewPostImagePreview] = useState(null);
  
  // Arkadaş arama filtresi
  const [friendSearch, setFriendSearch] = useState("");
  // Her gönderi için yorum metinleri (postId: commentText)
  const [commentTexts, setCommentTexts] = useState({});
  // Yükleme durumu
  const [loading, setLoading] = useState(true);

  // Yorumları açık olan gönderinin ID'si (null = hiçbiri açık değil)
  const [openCommentsFor, setOpenCommentsFor] = useState(null);

  // ========================================
  // POST DÜZENLEME STATE'LERİ
  // ========================================
  // Düzenlenen post'un ID'si (null = hiçbir post düzenlenmiyorsa)
  const [editingPost, setEditingPost] = useState(null);
  // Düzenleme için geçici metin
  const [editContent, setEditContent] = useState("");
  // Düzenleme için resim
  const [editImage, setEditImage] = useState(null);
  
  // Resim önizleme modal
  const [imageModal, setImageModal] = useState(null);

  // ========================================
  // MESAJLAŞMA STATE'LERİ
  // ========================================
  const [messagePanelOpen, setMessagePanelOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [messageImage, setMessageImage] = useState(null);
  const [messageImagePreview, setMessageImagePreview] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [editingMessageImage, setEditingMessageImage] = useState(null);
  const [editingMessageImagePreview, setEditingMessageImagePreview] = useState(null);
  
  // Okunmamış mesaj sayıları (userId: count)
  const [unreadCounts, setUnreadCounts] = useState({});

  // ========================================
  // YORUM RESİM STATE'LERİ
  // ========================================
  const [commentImages, setCommentImages] = useState({}); // { postId: imageBase64 }
  const [commentImagePreviews, setCommentImagePreviews] = useState({}); // { postId: previewUrl }

  // ========================================
  // EMOJI PICKER STATE'LERİ
  // ========================================
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState(null); // 'newPost' | 'edit-post' | 'comment-{postId}' | 'message' | 'editMessage'

  // ========================================
  // YORUM DÜZENLEME STATE'LERİ
  // ========================================
  // Düzenlenen yorumun ID'si (null = hiçbir yorum düzenlenmiyorsa)
  const [editingCommentId, setEditingCommentId] = useState(null);
  // Düzenleme için geçici yorum metni
  const [editCommentText, setEditCommentText] = useState("");

  // ========================================
  // MEMOIZED DEĞERLER
  // ========================================
  // Mevcut kullanıcının avatar'ını hesapla ve cache'le
  // currentUser değişmedikçe yeniden hesaplanmaz (performans optimizasyonu)
  const avatarSrc = useMemo(() => {
    if (!currentUser) return null;
    return getAvatarByGenderAndId(currentUser.gender, currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // 🔹 Eski haline yakın: followers HARİÇ hepsini Promise.all ile al
        const [meRes, usersRes, followingRes, feedRes, unreadRes] = await Promise.all([
          api.get("/account/me"),
          api.get("/account/users"),
          api.get("/follow/following"),
          api.get("/posts/feed"),
          api.get("/messages/unread-counts"),
        ]);

        const me = meRes.data;
        setCurrentUser(me);

        const allUsers = usersRes.data || [];
        const others = allUsers.filter((u) => u.id !== me.id);

        const mappedFriends = others.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          avatar: getAvatarByGenderAndId(u.gender, u.id),
          isFollowing: false,
        }));

        const followingIds = followingRes.data || [];

        const friendsWithFollow = mappedFriends.map((f) => ({
          ...f,
          isFollowing: followingIds.includes(f.id),
        }));

        setFriends(friendsWithFollow);
        setPosts(feedRes.data || []);
        setUnreadCounts(unreadRes.data || {});

        // 🔹 Followers endpoint'i opsiyonel: varsa kullan, yoksa [] bırak
        try {
          const followersRes = await api.get("/follow/followers");
          const rawFollowers = followersRes.data || [];
          const mappedFollowers = rawFollowers.map((u) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`,
          }));
          setFollowers(mappedFollowers);
        } catch (innerErr) {
          console.warn(
            "FOLLOWERS endpoint bulunamadı veya hata verdi, followers = []. Detay:",
            innerErr
          );
          setFollowers([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("HOME FETCH ERROR:", err);
        navigate("/"); // token bozuk vs ise login'e geri dönsün
      }
    };

    fetchAll();
  }, [navigate]);

  // Profil sayfasından mesaj açma kontrolü
  useEffect(() => {
    const openChatUserId = localStorage.getItem('openChatWithUser');
    if (openChatUserId && friends.length > 0) {
      localStorage.removeItem('openChatWithUser');
      const friend = friends.find(f => f.id === openChatUserId);
      if (friend) {
        handleOpenChat(friend);
      }
    }
  }, [friends]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString();
  };

  // ========================================
  // EMOJI PICKER FONKSİYONLARI
  // ========================================
  const handleEmojiSelect = (emoji) => {
    if (emojiTarget === 'newPost') {
      setNewPostText(prev => prev + emoji);
    } else if (emojiTarget === 'edit-post') {
      setEditContent(prev => prev + emoji);
    } else if (emojiTarget?.startsWith('comment-')) {
      const postId = emojiTarget.split('-')[1];
      setCommentTexts(prev => ({
        ...prev,
        [postId]: (prev[postId] || '') + emoji
      }));
    } else if (emojiTarget === 'message') {
      setNewMessage(prev => prev + emoji);
    } else if (emojiTarget === 'edit-message') {
      setEditingMessageText(prev => prev + emoji);
    }
  };

  const openEmojiPicker = (target) => {
    setEmojiTarget(target);
    setShowEmojiPicker(true);
  };

  // ========================================
  // RESİM YÜKLEME FONKSİYONLARI
  // ========================================
  
  // Resim seçildiğinde - File input'tan dosya seçildi
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // FileReader ile resim önizlemesi oluştur
    // readAsDataURL: Dosyayı base64 data URL'e dönüştürür
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPostImagePreview(reader.result); // Önizleme için img src'de kullanılacak
    };
    reader.readAsDataURL(file);
    setNewPostImage(file); // Orijinal dosyayı sakla (backend'e gönderilecek)
  };

  // Resmi kaldır - Kullanıcı seçilen resmi iptal etmek isterse
  const handleRemoveImage = () => {
    setNewPostImage(null);
    setNewPostImagePreview(null);
  };

  // ========================================
  // POST GÖNDERME FONKSİYONU
  // ========================================
  
  // Yeni post oluştur - Metin ve/veya resim içerebilir
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    // Validasyon: En az metin veya resim olmalı
    if (!newPostText.trim() && !newPostImage) {
      alert("Please enter some text or select an image.");
      return;
    }

    try {
      // FormData kullanarak resim yükleme (multipart/form-data)
      // Bu sayede hem metin hem dosya gönderilebilir
      const formData = new FormData();
      formData.append("content", newPostText.trim());
      if (newPostImage) {
        console.log("Image file selected:", newPostImage.name, newPostImage.type, newPostImage.size);
        formData.append("imageFile", newPostImage); // File object
      }

      // FormData içeriğini logla
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      // Backend'e POST isteği - Content-Type otomatik multipart/form-data olur
      const res = await api.post("/posts", formData);
      console.log("Post created successfully:", res.data);
      
      // Yeni postu ekle ve düzenleme zamanına göre sırala
      setPosts((prev) => 
        [res.data, ...prev].sort((a, b) => {
          const timeA = a.updatedAt || a.createdAt;
          const timeB = b.updatedAt || b.createdAt;
          return new Date(timeB) - new Date(timeA);
        })
      );
      
      // Formu temizle
      setNewPostText("");
      setNewPostImage(null);
      setNewPostImagePreview(null);
    } catch (err) {
      console.error("CREATE POST ERROR:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      const errorMsg = typeof err.response?.data === 'string' 
        ? err.response.data 
        : JSON.stringify(err.response?.data) || err.message;
      alert(`Failed to create post: ${errorMsg}`);
    }
  };

  // Like toggle
  const handleToggleLike = async (postId) => {
    try {
      const res = await api.post(`/posts/${postId}/like`);
      const updated = res.data;
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      console.error("LIKE ERROR:", err);
    }
  };

  // Comment ekle
  const handleAddComment = async (postId) => {
    const text = (commentTexts[postId] || "").trim();
    const image = commentImages[postId];
    
    if (!text && !image) return;

    try {
      const formData = new FormData();
      if (text) formData.append("Text", text);
      if (image) formData.append("ImageBase64", image);
      
      const res = await api.post(`/posts/${postId}/comments`, formData);
      const updated = res.data;
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setCommentTexts((prev) => ({ ...prev, [postId]: "" }));
      setCommentImages((prev) => ({ ...prev, [postId]: null }));
      setCommentImagePreviews((prev) => ({ ...prev, [postId]: null }));
    } catch (err) {
      console.error("COMMENT ERROR:", err);
    }
  };

  // Yorum için resim ekleme
  const handleCommentImageSelect = (postId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCommentImages(prev => ({ ...prev, [postId]: reader.result }));
      setCommentImagePreviews(prev => ({ ...prev, [postId]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Yorum resmi kaldırma
  const handleRemoveCommentImage = (postId) => {
    setCommentImages(prev => ({ ...prev, [postId]: null }));
    setCommentImagePreviews(prev => ({ ...prev, [postId]: null }));
  };

  // Follow toggle
  const handleToggleFollow = async (friendId) => {
    try {
      const res = await api.post(`/follow/${friendId}`);
      const { isFollowing } = res.data;

      setFriends((prev) =>
        prev.map((f) => (f.id === friendId ? { ...f, isFollowing } : f))
      );

      // feed'i güncelle
      const feedRes = await api.get("/posts/feed");
      setPosts(feedRes.data || []);

      // followers listesi değişmiş olabilir, tekrar çek
      try {
        const followersRes = await api.get("/follow/followers");
        const rawFollowers = followersRes.data || [];
        const mappedFollowers = rawFollowers.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
        }));
        setFollowers(mappedFollowers);
      } catch (innerErr) {
        console.warn("FOLLOWERS refresh hata:", innerErr);
      }
    } catch (err) {
      console.error("FOLLOW ERROR:", err);
    }
  };

  // ========================================
  // POST DÜZENLEME FONKSİYONLARI
  // ========================================
  
  // Post düzenleme modunu aç - Inline editing
  const handleStartEdit = (post) => {
    setEditingPost(post.id); // Hangi post düzenleniyor
    setEditContent(post.content || ""); // Mevcut içeriği textarea'ya yükle
    setEditImage(post.imageBase64 || null); // Mevcut resmi yükle
  };

  // Post düzenlemeyi iptal et - Değişiklikleri kaydetmeden kapat
  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditContent("");
    setEditImage(null);
  };

  // Düzenleme sırasında resim silme
  const handleRemoveEditImage = () => {
    setEditImage(null);
  };

  // Düzenleme sırasında yeni resim ekleme
  const handleEditImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Post güncellemesini kaydet - Backend'e PUT isteği gönder
  const handleSaveEdit = async (postId) => {
    // Validasyon: İçerik veya resim olmalı
    if (!editContent.trim() && !editImage) {
      alert("Post cannot be empty!");
      return;
    }

    try {
      // FormData kullanarak güncelleme isteği gönder
      const formData = new FormData();
      formData.append("content", editContent || "");
      
      if (editImage && editImage.startsWith('data:image')) {
        // Resim var ve base64 formatında
        formData.append("ImageBase64", editImage);
      } else if (!editImage) {
        // Resim silindi - boş string gönder
        formData.append("ImageBase64", "");
      }
      
      // Backend'e güncelleme isteği gönder
      const res = await api.put(`/posts/${postId}`, formData);
      const updated = res.data;
      
      // Local state'i güncelle ve düzenleme zamanına göre sırala
      setPosts((prev) => 
        prev.map((p) => (p.id === updated.id ? updated : p))
          .sort((a, b) => {
            const timeA = a.updatedAt || a.createdAt;
            const timeB = b.updatedAt || b.createdAt;
            return new Date(timeB) - new Date(timeA);
          })
      );
      
      // Düzenleme modundan çık
      setEditingPost(null);
      setEditContent("");
      setEditImage(null);
    } catch (err) {
      console.error("UPDATE POST ERROR:", err);
      alert("Failed to update post.");
    }
  };

  // ========================================
  // POST SİLME FONKSİYONU
  // ========================================
  
  // Post'u soft delete ile sil - "Bu post silindi" mesajına dönüşür
  // Mesajlarla aynı şekilde çalışır, tamamen silinmez
  const handleDeletePost = async (postId) => {
    // Onay dialogu - Kullanıcının yanlışlıkla silmesini engelle
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      // Backend'e DELETE isteği gönder
      const res = await api.delete(`/posts/${postId}`);
      const deleted = res.data;
      
      // Local state'i güncelle - Post "Bu post silindi" mesajına dönüşür
      // isDeleted = true olan postlar UI'da özel olarak gösterilir
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return { ...p, content: "Bu post silindi", imageBase64: null, isDeleted: true };
          }
          return p;
        })
      );
    } catch (err) {
      console.error("DELETE POST ERROR:", err);
      alert("Failed to delete post.");
    }
  };

  // ========================================
  // MESAJLAŞMA PANELİ AÇMA/KAPAMA
  // ========================================
  
  // Mesajlaşma panelini aç
  const handleOpenChat = async (friend) => {
    // Mesajları backend'den çek
    try {
      const res = await api.get(`/messages/with/${friend.id}`);
      setMessages(res.data || []);
      setSelectedChatUser(friend);
      setMessagePanelOpen(true);

      // Mesajları okundu olarak işaretle ve unread sayacını sıfırla
      try {
        await api.post(`/messages/mark-read/${friend.id}`);
        setUnreadCounts(prev => {
          const updated = {...prev};
          delete updated[friend.id]; // Sayacı tamamen kaldır
          return updated;
        });
      } catch (markErr) {
        console.warn("Mark as read failed:", markErr);
      }
    } catch (err) {
      console.error("LOAD MESSAGES ERROR:", err);
    }
  };

  // Mesajlaşma panelini kapat
  const handleCloseChat = () => {
    setMessagePanelOpen(false);
    setSelectedChatUser(null);
  };

  // ========================================
  // YORUM DÜZENLEME FONKSİYONLARI
  // ========================================
  
  // Mesaj düzenleme modunu başlat
  const handleStartEditMessage = (msg) => {
    setEditingMessageId(msg.id);
    setEditingMessageText(msg.content || '');
    setEditingMessageImage(msg.imageBase64 || null);
    setEditingMessageImagePreview(msg.imageBase64 || null);
  };

  // Mesaj düzenleme iptal
  const handleCancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingMessageText('');
    setEditingMessageImage(null);
    setEditingMessageImagePreview(null);
  };

  // Düzenleme mesaj resmi seç
  const handleEditMessageImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingMessageImage(reader.result);
      setEditingMessageImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Düzenleme mesaj resmini kaldır
  const handleRemoveEditMessageImage = () => {
    setEditingMessageImage(null);
    setEditingMessageImagePreview(null);
  };

  // Yorum düzenleme modunu başlat
  const handleStartEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.text);
  };

  // Yorum düzenlemeden vazgeç
  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentText("");
  };

  // Düzenlenen yorumu kaydet
  const handleSaveEditComment = async () => {
    if (!editCommentText.trim()) {
      alert("Comment cannot be empty!");
      return;
    }

    try {
      // Backend'e güncelleme isteği gönder
      const res = await api.put(`/posts/comments/${editingCommentId}`, {
        text: editCommentText,
      });
      const updatedPost = res.data;
      
      // Local state'i güncelle - Tüm postu yeniden alıyoruz (yorumlarla birlikte)
      setPosts((prev) =>
        prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
      );
      
      // Düzenleme modundan çık
      setEditingCommentId(null);
      setEditCommentText("");
    } catch (err) {
      console.error("EDIT COMMENT ERROR:", err);
      alert("Failed to edit comment.");
    }
  };

  // ========================================
  // MESAJ RESİM YÜKLEME
  // ========================================
  
  // Mesaja eklenecek resmi seç - FileReader ile önizleme oluştur
  const handleMessageImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Base64 önizleme oluştur
    const reader = new FileReader();
    reader.onloadend = () => {
      setMessageImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    setMessageImage(file); // Orijinal dosyayı sakla
  };

  // Mesaj resmini kaldır - Kullanıcı seçtiği resimden vazgeçerse
  const handleRemoveMessageImage = () => {
    setMessageImage(null);
    setMessageImagePreview(null);
  };

  // ========================================
  // MESAJ GÖNDERME FONKSİYONU
  // ========================================
  
  // Yeni mesaj gönder - Metin ve/veya resim içerebilir
  const handleSendMessage = async (e) => {
    e.preventDefault();
    // Validasyon: En az metin veya resim olmalı
    if (!newMessage.trim() && !messageImage) return;
    if (!selectedChatUser) return;

    try {
      // FormData ile resim yükleme (multipart/form-data)
      const formData = new FormData();
      formData.append("receiverId", selectedChatUser.id); // Alıcı ID
      formData.append("content", newMessage); // Mesaj metni
      if (messageImage) {
        console.log("Message image file:", messageImage.name, messageImage.type, messageImage.size);
        formData.append("imageFile", messageImage); // Resim dosyası
      }

      // FormData içeriğini logla
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      // Backend'e POST isteği - Mesaj veritabanına kaydedilir
      const res = await api.post("/messages", formData);
      console.log("Message sent successfully:", res.data);

      // Yeni mesajı chat'in sonuna ekle (en altta görünür)
      setMessages((prev) => [...prev, res.data]);
      
      // Input'ları temizle
      setNewMessage("");
      setMessageImage(null);
      setMessageImagePreview(null);
    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      alert(`Failed to send message: ${err.response?.data || err.message}`);
    }
  };

  // ========================================
  // MESAJ DÜZENLEME FONKSİYONLARI
  // ========================================
  
  // Mesaj düzenlemeyi kaydet - Backend'e PUT isteği gönder
  const handleSaveEditMessage = async (messageId) => {
    // Validasyon: içerik veya resim olmalı
    if (!editingMessageText.trim() && !editingMessageImage) {
      alert("Message cannot be empty!");
      return;
    }

    try {
      const formData = new FormData();
      if (editingMessageText.trim()) formData.append("Content", editingMessageText);
      if (editingMessageImage) formData.append("ImageBase64", editingMessageImage);

      // Backend'e düzenleme isteği gönder
      const res = await api.put(`/messages/${messageId}`, formData);

      // Local state'i güncelle ve düzenleme zamanına göre sırala
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? res.data : m))
          .sort((a, b) => {
            const timeA = new Date(a.editedAt || a.createdAt);
            const timeB = new Date(b.editedAt || b.createdAt);
            return timeA - timeB;
          })
      );
      
      // Düzenleme modundan çık
      handleCancelEditMessage();
    } catch (err) {
      console.error("EDIT MESSAGE ERROR:", err);
      alert("Failed to edit message.");
    }
  };

  // ========================================
  // MESAJ SİLME FONKSİYONU
  // ========================================
  
  // Mesaj sil - Soft delete (WhatsApp benzeri)
  // Mesaj "Bu mesaj silindi" olarak görünür ama tamamen silinmez
  const handleDeleteMessage = async (messageId) => {
    // Kullanıcıdan onay al
    if (!window.confirm("Are you sure you want to delete this message?")) {
      return;
    }

    try {
      // Backend'e silme isteği gönder
      const res = await api.delete(`/messages/${messageId}`);
      
      // Local state'i güncelle - mesaj tamamen silinmez, içeriği değişir
      // Backend'den gelen mesaj: content="Bu mesaj silindi", isDeleted=true, image=null
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? res.data : m))
      );
    } catch (err) {
      console.error("DELETE MESSAGE ERROR:", err);
      alert("Failed to delete message.");
    }
  };

  const filteredFriends = useMemo(() => {
    const q = friendSearch.toLowerCase();
    const filtered = friends.filter((f) => f.name.toLowerCase().includes(q));
    
    // Okunmamış mesajı olanlara göre sırala (en fazla unread en üstte)
    return filtered.sort((a, b) => {
      const countA = unreadCounts[a.id] || 0;
      const countB = unreadCounts[b.id] || 0;
      return countB - countA; // Descending order
    });
  }, [friends, friendSearch, unreadCounts]);

  if (loading) {
    return (
      <div
        className="home-root"
        style={{ backgroundImage: `url(${pageBackground})` }}
      >
        <div className="home-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="home-root"
      style={{ backgroundImage: `url(${pageBackground})` }}
    >
      {/* Profil kartı */}
      <div className="home-profile-card">
        {avatarSrc ? (
          <img src={avatarSrc} alt="profile" className="home-profile-avatar" />
        ) : (
          <div className="home-profile-avatar home-avatar-empty" />
        )}
        <div className="home-profile-info">
          <div 
            className="home-profile-name clickable-name"
            onClick={() => currentUser && navigate(`/profile/${currentUser.id}`)}
          >
            {currentUser
              ? `${currentUser.firstName} ${currentUser.lastName}`
              : "User"}
          </div>

          {/* Followers info + tooltip */}
          <div className="home-profile-followers">
            Followers: {followers.length}
            {followers.length > 0 && (
              <div className="home-profile-followers-tooltip">
                {followers.map((f) => (
                  <div key={f.id} className="home-profile-follower-row">
                    {f.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="home-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Ana içerik */}
      <div className="home-main">
        {/* Sol kolon: post input + feed */}
        <div className="home-left-column">
          {/* Post input */}
          <form className="home-tweet-input-card" onSubmit={handlePostSubmit}>
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="me"
                className="home-tweet-input-avatar"
              />
            ) : (
              <div className="home-tweet-input-avatar home-avatar-empty" />
            )}

            <div className="home-tweet-input-right">
              <div className="home-tweet-input-top">
                <input
                  type="text"
                  className="home-tweet-input"
                  placeholder="What do you think today?"
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                />
                <button type="submit" className="home-send-btn">
                  <span className="icon-emoji">📤</span>
                </button>
              </div>
              
              {/* Resim önizlemesi */}
              {newPostImagePreview && (
                <div className="home-image-preview-wrapper">
                  <img 
                    src={newPostImagePreview} 
                    alt="preview" 
                    className="home-image-preview"
                  />
                  <button 
                    type="button"
                    className="home-image-remove-btn"
                    onClick={handleRemoveImage}
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="home-tweet-input-bottom">
                <label className="home-upload-btn">
                  📷 Add Photo
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleImageSelect}
                  />
                </label>
                <button 
                  type="button"
                  className="emoji-trigger-btn"
                  onClick={() => openEmojiPicker('newPost')}
                  title="Add emoji"
                >
                  😊
                </button>
              </div>
            </div>
          </form>

          {/* Feed */}
          <div className="home-tweet-list">
            {posts.length === 0 ? (
              <div className="home-tweet-card">
                <div className="home-tweet-text">
                  No posts yet. Share something!
                </div>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="home-tweet-card">
                  <div className="home-tweet-header">
                    <div className="home-tweet-header-left">
                      {/* Author avatar gender + id'ye göre */}
                      {(() => {
                        const src = getAvatarByGenderAndId(
                          post.author.gender,
                          post.author.id
                        );
                        return src ? (
                          <img
                            src={src}
                            alt={post.author.name}
                            className="home-tweet-avatar"
                          />
                        ) : (
                          <div className="home-tweet-avatar home-avatar-empty" />
                        );
                      })()}

                      <div className="home-tweet-author-info">
                        <div 
                          className="home-tweet-author-name clickable-name"
                          onClick={() => navigate(`/profile/${post.author.id}`)}
                        >
                          {post.author.name}
                        </div>
                      </div>
                    </div>
                    <div className="home-tweet-time">
                      {post.updatedAt 
                        ? `${formatDate(post.updatedAt)} (edited)` 
                        : formatDate(post.createdAt)}
                    </div>
                  </div>

                  {/* Post içeriği veya düzenleme modu */}
                  {editingPost === post.id ? (
                    <div className="home-edit-post-box">
                      <div className="home-edit-input-row">
                        <textarea
                          className="home-edit-post-textarea"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="What's on your mind?"
                        />
                        <button
                          type="button"
                          className="emoji-trigger-btn"
                          onClick={() => openEmojiPicker('edit-post')}
                          title="Add emoji"
                        >
                          😊
                        </button>
                      </div>
                      
                      {/* Mevcut veya yeni resim önizleme */}
                      {editImage && (
                        <div className="home-edit-image-preview">
                          <img src={editImage} alt="preview" />
                          <button
                            type="button"
                            className="home-remove-image-btn"
                            onClick={handleRemoveEditImage}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      
                      <div className="home-edit-post-buttons">
                        <label className="home-image-upload-label">
                          📷 {editImage ? 'Change' : 'Add'} Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleEditImageUpload}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <button
                          className="home-edit-save-btn"
                          onClick={() => handleSaveEdit(post.id)}
                        >
                          Save
                        </button>
                        <button
                          className="home-edit-cancel-btn"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {post.content && (
                        <div className={`home-tweet-text ${post.isDeleted ? 'deleted-post' : ''}`}>
                          {post.content}
                        </div>
                      )}
                      {post.imageBase64 && !post.isDeleted && (
                        <div className="home-tweet-image-wrapper">
                          <img 
                            src={post.imageBase64} 
                            alt="post" 
                            className="home-tweet-image"
                            onClick={() => setImageModal(post.imageBase64)}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Butonlar - sadece silinmemiş postlar için */}
                  {!post.isDeleted && (
                    <div className="home-tweet-footer">
                    {/* LIKE butonu + tooltip (kimler beğendi) */}
                    <button
                      type="button"
                      className={
                        post.isLikedByCurrentUser
                          ? "home-tweet-footer-btn liked"
                          : "home-tweet-footer-btn"
                      }
                      onClick={() => handleToggleLike(post.id)}
                    >
                      <span className="icon-emoji">❤️</span>
                      <span>{post.likeCount}</span>

                      {post.likeCount > 0 && (
                        <div className="home-like-tooltip">
                          {post.likes.map((l) => l.name).join(", ")}
                        </div>
                      )}
                    </button>

                    {/* COMMENTS */}
                    <button
                      type="button"
                      className="home-tweet-footer-btn"
                      onClick={() =>
                        setOpenCommentsFor((prev) =>
                          prev === post.id ? null : post.id
                        )
                      }
                    >
                      <span className="icon-emoji">💬</span>
                      <span>{post.commentCount}</span>
                    </button>

                    {/* Düzenle/Sil butonları - sadece post sahibi için */}
                    {post.isOwner && editingPost !== post.id && (
                      <>
                        <button
                          type="button"
                          className="home-tweet-edit-btn"
                          onClick={() => handleStartEdit(post)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="home-tweet-delete-btn"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                    </div>
                  )}

                  {/* Comments paneli - sadece silinmemiş postlar için */}
                  {!post.isDeleted && openCommentsFor === post.id && (
                    <div className="home-comments-box">
                      {post.comments.length === 0 ? (
                        <div className="home-no-comments">
                          No comments yet.
                        </div>
                      ) : (
                        post.comments.map((c, idx) => (
                          <div key={idx} className="home-comment-row">
                            {/* Yorum sahibinin gerçek avatarı */}
                            {(() => {
                              const src = getAvatarByGenderAndId(
                                c.gender,
                                c.userId
                              );
                              return src ? (
                                <img
                                  src={src}
                                  className="home-comment-avatar"
                                />
                              ) : (
                                <div className="home-comment-avatar home-avatar-empty" />
                              );
                            })()}
                            <div className="home-comment-content">
                              <span 
                                className="home-comment-user clickable-name"
                                onClick={() => navigate(`/profile/${c.userId}`)}
                              >
                                {c.name}
                              </span>
                              
                              {/* Düzenleme modu: Inline input */}
                              {editingCommentId === c.id ? (
                                <div className="home-edit-comment-box">
                                  <input
                                    type="text"
                                    className="home-edit-comment-input"
                                    value={editCommentText}
                                    onChange={(e) => setEditCommentText(e.target.value)}
                                  />
                                  <div className="home-edit-comment-buttons">
                                    <button
                                      type="button"
                                      className="home-save-comment-btn"
                                      onClick={handleSaveEditComment}
                                    >
                                      Kaydet
                                    </button>
                                    <button
                                      type="button"
                                      className="home-cancel-comment-btn"
                                      onClick={handleCancelEditComment}
                                    >
                                      İptal
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="home-comment-text-row">
                                    <span className="home-comment-text">
                                      {c.text}
                                      {c.isEdited && (
                                        <span className="home-comment-edited"> (düzenlendi)</span>
                                      )}
                                    </span>
                                    
                                    {/* Düzenle butonu - sadece yorum sahibi için */}
                                    {c.isOwner && (
                                      <button
                                        type="button"
                                        className="home-edit-comment-btn"
                                        onClick={() => handleStartEditComment(c)}
                                      >
                                        ✏️
                                      </button>
                                    )}
                                  </div>
                                  {/* Yorum resmi */}
                                  {c.imageBase64 && (
                                    <img
                                      src={c.imageBase64}
                                      alt="comment"
                                      className="home-comment-image"
                                      onClick={() => setImageModal(c.imageBase64)}
                                    />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}

                      {/* Yorum yazma alanı */}
                      <div className="home-comment-input-row-wrapper">
                        {/* Resim önizleme - input'un üstünde */}
                        {commentImagePreviews[post.id] && (
                          <div className="home-comment-image-preview">
                            <img src={commentImagePreviews[post.id]} alt="preview" />
                            <button
                              type="button"
                              className="home-remove-comment-image"
                              onClick={() => handleRemoveCommentImage(post.id)}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                        
                        <div className="home-comment-input-row">
                          {avatarSrc ? (
                            <img src={avatarSrc} className="home-comment-avatar-input" alt="me" />
                          ) : (
                            <div className="home-comment-avatar-input home-avatar-empty" />
                          )}
                          <div className="home-comment-input-wrapper">
                            <input
                              type="text"
                              className="home-comment-input"
                              placeholder="Write a comment..."
                              value={commentTexts[post.id] || ""}
                              onChange={(e) =>
                                setCommentTexts((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
                              }
                            />
                            <label className="home-comment-image-btn" title="Add image">
                              📷
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleCommentImageSelect(post.id, e)}
                                style={{ display: 'none' }}
                              />
                            </label>
                            <button
                              type="button"
                              className="emoji-trigger-btn"
                              onClick={() => openEmojiPicker(`comment-${post.id}`)}
                              title="Add emoji"
                            >
                              😊
                            </button>
                            <button
                              type="button"
                              className="home-comment-send-btn"
                              onClick={() => handleAddComment(post.id)}
                            >
                              <span className="icon-emoji">📩</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sağ kolon: Friends + follow */}
        <div className="home-right-column">
          <div className="home-friends-card">
            <div className="home-friends-search">
              <img
                src={searchIcon}
                alt="search"
                className="home-friends-search-icon"
              />
              <input
                type="text"
                className="home-friends-search-input"
                placeholder="Search Friends"
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
              />
            </div>

            <div className="home-friends-list">
              {filteredFriends.map((friend) => (
                <div key={friend.id} className="home-friend-row">
                  <div className="home-friend-info">
                    <div className="home-friend-avatar-wrapper">
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="home-friend-avatar"
                        />
                      ) : (
                        <div className="home-friend-avatar home-avatar-empty" />
                      )}
                      {/* Unread mesaj badge - Avatar üzerinde */}
                      {unreadCounts[friend.id] > 0 && (
                        <span className="unread-badge-mini">
                          {unreadCounts[friend.id]}
                        </span>
                      )}
                    </div>
                    <span 
                      className="home-friend-name clickable-name"
                      onClick={() => navigate(`/profile/${friend.id}`)}
                    >
                      {friend.name}
                    </span>
                  </div>

                  <button
                    className={
                      friend.isFollowing
                        ? "home-follow-btn followed"
                        : "home-follow-btn"
                    }
                    onClick={() => handleToggleFollow(friend.id)}
                  >
                    {friend.isFollowing ? "Followed" : "Follow"}
                  </button>
                  <button
                    className="home-message-btn"
                    onClick={() => handleOpenChat(friend)}
                  >
                    💬
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mesajlaşma Paneli */}
      {messagePanelOpen && selectedChatUser && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div className="chat-panel-title">
              💬 {selectedChatUser.name}
            </div>
            <button className="chat-panel-close" onClick={handleCloseChat}>
              ✕
            </button>
          </div>

          <div className="chat-panel-messages">
            {messages.length === 0 ? (
              <div className="chat-no-messages">No messages yet. Say hi! 👋</div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.senderId === currentUser.id
                      ? "chat-message chat-message-sent"
                      : "chat-message chat-message-received"
                  }
                >
                  {/* Mesaj düzenleme modu */}
                  {editingMessageId === msg.id ? (
                    <div className="chat-message-edit-box">
                      <textarea
                        className="chat-message-edit-textarea"
                        value={editingMessageText}
                        onChange={(e) => setEditingMessageText(e.target.value)}
                      />
                      
                      {/* Resim önizleme */}
                      {editingMessageImagePreview && (
                        <div className="chat-edit-image-preview-wrapper">
                          <img
                            src={editingMessageImagePreview}
                            alt="preview"
                            className="chat-edit-image-preview"
                          />
                          <button
                            className="chat-edit-image-remove-btn"
                            onClick={handleRemoveEditMessageImage}
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <div className="chat-message-edit-buttons">
                        {/* Resim yükleme butonu */}
                        <label className="chat-edit-image-label">
                          🖼️
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleEditMessageImageSelect}
                          />
                        </label>

                        {/* Emoji butonu */}
                        <button
                          className="chat-edit-emoji-btn"
                          onClick={() => {
                            setEmojiPickerTarget('edit-message');
                            setShowEmojiPicker(!showEmojiPicker);
                          }}
                        >
                          😊
                        </button>

                        <button
                          className="chat-edit-save-btn"
                          onClick={() => handleSaveEditMessage(msg.id)}
                        >
                          ✓
                        </button>
                        <button
                          className="chat-edit-cancel-btn"
                          onClick={handleCancelEditMessage}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {msg.content && (
                        <div className="chat-message-text">
                          {msg.content}
                          {msg.isEdited && !msg.isDeleted && (
                            <span className="chat-message-edited"> (düzenlendi)</span>
                          )}
                        </div>
                      )}
                      {msg.imageBase64 && !msg.isDeleted && (
                        <div className="chat-message-image-wrapper">
                          <img
                            src={msg.imageBase64}
                            alt="message"
                            className="chat-message-image"
                            onClick={() => setImageModal(msg.imageBase64)}
                          />
                        </div>
                      )}
                      <div className="chat-message-time">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </div>

                      {/* Düzenle/Sil butonları - sadece kendi mesajları için ve silinmemişse */}
                      {msg.senderId === currentUser.id && !msg.isDeleted && (
                        <div className="chat-message-actions">
                          <button
                            className="chat-message-action-btn"
                            onClick={() => handleStartEditMessage(msg)}
                            title="Düzenle"
                          >
                            ✏️
                          </button>
                          <button
                            className="chat-message-action-btn"
                            onClick={() => handleDeleteMessage(msg.id)}
                            title="Sil"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <form className="chat-panel-input" onSubmit={handleSendMessage}>
            {messageImagePreview && (
              <div className="chat-image-preview-wrapper">
                <img
                  src={messageImagePreview}
                  alt="preview"
                  className="chat-image-preview"
                />
                <button
                  type="button"
                  className="chat-image-remove-btn"
                  onClick={handleRemoveMessageImage}
                >
                  ✕
                </button>
              </div>
            )}
            <div className="chat-input-row">
              <label className="chat-image-btn">
                📷
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleMessageImageSelect}
                />
              </label>
              <input
                type="text"
                className="chat-input"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button 
                type="button"
                className="emoji-trigger-btn"
                onClick={() => openEmojiPicker('message')}
                title="Add emoji"
              >
                😊
              </button>
              <button type="submit" className="chat-send-btn">
                <span className="icon-emoji">✉️</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Emoji Picker Modal */}
      <EmojiPicker
        show={showEmojiPicker}
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />

      {/* Image Modal */}
      <ImageModal
        imageUrl={imageModal}
        onClose={() => setImageModal(null)}
      />
    </div>
  );
}

export default HomePage;
