// src/pages/PostDetail.jsx
// Individual post page view
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/premium.css';

// Format relative time
const formatRelativeTime = (date) => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await api.get(`/api/social/posts/${postId}`);
        setPost(data);
        // Track view
        api.post(`/api/social/posts/${postId}/view`).catch(() => {});
      } catch (err) {
        console.error('Failed to fetch post:', err);
        setError(err.message || 'Post not found');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  const handleLike = async () => {
    if (!user) return alert('Please log in');
    const hasLiked = post.likedBy?.some(id => id === user.id || id._id === user.id);
    const hasDisliked = post.dislikedBy?.some(id => id === user.id || id._id === user.id);
    if (hasLiked || hasDisliked) return;

    try {
      const res = await api.post(`/api/social/posts/${postId}/like`);
      setPost(prev => ({
        ...prev,
        likes: res.likes,
        dislikes: res.dislikes,
        likedBy: [...(prev.likedBy || []), user.id],
      }));
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleDislike = async () => {
    if (!user) return alert('Please log in');
    const hasLiked = post.likedBy?.some(id => id === user.id || id._id === user.id);
    const hasDisliked = post.dislikedBy?.some(id => id === user.id || id._id === user.id);
    if (hasLiked || hasDisliked) return;

    try {
      const res = await api.post(`/api/social/posts/${postId}/dislike`);
      setPost(prev => ({
        ...prev,
        likes: res.likes,
        dislikes: res.dislikes,
        dislikedBy: [...(prev.dislikedBy || []), user.id],
      }));
    } catch (err) {
      console.error('Dislike failed:', err);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const updatedPost = await api.post(`/api/social/posts/${postId}/comments`, {
        content: commentText.trim()
      });
      setPost(updatedPost);
      setCommentText('');
    } catch (err) {
      console.error('Comment failed:', err);
      alert(err.message || 'Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.5)',
      }}>
        Loading...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px' }}>
          {error || 'Post not found'}
        </div>
        <button
          onClick={() => navigate('/feed')}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Back to Feed
        </button>
      </div>
    );
  }

  const hasLiked = user && post.likedBy?.some(id => id === user.id || id._id === user.id);
  const hasDisliked = user && post.dislikedBy?.some(id => id === user.id || id._id === user.id);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a0c 0%, #0d0d10 100%)',
      padding: '24px 16px',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/feed')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            padding: '8px 0',
          }}
        >
          ← Back to Feed
        </button>

        {/* Post Card */}
        <div style={{
          background: 'rgba(12, 12, 15, 1)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff1744 0%, #2979ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '700',
              color: '#fff',
              overflow: 'hidden',
            }}>
              {post.author?.avatar ? (
                <img src={post.author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                post.author?.username?.charAt(0).toUpperCase() || '?'
              )}
            </div>
            <div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#fff',
              }}>
                {post.author?.username || 'Unknown'}
              </div>
              <div style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.5)',
              }}>
                {formatRelativeTime(post.createdAt)}
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{
            fontSize: '17px',
            color: '#fff',
            lineHeight: '1.6',
            marginBottom: '20px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {post.content}
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: '20px',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
              {post.views || 0} views
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
              {post.comments?.length || 0} comments
            </span>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <button
              onClick={handleLike}
              disabled={hasLiked || hasDisliked}
              style={{
                background: hasLiked ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                padding: '10px 16px',
                cursor: hasLiked || hasDisliked ? 'default' : 'pointer',
                fontSize: '14px',
                color: hasLiked ? '#22c55e' : 'rgba(255,255,255,0.6)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: hasDisliked ? 0.4 : 1,
              }}
            >
              <span>↑</span>
              <span style={{ fontFamily: "'SF Mono', monospace" }}>{post.likes || 0}</span>
            </button>

            <button
              onClick={handleDislike}
              disabled={hasLiked || hasDisliked}
              style={{
                background: hasDisliked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                padding: '10px 16px',
                cursor: hasLiked || hasDisliked ? 'default' : 'pointer',
                fontSize: '14px',
                color: hasDisliked ? '#ef4444' : 'rgba(255,255,255,0.6)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: hasLiked ? 0.4 : 1,
              }}
            >
              <span>↓</span>
              <span style={{ fontFamily: "'SF Mono', monospace" }}>{post.dislikes || 0}</span>
            </button>

            <button
              onClick={handleShare}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                color: 'rgba(255,255,255,0.6)',
                borderRadius: '8px',
                marginLeft: 'auto',
              }}
            >
              Share
            </button>
          </div>

          {/* Comment Form */}
          {user && (
            <form onSubmit={handleSubmitComment} style={{ marginTop: '16px' }}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#fff',
                  fontSize: '14px',
                  resize: 'vertical',
                  outline: 'none',
                  marginBottom: '12px',
                }}
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isSubmittingComment}
                style={{
                  background: commentText.trim() 
                    ? 'linear-gradient(135deg, #ff1744 0%, #d32f2f 100%)' 
                    : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: commentText.trim() && !isSubmittingComment ? 'pointer' : 'not-allowed',
                  opacity: commentText.trim() ? 1 : 0.5,
                }}
              >
                {isSubmittingComment ? 'Posting...' : 'Comment'}
              </button>
            </form>
          )}

          {/* Comments List */}
          {post.comments && post.comments.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '16px',
              }}>
                Comments ({post.comments.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {post.comments.map((comment, idx) => (
                  <div 
                    key={comment._id || idx}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px',
                      padding: '14px',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '8px',
                    }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ff1744 0%, #2979ff 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#fff',
                      }}>
                        {comment.author?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                        {comment.author?.username || 'Unknown'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: 'rgba(255,255,255,0.85)',
                      lineHeight: '1.5',
                      paddingLeft: '38px',
                    }}>
                      {comment.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
