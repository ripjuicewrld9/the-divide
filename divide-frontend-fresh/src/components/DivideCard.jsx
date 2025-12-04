// src/components/DivideCard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from '../utils/format';
import api from '../services/api';

const getCategoryColor = (category) => {
  const colors = {
    'Politics': '#ff0044',
    'Sports': '#00ff88',
    'Crypto': '#f7931a',
    'Entertainment': '#ff44aa',
    'Science': '#44aaff',
    'Business': '#ffaa00',
    'Other': '#888888'
  };
  return colors[category] || '#888888';
};

export default function DivideCard({
  divideId,
  title,
  category = 'Other',
  creatorUsername = null,
  left,
  right,
  leftVotes = 0,
  rightVotes = 0,
  pot = 0,
  endTime = null,
  status = 'active',
  winner = null,
  likes = 0,
  dislikes = 0,
  likedBy = [],
  dislikedBy = [],
  onVote,
  onRequestExpand,
  colorA = "#ff0044",
  colorB = "#0ff",
  active = true,
}) {
  const [l, setL] = useState(Number(leftVotes) || 0);
  const [r, setR] = useState(Number(rightVotes) || 0);
  const [editingSide, setEditingSide] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [localLikes, setLocalLikes] = useState(Number(likes) || 0);
  const [localDislikes, setLocalDislikes] = useState(Number(dislikes) || 0);
  const [userLiked, setUserLiked] = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);
  const [seconds, setSeconds] = useState(() => {
    if (!endTime) return 0;
    const delta = Math.floor((new Date(endTime) - Date.now()) / 1000);
    return Math.max(0, delta);
  });

  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';

  useEffect(() => { setL(Number(leftVotes) || 0); }, [leftVotes]);
  useEffect(() => { setR(Number(rightVotes) || 0); }, [rightVotes]);
  useEffect(() => { setLocalLikes(Number(likes) || 0); }, [likes]);
  useEffect(() => { setLocalDislikes(Number(dislikes) || 0); }, [dislikes]);
  
  // Check if current user has already liked/disliked
  useEffect(() => {
    if (user && user.id) {
      setUserLiked((likedBy || []).includes(user.id));
      setUserDisliked((dislikedBy || []).includes(user.id));
    }
  }, [user, likedBy, dislikedBy]);

  useEffect(() => {
    if (!endTime) return;
    const update = () => {
      const delta = Math.floor((new Date(endTime) - Date.now()) / 1000);
      setSeconds(Math.max(0, delta));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [endTime]);

  const total = l + r || 1;
  const leftPct = Math.round((l / total) * 100);
  const rightPct = Math.round((r / total) * 100);

  const winnerLabel = (() => {
    if (!winner) return null;
    const w = String(winner).toUpperCase();
    if (w === 'A' || w === 'LEFT') return left;
    if (w === 'B' || w === 'RIGHT') return right;
    return winner;
  })();

  const handleVote = async (side, boostAmount) => {
    if (!active) return alert('This market is no longer active');
    if (!user) return alert("Please log in to place a position");
    try {
      if (onVote) {
        await onVote(side === "left" ? "A" : "B", boostAmount);
        return;
      }
    } catch (err) {
      console.error("Position error:", err);
      alert(err.message || "Failed to place position");
    }
  };

  const handleStartEdit = (side) => {
    // Server handles all validation (creator lock, duplicate votes, etc.)
    // Frontend just opens the input - server will reject invalid attempts
    setEditingSide(side);
    setBetAmount('');
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return alert('Please log in to react');
    if (userLiked) return; // Already liked
    try {
      const res = await api.post(`/api/divides/${divideId}/like`);
      setLocalLikes(res.likes || localLikes + 1);
      if (userDisliked) setLocalDislikes(prev => Math.max(0, prev - 1));
      setUserLiked(true);
      setUserDisliked(false);
    } catch (err) {
      console.error('Like failed:', err);
      // Don't show alert for common cases like "already liked"
    }
  };

  const handleDislike = async (e) => {
    e.stopPropagation();
    if (!user) return alert('Please log in to react');
    if (userDisliked) return; // Already disliked
    try {
      const res = await api.post(`/api/divides/${divideId}/dislike`);
      setLocalDislikes(res.dislikes || localDislikes + 1);
      if (userLiked) setLocalLikes(prev => Math.max(0, prev - 1));
      setUserDisliked(true);
      setUserLiked(false);
    } catch (err) {
      console.error('Dislike failed:', err);
      // Don't show alert for common cases like "already disliked"
    }
  };

  const handleSubmitBet = async (side) => {
    const amount = Number(betAmount) || 0;
    if (amount <= 0) return alert('Enter a valid amount');
    try {
      await handleVote(side, amount);
      if (side === 'left') setL((p) => p + amount);
      else setR((p) => p + amount);
    } catch (err) {
      console.debug('handleSubmitBet error', err);
    } finally {
      setEditingSide(null);
    }
  };

  const formatTime = (s) => {
    if (s <= 0) return "0:00";
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    const sec = (s % 60).toString().padStart(2, "0");
    const min = minutes.toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  const toggleExpand = () => {
    if (typeof onRequestExpand === 'function') onRequestExpand();
  };

  // Determine urgency based on time
  const isUrgent = seconds > 0 && seconds <= 60;
  const isEnding = seconds > 0 && seconds <= 300;
  const categoryColor = getCategoryColor(category);
      
  return (
    <div
      className="divide-market-card"
      style={{
        background: 'linear-gradient(135deg, rgba(17, 17, 17, 0.98) 0%, rgba(25, 25, 25, 0.95) 100%)',
        border: status === 'ended' && winner 
          ? `2px solid ${String(winner).toUpperCase() === 'A' ? colorA : colorB}`
          : '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '20px',
        color: '#fff',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: status === 'ended' && winner 
          ? `0 0 24px ${String(winner).toUpperCase() === 'A' ? colorA : colorB}30`
          : '0 2px 12px rgba(0,0,0,0.5)',
      }}
      onClick={toggleExpand}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.5)';
      }}
    >
      {/* Category Badge + Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          background: `${categoryColor}18`,
          border: `1px solid ${categoryColor}40`,
          borderRadius: '16px',
          fontSize: '11px',
          fontWeight: '600',
          color: categoryColor,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {category}
        </div>
        
        {status === 'active' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: isUrgent ? 'rgba(255,68,68,0.12)' : 'rgba(255,50,50,0.08)',
            borderRadius: '16px',
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: 'monospace',
            color: isUrgent ? '#ff6b6b' : '#ff3232',
            border: `1px solid ${isUrgent ? 'rgba(255,68,68,0.25)' : 'rgba(255,50,50,0.2)'}`,
          }}>
            {isUrgent && '⚡'} {formatTime(seconds)}
          </div>
        )}
      </div>

      {/* Title */}
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '15px',
        fontWeight: '600',
        lineHeight: '1.5',
        color: '#fff',
        letterSpacing: '0.2px',
      }}>
        {title}
      </h3>

      {/* Admin controls */}
      {isAdmin && status === 'active' && (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!confirm('Cancel this market?')) return;
            try {
              await api.patch(`/divides/${encodeURIComponent(divideId)}`, { status: 'ended' });
              alert('Market cancelled');
            } catch (err) {
              alert(err.message || 'Failed to cancel');
            }
          }}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#888',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      )}

      {/* Position Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        {/* Left/A Position */}
        <button
          onClick={(e) => { e.stopPropagation(); if (editingSide !== 'left') handleStartEdit('left'); }}
          disabled={status !== 'active'}
          style={{
            flex: 1,
            background: editingSide === 'left' 
              ? 'linear-gradient(135deg, #ff0044 0%, #cc0033 100%)'
              : 'linear-gradient(135deg, rgba(255,0,68,0.15) 0%, rgba(255,0,68,0.05) 100%)',
            border: `1px solid ${editingSide === 'left' ? '#ff0044' : 'rgba(255,0,68,0.3)'}`,
            borderRadius: '12px',
            padding: editingSide === 'left' ? '12px' : '16px',
            cursor: status === 'active' ? 'pointer' : 'default',
            opacity: status === 'active' ? 1 : 0.5,
            transition: 'all 0.2s ease',
          }}
        >
          {editingSide === 'left' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="$ Amount"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingSide(null); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSubmitBet('left'); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#ff0044',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', lineHeight: '1.3' }}>
                {left}
              </div>
              {status !== 'active' && (
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{leftPct}%</div>
              )}
            </>
          )}
        </button>

        {/* VS Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: '700',
          color: '#444',
          letterSpacing: '1px',
        }}>
          VS
        </div>

        {/* Right/B Position */}
        <button
          onClick={(e) => { e.stopPropagation(); if (editingSide !== 'right') handleStartEdit('right'); }}
          disabled={status !== 'active'}
          style={{
            flex: 1,
            background: editingSide === 'right'
              ? 'linear-gradient(135deg, #0088ff 0%, #0066cc 100%)'
              : 'linear-gradient(135deg, rgba(0,136,255,0.15) 0%, rgba(0,136,255,0.05) 100%)',
            border: `1px solid ${editingSide === 'right' ? '#0088ff' : 'rgba(0,136,255,0.3)'}`,
            borderRadius: '12px',
            padding: editingSide === 'right' ? '12px' : '16px',
            cursor: status === 'active' ? 'pointer' : 'default',
            opacity: status === 'active' ? 1 : 0.5,
            transition: 'all 0.2s ease',
          }}
        >
          {editingSide === 'right' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="$ Amount"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingSide(null); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSubmitBet('right'); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#0088ff',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', lineHeight: '1.3' }}>
                {right}
              </div>
              {status !== 'active' && (
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{rightPct}%</div>
              )}
            </>
          )}
        </button>
      </div>

      {/* Social Engagement Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '12px',
        padding: '8px 0',
      }}>
        <button
          onClick={handleLike}
          disabled={userLiked}
          style={{
            background: userLiked ? 'rgba(0,255,136,0.15)' : 'none',
            border: userLiked ? '1px solid rgba(0,255,136,0.3)' : 'none',
            cursor: userLiked ? 'default' : 'pointer',
            padding: '6px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: userLiked ? '#00ff88' : '#888',
            fontSize: '13px',
            transition: 'all 0.2s ease',
            opacity: userLiked ? 0.8 : 1,
          }}
          onMouseEnter={(e) => { if (!userLiked) { e.currentTarget.style.background = 'rgba(0,255,136,0.1)'; e.currentTarget.style.color = '#00ff88'; }}}
          onMouseLeave={(e) => { if (!userLiked) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#888'; }}}
        >
          👍 <span>{localLikes}</span>
        </button>
        <button
          onClick={handleDislike}
          disabled={userDisliked}
          style={{
            background: userDisliked ? 'rgba(255,68,68,0.15)' : 'none',
            border: userDisliked ? '1px solid rgba(255,68,68,0.3)' : 'none',
            cursor: userDisliked ? 'default' : 'pointer',
            padding: '6px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: userDisliked ? '#ff6b6b' : '#888',
            fontSize: '13px',
            transition: 'all 0.2s ease',
            opacity: userDisliked ? 0.8 : 1,
          }}
          onMouseEnter={(e) => { if (!userDisliked) { e.currentTarget.style.background = 'rgba(255,68,68,0.1)'; e.currentTarget.style.color = '#ff6b6b'; }}}
          onMouseLeave={(e) => { if (!userDisliked) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#888'; }}}
        >
          👎 <span>{localDislikes}</span>
        </button>
      </div>

      {/* Footer: Probabilities + Pot */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Probability Bar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'rgba(255,0,68,0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(255,0,68,0.2)',
          }}>
            <span style={{ fontSize: '12px', color: '#fff', fontWeight: '500' }}>{left}</span>
            <span style={{ fontSize: '15px', color: '#ff0044', fontWeight: '700' }}>{leftPct}%</span>
          </div>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'rgba(255,50,50,0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(255,50,50,0.2)',
          }}>
            <span style={{ fontSize: '12px', color: '#fff', fontWeight: '500' }}>{right}</span>
            <span style={{ fontSize: '15px', color: '#ff3232', fontWeight: '700' }}>{rightPct}%</span>
          </div>
        </div>
        
        {/* Pool Amount */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pool</span>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#00ff88' }}>
            ${formatCurrency(pot, 2)}
          </span>
        </div>
      </div>

      {/* Warning Banner - Ominous */}
      {status === 'active' && (
        <div style={{
          marginTop: '12px',
          padding: '10px 12px',
          background: 'linear-gradient(90deg, rgba(255,68,68,0.08) 0%, rgba(255,136,0,0.08) 100%)',
          borderRadius: '8px',
          border: '1px solid rgba(255,68,68,0.2)',
          fontSize: '12px',
          color: '#ff9966',
          textAlign: 'center',
          lineHeight: '1.5',
          fontWeight: '500',
        }}>
          ⚠️ <strong>Pick. But know this:</strong><br/>
          <span style={{ color: '#cc6644' }}>If everyone agrees with you, you all lose.</span>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}