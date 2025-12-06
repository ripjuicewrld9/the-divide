import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { formatDivideText } from '../utils/textFormat';
import '../styles/CreateDivideModal.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const CATEGORIES = ['Politics', 'Sports', 'Crypto', 'Entertainment', 'Science', 'Business', 'Other'];

export default function CreateDivideModal({ isOpen, onClose, onDivideCreated }) {
  const { user, refreshUser } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [category, setCategory] = useState('Other');
  const [bet, setBet] = useState('1');
  const [side, setSide] = useState('A');
  const [positionMode, setPositionMode] = useState('short'); // 'long' or 'short' - default to short
  const [duration, setDuration] = useState('10');
  const [durationUnit, setDurationUnit] = useState('minutes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const betAmount = parseFloat(bet);
      if (isNaN(betAmount) || betAmount <= 0) {
        setError('Short amount must be greater than 0');
        setLoading(false);
        return;
      }

      if (!user) {
        setError('You must be logged in');
        setLoading(false);
        return;
      }

      if (user.balance < betAmount) {
        setError(`Insufficient balance. You have $${user.balance}, but need $${betAmount}`);
        setLoading(false);
        return;
      }

      // Format text with smart capitalization and spell correction
      const formattedTitle = formatDivideText(title);
      const formattedOptionA = formatDivideText(optionA);
      const formattedOptionB = formatDivideText(optionB);

      // Map Long/Short + Side to actual betting side
      // Long A = money to B (expect A majority, B minority wins)
      // Short A = money to A (expect A minority wins)
      let actualSide;
      if (positionMode === 'long') {
        actualSide = side === 'A' ? 'B' : 'A';
      } else {
        actualSide = side;
      }

      const response = await fetch(`${API_BASE}/Divides/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: formattedTitle,
          optionA: formattedOptionA,
          optionB: formattedOptionB,
          category,
          bet: betAmount,
          side: actualSide,
          durationValue: parseInt(duration),
          durationUnit
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create divide');
        setLoading(false);
        return;
      }

      // Refresh user balance and close modal
      await refreshUser();
      onDivideCreated?.(data);

      // Reset form
      setTitle('');
      setOptionA('');
      setOptionB('');
      setCategory('Other');
      setBet('1');
      setSide('A');
      setPositionMode('short');
      setDuration('10');
      setDurationUnit('minutes');
      setError('');
      onClose();
    } catch (err) {
      console.error('Create divide error:', err);
      setError('Server error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }}>
      <div style={{
        background: '#16161a',
        border: '1px solid #2a2a30',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #2a2a30',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#e8e8e8' }}>Create a Divide</h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}>✕</button>
        </div>

        {/* How It Works Explainer */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(229, 57, 53, 0.1) 0%, rgba(156, 39, 176, 0.1) 50%, rgba(30, 136, 229, 0.1) 100%)',
          padding: '16px',
          borderRadius: '12px',
          margin: '16px 20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '12px',
          lineHeight: '1.6'
        }}>
          {/* Core Rule */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
            paddingBottom: '10px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fbbf24" style={{ width: '18px', height: '18px', flexShrink: 0 }}>
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
            <span style={{ color: '#fff', fontWeight: '700', fontSize: '13px' }}>BLIND PLAY — MINORITY WINS</span>
          </div>

          {/* The Hook */}
          <p style={{ color: '#e0e0e0', marginBottom: '12px', fontWeight: '500' }}>
            Go Long on your side. <span style={{ color: '#4ade80' }}>Win the money if you're the minority.</span> <span style={{ color: '#f87171' }}>Lose it all if you're the majority.</span>
          </p>

          {/* The Rules */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '12px'
          }}>
            <p style={{ color: '#a0a0a0', margin: 0 }}>
              The side with <span style={{ color: '#4ade80', fontWeight: '600' }}>fewer longs</span> wins <span style={{ color: '#4ade80', fontWeight: '600' }}>97%</span> of the pot. All plays are blind — you can't see how others chose.
            </p>
          </div>

          {/* The Sacrifice */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            fontSize: '11px'
          }}>
            <div style={{
              background: 'rgba(74, 222, 128, 0.15)',
              borderRadius: '6px',
              padding: '8px',
              border: '1px solid rgba(74, 222, 128, 0.2)'
            }}>
              <span style={{ color: '#4ade80', fontWeight: '600' }}>💰 MINORITY WINS:</span>
              <p style={{ color: '#a0a0a0', margin: '4px 0 0 0' }}>Fewer longs = you split the entire pot</p>
            </div>
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              borderRadius: '6px',
              padding: '8px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <span style={{ color: '#f87171', fontWeight: '600' }}>💸 MAJORITY LOSES:</span>
              <p style={{ color: '#a0a0a0', margin: '4px 0 0 0' }}>More longs = you funded the winner's payout</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="create-divide-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., iPhone 16 vs Galaxy S24"
              required
              maxLength={100}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Option A</label>
              <input
                type="text"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="e.g., iPhone 16"
                required
                maxLength={50}
              />
            </div>
            <div className="form-group">
              <label>Option B</label>
              <input
                type="text"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="e.g., Galaxy S24"
                required
                maxLength={50}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              style={{
                padding: '10px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #2a2a30',
                background: '#0d0d0f',
                color: '#e0e0e0',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} style={{ background: '#16161a', color: '#e0e0e0' }}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Your Initial Position ($)</label>
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              placeholder="1.00"
              min="0.01"
              step="0.01"
              required
            />
            <small>Your balance: ${user?.balance?.toFixed(2) || '0.00'}</small>
          </div>

          {/* Long/Short Toggle */}
          <div className="form-group">
            <label>Position Type</label>
            {/* Toggle Switch */}
            <div
              onClick={() => setPositionMode(positionMode === 'long' ? 'short' : 'long')}
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
                marginBottom: '12px',
              }}
            >
              <div style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '17px',
                background: positionMode === 'long'
                  ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
                  : 'transparent',
                color: positionMode === 'long' ? '#000' : '#666',
                fontSize: '12px',
                fontWeight: '700',
                textAlign: 'center',
                transition: 'all 200ms ease',
              }}>
                📈 LONG
              </div>
              <div style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '17px',
                background: positionMode === 'short'
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'transparent',
                color: positionMode === 'short' ? '#fff' : '#666',
                fontSize: '12px',
                fontWeight: '700',
                textAlign: 'center',
                transition: 'all 200ms ease',
              }}>
                📉 SHORT
              </div>
            </div>
            <small style={{ color: '#888', lineHeight: 1.5 }}>
              {positionMode === 'long'
                ? 'Long = expect this side to be majority'
                : 'Short = expect this side to be minority'
              }
              <span style={{ color: '#fbbf24', display: 'block' }}>Minority eats 97% of the pot.</span>
            </small>
          </div>

          {/* Side Selection */}
          <div className="form-group">
            <label>Select Side to {positionMode === 'long' ? 'Long' : 'Short'}</label>
            <div className="side-selector">
              <button
                type="button"
                className={`side-btn ${side === 'A' ? 'active' : ''}`}
                onClick={() => setSide('A')}
                style={{
                  border: side === 'A' ? '1px solid #e53935' : '1px solid #2a2a30',
                  background: side === 'A' ? 'rgba(229, 57, 53, 0.2)' : '#0d0d0f',
                  color: side === 'A' ? '#ff5252' : '#888'
                }}
              >
                {optionA || 'Option A'}
              </button>
              <button
                type="button"
                className={`side-btn ${side === 'B' ? 'active' : ''}`}
                onClick={() => setSide('B')}
                style={{
                  border: side === 'B' ? '1px solid #1e88e5' : '1px solid #2a2a30',
                  background: side === 'B' ? 'rgba(30, 136, 229, 0.2)' : '#0d0d0f',
                  color: side === 'B' ? '#42a5f5' : '#888'
                }}
              >
                {optionB || 'Option B'}
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Duration</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="10"
                min="1"
                max="1440"
                required
              />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)}>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-create" disabled={loading}>
              {loading ? 'Creating...' : 'Create Divide'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
