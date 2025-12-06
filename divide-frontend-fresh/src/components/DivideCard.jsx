// src/components/DivideCard.jsx
// Premium minimalist game card - Billion dollar aesthetic
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
  voteHistory = [],
  onVote,
  // eslint-disable-next-line no-unused-vars
  onRequestExpand,
  active = true,
}) {
  const [l, setL] = useState(Number(leftVotes) || 0);
  const [r, setR] = useState(Number(rightVotes) || 0);
  const [editingSide, setEditingSide] = useState(null);
  const [positionMode, setPositionMode] = useState('short'); // 'long' or 'short' - default short
  const [betAmount, setBetAmount] = useState('');
  const [localLikes, setLocalLikes] = useState(Number(likes) || 0);
  const [localDislikes, setLocalDislikes] = useState(Number(dislikes) || 0);
  const [userLiked, setUserLiked] = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sentiment, setSentiment] = useState(null);
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

  // Fetch sentiment data
  useEffect(() => {
    if (!divideId) return;
    api.get(`/api/divides/${divideId}/sentiment`)
      .then(data => {
        if (data && data.hasData) {
          setSentiment(data.current);
        }
      })
      .catch(() => { }); // Silently fail if no sentiment
  }, [divideId]);

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

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/divide/${divideId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  };

  const handleCardClick = () => {
    navigate(`/divide/${divideId}`);
  };

  // Premium color tokens - Bold gradient brand
  const colors = {
    bg: isHovered ? 'rgba(18, 18, 22, 1)' : 'rgba(12, 12, 15, 1)',
    border: isHovered ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
    text: {
      primary: '#ffffff',
      secondary: '#b4b4b4',
      muted: '#808080',
    },
    red: {
      primary: '#ff1744',
      hover: '#ff4569',
      bg: 'rgba(255, 23, 68, 0.12)',
      border: 'rgba(255, 23, 68, 0.3)',
    },
    blue: {
      primary: '#2979ff',
      hover: '#448aff',
      bg: 'rgba(41, 121, 255, 0.12)',
      border: 'rgba(41, 121, 255, 0.3)',
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: colors.bg,
        borderRadius: '14px',
        padding: '18px',
        cursor: 'pointer',
        transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        border: `1px solid ${colors.border}`,
        position: 'relative',
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: isHovered
          ? '0 12px 40px rgba(0, 0, 0, 0.35), 0 0 60px rgba(255, 23, 68, 0.08), 0 0 60px rgba(41, 121, 255, 0.08)'
          : '0 4px 16px rgba(0, 0, 0, 0.2)',
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
            padding: '5px 12px',
            borderRadius: '20px',
            background: seconds <= 300
              ? 'linear-gradient(135deg, rgba(255,23,68,0.15) 0%, rgba(255,23,68,0.08) 100%)'
              : 'linear-gradient(135deg, rgba(0,230,118,0.15) 0%, rgba(0,230,118,0.08) 100%)',
            border: `1px solid ${seconds <= 300
              ? 'rgba(255, 23, 68, 0.3)'
              : 'rgba(0, 230, 118, 0.3)'}`,
          }}>
            {seconds <= 300 ? null : (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#00e676',
                boxShadow: '0 0 8px rgba(0, 230, 118, 0.6)',
                animation: 'pulse-dot 2s ease-in-out infinite',
              }} />
            )}
            <span style={{
              fontSize: '12px',
              fontWeight: '700',
              fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
              color: seconds <= 300 ? '#ff1744' : '#00e676',
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
          background: 'linear-gradient(135deg, rgba(10,10,12,0.97) 0%, rgba(5,5,7,0.98) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          border: '1px solid rgba(255, 23, 68, 0.2)',
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: '700',
            color: '#808080',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: '16px',
          }}>
            Final Countdown
          </div>
          <div style={{
            fontSize: '72px',
            fontWeight: '800',
            fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
            background: 'linear-gradient(135deg, #ff1744 0%, #d32f2f 40%, #7c4dff 60%, #2979ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
            textShadow: '0 0 60px rgba(255, 23, 68, 0.3)',
            animation: 'pulse-scale 1s ease-in-out infinite',
          }}>
            {seconds}
          </div>
        </div>
      )}

      {/* Position Selection */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px',
        opacity: isLocked ? 0.2 : 1,
        pointerEvents: isLocked ? 'none' : 'auto'
      }}>

        {/* LONG / SHORT Toggle Switch */}
        {status === 'active' && !isLocked && !editingSide && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginBottom: '4px',
          }}>
            {/* Toggle Switch */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setPositionMode(positionMode === 'long' ? 'short' : 'long');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0',
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '20px',
                padding: '3px',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {/* Long side */}
              <div style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '17px',
                background: positionMode === 'long'
                  ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
                  : 'transparent',
                color: positionMode === 'long' ? '#000' : '#666',
                fontSize: '11px',
                fontWeight: '700',
                textAlign: 'center',
                transition: 'all 200ms ease',
              }}>
                📈 LONG
              </div>
              {/* Short side */}
              <div style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '17px',
                background: positionMode === 'short'
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'transparent',
                color: positionMode === 'short' ? '#fff' : '#666',
                fontSize: '11px',
                fontWeight: '700',
                textAlign: 'center',
                transition: 'all 200ms ease',
              }}>
                📉 SHORT
              </div>
            </div>
            {/* Helper text */}
            <div style={{
              fontSize: '9px',
              color: '#666',
              textAlign: 'center',
              lineHeight: 1.4,
            }}>
              {positionMode === 'long'
                ? 'Long = expect this side to be majority'
                : 'Short = expect this side to be minority'
              }
              <span style={{ color: '#fbbf24', display: 'block' }}>Minority eats 97%</span>
            </div>
          </div>
        )}

        {/* Option A Row */}
        <div
          onClick={(e) => {
            if (status !== 'active' || isLocked) return;
            e.stopPropagation();
            if (positionMode) {
              setEditingSide(positionMode === 'long' ? 'longA' : 'shortA');
              setBetAmount('');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '12px',
            cursor: positionMode && status === 'active' && !isLocked ? 'pointer' : 'default',
            background: editingSide === 'longA' || editingSide === 'shortA'
              ? 'linear-gradient(135deg, rgba(255,23,68,0.25) 0%, rgba(255,23,68,0.15) 100%)'
              : 'linear-gradient(135deg, rgba(255,23,68,0.12) 0%, rgba(255,23,68,0.06) 100%)',
            border: editingSide === 'longA' || editingSide === 'shortA'
              ? `2px solid ${colors.red.primary}`
              : `1px solid ${colors.red.border}`,
            transition: 'all 150ms ease',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {left}
            </span>
            <span style={{
              fontSize: '11px',
              color: '#666',
            }}>
              {votesHidden ? '—' : `${leftPct}% · $${formatCurrency(l, 0)}`}
            </span>
          </div>

          {/* Show selected action */}
          {positionMode && status === 'active' && !isLocked && !editingSide && (
            <span style={{
              fontSize: '10px',
              fontWeight: '600',
              color: positionMode === 'long' ? '#4ade80' : '#ef4444',
              background: positionMode === 'long' ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
              padding: '4px 8px',
              borderRadius: '4px',
            }}>
              {positionMode === 'long' ? 'LONG' : 'SHORT'}
            </span>
          )}
        </div>

        {/* Option B Row */}
        <div
          onClick={(e) => {
            if (status !== 'active' || isLocked) return;
            e.stopPropagation();
            if (positionMode) {
              setEditingSide(positionMode === 'long' ? 'longB' : 'shortB');
              setBetAmount('');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '12px',
            cursor: positionMode && status === 'active' && !isLocked ? 'pointer' : 'default',
            background: editingSide === 'longB' || editingSide === 'shortB'
              ? 'linear-gradient(135deg, rgba(41,121,255,0.25) 0%, rgba(41,121,255,0.15) 100%)'
              : 'linear-gradient(135deg, rgba(41,121,255,0.12) 0%, rgba(41,121,255,0.06) 100%)',
            border: editingSide === 'longB' || editingSide === 'shortB'
              ? `2px solid ${colors.blue.primary}`
              : `1px solid ${colors.blue.border}`,
            transition: 'all 150ms ease',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {right}
            </span>
            <span style={{
              fontSize: '11px',
              color: '#666',
            }}>
              {votesHidden ? '—' : `${rightPct}% · $${formatCurrency(r, 0)}`}
            </span>
          </div>

          {/* Show selected action */}
          {positionMode && status === 'active' && !isLocked && !editingSide && (
            <span style={{
              fontSize: '10px',
              fontWeight: '600',
              color: positionMode === 'long' ? '#4ade80' : '#ef4444',
              background: positionMode === 'long' ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
              padding: '4px 8px',
              borderRadius: '4px',
            }}>
              {positionMode === 'long' ? 'LONG' : 'SHORT'}
            </span>
          )}
        </div>

        {/* Amount Input + Confirm - shows when side is selected */}
        {editingSide && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '10px',
              border: editingSide.includes('long')
                ? '1px solid rgba(74, 222, 128, 0.3)'
                : '1px solid rgba(239, 68, 68, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Explanation of what this bet does */}
            <div style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>
              {editingSide === 'longA' && `Long ${left} = betting ${right} will be minority`}
              {editingSide === 'shortA' && `Short ${left} = betting ${left} will be minority`}
              {editingSide === 'longB' && `Long ${right} = betting ${left} will be minority`}
              {editingSide === 'shortB' && `Short ${right} = betting ${right} will be minority`}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#888' }}>$</span>
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
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: '#fafafa',
                  fontSize: '16px',
                  fontFamily: "'SF Mono', monospace",
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingSide(null);
                  setPositionMode(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#888',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!betAmount || Number(betAmount) <= 0) return;
                  // Determine which side money goes to
                  // Long A = money to B, Short A = money to A
                  // Long B = money to A, Short B = money to B
                  const moneyGoesTo =
                    editingSide === 'longA' || editingSide === 'shortB' ? 'right' : 'left';
                  handleSubmitBet(moneyGoesTo, e);
                  setEditingSide(null);
                  setPositionMode(null);
                }}
                disabled={!betAmount || Number(betAmount) <= 0}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: editingSide.includes('long')
                    ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: editingSide.includes('long') ? '#000' : '#fff',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: betAmount && Number(betAmount) > 0 ? 'pointer' : 'default',
                  opacity: betAmount && Number(betAmount) > 0 ? 1 : 0.5,
                }}
              >
                {editingSide.includes('long') ? '📈 Confirm Long' : '📉 Confirm Short'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sentiment Indicator */}
      {sentiment && sentiment.optionA && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '9px',
              fontWeight: '600',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.4)',
            }}>
              Sentiment
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Option A Sentiment */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                color: sentiment.optionA.label === 'bullish' ? '#22c55e'
                  : sentiment.optionA.label === 'bearish' ? '#ef4444'
                    : 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
              }}>
                {sentiment.optionA.label === 'bullish' ? '↑' : sentiment.optionA.label === 'bearish' ? '↓' : '•'}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colors.red.primary,
                fontFamily: "'SF Mono', monospace",
              }}>
                {sentiment.optionA.score}%
              </span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>|</span>
            {/* Option B Sentiment */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                color: sentiment.optionB.label === 'bullish' ? '#22c55e'
                  : sentiment.optionB.label === 'bearish' ? '#ef4444'
                    : 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
              }}>
                {sentiment.optionB.label === 'bullish' ? '↑' : sentiment.optionB.label === 'bearish' ? '↓' : '•'}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colors.blue.primary,
                fontFamily: "'SF Mono', monospace",
              }}>
                {sentiment.optionB.score}%
              </span>
            </div>
          </div>
        </div>
      )}



      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{
            fontSize: '11px',
            color: colors.text.muted,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Vol
          </span>
          <span style={{
            fontSize: '18px',
            fontWeight: '800',
            fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
            background: 'linear-gradient(135deg, #ff1744 0%, #d32f2f 35%, #7c4dff 65%, #2979ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
          }}>
            ${formatCurrency(pot, 0)}
          </span>
        </div>

        {/* Reactions & Share */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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

          {/* Share Button */}
          <button
            onClick={handleShare}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px 8px',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 150ms ease',
              color: copied ? '#22c55e' : colors.text.muted,
            }}
            title={copied ? 'Copied!' : 'Copy link'}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            {copied && (
              <span style={{ fontSize: '10px', fontWeight: '600' }}>Copied!</span>
            )}
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
