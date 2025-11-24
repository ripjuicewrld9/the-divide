// src/components/AuthModal.jsx
import React, { useState, useContext } from 'react';
import ReactDOM from 'react-dom';
import { AuthContext } from '../context/AuthContext';

export default function AuthModal({ onClose, isRegister, setIsRegister }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, register } = useContext(AuthContext);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        const success = isRegister ? register(username, password) : login(username, password);
        if (success) {
            onClose();
        } else {
            setError('Invalid credentials');
        }
    };

    const modalContent = (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            margin: 0,
            padding: 0
        }} onClick={onClose}>
            <div style={{
                background: '#0b0b0b',
                padding: '2.5rem',
                borderRadius: '12px',
                border: '2px solid rgba(0, 255, 255, 0.3)',
                width: '90%',
                maxWidth: '400px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0, 255, 255, 0.2)'
            }} onClick={e => e.stopPropagation()}>
                <h2 style={{
                    background: 'linear-gradient(135deg, #00ffff, #00ccff)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '1.5rem',
                    fontSize: '24px',
                    fontWeight: 700,
                    letterSpacing: '1px'
                }}>
                    {isRegister ? 'SIGN UP' : 'LOG IN'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        style={inputStyle}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={inputStyle}
                    />
                    <button type="submit" style={buttonStyle}>
                        {isRegister ? 'SIGN UP' : 'LOG IN'}
                    </button>
                </form>
                {error && <p style={{ color: '#ff0044', marginTop: '0.5rem' }}>{error}</p>}
                <button
                    onClick={() => setIsRegister(!isRegister)}
                    style={{ ...linkStyle, marginTop: '1rem' }}
                >
                    {isRegister ? 'Already have account? Log in' : 'No account? Sign up'}
                </button>
                <button onClick={onClose} style={linkStyle}>Close</button>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
}

const inputStyle = {
    display: 'block',
    width: '100%',
    margin: '0.8rem 0',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 255, 0.2)',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease'
};

const buttonStyle = {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #00ffff, #00ccff)',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'all 0.2s ease',
    marginTop: '8px'
};

const linkStyle = {
    background: 'none',
    border: 'none',
    color: '#00ffff',
    textDecoration: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'color 0.2s ease',
    padding: '8px',
    display: 'inline-block'
};