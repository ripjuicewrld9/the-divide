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
  // imageA, imageB, soundA, soundB removed (no charts / labels)
}) {
  // images removed for simplified cards
  // always reflect server values passed as props
  const [l, setL] = useState(Number(leftVotes) || 0);
  const [r, setR] = useState(Number(rightVotes) || 0);
  const [hoverSide, setHoverSide] = useState(null);
  const [editingSide, setEditingSide] = useState(null); // 'left' | 'right' | null
  const [betAmount, setBetAmount] = useState('1');
  const [userVotedSide, setUserVotedSide] = useState(() => {
    try { return localStorage.getItem(`divideVote:${divideId}`); } catch { return null; }
  });
  const [seconds, setSeconds] = useState(() => {
    if (!endTime) return 0;
    const delta = Math.floor((new Date(endTime) - Date.now()) / 1000);
    return Math.max(0, delta);
  });

  const { user } = useAuth();

  const isAdmin = user && user.role === 'admin';

  // Update local vote counts when server props change
  useEffect(() => {
    console.debug('[DivideCard] leftVotes changed', {
      title,
      old: l,
      new: Number(leftVotes) || 0,
      delta: (Number(leftVotes) || 0) - l,
      time: new Date().toISOString()
    });
    setL(Number(leftVotes) || 0);
  }, [leftVotes, title, l]);

  useEffect(() => {
    console.debug('[DivideCard] rightVotes changed', {
      title,
      old: r,
      new: Number(rightVotes) || 0,
      delta: (Number(rightVotes) || 0) - r,
      time: new Date().toISOString()
    });
    setR(Number(rightVotes) || 0);
  }, [rightVotes, title, r]);
  
  useEffect(() => {
    console.debug('[DivideCard] state update', {
      title,
      leftVotes,
      rightVotes,
      l,
      r,
      time: new Date().toISOString()
    });
  }, [leftVotes, rightVotes, l, r, title]);

  // Timer: compute from server `endTime`
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

  // derive a human-friendly winner label when the divide ends
  const winnerLabel = (() => {
    if (!winner) return null;
    const w = String(winner).toUpperCase();
    if (w === 'A' || w === 'LEFT') return left;
    if (w === 'B' || w === 'RIGHT') return right;
    return winner;
  })();

  const handleVote = async (side, boostAmount) => {
    if (!active) return alert('This divide is no longer active');
    if (!user) return alert("Please log in to vote");
    try {
      // prefer parent handler (calls backend). If none, update locally.
      if (onVote) {
        // allow parent handler to accept an optional boostAmount param
        await onVote(side === "left" ? "A" : "B", boostAmount);
        // persist choice so user cannot vote opposite side in this session
        try { localStorage.setItem(`divideVote:${divideId}`, side === 'left' ? 'A' : 'B'); } catch (e) { console.debug('localStorage set item failed', e); }
        setUserVotedSide(side === 'left' ? 'A' : 'B');
        return;
      }

      // local fallback: increment counts
      if (side === "left") setL((p) => p + 1);
      else setR((p) => p + 1);
    } catch (err) {
      console.error("Vote error:", err);
      alert(err.message || "Vote failed");
    }
  };

  const handleStartEdit = (side) => {
    // Prevent selecting opposite side if already voted for one side
    if (userVotedSide && ((userVotedSide === 'A' && side === 'right') || (userVotedSide === 'B' && side === 'left'))) {
      alert('You have already placed a bet on the other side and cannot bet the opposite side.');
      return;
    }
    setEditingSide(side);
    setBetAmount('1');
  };

  const handleSubmitBet = async (side) => {
    const amount = Number(betAmount) || 0;
    if (amount <= 0) return alert('Enter a positive bet amount');
    try {
      await handleVote(side, amount);
      // optimistic local counts (server will emit update)
      if (side === 'left') setL((p) => p + amount);
      else setR((p) => p + amount);
    } catch (err) {
      // errors are handled/propagated in handleVote; log for debugging
      console.debug('handleSubmitBet error', err);
    } finally {
      setEditingSide(null);
    }
  };

  const formatTime = (s) => {
    // Show human-friendly Dd Hh Mm when large
    if (s <= 0) return "00:00";
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    const sec = (s % 60).toString().padStart(2, "0");
    const min = minutes.toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  const toggleExpand = () => {
    // delegate expansion handling to parent
    if (typeof onRequestExpand === 'function') onRequestExpand();
  };
      
  return (
    <div
      className="divide-card"
      style={{
        position: 'relative',
        cursor: 'pointer',
        // show winner glow when divide has ended and a winner exists
        border: `2px solid ${status === 'ended' && winner ? (String(winner).toUpperCase() === 'A' ? colorA : (String(winner).toUpperCase() === 'B' ? colorB : '#223')) : '#223'}`,
        boxShadow: status === 'ended' && winner ? `0 0 18px ${String(winner).toUpperCase() === 'A' ? colorA : (String(winner).toUpperCase() === 'B' ? colorB : '#223')}, 0 0 36px ${String(winner).toUpperCase() === 'A' ? colorA : (String(winner).toUpperCase() === 'B' ? colorB : '#223')} inset` : 'none'
      }}
      onClick={toggleExpand}
    >
      {status !== 'active' && (
        <div className="status-badge">{status === 'ended' ? `Ended${winnerLabel ? ` • Winner: ${winnerLabel}` : ''}` : status}</div>
      )}
  <h2 style={{ cursor: 'pointer' }}>{title}</h2>

      {creatorUsername && (
        <div style={{ fontSize: 12, color: '#9fb', marginBottom: 8 }}>Created by: {creatorUsername}</div>
      )}

      {/* Admin controls */}
      {isAdmin && status === 'active' && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <button
            className="btn-small"
            onClick={async (e) => {
              e.stopPropagation();
              if (!confirm('Cancel this divide? This will end it immediately without payouts.')) return;
              try {
                // use frontend API helper so the request goes to the configured backend (VITE_API_URL or fallback)
                await api.patch(`/divides/${encodeURIComponent(divideId)}`, { status: 'ended' });
                // rely on socket update to refresh UI
                alert('Divide cancelled');
              } catch (err) {
                console.error('Cancel divide failed', err);
                alert(err.message || 'Failed to cancel divide');
              }
            }}
            style={{ background: '#666', color: '#fff', padding: '6px 8px', borderRadius: 6 }}
          >Cancel</button>
        </div>
      )}
      {/* removed blind voting label UI - buttons already hide content during active user-created divides */}

      {/* Blind short betting explanation for active divides */}
      {status === 'active' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(238, 90, 111, 0.2) 100%)',
          border: '2px solid rgba(255, 107, 107, 0.5)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '14px',
          fontSize: '13px',
          color: '#ffb3b3',
          fontWeight: '700',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(255, 107, 107, 0.2)'
        }}>
          🎭 <strong>BLIND SHORT</strong>: Bet on what will <strong>LOSE</strong> • Can't see others' picks • Losing side wins!
        </div>
      )}

      <div className="vote-section">
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); if (editingSide === 'left') return; handleStartEdit('left'); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (editingSide !== 'left') handleStartEdit('left'); } }}
          onMouseEnter={() => setHoverSide("left")}
          onMouseLeave={() => setHoverSide(null)}
          className="vote-btn"
          title={`SHORT ${left} - Bet this will LOSE`}
        >
          <div className="vote-colored-top vote-colored-top-left"></div>
          <div className="vote-box-front"></div>
          {editingSide === 'left' ? (
            <span className="vote-input-wrapper">
              <input
                className="clean-input vote-input"
                type="number"
                min="0"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Bet amount for ${left}`}
              />
              <button type="button" className="vote-submit" onClick={(e) => { e.stopPropagation(); handleSubmitBet('left'); }} aria-label="Submit bet">✔</button>
            </span>
          ) : (
            <span>
              {(hoverSide === "left" && status !== 'active') ? `${leftPct}%` : left}
            </span>
          )}
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); if (editingSide === 'right') return; handleStartEdit('right'); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (editingSide !== 'right') handleStartEdit('right'); } }}
          onMouseEnter={() => setHoverSide("right")}
          onMouseLeave={() => setHoverSide(null)}
          className="vote-btn"
          title={`SHORT ${right} - Bet this will LOSE`}
        >
          <div className="vote-colored-top vote-colored-top-right"></div>
          <div className="vote-box-front"></div>
          {editingSide === 'right' ? (
            <span className="vote-input-wrapper">
              <input
                className="clean-input vote-input"
                type="number"
                min="0"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Bet amount for ${right}`}
              />
              <button type="button" className="vote-submit" onClick={(e) => { e.stopPropagation(); handleSubmitBet('right'); }} aria-label="Submit bet">✔</button>
            </span>
          ) : (
            <span>
              {(hoverSide === "right" && status !== 'active') ? `${rightPct}%` : right}
            </span>
          )}
        </div>
      </div>

      <div className="timer-wrapper">
        <div className={`timer ${seconds <= 30 ? "timer-red" : ""}`}>
          {formatTime(seconds)}
        </div>
  <div className="pot">Pot: ${formatCurrency(pot, 2)}</div>
      </div>
    </div>
  );
}