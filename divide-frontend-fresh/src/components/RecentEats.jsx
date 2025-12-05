import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/format';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function RecentEats() {
  const [recentDivides, setRecentDivides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentEats();
  }, []);

  const fetchRecentEats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/divides/recent-eats`);
      if (res.ok) {
        const data = await res.json();
        setRecentDivides(data);
      }
    } catch (err) {
      console.error('Failed to fetch recent eats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (recentDivides.length === 0) return null;

  return (
    <div style={{
      marginBottom: '24px',
      background: '#111',
      borderRadius: '12px',
      border: '1px solid #1a1a1a',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🔥</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Recent Eats</span>
          <span style={{ 
            fontSize: '9px', 
            color: '#4ade80', 
            background: 'rgba(74, 222, 128, 0.15)', 
            padding: '2px 6px', 
            borderRadius: '10px',
            fontWeight: '600',
          }}>
            LIVE
          </span>
        </div>
        <span style={{ fontSize: '10px', color: '#666' }}>Last {recentDivides.length} completed</span>
      </div>

      {/* Horizontal Scroller */}
      <div style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        overflowX: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: '#333 transparent',
      }}>
        {recentDivides.map((d) => (
          <Link
            key={d._id || d.id}
            to={`/divide/${d._id || d.id}`}
            style={{
              flexShrink: 0,
              width: '220px',
              background: '#16161a',
              borderRadius: '10px',
              border: '1px solid #2a2a30',
              padding: '12px',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = '1px solid #2979ff';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = '1px solid #2a2a30';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Title */}
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#e0e0e0',
              marginBottom: '8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {d.title}
            </div>

            {/* Winner Side */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
            }}>
              <span style={{
                fontSize: '9px',
                fontWeight: '700',
                color: d.winnerSide === 'A' ? '#ff1744' : '#2979ff',
                background: d.winnerSide === 'A' ? 'rgba(255, 23, 68, 0.15)' : 'rgba(41, 121, 255, 0.15)',
                padding: '3px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
              }}>
                {d.winnerSide === 'A' ? d.optionA : d.optionB} WON
              </span>
            </div>

            {/* Stats */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase' }}>Pot</div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '800',
                  background: 'linear-gradient(90deg, #e53935 0%, #2979ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  ${formatCurrency(d.pot || 0, 0)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase' }}>Winners</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#4ade80' }}>
                  {d.winnerCount || 0}
                </div>
              </div>
            </div>

            {/* Minority % */}
            <div style={{
              marginTop: '8px',
              padding: '6px 8px',
              background: 'rgba(74, 222, 128, 0.1)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '9px', color: '#888' }}>Minority Split</span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#4ade80' }}>
                {d.minorityPct || 0}%
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
