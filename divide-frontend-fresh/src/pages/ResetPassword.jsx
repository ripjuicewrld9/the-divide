import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setMessage({ type: 'error', text: 'Invalid or missing reset token' });
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      setMessage({ type: 'success', text: 'Password reset successful! Redirecting to login...' });
      
      // Redirect to home page after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
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
            Reset Password
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            Enter your new password below
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#9ca3af',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500
              }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
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

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: '#9ca3af',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter your password"
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
              disabled={loading || !token}
              style={{
                width: '100%',
                padding: '14px',
                background: (loading || !token) ? 'rgba(100, 100, 100, 0.3)' : 'linear-gradient(135deg, #c97586, #a85c6f)',
                border: 'none',
                borderRadius: '8px',
                color: (loading || !token) ? '#666' : '#000',
                fontSize: '16px',
                fontWeight: 700,
                cursor: (loading || !token) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '16px'
              }}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        ) : (
          <div style={{
            padding: '24px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10b981" style={{ width: '48px', height: '48px' }}><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
            </div>
            <p style={{ color: '#10b981', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              Password Reset Successful!
            </p>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>
              Redirecting you to login...
            </p>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <Link
            to="/"
            style={{
              color: '#00ffff',
              fontSize: '14px',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#c97586'}
            onMouseLeave={(e) => e.target.style.color = '#00ffff'}
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
