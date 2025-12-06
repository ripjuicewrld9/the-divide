import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { formatDivideText } from '../utils/textFormat';
import '../styles/CreateDivideModal.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const CATEGORIES = ['Politics', 'Sports', 'Crypto', 'Entertainment', 'Science', 'Business', 'Other'];

export default function CreateDivideModal({ isOpen, onClose, onDivideCreated }) {
  const { user, refreshUser } = useContext(AuthContext);
  const [mode, setMode] = useState('classic'); // 'classic' or 'versus'
  const [title, setTitle] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [assetA, setAssetA] = useState('BTC');
  const [assetB, setAssetB] = useState('SOL');
  const [category, setCategory] = useState('Other');
  const [bet, setBet] = useState('1');
  const [side, setSide] = useState('A');
  const [positionMode, setPositionMode] = useState('short'); // 'long' or 'short' - default to short
  const [duration, setDuration] = useState('10');
  const [durationUnit, setDurationUnit] = useState('minutes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const SUPPORTED_ASSETS = [
    'BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'PEPE', 'XRP', 'ADA', 'AVAX', 'DOT',
    'MATIC', 'LINK', 'UNI', 'ATOM', 'LTC', 'BCH', 'NEAR', 'APT', 'ARB', 'OP',
    'SUI', 'TIA', 'SEI', 'BONK', 'WIF'
  ];

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const betAmount = parseFloat(bet);
      if (isNaN(betAmount) || betAmount <= 0) {
        setError('Bet amount must be greater than 0');
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

      let payload = {
        category,
        bet: betAmount,
        durationValue: parseInt(duration),
        durationUnit,
        mode
      };

      if (mode === 'versus') {
        if (assetA === assetB) {
          setError('Assets must be different');
          setLoading(false);
          return;
        }
        payload.title = `${assetA} vs ${assetB}`;
        payload.optionA = assetA;
        payload.optionB = assetB;
        payload.assetA = assetA;
        payload.assetB = assetB;
        payload.side = side; // In versus, side A means betting on Asset A
      } else {
        // Classic Mode
        const formattedTitle = formatDivideText(title);
        const formattedOptionA = formatDivideText(optionA);
        const formattedOptionB = formatDivideText(optionB);

        payload.title = formattedTitle;
        payload.optionA = formattedOptionA;
        payload.optionB = formattedOptionB;

        // Map Long/Short + Side to actual betting side
        let actualSide;
        if (positionMode === 'long') {
          actualSide = side === 'A' ? 'B' : 'A';
        } else {
          actualSide = side;
        }
        payload.side = actualSide;
      }

      const response = await fetch(`${API_BASE}/Divides/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
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

        {/* Mode Toggle */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '4px',
            border: '1px solid #2a2a30'
          }}>
            <button
              type="button"
              onClick={() => setMode('classic')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                background: mode === 'classic' ? '#7c4dff' : 'transparent',
                color: mode === 'classic' ? '#fff' : '#888',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Classic (Minority Wins)
            </button>
            <button
              type="button"
              onClick={() => setMode('versus')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                background: mode === 'versus' ? '#f59e0b' : 'transparent',
                color: mode === 'versus' ? '#000' : '#888',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Versus (PvP Price War)
            </button>
          </div>
        </div>

        {/* How It Works Explainer */}
        <div style={{
          background: mode === 'versus'
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)'
            : 'linear-gradient(135deg, rgba(229, 57, 53, 0.1) 0%, rgba(156, 39, 176, 0.1) 50%, rgba(30, 136, 229, 0.1) 100%)',
          padding: '16px',
          borderRadius: '12px',
          margin: '16px 20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '12px',
          lineHeight: '1.6'
        }}>
          {mode === 'versus' ? (
            <>
              {/* Versus Rules */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
                paddingBottom: '10px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <span style={{ fontSize: '16px' }}>⚔️</span>
                <span style={{ color: '#fbbf24', fontWeight: '700', fontSize: '13px' }}>VERSUS — PERFORMANCE WINS</span>
              </div>
              <p style={{ color: '#e0e0e0', marginBottom: '12px', fontWeight: '500' }}>
                Bet on the asset that will have the <span style={{ color: '#4ade80' }}>better % performance</span>. Winner takes all from the losing side.
              </p>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '12px'
              }}>
                <p style={{ color: '#a0a0a0', margin: 0 }}>
                  If you bet on BTC and it outperforms SOL, you win the entire SOL pot. <span style={{ color: '#fbbf24' }}>Zero minority rule. Pure PvP.</span>
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Classic Rules */}
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
              <p style={{ color: '#e0e0e0', marginBottom: '12px', fontWeight: '500' }}>
                Go Long on your side. <span style={{ color: '#4ade80' }}>Win the money if you're the minority.</span> <span style={{ color: '#f87171' }}>Lose it all if you're the majority.</span>
              </p>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '12px'
              }}>
                <p style={{ color: '#a0a0a0', margin: 0 }}>
                  The side with <span style={{ color: '#4ade80', fontWeight: '600' }}>fewer longs</span> wins <span style={{ color: '#4ade80', fontWeight: '600' }}>97%</span> of the pot. All plays are blind.
                </p>
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="create-divide-form">
          {error && <div className="error-message">{error}</div>}

          {mode === 'classic' ? (
            <>
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
            </>
          ) : (
            <>
              {/* Versus Mode Asset Selection */}
              <div className="form-row">
                <div className="form-group">
                  <label>Asset A</label>
                  <select
                    value={assetA}
                    onChange={(e) => setAssetA(e.target.value)}
                    className="asset-select"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#0d0d0f',
                      border: '1px solid #2a2a30',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                  >
                    {SUPPORTED_ASSETS.map(asset => (
                      <option key={asset} value={asset}>{asset}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '24px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>VS</span>
                </div>
                <div className="form-group">
                  <label>Asset B</label>
                  <select
                    value={assetB}
                    onChange={(e) => setAssetB(e.target.value)}
                    className="asset-select"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#0d0d0f',
                      border: '1px solid #2a2a30',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                  >
                    {SUPPORTED_ASSETS.map(asset => (
                      <option key={asset} value={asset}>{asset}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

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
            <label>Your Bet ($)</label>
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

          {mode === 'classic' && (
            <div className="form-group">
              <label>Position Type</label>
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
                  ? 'Long = Expect Majority (Bet placed on Opposite)'
                  : 'Short = Expect Minority (Bet placed on this side)'
                }
                <span style={{ color: '#fbbf24', display: 'block' }}>Minority eats 97% of the pot.</span>
              </small>
            </div>
          )}

          {/* Side Selection */}
          <div className="form-group">
            <label>
              {mode === 'versus' ? 'Select Winning Asset' : `Select Side to ${positionMode === 'long' ? 'Long' : 'Short'}`}
            </label>
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
                {mode === 'versus' ? assetA : (optionA || 'Option A')}
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
                {mode === 'versus' ? assetB : (optionB || 'Option B')}
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
