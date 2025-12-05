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
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
    }} onClick={onClose}>
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

        {/* Explanation Banner */}
        <div style={{
          background: 'rgba(229, 57, 53, 0.12)',
          color: '#ff5252',
          padding: '12px 14px',
          borderRadius: '8px',
          margin: '16px 20px',
          border: '1px solid rgba(229, 57, 53, 0.25)',
          fontSize: '12px',
          lineHeight: '1.5'
        }}>
          <strong><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px', display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg> BLIND VOTING</strong> — Pick the side you think will LOSE. If everyone agrees with you, you all lose.
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
            <small style={{ color: '#888' }}>
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
