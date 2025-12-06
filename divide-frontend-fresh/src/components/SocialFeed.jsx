// src/components/SocialFeed.jsx
// Social feed - "custom X inside the site"
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/premium.css';

// Format relative time
const formatRelativeTime = (date) => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Create Post Component
function CreatePost({ onPostCreated }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newPost = await api.post('/api/social/posts', { content: content.trim() });
      setContent('');
      if (onPostCreated) onPostCreated(newPost);
    } catch (err) {
      console.error('Failed to create post:', err);
      alert(err.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{
      background: 'rgba(12, 12, 15, 1)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
      border: '1px solid rgba(255, 255, 255, 0.06)',
    }}>
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          maxLength={1000}
          style={{
            width: '100%',
            minHeight: '80px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '14px',
            color: '#fff',
            fontSize: '15px',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '12px',
        }}>
          <span style={{
            fontSize: '12px',
            color: content.length > 900 ? '#ff1744' : 'rgba(255,255,255,0.4)',
            fontFamily: "'SF Mono', monospace",
          }}>
            {content.length}/1000
          </span>
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              border: 'none',
              background: content.trim() 
                ? 'linear-gradient(135deg, #ff1744 0%, #2979ff 100%)' 
                : 'rgba(255,255,255,0.1)',
              color: content.trim() ? '#fff' : 'rgba(255,255,255,0.4)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: content.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
              transition: 'all 200ms ease',
              boxShadow: content.trim() ? '0 4px 16px rgba(255, 23, 68, 0.2)' : 'none',
            }}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Single Post Card Component
