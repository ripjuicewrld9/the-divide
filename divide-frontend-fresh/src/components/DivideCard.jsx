// src/components/DivideCard.jsx
// Polymarket-exact minimalist design with deep red/black theme
import React, { useState, useEffect } from "react";
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
    if (userLiked) return;
    try {
      const res = await api.post(`/api/divides/${divideId}/like`);
      setLocalLikes(res.likes || localLikes + 1);
      if (userDisliked) setLocalDislikes(prev => Math.max(0, prev - 1));
      setUserLiked(true);
      setUserDisliked(false);
    } catch (err) { console.error('Like failed:', err); }
  };

  const handleDislike = async (e) => {
    e.stopPropagation();
    if (!user) return alert('Please log in');
    if (userDisliked) return;
    try {
      const res = await api.post(`/api/divides/${divideId}/dislike`);
      setLocalDislikes(res.dislikes || localDislikes + 1);
      if (userLiked) setLocalLikes(prev => Math.max(0, prev - 1));
      setUserDisliked(true);
      setUserLiked(false);
    } catch (err) { console.error('Dislike failed:', err); }
  };

  const toggleExpand = () => {
    if (typeof onRequestExpand === 'function') onRequestExpand();
  };

  return (
    <div
      onClick={toggleExpand}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? '#161616' : '#111111',
        borderRadius: '8px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        border: '1px solid #1a1a1a',
        position: 'relative',
      }}
    >
      {/* Header: Category + Timer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: '600', color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {category}
        </span>
        <span style={{ fontSize: '10px', fontWeight: '500', color: status === 'ended' ? '#6b1c1c' : '#444' }}>
          {status === 'active' ? formatTime(seconds) : 'Ended'}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#d4d4d4',
        lineHeight: '1.4',
        marginBottom: '14px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {title}
      </div>

      {/* Options - Polymarket style rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        {/* Option A */}
        <div
          onClick={(e) => handleStartEdit('left', e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: editingSide === 'left' ? '8px 10px' : '10px 12px',
            borderRadius: '6px',
            cursor: status === 'active' ? 'pointer' : 'default',
            transition: 'all 0.12s ease',
            background: editingSide === 'left' 
              ? 'linear-gradient(90deg, #6b1c1c 0%, #4a1212 100%)' 
              : 'linear-gradient(90deg, rgba(107, 28, 28, 0.12) 0%, rgba(74, 18, 18, 0.06) 100%)',
            border: `1px solid ${editingSide === 'left' ? '#6b1c1c' : 'rgba(107, 28, 28, 0.2)'}`,
          }}
        >
          {editingSide === 'left' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="$0.00"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.4)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button onClick={(e) => { e.stopPropagation(); setEditingSide(null); }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', padding: '6px 8px', color: '#666', fontSize: '11px', cursor: 'pointer' }}>✕</button>
              <button onClick={(e) => handleSubmitBet('left', e)} style={{ background: '#6b1c1c', border: 'none', borderRadius: '4px', padding: '6px 12px', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Buy</button>
            </div>
          ) : (
            <>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#c4c4c4' }}>{left}</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#a33' }}>{leftPct}%</span>
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
            padding: editingSide === 'right' ? '8px 10px' : '10px 12px',
            borderRadius: '6px',
            cursor: status === 'active' ? 'pointer' : 'default',
            transition: 'all 0.12s ease',
            background: editingSide === 'right'
              ? 'linear-gradient(90deg, #4a1212 0%, #2d0a0a 100%)'
              : 'linear-gradient(90deg, rgba(74, 18, 18, 0.12) 0%, rgba(45, 10, 10, 0.06) 100%)',
            border: `1px solid ${editingSide === 'right' ? '#4a1212' : 'rgba(74, 18, 18, 0.2)'}`,
          }}
        >
          {editingSide === 'right' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="$0.00"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.4)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button onClick={(e) => { e.stopPropagation(); setEditingSide(null); }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', padding: '6px 8px', color: '#666', fontSize: '11px', cursor: 'pointer' }}>✕</button>
              <button onClick={(e) => handleSubmitBet('right', e)} style={{ background: '#4a1212', border: 'none', borderRadius: '4px', padding: '6px 12px', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Buy</button>
            </div>
          ) : (
            <>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#c4c4c4' }}>{right}</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#733' }}>{rightPct}%</span>
            </>
          )}
        </div>
      </div>

      {/* Footer: Volume + Reactions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #1a1a1a' }}>
        <span style={{ fontSize: '11px', color: '#444' }}>
          <span style={{ color: '#6b1c1c', fontWeight: '600' }}>${formatCurrency(pot, 0)}</span> Vol.
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleLike}
            style={{ 
              background: userLiked ? 'rgba(74, 222, 128, 0.1)' : 'none',
              border: 'none',
              padding: '4px 6px',
              cursor: userLiked ? 'default' : 'pointer',
              fontSize: '11px',
              color: userLiked ? '#4ade80' : '#444',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            👍 {localLikes}
          </button>
          <button 
            onClick={handleDislike}
            style={{ 
              background: userDisliked ? 'rgba(248, 113, 113, 0.1)' : 'none',
              border: 'none',
              padding: '4px 6px',
              cursor: userDisliked ? 'default' : 'pointer',
              fontSize: '11px',
              color: userDisliked ? '#f87171' : '#444',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
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