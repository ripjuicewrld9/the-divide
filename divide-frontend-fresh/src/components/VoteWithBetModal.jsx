import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../styles/VoteWithBetModal.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function VoteWithBetModal({ isOpen, onClose, divide, onVoted }) {
  const { user, refreshUser } = useContext(AuthContext);
  const [bet, setBet] = useState('1');
  const [positionMode, setPositionMode] = useState('short'); // 'long' or 'short' - default short
  const [selectedSide, setSelectedSide] = useState(null); // 'A' or 'B'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !divide) return null;

  const handleVote = async () => {
    setError('');
    setLoading(true);

    try {
      const betAmount = parseFloat(bet);
      if (isNaN(betAmount) || betAmount <= 0) {
        setError('Amount must be greater than 0');
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

      // Map Long/Short + Side to actual betting side
      let actualSide;
      if (positionMode === 'long') {
        actualSide = selectedSide === 'A' ? 'B' : 'A';
      } else {
        actualSide = selectedSide;
      }

      const response = await fetch(`${API_BASE}/Divides/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          divideId: divide.id || divide._id,
          side: actualSide,
          bet: betAmount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to place position');
        setLoading(false);
        return;
      }

      await refreshUser();
      onVoted?.(data);
      setBet('1');
      setPositionMode('short');
      setSelectedSide(null);
      setError('');
      onClose();
    } catch (err) {
      console.error('Vote error:', err);
      setError('Server error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPositionMode('short');
    setSelectedSide(null);
    setBet('1');
    setError('');
    onClose();
  };

  // Calculate potential share
  const betAmount = parseFloat(bet) || 0;
  const currentPot = divide.pot || 0;
  const newPot = currentPot + betAmount;
  const winnerPot = newPot * 0.97;
  const potentialShare = newPot > 0 ? (betAmount / newPot) * winnerPot : 0;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content vote-bet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Take a Position</h2>
          <button className="close-btn" onClick={handleClose}>✕</button>
        </div>

        <div className="vote-bet-content">
          <div className="divide-info">
            <h3>{divide.title}</h3>
            <p className="current-pot">Current Pot: <strong>${currentPot.toFixed(2)}</strong></p>
          </div>

          {error && <div className="error-message">{error}</div>}

          {/* Toggle Switch + Side Selection */}
          {!selectedSide && (
            <div style={{ marginBottom: '16px' }}>
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

              {/* Helper text */}
              <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', lineHeight: 1.5, marginBottom: '16px' }}>
                {positionMode === 'long'
                  ? 'Long = expect this side to be majority'
                  : 'Short = expect this side to be minority'
                }
                <span style={{ color: '#fbbf24', display: 'block' }}>Minority eats 97% of pot</span>
              </div>

              {/* Side Selection */}
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px', textAlign: 'center' }}>
                Select a side to {positionMode.toUpperCase()}:
              </p>
              <div className="vote-buttons">
                <button
                  className="vote-btn option-a"
                  onClick={() => setSelectedSide('A')}
                  disabled={loading}
                >
                  <span className="label">{divide.optionA}</span>
                </button>
                <button
                  className="vote-btn option-b"
                  onClick={() => setSelectedSide('B')}
                  disabled={loading}
                >
                  <span className="label">{divide.optionB}</span>
                </button>
              </div>
            </div>
          )}

          {/* Amount and confirm */}
          {selectedSide && (
            <>
              <div style={{
                background: positionMode === 'long' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${positionMode === 'long' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px',
              }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Your position:</div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: positionMode === 'long' ? '#4ade80' : '#ef4444',
                }}>
                  {positionMode === 'long' ? '📈 LONG' : '📉 SHORT'} {selectedSide === 'A' ? divide.optionA : divide.optionB}
                </div>
              </div>

              <div className="bet-input-group">
                <label>Your Amount ($)</label>
                <input
                  type="number"
                  value={bet}
                  onChange={(e) => setBet(e.target.value)}
                  placeholder="1.00"
                  min="0.01"
                  step="0.01"
                  disabled={loading}
                />
                <small>Your balance: ${user?.balance?.toFixed(2) || '0.00'}</small>
              </div>

              <div className="share-estimate">
                <p>If you win, your potential share:</p>
                <p className="share-amount">${potentialShare.toFixed(2)}</p>
                <small>Based on {((betAmount / newPot) * 100).toFixed(1)}% of the pot</small>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => setSelectedSide(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#888',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleVote}
                  disabled={loading || !bet || parseFloat(bet) <= 0}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: positionMode === 'long'
                      ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: positionMode === 'long' ? '#000' : '#fff',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Confirming...' : (positionMode === 'long' ? '📈 Confirm Long' : '📉 Confirm Short')}
                </button>
              </div>
            </>
          )}

          {!selectedSide && (
            <button className="btn-cancel" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