function PostCard({ post, onUpdate }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const hasLiked = user && localPost.likedBy?.some(id => id === user.id || id._id === user.id);
  const hasDisliked = user && localPost.dislikedBy?.some(id => id === user.id || id._id === user.id);

  const handleCardClick = (e) => {
    // Don't navigate if clicking on buttons or interactive elements
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('form')) {
      return;
    }
    navigate(`/post/${localPost._id}`);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return alert('Please log in');
    if (hasLiked || hasDisliked) return;

    try {
      const res = await api.post(`/api/social/posts/${localPost._id}/like`);
      setLocalPost(prev => ({
        ...prev,
        likes: res.likes,
        dislikes: res.dislikes,
        likedBy: [...(prev.likedBy || []), user.id],
        dislikedBy: (prev.dislikedBy || []).filter(id => id !== user.id),
      }));
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleDislike = async (e) => {
    e.stopPropagation();
    if (!user) return alert('Please log in');
    if (hasLiked || hasDisliked) return;

    try {
      const res = await api.post(`/api/social/posts/${localPost._id}/dislike`);
      setLocalPost(prev => ({
        ...prev,
        likes: res.likes,
        dislikes: res.dislikes,
        dislikedBy: [...(prev.dislikedBy || []), user.id],
        likedBy: (prev.likedBy || []).filter(id => id !== user.id),
      }));
    } catch (err) {
      console.error('Dislike failed:', err);
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${localPost._id}`;
    navigator.clipboard.writeText(url).then(() => {
      // Could show a toast here
    });
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const updatedPost = await api.post(`/api/social/posts/${localPost._id}/comments`, {
        content: commentText.trim()
      });
      setLocalPost(updatedPost);
      setCommentText('');
    } catch (err) {
      console.error('Comment failed:', err);
      alert(err.message || 'Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeletePost = async (e) => {
    e.stopPropagation();
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete(`/api/social/posts/${localPost._id}`);
      if (onUpdate) onUpdate(localPost._id, 'deleted');
    } catch (err) {
      console.error('Delete failed:', err);
      alert(err.message || 'Failed to delete post');
    }
  };

  const isAuthor = user && (localPost.author?._id === user.id || localPost.author === user.id);
  const isAdmin = user && user.role === 'admin';

  return (
    <div 
      onClick={handleCardClick}
      style={{
        background: 'rgba(12, 12, 15, 1)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        transition: 'all 200ms ease',
        cursor: 'pointer',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff1744 0%, #2979ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '700',
            color: '#fff',
            overflow: 'hidden',
          }}>
            {localPost.author?.profileImage ? (
              <img src={localPost.author.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              localPost.author?.username?.charAt(0).toUpperCase() || '?'
            )}
          </div>
          <div>
            <div style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              {localPost.author?.username || 'Unknown'}
              {localPost.author?.level && (
                <span style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  color: '#000',
                  fontWeight: '700',
                }}>
                  Lv.{localPost.author.level}
                </span>
              )}
              {localPost.author?.currentBadge && (
                <span style={{
                  fontSize: '11px',
                  color: '#a855f7',
                  fontWeight: '600',
                }}>
                  {localPost.author.currentBadge}
                </span>
              )}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
            }}>
              {formatRelativeTime(localPost.createdAt)}
            </div>
          </div>
        </div>
        
        {(isAuthor || isAdmin) && (
          <button
            onClick={handleDeletePost}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '16px',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{
        fontSize: '15px',
        color: '#fff',
        lineHeight: '1.5',
        marginBottom: '16px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {localPost.content}
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        {/* Like */}
        <button
          onClick={handleLike}
          disabled={hasLiked || hasDisliked}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '8px 12px',
            cursor: hasLiked || hasDisliked ? 'default' : 'pointer',
            fontSize: '13px',
            color: hasLiked ? '#22c55e' : 'rgba(255,255,255,0.5)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 150ms ease',
            opacity: hasDisliked ? 0.4 : 1,
          }}
        >
          <span>↑</span>
          <span style={{ fontFamily: "'SF Mono', monospace" }}>{localPost.likes || 0}</span>
        </button>

        {/* Dislike */}
        <button
          onClick={handleDislike}
          disabled={hasLiked || hasDisliked}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '8px 12px',
            cursor: hasLiked || hasDisliked ? 'default' : 'pointer',
            fontSize: '13px',
            color: hasDisliked ? '#ef4444' : 'rgba(255,255,255,0.5)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 150ms ease',
            opacity: hasLiked ? 0.4 : 1,
          }}
        >
          <span>↓</span>
          <span style={{ fontFamily: "'SF Mono', monospace" }}>{localPost.dislikes || 0}</span>
        </button>

        {/* Comments Toggle */}
        <button
          onClick={() => setShowComments(!showComments)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '13px',
            color: showComments ? '#2979ff' : 'rgba(255,255,255,0.5)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 150ms ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ fontFamily: "'SF Mono', monospace" }}>{localPost.commentCount || 0}</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 150ms ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>

        {/* Views */}
        <div style={{
          marginLeft: 'auto',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span style={{ fontFamily: "'SF Mono', monospace" }}>{localPost.views || 0}</span>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          {/* Comment Input */}
          {user && (
            <form onSubmit={handleSubmitComment} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  maxLength={500}
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    padding: '10px 16px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || isSubmittingComment}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: commentText.trim() ? '#2979ff' : 'rgba(255,255,255,0.1)',
                    color: commentText.trim() ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Post
                </button>
              </div>
            </form>
          )}

          {/* Comments List */}
          {localPost.comments && localPost.comments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {localPost.comments.map((comment) => (
                <div key={comment._id} style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '10px',
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
                    flexShrink: 0,
                  }}>
                    {comment.author?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#fff',
                      marginBottom: '2px',
                    }}>
                      {comment.author?.username || 'Unknown'}
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '400',
                        color: 'rgba(255,255,255,0.4)',
                        marginLeft: '8px',
                      }}>
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: 'rgba(255,255,255,0.8)',
                      lineHeight: '1.4',
                    }}>
                      {comment.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '14px',
            }}>
              No comments yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main Social Feed Component
export default function SocialFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState(null);
  const { user } = useAuth();

  const fetchPosts = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await api.get(`/api/social/posts?page=${page}&limit=20`);
      
      if (append) {
        setPosts(prev => [...prev, ...res.posts]);
      } else {
        setPosts(res.posts);
      }
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handlePostUpdate = (postId, action) => {
    if (action === 'deleted') {
      setPosts(prev => prev.filter(p => p._id !== postId));
    }
  };

  const loadMore = () => {
    if (pagination?.hasMore && !loadingMore) {
      fetchPosts(pagination.page + 1, true);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050507',
      padding: '80px 16px 40px',
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #ff1744 0%, #2979ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px',
          }}>
            Feed
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.5)',
          }}>
            Share your thoughts with the community
          </p>
        </div>

        {/* Create Post */}
        {user && <CreatePost onPostCreated={handlePostCreated} />}

        {/* Loading State */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'rgba(255,255,255,0.5)',
          }}>
            Loading...
          </div>
        ) : posts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'rgba(12, 12, 15, 1)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>
              📝
            </div>
            <div style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: '8px',
            }}>
              No posts yet
            </div>
            <div style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.4)',
            }}>
              Be the first to share something!
            </div>
          </div>
        ) : (
          <>
            {/* Posts */}
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onUpdate={handlePostUpdate}
              />
            ))}

            {/* Load More */}
            {pagination?.hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'transparent',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  marginTop: '16px',
                }}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
