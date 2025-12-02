// src/components/DivideCard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from '../utils/format';
import api from '../services/api';

export default function DivideCard({
  divideId,
  title,
  creatorUsername = null,
  left,
  right,
  leftVotes = 0,
  rightVotes = 0,
  pot = 0,
  endTime = null,
  status = 'active',
  winner = null,
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
  const [seconds, setSeconds] = useState(() => {
    if (!endTime) return 0;
    const delta = Math.floor((new Date(endTime) - Date.now()) / 1000);
    return Math.max(0, delta);
  });

  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';

  useEffect(() => { setL(Number(leftVotes) || 0); }, [leftVotes]);
  useEffect(() => { setR(Number(rightVotes) || 0); }, [rightVotes]);

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
      
  return (
    <div
      className="fade-card"
      style={{
        background: 'linear-gradient(180deg, #0d1117 0%, #161b22 100%)',
        border: status === 'ended' && winner 
          ? `2px solid ${String(winner).toUpperCase() === 'A' ? colorA : colorB}`
          : '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '20px',
        color: '#fff',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: status === 'ended' && winner 
          ? `0 0 20px ${String(winner).toUpperCase() === 'A' ? colorA : colorB}40`
          : '0 4px 20px rgba(0,0,0,0.3)',
      }}
      onClick={toggleExpand}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* Header: Status + Timer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {status === 'active' ? (
            <>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isUrgent ? '#ff4444' : '#ff6600',
                boxShadow: `0 0 8px ${isUrgent ? '#ff4444' : '#ff6600'}`,
                animation: 'pulse 2s infinite',
              }} />
              <span style={{ fontSize: '11px', fontWeight: '700', color: isUrgent ? '#ff6b6b' : '#ff8833', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {isUrgent ? '⚡ CLOSING' : 'BLIND WAGER'}
              </span>
            </>
          ) : (
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase' }}>
              {status === 'ended' ? `Settled${winnerLabel ? ` • ${winnerLabel} won` : ''}` : status}
            </span>
          )}
        </div>
        
        {status === 'active' && (
          <div style={{
            background: isUrgent ? 'rgba(255,68,68,0.15)' : 'rgba(255,102,0,0.1)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            fontFamily: 'monospace',
            color: isUrgent ? '#ff6b6b' : '#ff8833',
            border: `1px solid ${isUrgent ? 'rgba(255,68,68,0.3)' : 'rgba(255,102,0,0.2)'}`,
          }}>
            ⏱ {formatTime(seconds)}
          </div>
        )}
      </div>

      {/* Title */}
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '16px',
        fontWeight: '600',
        lineHeight: '1.4',
        color: '#fff',
      }}>
        {title}
      </h3>

      {creatorUsername && (
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '16px' }}>
          by {creatorUsername}
        </div>
      )}

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

      {/* Footer: Pot */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ fontSize: '12px', color: '#888', marginRight: '6px' }}>Pool</span>
        <span style={{ fontSize: '16px', fontWeight: '700', color: '#00ff88' }}>
          ${formatCurrency(pot, 2)}
        </span>
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