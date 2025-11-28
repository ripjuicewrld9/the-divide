import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { formatCurrency } from '../utils/format';

export default function BlackjackLeaderboard() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.get('/blackjack/leaderboard');
        if (mounted) setRows(Array.isArray(data) ? data : []);
      } catch (e) { 
        console.error('Error fetching blackjack leaderboard:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{
      background: 'rgba(11, 11, 11, 0.8)',
      border: '1px solid rgba(0, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '24px'
    }}>
      <h2 style={{
        margin: '0 0 20px 0',
        fontSize: '24px',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #00ffff, #00ccff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        🏆 Top Multipliers
      </h2>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gap: '16px',
        padding: '12px 16px',
        background: 'rgba(0, 255, 255, 0.03)',
        borderRadius: '8px',
        marginBottom: '8px',
        fontSize: '11px',
        fontWeight: 700,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        <div>Player</div>
        <div style={{ textAlign: 'right' }}>Mult</div>
        <div style={{ textAlign: 'right' }}>Win</div>
      </div>

      {rows.length ? rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: '16px',
            padding: '14px 16px',
            background: i % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
            borderRadius: '6px',
            alignItems: 'center',
            transition: 'all 0.2s ease',
            border: '1px solid transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0)';
            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0)';
          }}
        >
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#00ffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
            </span>
            {r.username}
          </div>
          <div style={{
            textAlign: 'right',
            fontSize: '14px',
            fontWeight: 700,
            color: '#ffd700'
          }}>
            {Number(r.multiplier).toFixed(2)}x
          </div>
          <div style={{
            textAlign: 'right',
            fontSize: '14px',
            fontWeight: 700,
            color: '#10b981'
          }}>
            C${formatCurrency(r.win, 2)}
          </div>
        </div>
      )) : (
        <div style={{
          textAlign: 'center',
          color: '#666',
          padding: '32px',
          fontSize: '14px'
        }}>
          No big wins yet
        </div>
      )}
    </div>
  );
}
