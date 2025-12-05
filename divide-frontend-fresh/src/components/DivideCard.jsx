// src/components/DivideCard.jsx
// Polymarket-style design with bright Red vs Blue sides
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from '../utils/format';
import api from '../services/api';

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

  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user && user.role === 'admin';

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
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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
    if (status !== 'active') return; // Can't like ended divides
    if (userLiked || userDisliked) return; // Locked once you've reacted
    try {
      const res = await api.post(`/api/divides/${divideId}/like`);
      setLocalLikes(res.likes || localLikes + 1);
      setUserLiked(true);
    } catch (err) { console.error('Like failed:', err); }
  };

  const handleDislike = async (e) => {
    e.stopPropagation();
    if (!user) return alert('Please log in');
    if (status !== 'active') return; // Can't dislike ended divides
    if (userLiked || userDisliked) return; // Locked once you've reacted
    try {
      const res = await api.post(`/api/divides/${divideId}/dislike`);
      setLocalDislikes(res.dislikes || localDislikes + 1);
      setUserDisliked(true);
    } catch (err) { console.error('Dislike failed:', err); }
  };

  const handleCardClick = () => {
    // Navigate to divide detail page
    navigate(`/divide/${divideId}`);
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? '#1e1e24' : '#16161a',
        borderRadius: '8px',
        padding: '14px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        border: '1px solid #2a2a30',
        position: 'relative',
        fontSize: '12px',
        boxShadow: isHovered ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      {/* Header: Category + Timer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <span style={{ fontSize: '9px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {category}
        </span>
        <span style={{ fontSize: '9px', fontWeight: '500', color: status === 'ended' ? '#e53935' : '#888' }}>
          {status === 'active' ? formatTime(seconds) : 'Ended'}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: '13px',
        fontWeight: '600',
        color: '#e8e8e8',
        lineHeight: '1.35',
        marginBottom: '12px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: '36px',
      }}>
        {title}
      </div>

      {/* Options - Red vs Blue style rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
        {/* Option A - RED */}
        <div
          onClick={(e) => handleStartEdit('left', e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: editingSide === 'left' ? '6px 10px' : '10px 12px',
            borderRadius: '6px',
            cursor: status === 'active' ? 'pointer' : 'default',
            transition: 'all 0.12s ease',
            background: editingSide === 'left' 
              ? 'linear-gradient(90deg, #ff1744 0%, #d50000 100%)' 
              : 'linear-gradient(90deg, rgba(255, 23, 68, 0.25) 0%, rgba(213, 0, 0, 0.15) 100%)',
            border: `1px solid ${editingSide === 'left' ? '#ff1744' : 'rgba(255, 23, 68, 0.4)'}`,
            boxShadow: editingSide === 'left' ? '0 0 12px rgba(255, 23, 68, 0.4)' : 'none',
          }}
        >
          {editingSide === 'left' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="$"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.5)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                  width: '100%',
                }}
              />
              <button onClick={(e) => { e.stopPropagation(); setEditingSide(null); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '6px 8px', color: '#888', fontSize: '11px', cursor: 'pointer' }}>✕</button>
              <button onClick={(e) => handleSubmitBet('left', e)} style={{ background: '#e53935', border: 'none', borderRadius: '4px', padding: '6px 12px', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Buy</button>
            </div>
          ) : (
            <>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{left}</span>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#ff1744', textShadow: '0 0 8px rgba(255, 23, 68, 0.5)' }}>{leftPct}%</span>
            </>
          )}
        </div>

        {/* Option B - BLUE */}
        <div
          onClick={(e) => handleStartEdit('right', e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: editingSide === 'right' ? '6px 10px' : '10px 12px',
            borderRadius: '6px',
            cursor: status === 'active' ? 'pointer' : 'default',
            transition: 'all 0.12s ease',
            background: editingSide === 'right'
              ? 'linear-gradient(90deg, #2979ff 0%, #0d47a1 100%)'
              : 'linear-gradient(90deg, rgba(41, 121, 255, 0.25) 0%, rgba(13, 71, 161, 0.15) 100%)',
            border: `1px solid ${editingSide === 'right' ? '#2979ff' : 'rgba(41, 121, 255, 0.4)'}`,
            boxShadow: editingSide === 'right' ? '0 0 12px rgba(41, 121, 255, 0.4)' : 'none',
          }}
        >
          {editingSide === 'right' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="$"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.5)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                  width: '100%',
                }}
              />
              <button onClick={(e) => { e.stopPropagation(); setEditingSide(null); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '6px 8px', color: '#888', fontSize: '11px', cursor: 'pointer' }}>✕</button>
              <button onClick={(e) => handleSubmitBet('right', e)} style={{ background: '#1e88e5', border: 'none', borderRadius: '4px', padding: '6px 12px', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Buy</button>
            </div>
          ) : (
            <>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{right}</span>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#2979ff', textShadow: '0 0 8px rgba(41, 121, 255, 0.5)' }}>{rightPct}%</span>
            </>
          )}
        </div>
      </div>

      {/* Footer: Volume + Reactions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #2a2a30' }}>
        <span style={{ fontSize: '11px', color: '#666' }}>
          <span style={{ color: '#e53935', fontWeight: '600' }}>${formatCurrency(pot, 0)}</span> Vol
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleLike}
            disabled={userLiked || userDisliked || status !== 'active'}
            style={{ 
              background: userLiked ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.05)',
              border: 'none',
              padding: '4px 8px',
              cursor: (userLiked || userDisliked || status !== 'active') ? 'default' : 'pointer',
              fontSize: '11px',
              color: userLiked ? '#4ade80' : (userDisliked || status !== 'active' ? '#444' : '#888'),
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: (userDisliked || status !== 'active') ? 0.4 : 1,
              transition: 'all 0.12s ease',
            }}
          >
            👍 {localLikes}
          </button>
          <button 
            onClick={handleDislike}
            disabled={userLiked || userDisliked || status !== 'active'}
            style={{ 
              background: userDisliked ? 'rgba(248, 113, 113, 0.2)' : 'rgba(255,255,255,0.05)',
              border: 'none',
              padding: '4px 8px',
              cursor: (userLiked || userDisliked || status !== 'active') ? 'default' : 'pointer',
              fontSize: '11px',
              color: userDisliked ? '#f87171' : (userLiked || status !== 'active' ? '#444' : '#888'),
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: (userLiked || status !== 'active') ? 0.4 : 1,
              transition: 'all 0.12s ease',
            }}
          >
            👎 {localDislikes}
          </button>
        </div>
      </div>

      {/* Admin Cancel */}
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
          style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.04)', border: 'none', color: '#444', padding: '3px 6px', borderRadius: '4px', fontSize: '9px', cursor: 'pointer' }}
        >
          ✕
        </button>
      )}
    </div>
  );
}