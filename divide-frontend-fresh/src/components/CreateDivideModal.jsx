import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
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
          category,
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
      setCategory('Other');
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: '#111',
        border: '1px solid #1a1a1a',
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
          borderBottom: '1px solid #1a1a1a',
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#d4d4d4' }}>Create a Divide</h2>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            color: '#666',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}>✕</button>
        </div>

        {/* Explanation Banner */}
        <div style={{
          background: 'rgba(107, 28, 28, 0.15)',
          color: '#a33',
          padding: '12px 14px',
          borderRadius: '8px',
          margin: '16px 20px',
          border: '1px solid rgba(107, 28, 28, 0.3)',
          fontSize: '12px',
          lineHeight: '1.5'
        }}>
          <strong>⚠️ BLIND VOTING</strong> — Pick the side you think will LOSE. If everyone agrees with you, you all lose.
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
                border: '1px solid #1a1a1a',
                background: '#0a0a0a',
                color: '#d4d4d4',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} style={{ background: '#111', color: '#d4d4d4' }}>
                  {cat}
                </option>
              ))}
            </select>
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
            <label>Pick a Side</label>
            <div className="side-selector">
              <button
                type="button"
                className={`side-btn ${side === 'A' ? 'active' : ''}`}
                onClick={() => setSide('A')}
                style={{
                  border: side === 'A' ? '1px solid #6b1c1c' : '1px solid #1a1a1a',
                  background: side === 'A' ? 'rgba(107, 28, 28, 0.2)' : '#0a0a0a',
                  color: side === 'A' ? '#a33' : '#666'
                }}
              >
                {optionA || 'Option A'}
              </button>
              <button
                type="button"
                className={`side-btn ${side === 'B' ? 'active' : ''}`}
                onClick={() => setSide('B')}
                style={{
                  border: side === 'B' ? '1px solid #6b1c1c' : '1px solid #1a1a1a',
                  background: side === 'B' ? 'rgba(107, 28, 28, 0.2)' : '#0a0a0a',
                  color: side === 'B' ? '#a33' : '#666'
                }}
              >
                {optionB || 'Option B'}
              </button>
            </div>
            <small style={{ color: '#666' }}>
              Pick the side you think will lose
            </small>
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
