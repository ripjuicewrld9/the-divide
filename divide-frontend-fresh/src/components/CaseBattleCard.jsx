import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/buttons.css';

export default function CaseBattleCard({ battle, onBattleUpdated }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/case-battles/join/${battle.id}`, {});
      if (res.success) onBattleUpdated?.();
    } finally {
      setLoading(false);
    }
  };

  // Status styling with color coding
  const statusStyles = {
    waiting: { color: '#ffa500', label: '⏳ WAITING' },
    active: { color: '#3498db', label: '🔄 ACTIVE' },
    opened: { color: '#9b59b6', label: '📂 ROLLING' },
    ended: { color: '#27ae60', label: '✅ ENDED' },
  };

  const currentStatus = statusStyles[battle.status] || statusStyles.waiting;

  // Mode badge styling
  const modeBadgeStyles = {
    normal: { bg: '#3498db', label: '⚔️ NORMAL' },
    crazy: { bg: '#e74c3c', label: '🔥 CRAZY' },
    group: { bg: '#9b59b6', label: '👥 GROUP' },
  };

  const modeBadge = modeBadgeStyles[battle.mode] || modeBadgeStyles.normal;

  return (
    <div
      style={{
        backgroundColor: '#0b0b0b',
        border: '2px solid #333',
        borderRadius: '12px',
        padding: '20px',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#00ffff';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 255, 255, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#333';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={() => navigate(`/case-battles/${battle.id}`)}
    >
      {/* Top Row: Mode Badge + Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        {/* Mode Badge */}
        <div
          style={{
            backgroundColor: modeBadge.bg,
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {modeBadge.label}
        </div>

        {/* Status Badge */}
        <div
          style={{
            color: currentStatus.color,
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {currentStatus.label}
        </div>
      </div>

      {/* Battle ID */}
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', fontFamily: 'monospace' }}>
        Battle #{battle.id?.slice(-8) || 'Unknown'}
      </div>

      {/* Case Name */}
      {battle.caseName && (
        <div
          style={{
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '11px',
            color: '#ffd700',
            marginBottom: '12px',
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          🎁 {battle.caseName}
        </div>
      )}

      {/* Player Count */}
      <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '12px' }}>
        {battle.players ? `⏳ ${battle.players.length}/${battle.teamSize && battle.mode === 'group' ? battle.teamSize : battle.teamSize ? battle.teamSize * 2 : 2} Players` : '⏳ Loading...'}
      </div>

      {/* Players Grid - 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {/* Player 1 */}
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Player 1</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
            {battle.player1Username || '???'}
          </div>
          <div style={{ fontSize: '11px', color: '#ffd700' }}>
            💰 ${((battle.player1CaseValue || 0) / 100).toFixed(2)}
          </div>
        </div>

        {/* Player 2 */}
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Player 2</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
            {battle.player2Username || '❌ WAITING'}
          </div>
          <div style={{ fontSize: '11px', color: '#ffd700' }}>
            💰 ${((battle.player2CaseValue || 0) / 100).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Pot Display */}
      {battle.pot && battle.pot > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(30, 255, 0, 0.08)',
            border: '1px solid rgba(30, 255, 0, 0.2)',
            borderRadius: '6px',
            padding: '10px',
            marginBottom: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '10px', color: '#9fb', marginBottom: '4px', textTransform: 'uppercase' }}>
            Pot
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#1eff00' }}>
            ${(battle.pot / 100).toFixed(2)}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Watch Button - Always visible */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/case-battles/${battle.id}`);
          }}
          className="btn btn-secondary"
          style={{
            minHeight: '44px',
            fontSize: '12px',
            flex: 0.8,
          }}
        >
          👁️ WATCH
        </button>

        {/* Join Button - Only if not full */}
        {battle.status === 'waiting' && !battle.player2Id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleJoin();
            }}
            disabled={loading}
            className="btn btn-success"
            style={{
              minHeight: '44px',
              fontSize: '13px',
              flex: 1,
            }}
          >
            {loading ? '⏳ JOINING...' : '⚡ JOIN'}
          </button>
        )}

        {/* Full indicator */}
        {battle.player2Id && battle.status === 'waiting' && (
          <button
            disabled
            className="btn btn-secondary"
            style={{
              minHeight: '44px',
              fontSize: '12px',
              flex: 1,
              opacity: 0.5,
            }}
          >
            🚫 FULL
          </button>
        )}
      </div>
    </div>
  );
}
