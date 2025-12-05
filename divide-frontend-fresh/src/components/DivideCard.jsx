// src/components/DivideCard.jsx
// Premium minimalist prediction market card - Billion dollar aesthetic
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from '../utils/format';
import api from '../services/api';

export default function DivideCard({
  divideId,
  title,
  category = 'Other',
  // eslint-disable-next-line no-unused-vars
  creatorUsername = null,
  left,
  right,
  leftVotes = 0,
  rightVotes = 0,
  pot = 0,
  endTime = null,
  status = 'active',
  // eslint-disable-next-line no-unused-vars
  winner = null,
  likes = 0,
  dislikes = 0,
  likedBy = [],
  dislikedBy = [],
  onVote,
  // eslint-disable-next-line no-unused-vars
  onRequestExpand,
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
  const [isHovered, setIsHovered] = useState(false);
  const [seconds, setSeconds] = useState(() => {
    if (!endTime) return 0;
    const delta = Math.floor((new Date(endTime) - Date.now()) / 1000);
    return Math.max(0, delta);
  });
  
  const isLocked = status === 'active' && seconds > 0 && seconds <= 5;
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user && user.role === 'admin';
  const votesHidden = leftVotes === null || leftVotes === undefined;
  
  useEffect(() => { setL(Number(leftVotes) || 0); }, [leftVotes]);
  useEffect(() => { setR(Number(rightVotes) || 0); }, [rightVotes]);
  useEffect(() => { setLocalLikes(Number(likes) || 0); }, [likes]);
  useEffect(() => { setLocalDislikes(Number(dislikes) || 0); }, [dislikes]);
  
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
  const rightPct = 100 - leftPct;

  const formatTime = (s) => {
    if (s <= 0) return "Ended";
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${secs}s`;
  };

  const handleVote = async (side, boostAmount) => {
    if (!active) return alert('This market is no longer active');
    if (!user) return alert("Please log in to place a position");
    try {
      if (onVote) await onVote(side === "left" ? "A" : "B", boostAmount);
    } catch (err) {
      console.error("Position error:", err);
      alert(err.message || "Failed to place position");
    }
  };

  const handleStartEdit = (side, e) => {
    e.stopPropagation();
    if (status !== 'active') return;
    if (isLocked) return;
    setEditingSide(side);
    setBetAmount('');
  };

  const handleSubmitBet = async (side, e) => {
    e.stopPropagation();
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

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return alert('Please log in');
    if (status !== 'active') return;
    if (userLiked || userDisliked) return;
    try {
      const res = await api.post(`/api/divides/${divideId}/like`);
      setLocalLikes(res.likes || localLikes + 1);
      setUserLiked(true);
    } catch (err) { console.error('Like failed:', err); }
  };

  const handleDislike = async (e) => {
    e.stopPropagation();
    if (!user) return alert('Please log in');
    if (status !== 'active') return;
    if (userLiked || userDisliked) return;
    try {
      const res = await api.post(`/api/divides/${divideId}/dislike`);
      setLocalDislikes(res.dislikes || localDislikes + 1);
      setUserDisliked(true);
    } catch (err) { console.error('Dislike failed:', err); }
  };

  const handleCardClick = () => {
    navigate(`/divide/${divideId}`);
  };

  // Premium color tokens
  const colors = {
    bg: isHovered ? 'rgba(24, 24, 27, 1)' : 'rgba(20, 20, 22, 1)',
    border: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
    text: {
      primary: '#fafafa',
      secondary: '#a1a1aa',
      muted: '#71717a',
    },
    red: {
      primary: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.2)',
    },
    blue: {
      primary: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.08)',
      border: 'rgba(59, 130, 246, 0.2)',
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: colors.bg,
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        border: `1px solid ${colors.border}`,
        position: 'relative',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? '0 8px 32px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
          : '0 2px 8px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Header Row */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '14px' 
      }}>
        <span style={{ 
          fontSize: '10px', 
          fontWeight: '600', 
          color: colors.text.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {category}
        </span>
        
        {status === 'active' ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: seconds <= 300 
              ? 'rgba(239, 68, 68, 0.1)' 
              : 'rgba(34, 197, 94, 0.1)',
            border: `1px solid ${seconds <= 300 
              ? 'rgba(239, 68, 68, 0.2)' 
              : 'rgba(34, 197, 94, 0.2)'}`,
          }}>
            {seconds <= 300 ? null : (
              <span style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#22c55e',
                animation: 'pulse-dot 2s ease-in-out infinite',
              }} />
            )}
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '600',
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
              color: seconds <= 300 ? '#ef4444' : '#22c55e',
              letterSpacing: '-0.02em',
            }}>
              {formatTime(seconds)}
            </span>
          </div>
        ) : (
          <span style={{ 
            fontSize: '10px', 
            fontWeight: '600', 
            color: colors.text.muted,
            background: 'rgba(113, 113, 122, 0.1)',
            padding: '4px 10px',
            borderRadius: '20px',
            letterSpacing: '0.04em',
          }}>
            ENDED
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: colors.text.primary,
        lineHeight: '1.4',
        marginBottom: '16px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: '40px',
        letterSpacing: '-0.01em',
      }}>
        {title}
      </div>

      {/* FINAL COUNTDOWN OVERLAY */}
      {isLocked && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 9, 11, 0.95)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <div style={{
            fontSize: '9px',
            fontWeight: '700',
            color: '#71717a',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            marginBottom: '12px',
          }}>
            Closing
          </div>
          <div style={{
            fontSize: '56px',
            fontWeight: '700',
            fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
            background: 'linear-gradient(135deg, #ef4444 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
          }}>
            {seconds}
          </div>
        </div>
      )}

      {/* Options */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px', 
        marginBottom: '16px', 
        opacity: isLocked ? 0.2 : 1, 
        pointerEvents: isLocked ? 'none' : 'auto' 
      }}>
        {/* Option A */}
        <div
          onClick={(e) => handleStartEdit('left', e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: editingSide === 'left' ? '8px 12px' : '12px 14px',
            borderRadius: '10px',
            cursor: (status === 'active' && !isLocked) ? 'pointer' : 'default',
            transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
            background: editingSide === 'left' 
              ? 'rgba(239, 68, 68, 0.15)' 
              : colors.red.bg,
            border: `1px solid ${editingSide === 'left' ? colors.red.primary : colors.red.border}`,
          }}
        >
          {editingSide === 'left' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fafafa',
                  fontSize: '13px',
                  fontFamily: "'SF Mono', monospace",
                  outline: 'none',
                }}
              />
              <button 
                onClick={(e) => { e.stopPropagation(); setEditingSide(null); }} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.06)', 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '8px 10px', 
                  color: '#71717a', 
                  fontSize: '12px', 
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                ✕
              </button>
              <button 
                onClick={(e) => handleSubmitBet('left', e)} 
                style={{ 
                  background: colors.red.primary, 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '8px 16px', 
                  color: '#fff', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                Buy
              </button>
            </div>
          ) : (
            <>
              <span style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                color: colors.text.primary, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap', 
                maxWidth: '65%' 
              }}>
                {left}
              </span>
              <span style={{ 
                fontSize: '15px', 
                fontWeight: '700', 
                fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
                color: colors.red.primary,
                letterSpacing: '-0.02em',
              }}>
                {votesHidden ? '—' : `${leftPct}%`}
              </span>
            </>
          )}
        </div>

        {/* Option B */}
        <div
          onClick={(e) => handleStartEdit('right', e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: editingSide === 'right' ? '8px 12px' : '12px 14px',
            borderRadius: '10px',
            cursor: (status === 'active' && !isLocked) ? 'pointer' : 'default',
            transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
            background: editingSide === 'right'
              ? 'rgba(59, 130, 246, 0.15)'
              : colors.blue.bg,
            border: `1px solid ${editingSide === 'right' ? colors.blue.primary : colors.blue.border}`,
          }}
        >
          {editingSide === 'right' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fafafa',
                  fontSize: '13px',
                  fontFamily: "'SF Mono', monospace",
                  outline: 'none',
                }}
              />
              <button 
                onClick={(e) => { e.stopPropagation(); setEditingSide(null); }} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.06)', 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '8px 10px', 
                  color: '#71717a', 
                  fontSize: '12px', 
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
              <button 
                onClick={(e) => handleSubmitBet('right', e)} 
                style={{ 
                  background: colors.blue.primary, 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '8px 16px', 
                  color: '#fff', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                }}
              >
                Buy
              </button>
            </div>
          ) : (
            <>
              <span style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                color: colors.text.primary, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap', 
                maxWidth: '65%' 
              }}>
                {right}
              </span>
              <span style={{ 
                fontSize: '15px', 
                fontWeight: '700', 
                fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
                color: colors.blue.primary,
                letterSpacing: '-0.02em',
              }}>
                {votesHidden ? '—' : `${rightPct}%`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingTop: '14px',
        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
      }}>
        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ 
            fontSize: '11px', 
            color: colors.text.muted,
            fontWeight: '500',
          }}>
            Vol
          </span>
          <span style={{ 
            fontSize: '15px', 
            fontWeight: '700',
            fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
            background: 'linear-gradient(135deg, #ef4444 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
          }}>
            ${formatCurrency(pot, 0)}
          </span>
        </div>
        
        {/* Reactions - Minimized */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={handleLike}
            disabled={userLiked || userDisliked || status !== 'active'}
            style={{ 
              background: 'transparent',
              border: 'none',
              padding: '4px 8px',
              cursor: (userLiked || userDisliked || status !== 'active') ? 'default' : 'pointer',
              fontSize: '12px',
              color: userLiked ? '#22c55e' : colors.text.muted,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: (userDisliked || status !== 'active') ? 0.3 : 1,
              transition: 'all 150ms ease',
            }}
          >
            <span style={{ fontSize: '11px' }}>↑</span>
            <span style={{ fontFamily: "'SF Mono', monospace", fontSize: '11px' }}>{localLikes}</span>
          </button>
          <button 
            onClick={handleDislike}
            disabled={userLiked || userDisliked || status !== 'active'}
            style={{ 
              background: 'transparent',
              border: 'none',
              padding: '4px 8px',
              cursor: (userLiked || userDisliked || status !== 'active') ? 'default' : 'pointer',
              fontSize: '12px',
              color: userDisliked ? '#ef4444' : colors.text.muted,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: (userLiked || status !== 'active') ? 0.3 : 1,
              transition: 'all 150ms ease',
            }}
          >
            <span style={{ fontSize: '11px' }}>↓</span>
            <span style={{ fontFamily: "'SF Mono', monospace", fontSize: '11px' }}>{localDislikes}</span>
          </button>
        </div>
      </div>

      {/* Admin Cancel - Subtle */}
      {isAdmin && status === 'active' && (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!confirm('Cancel this market?')) return;
            try {
              await api.patch(`/divides/${encodeURIComponent(divideId)}`, { status: 'ended' });
              alert('Market cancelled');
            } catch (err) { alert(err.message || 'Failed'); }
          }}
          style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            background: 'transparent', 
            border: 'none', 
            color: '#52525b', 
            padding: '4px', 
            borderRadius: '4px', 
            fontSize: '10px', 
            cursor: 'pointer',
            opacity: 0.5,
            transition: 'opacity 150ms ease',
          }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0.5}
        >
          ✕
        </button>
      )}
    </div>
  );
}
