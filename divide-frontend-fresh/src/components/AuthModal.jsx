// src/components/AuthModal.jsx
// Premium minimalist auth modal - Billion dollar aesthetic

import React, { useState, useContext } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AuthModal({ onClose, isRegister, setIsRegister }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useContext(AuthContext);

  const handleDiscordLogin = () => {
    window.location.href = `${API_BASE}/auth/discord/login`;
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/auth/google/login`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(username, password, email, dateOfBirth, marketingConsent);
        onClose();
      } else {
        const result = await login(username, password, twoFactorToken);
        if (result && result.requires2FA) {
          setRequires2FA(true);
          setError('Please enter your 2FA code');
        } else {
          onClose();
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        margin: 0,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(15,15,17,0.98)',
          padding: '40px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            letterSpacing: '-0.03em',
            color: 'rgba(255,255,255,0.95)',
            marginBottom: '8px',
          }}>
            {isRegister ? 'Create account' : 'Welcome back'}
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '-0.01em',
          }}>
            {isRegister ? 'Start predicting outcomes' : 'Sign in to continue'}
          </p>
        </div>

        {/* OAuth Buttons */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={handleDiscordLogin}
            type="button"
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: '10px',
              borderRadius: '10px',
              border: 'none',
              background: '#5865F2',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <svg width="18" height="14" viewBox="0 0 71 55" fill="white">
              <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" />
            </svg>
            Continue with Discord
          </button>

          <button
            onClick={handleGoogleLogin}
            type="button"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontWeight: '500' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          )}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          
          {!isRegister && requires2FA && (
            <div>
              <input
                type="text"
                placeholder="2FA Code"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                style={{
                  ...inputStyle,
                  textAlign: 'center',
                  letterSpacing: '8px',
                  fontSize: '18px',
                  fontFamily: 'SF Mono, Monaco, monospace',
                }}
              />
              <p style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.4)',
                marginTop: '8px',
                textAlign: 'center',
              }}>
                Enter the 6-digit code from your authenticator
              </p>
            </div>
          )}
          
          {isRegister && (
            <input
              type="date"
              placeholder="Date of Birth"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
              style={inputStyle}
            />
          )}
          
          {isRegister && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              margin: '16px 0',
            }}>
              <input
                type="checkbox"
                id="marketingConsent"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                style={{
                  marginTop: '3px',
                  cursor: 'pointer',
                  accentColor: 'rgba(255,255,255,0.9)',
                }}
              />
              <label
                htmlFor="marketingConsent"
                style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  lineHeight: '1.5',
                }}
              >
                Receive updates about new features and promotions
              </label>
            </div>
          )}
          
          <button type="submit" style={buttonStyle}>
            {isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <p style={{
            color: '#f87171',
            marginTop: '16px',
            fontSize: '13px',
            textAlign: 'center',
          }}>
            {error}
          </p>
        )}

        {/* Forgot Password */}
        {!isRegister && (
          <Link
            to="/forgot-password"
            onClick={onClose}
            style={{
              display: 'block',
              marginTop: '16px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            Forgot password?
          </Link>
        )}

        {/* Toggle */}
        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}>
          <button
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '8px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

const inputStyle = {
  display: 'block',
  width: '100%',
  marginBottom: '12px',
  padding: '14px 16px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.95)',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: '500',
  outline: 'none',
  transition: 'all 0.15s ease',
  boxSizing: 'border-box',
};

const buttonStyle = {
  width: '100%',
  padding: '14px',
  background: 'rgba(255,255,255,0.95)',
  color: '#09090b',
  border: 'none',
  borderRadius: '10px',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '14px',
  letterSpacing: '-0.01em',
  transition: 'all 0.15s ease',
  marginTop: '8px',
};
