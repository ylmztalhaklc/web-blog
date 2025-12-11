import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
import EmojiPicker from "../components/EmojiPicker";
import "../styles/profile.css";

// Avatar imports
import male1 from "../../PersonIcon/IconMale.jpg";
import male2 from "../../PersonIcon/IconMale2.jpg";
import male3 from "../../PersonIcon/IconMale3.jpg";
import male4 from "../../PersonIcon/IconMale4.jpg";
import male5 from "../../PersonIcon/IconMale5.jpg";
import female1 from "../../PersonIcon/IconFemale.jpg";
import female2 from "../../PersonIcon/IconFemale2.jpg";
import pageBackground from "../../Pages/PageBackgroundPics/Log_RegBackgroundRight.jpg";

function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [commentTexts, setCommentTexts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState(null);
  
  // Post editing states
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  
  // Chat panel states
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageImage, setMessageImage] = useState(null);
  const [messageImagePreview, setMessageImagePreview] = useState(null);

  const getAvatarByGenderAndId = (gender, id) => {
    const maleAvatars = [male1, male2, male3, male4, male5];
    const femaleAvatars = [female1, female2];
    
    if (!id) return maleAvatars[0]; // Fallback
    
    // ID'nin tüm karakterlerini sayıya çevir ve topla
    const idSum = id.split('').reduce((sum, char) => {
      return sum + char.charCodeAt(0);
    }, 0);
    
    if (gender?.toLowerCase() === "female") {
      const index = idSum % femaleAvatars.length;
      return femaleAvatars[index];
    } else {
      const index = idSum % maleAvatars.length;
      return maleAvatars[index];
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString();
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const [meRes, userRes, postsRes, followersRes, followingRes] = await Promise.all([
          api.get("/account/me"),
          api.get(`/account/users`),
          api.get(`/posts/user/${userId}`),
          api.get(`/follow/followers/${userId}`),
          api.get("/follow/following"),
        ]);

        setCurrentUser(meRes.data);
        
        const allUsers = userRes.data || [];
        const targetUser = allUsers.find(u => u.id === userId);
        
        if (targetUser) {
          setUser(targetUser);
        } else {
          console.error("User not found in users list");
        }

        setPosts(postsRes.data || []);
        setFollowers(followersRes.data || []);
        
        const followingIds = followingRes.data || [];
        setIsFollowing(followingIds.includes(userId));
        
        setLoading(false);
      } catch (err) {
        console.error("PROFILE FETCH ERROR:", err);
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  const handleToggleFollow = async () => {
    try {
      await api.post(`/follow/${userId}`);
      setIsFollowing(!isFollowing);
      
      // Followers listesini güncelle
      if (!isFollowing) {
        setFollowers([...followers, currentUser]);
      } else {
        setFollowers(followers.filter(f => f.id !== currentUser.id));
      }
    } catch (err) {
      console.error("FOLLOW ERROR:", err);
    }
  };

  const handleOpenChat = async () => {
    try {
      const res = await api.get(`/messages/with/${userId}`);
      setMessages(res.data || []);
      setChatOpen(true);
      
      // Mesajları okundu olarak işaretle
      try {
        await api.post(`/messages/mark-read/${userId}`);
      } catch (markErr) {
        console.warn("Mark as read failed:", markErr);
      }
    } catch (err) {
      console.error("LOAD MESSAGES ERROR:", err);
    }
  };

  const handleCloseChat = () => {
    setChatOpen(false);
    setNewMessage('');
    setMessageImage(null);
    setMessageImagePreview(null);
  };

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text && !messageImage) return;

    try {
      const formData = new FormData();
      if (text) formData.append("Content", text);
      if (messageImage) formData.append("ImageBase64", messageImage);
      formData.append("ReceiverId", userId);

      await api.post("/messages", formData);
      
      // Mesajları yeniden yükle
      const res = await api.get(`/messages/with/${userId}`);
      setMessages(res.data || []);
      setNewMessage('');
      setMessageImage(null);
      setMessageImagePreview(null);
    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err);
    }
  };

  const handleMessageImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setMessageImage(reader.result);
      setMessageImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMessageImage = () => {
    setMessageImage(null);
    setMessageImagePreview(null);
  };

  const handleToggleLike = async (postId) => {
    try {
      const res = await api.post(`/posts/${postId}/like`);
      const updated = res.data;
      setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (err) {
      console.error("LIKE ERROR:", err);
    }
  };

  const handleAddComment = async (postId) => {
    const text = (commentTexts[postId] || "").trim();
    if (!text) return;

    try {
      const formData = new FormData();
      formData.append("Text", text);
      
      const res = await api.post(`/posts/${postId}/comments`, formData);
      const updated = res.data;
      setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setCommentTexts(prev => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("ADD COMMENT ERROR:", err);
      alert("Failed to add comment.");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      const res = await api.delete(`/posts/${postId}`);
      const deleted = res.data;
      
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

  const handleStartEditPost = (post) => {
    setEditingPost(post.id);
    setEditContent(post.content || "");
    setEditImage(post.imageBase64 || null);
    setEditImagePreview(post.imageBase64 || null);
  };

  const handleCancelEditPost = () => {
    setEditingPost(null);
    setEditContent("");
    setEditImage(null);
    setEditImagePreview(null);
  };

  const handleEditImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImage(reader.result);
      setEditImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveEditImage = () => {
    setEditImage(null);
    setEditImagePreview(null);
  };

  const handleSaveEditPost = async (postId) => {
    if (!editContent.trim() && !editImage) {
      alert("Post cannot be empty!");
      return;
    }

    try {
      const formData = new FormData();
      if (editContent.trim()) formData.append("Content", editContent);
      if (editImage) formData.append("ImageBase64", editImage);

      const res = await api.put(`/posts/${postId}`, formData);
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p));
      handleCancelEditPost();
    } catch (err) {
      console.error("EDIT POST ERROR:", err);
      alert("Failed to edit post.");
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const openEmojiPicker = (target) => {
    setEmojiTarget(target);
    setShowEmojiPicker(true);
  };

  const handleEmojiSelect = (emoji) => {
    if (typeof emojiTarget === 'string' && emojiTarget === 'edit-post') {
      setEditContent(prev => prev + emoji);
    } else if (typeof emojiTarget === 'string' && emojiTarget.startsWith('comment-')) {
      const postId = emojiTarget.replace('comment-', '');
      setCommentTexts(prev => ({
        ...prev,
        [postId]: (prev[postId] || '') + emoji
      }));
    }
    setShowEmojiPicker(false);
  };

  if (loading) {
    return (
      <div className="profile-root" style={{ backgroundImage: `url(${pageBackground})` }}>
        <div className="profile-loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-root" style={{ backgroundImage: `url(${pageBackground})` }}>
        <div className="profile-loading">User not found</div>
      </div>
    );
  }

  const avatarSrc = getAvatarByGenderAndId(user.gender || 'male', user.id);

  return (
    <div className="profile-root" style={{ backgroundImage: `url(${pageBackground})` }}>
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <button className="profile-back-btn" onClick={() => navigate("/home")}>
            ← Back to Feed
          </button>
        </div>

        {/* Profile Card */}
        <div className="profile-card">
          {avatarSrc ? (
            <img src={avatarSrc} alt={user.firstName} className="profile-avatar" />
          ) : (
            <div className="profile-avatar profile-avatar-empty" />
          )}
          
          <div className="profile-info">
            <h1 className="profile-name">{user.firstName} {user.lastName}</h1>
            <p className="profile-email">{user.email}</p>
            
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="profile-stat-number">{posts.length}</span>
                <span className="profile-stat-label">Posts</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-number">{followers.length}</span>
                <span className="profile-stat-label">Followers</span>
              </div>
            </div>

            {currentUser?.id !== userId && (
              <div className="profile-actions">
                <button
                  className={`profile-follow-btn ${isFollowing ? 'following' : ''}`}
                  onClick={handleToggleFollow}
                >
                  {isFollowing ? 'Followed' : 'Follow'}
                </button>
                <button className="profile-message-btn" onClick={handleOpenChat}>
                  💬 Message
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Posts Section */}
        <div className="profile-posts-section">
          <h2 className="profile-posts-title">Posts</h2>
          
          {posts.length === 0 ? (
            <div className="profile-no-posts">No posts yet</div>
          ) : (
            <div className="profile-posts-list">
              {posts.map(post => (
                <div key={post.id} className="profile-post-card">
                  <div className="profile-post-header">
                    <img src={avatarSrc} alt={user.firstName} className="profile-post-avatar" />
                    <div className="profile-post-user-info">
                      <span className="profile-post-user-name">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="profile-post-date">
                        {post.updatedAt 
                          ? `${formatDate(post.updatedAt)} (edited)` 
                          : formatDate(post.createdAt)
                        }
                      </span>
                    </div>
                  </div>

                  {/* Post Content or Edit Mode */}
                  {editingPost === post.id ? (
                    <div className="profile-edit-post-box">
                      <textarea
                        className="profile-edit-post-textarea"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="What's on your mind?"
                      />
                      
                      {editImagePreview && (
                        <div className="profile-edit-image-preview-wrapper">
                          <img
                            src={editImagePreview}
                            alt="preview"
                            className="profile-edit-image-preview"
                          />
                          <button
                            className="profile-edit-image-remove-btn"
                            onClick={handleRemoveEditImage}
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <div className="profile-edit-post-buttons">
                        <label className="profile-edit-image-label">
                          🖼️
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleEditImageSelect}
                          />
                        </label>

                        <button
                          className="profile-edit-emoji-btn"
                          onClick={() => openEmojiPicker('edit-post')}
                        >
                          😊
                        </button>

                        <button
                          className="profile-edit-save-btn"
                          onClick={() => handleSaveEditPost(post.id)}
                        >
                          ✓ Save
                        </button>
                        <button
                          className="profile-edit-cancel-btn"
                          onClick={handleCancelEditPost}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {post.content && (
                        <p className="profile-post-content">{post.content}</p>
                      )}

                      {post.imageBase64 && (
                        <img 
                          src={post.imageBase64} 
                          alt="post" 
                          className="profile-post-image" 
                        />
                      )}
                    </>
                  )}

                  {/* Action Buttons - Always Visible */}
                  <div className="profile-post-actions">
                    <button 
                      className="profile-post-action-btn"
                      onClick={() => handleToggleLike(post.id)}
                    >
                      <span className="icon-emoji">
                        {post.isLikedByCurrentUser ? '❤️' : '🤍'}
                      </span>
                      <span>{post.likeCount || 0}</span>
                    </button>
                    <button 
                      className="profile-post-action-btn"
                      onClick={() => toggleComments(post.id)}
                    >
                      <span className="icon-emoji">💬</span>
                      <span>{post.commentCount || 0}</span>
                    </button>
                  </div>

                  {/* Owner Actions - Edit & Delete */}
                  {post.isOwner && !post.isDeleted && editingPost !== post.id && (
                    <div className="profile-post-owner-actions">
                      <button
                        className="profile-edit-btn"
                        onClick={() => handleStartEditPost(post)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="profile-delete-btn"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}

                  {/* Comments Section */}
                  {expandedComments[post.id] && (
                    <div className="profile-comments-section">
                      {post.comments && post.comments.length > 0 && (
                        <div className="profile-comments-list">
                          {post.comments.map(comment => {
                            // Comment'ten gender bilgisini al (backend doğrudan comment içinde gönderiyor)
                            const commentGender = comment.gender || 'male';
                            const commentAuthorAvatar = getAvatarByGenderAndId(
                              commentGender,
                              comment.userId
                            );
                            return (
                              <div key={comment.id} className="profile-comment-item">
                                <img
                                  src={commentAuthorAvatar}
                                  alt={comment.name}
                                  className="profile-comment-avatar"
                                />
                                <div className="profile-comment-content">
                                  <span className="profile-comment-author">
                                    {comment.name}
                                  </span>
                                  <p className="profile-comment-text">{comment.text}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Comment */}
                      <div className="profile-comment-row">
                        {currentUser && (
                          <img
                            src={getAvatarByGenderAndId(currentUser.gender, currentUser.id)}
                            alt="me"
                            className="profile-comment-avatar-input"
                          />
                        )}
                        <div className="profile-comment-input-wrapper">
                          <input
                            type="text"
                            className="profile-comment-input"
                            placeholder="Write a comment..."
                            value={commentTexts[post.id] || ""}
                            onChange={(e) =>
                              setCommentTexts(prev => ({
                                ...prev,
                                [post.id]: e.target.value
                              }))
                            }
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddComment(post.id);
                              }
                            }}
                          />
                          <button
                            className="profile-emoji-trigger-btn"
                            onClick={() => openEmojiPicker(`comment-${post.id}`)}
                            title="Add emoji"
                          >
                            😊
                          </button>
                          <button
                            className="profile-comment-send-btn"
                            onClick={() => handleAddComment(post.id)}
                          >
                            <span className="icon-emoji">📩</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Emoji Picker Modal */}
      <EmojiPicker
        show={showEmojiPicker}
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />

      {/* Chat Panel */}
      {chatOpen && (
        <div className="profile-chat-panel">
          <div className="profile-chat-header">
            <div className="profile-chat-header-info">
              <h3>{user.firstName} {user.lastName}</h3>
            </div>
            <button className="profile-chat-close" onClick={handleCloseChat}>
              ✕
            </button>
          </div>

          <div className="profile-chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`profile-chat-message ${msg.isFromMe ? 'sent' : 'received'}`}
              >
                {msg.content && !msg.isDeleted && (
                  <div className="profile-chat-message-text">
                    {msg.content}
                  </div>
                )}
                {msg.imageBase64 && !msg.isDeleted && (
                  <img
                    src={msg.imageBase64}
                    alt="message"
                    className="profile-chat-message-image"
                  />
                )}
                {msg.isDeleted && (
                  <div className="profile-chat-message-deleted">Bu mesaj silindi</div>
                )}
                <div className="profile-chat-message-time">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>

          <div className="profile-chat-input">
            {messageImagePreview && (
              <div className="profile-message-image-preview">
                <img src={messageImagePreview} alt="preview" />
                <button onClick={handleRemoveMessageImage}>✕</button>
              </div>
            )}
            <div className="profile-chat-input-row">
              <input
                type="text"
                placeholder="Write a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <label className="profile-chat-image-btn">
                📷
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMessageImageSelect}
                  style={{ display: 'none' }}
                />
              </label>
              <button onClick={handleSendMessage}>📩</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfilePage;
