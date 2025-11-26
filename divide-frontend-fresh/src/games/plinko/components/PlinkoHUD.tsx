import React, { useState } from 'react';
import PlinkoProvablyFair from '../../../components/PlinkoProvablyFair';

interface PlinkoHUDProps {
  balance: number;
  message?: string;
}

export default function PlinkoHUD({ balance, message = 'Drop a ball to play' }: PlinkoHUDProps) {
  const [showProvablyFair, setShowProvablyFair] = useState(false);
  const [showLiveChart, setShowLiveChart] = useState(false);

  return (
    <>
      <div style={{
        marginBottom: '12px',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(15, 15, 30, 0.8) 100%)',
        border: '1px solid rgba(0, 255, 255, 0.15)',
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ color: '#999', fontSize: '0.95em', flex: 1, textAlign: 'center' }}>
            {message}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={{
                padding: '6px 14px',
                background: 'linear-gradient(135deg, #00ffff, #ffd700)',
                color: '#1a1a1a',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9em'
              }}
              onClick={() => setShowLiveChart(s => !s)}
            >
              {showLiveChart ? 'Hide Live Chart' : 'Live Chart'}
            </button>
            <button
              title="Info"
              aria-label="Info"
              onClick={() => setShowProvablyFair(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 12px',
                background: 'linear-gradient(135deg, #00ffff, #ffd700)',
                color: '#1a1a1a',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle' }}>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M11.5 12h1v4h-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Provably Fair modal */}
      {showProvablyFair && (
        <PlinkoProvablyFair onClose={() => setShowProvablyFair(false)} initialTab="seed" />
      )}

      {/* Live Chart - placeholder for now */}
      {showLiveChart && (
        <div
          style={{
            position: 'fixed',
            left: '40px',
            top: '120px',
            zIndex: 2000,
            width: '420px',
            background: 'linear-gradient(135deg, #071021, #0b1420)',
            border: '1px solid rgba(148, 0, 0, 0.08)',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            color: '#9fe'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700 }}>Live Chart</div>
            <button
              onClick={() => setShowLiveChart(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '1.2em'
              }}
            >
              ×
            </button>
          </div>
          <div style={{ textAlign: 'center', padding: '24px', color: '#999' }}>
            Live chart coming soon...
          </div>
        </div>
      )}
    </>
  );
}
