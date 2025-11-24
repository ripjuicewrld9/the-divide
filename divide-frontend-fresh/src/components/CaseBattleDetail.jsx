import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import api from '../services/api';
import CaseBattleArenaReelNativeV2 from './CaseBattleArenaReelNativeV2';
import '../styles/buttons.css';
import '../styles/rarities.css';
import '../styles/BattleWrapper.css';

export default function CaseBattleDetail() {
  const { battleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket(null);
  useContext(AuthContext);
  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBattle = useCallback(async () => {
    try {
      const url = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/case-battles/${battleId}`
        : `http://localhost:3000/case-battles/${battleId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.battle) {
        setBattle(data.battle);
        setError(null);
      } else {
        setError('Battle not found');
      }
    } catch (err) {
      console.error('Error fetching battle:', err);
      setError('Failed to load battle');
    } finally {
      setLoading(false);
    }
  }, [battleId]);

  useEffect(() => {
    // Initial fetch only - WebSocket will handle updates
    fetchBattle();
  }, [fetchBattle]);

  // Listen for real-time battle updates
  useEffect(() => {
    if (!socket || !battleId) return;

    const handleBattleUpdated = (data) => {
      if (data?.battle?.id === battleId) {
        setBattle(data.battle);
      }
    };

    const handleBattleEnded = (data) => {
      if (data?.battle?.id === battleId) {
        setBattle(data.battle);
      }
    };

    socket.on('battle:updated', handleBattleUpdated);
    socket.on('battle:ended', handleBattleEnded);

    return () => {
      socket.off('battle:updated', handleBattleUpdated);
      socket.off('battle:ended', handleBattleEnded);
    };
  }, [socket, battleId]);

  const handleJoinBattle = async () => {
    try {
      const res = await api.post(`/case-battles/join/${battleId}`, {});
      if (res.success) setBattle(res.battle);
    } catch (err) {
      console.error('Error joining:', err);
      setError(err.message || 'Failed to join');
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>🎮 Loading Arena...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: '#e74c3c' }}>{error}</div>;
  if (!battle) return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Battle not found</div>;

  const isCreator = user?.id === battle.player1Id;
  const playerInBattle = battle.players && battle.players.some(p => p.userId === user?.id);
  const playerCount = battle.players ? battle.players.length : 0;
  const maxPlayers = battle.teamSize && (battle.mode === 'group') 
    ? battle.teamSize 
    : (battle.teamSize ? battle.teamSize * 2 : 2);
  const canJoin = battle.status === 'waiting' && !isCreator && !playerInBattle && playerCount < maxPlayers;

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return '#ffa500';
      case 'active': return '#3498db';
      case 'opened': return '#9b59b6';
      case 'ended': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'waiting': return '⏳ WAITING FOR PLAYER 2';
      case 'active': return '🔄 BOTH PLAYERS READY';
      case 'opened': return '🎲 BATTLE IN PROGRESS';
      case 'ended': return '✅ BATTLE COMPLETE';
      default: return status;
    }
  };

  const modeConfig = {
    normal: { icon: '⚔️', label: 'NORMAL MODE', color: '#0ff', bgColor: 'rgba(0, 200, 200, 0.15)', borderColor: 'rgba(0, 200, 200, 0.5)' },
    crazy: { icon: '🔥', label: 'CRAZY MODE', color: '#ff6464', bgColor: 'rgba(255, 100, 100, 0.15)', borderColor: 'rgba(255, 100, 100, 0.5)' },
    group: { icon: '👥', label: 'GROUP MODE', color: '#64c864', bgColor: 'rgba(100, 200, 100, 0.15)', borderColor: 'rgba(100, 200, 100, 0.5)' },
  };
  const mode = modeConfig[battle?.mode] || modeConfig.normal;

  return (
    <div className="battle-page-wrapper">
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', height: '90vh', maxHeight: '800px' }}>
        {/* Header Section - Back button and info badges */}
        <div className="battle-header-section">
          <div className="battle-back-button-group">
            <button
              onClick={() => navigate('/case-battles')}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              ← BACK
            </button>
          </div>

          {/* Info Badges */}
          <div className="battle-info-badges">
            {/* Battle Status */}
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: `1px solid ${getStatusColor(battle.status)}`,
              borderRadius: '6px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <div style={{ fontSize: '14px' }}>🎪</div>
              <div>
                <div style={{ color: '#9fb', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Status
                </div>
                <div style={{ color: getStatusColor(battle.status), fontSize: '11px', fontWeight: 700 }}>
                  {getStatusLabel(battle.status)}
                </div>
              </div>
            </div>

            {/* Mode Badge */}
            <div style={{
              backgroundColor: mode.bgColor,
              border: `1px solid ${mode.borderColor}`,
              color: mode.color,
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}>
              {mode.icon} {mode.label}
            </div>

            {/* Team Size Badge */}
            <div style={{
              backgroundColor: 'rgba(100, 200, 100, 0.15)',
              border: '1px solid rgba(100, 200, 100, 0.5)',
              color: '#64c864',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}>
              {battle.mode === 'group'
                ? `👥 ${battle.teamSize}P`
                : `⚔️ ${battle.teamSize}v${battle.teamSize}`}
            </div>

            {/* Battle ID */}
            <div style={{
              backgroundColor: 'rgba(31, 255, 0, 0.1)',
              border: '1px solid rgba(31, 255, 0, 0.3)',
              color: '#1eff00',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 600,
              fontFamily: 'monospace',
            }}>
              #{battle.id}
            </div>
          </div>
        </div>

        {/* Battle Arena Frame - Main wrapper */}
        <div className="battle-arena-frame">
          <div className="battle-arena-content">
            <CaseBattleArenaReelNativeV2
              battleData={battle}
              onBattleComplete={async () => {
                console.log('[Arena] Battle complete, refreshing user balance...');
                // Refresh user balance after battle completes
                try {
                  const res = await api.get('/api/me');
                  console.log('[Arena] User balance refreshed:', res.balance);
                } catch (err) {
                  console.error('[Arena] Error refreshing user balance:', err);
                }
                setTimeout(() => {
                  navigate('/case-battles');
                }, 3000);
              }}
            />
          </div>
        </div>

        {/* Action Buttons - Hidden since arena has its own button */}
        {/* Keeping for join button only if needed */}
        {battle.status === 'waiting' && (
          <div className="battle-action-section">
            {canJoin && (
              <button
                onClick={handleJoinBattle}
                className="btn btn-success"
                style={{ minWidth: '120px', height: '40px', fontSize: '12px', fontWeight: 700 }}
              >
                ⚡ JOIN
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
