import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../styles/CreateDivideModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CreateDivideModal({ isOpen, onClose, onDivideCreated }) {
  const { user, refreshUser } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [bet, setBet] = useState('1');
  const [side, setSide] = useState('A');
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

      const response = await fetch(`${API_BASE}/Divides/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title,
          optionA,
          optionB,
          bet: betAmount,
          side,
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
      setBet('1');
      setSide('A');
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-divide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create a Divide</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
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
            <label>Your Initial Bet ($)</label>
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

          <div className="form-group">
            <label>Choose Your Side</label>
            <div className="side-selector">
              <button
                type="button"
                className={`side-btn ${side === 'A' ? 'active' : ''}`}
                onClick={() => setSide('A')}
              >
                {optionA || 'Option A'}
              </button>
              <button
                type="button"
                className={`side-btn ${side === 'B' ? 'active' : ''}`}
                onClick={() => setSide('B')}
              >
                {optionB || 'Option B'}
              </button>
            </div>
            <small>You will be locked to this side and cannot change your vote</small>
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
