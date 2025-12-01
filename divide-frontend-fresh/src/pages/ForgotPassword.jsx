import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setEmailSent(true);
      setMessage({ 
        type: 'success', 
        text: 'If an account exists with that username, a password reset link has been sent to the associated email.' 
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b0b0b 0%, #1a1a2e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(26, 26, 46, 0.95)',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '450px',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 255, 255, 0.15)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            color: '#fff', 
            marginBottom: '8px' 
          }}>
            Forgot Password?
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            Enter your username and we'll send a reset link to your email
          </p>
        </div>

        {!emailSent ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: '#9ca3af',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="your_username"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(0, 255, 255, 0.5)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              />
            </div>

            {message.text && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: message.type === 'success' ? '#10b981' : '#ef4444',
                fontSize: '14px'
              }}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? 'rgba(100, 100, 100, 0.3)' : 'linear-gradient(135deg, #00ffff, #00ccff)',
                border: 'none',
                borderRadius: '8px',
                color: loading ? '#666' : '#000',
                fontSize: '16px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '16px'
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{
            padding: '24px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
            <p style={{ color: '#10b981', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              Check Your Email
            </p>
            <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.6' }}>
              If an account exists with username <strong style={{ color: '#00ffff' }}>{username}</strong>, 
              a password reset link has been sent to the associated email.
            </p>
          </div>
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center'
        }}>
          <Link
            to="/"
            style={{
              color: '#00ffff',
              fontSize: '14px',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#00ccff'}
            onMouseLeave={(e) => e.target.style.color = '#00ffff'}
          >
            ← Back to Login
          </Link>
          
          {emailSent && (
            <button
              onClick={() => {
                setEmailSent(false);
                setUsername('');
                setMessage({ type: '', text: '' });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Try a different username
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
