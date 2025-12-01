import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../styles/VoteWithBetModal.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function VoteWithBetModal({ isOpen, onClose, divide, onVoted }) {
  const { user, refreshUser } = useContext(AuthContext);
  const [bet, setBet] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !divide) return null;

  const handleVote = async (side) => {
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

      const response = await fetch(`${API_BASE}/Divides/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          divideId: divide.id || divide._id,
          side,
          bet: betAmount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to place vote');
        setLoading(false);
        return;
      }

      // Refresh user balance and close modal
      await refreshUser();
      onVoted?.(data);
      setBet('1');
      setError('');
      onClose();
    } catch (err) {
      console.error('Vote error:', err);
      setError('Server error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate potential share
  const betAmount = parseFloat(bet) || 0;
  const currentPot = divide.pot || 0;
  const newPot = currentPot + betAmount;
  const winnerPot = newPot * 0.90;
  const potentialShare = newPot > 0 ? (betAmount / newPot) * winnerPot : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content vote-bet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Place Your Vote</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="vote-bet-content">
          <div className="divide-info">
            <h3>{divide.title}</h3>
            <p className="current-pot">Current Pot: <strong>${currentPot.toFixed(2)}</strong></p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="bet-input-group">
            <label>Your Bet ($)</label>
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

          <div className="vote-buttons">
            <button
              className="vote-btn option-a"
              onClick={() => handleVote('A')}
              disabled={loading}
            >
              <span className="label">{divide.optionA}</span>
              <span className="side">Side A</span>
            </button>
            <button
              className="vote-btn option-b"
              onClick={() => handleVote('B')}
              disabled={loading}
            >
              <span className="label">{divide.optionB}</span>
              <span className="side">Side B</span>
            </button>
          </div>

          <button className="btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
