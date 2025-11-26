import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import CaseBattleCard from './CaseBattleCard';
import LiveGamesFeed from './LiveGamesFeed';
import MobileGameHeader from './MobileGameHeader';
import '../styles/buttons.css';

export default function ActiveBattlesPage({ onOpenChat }) {
  const navigate = useNavigate();
  const socket = useSocket(null); // Connect to global socket (no specific room)
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available battles
  const fetchBattles = async () => {
    setLoading(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/case-battles' || 'http://localhost:3000/case-battles');
      const data = await res.json();
      setBattles(data.battles || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching battles:', err);
      setError('Failed to load battles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchBattles();
    // No more polling - WebSocket will push updates
  }, []);

  // Listen for real-time battle updates via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleBattleCreated = (data) => {
      if (data?.battle) {
        setBattles(prev => [data.battle, ...prev]);
      }
    };

    const handleBattleUpdated = (data) => {
      if (data?.battle) {
        setBattles(prev => prev.map(b =>
          b.id === data.battle.id ? data.battle : b
        ));
      }
    };

    const handleBattleEnded = (data) => {
      if (data?.battle?.id) {
        setBattles(prev => prev.filter(b => b.id !== data.battle.id));
      }
    };

    socket.on('battle:created', handleBattleCreated);
    socket.on('battle:updated', handleBattleUpdated);
    socket.on('battle:ended', handleBattleEnded);

    // Legacy event names for backward compatibility
    socket.on('newBattle', handleBattleCreated);
    socket.on('caseBattleEnded', handleBattleEnded);

    return () => {
      socket.off('battle:created', handleBattleCreated);
      socket.off('battle:updated', handleBattleUpdated);
      socket.off('battle:ended', handleBattleEnded);
      socket.off('newBattle', handleBattleCreated);
      socket.off('caseBattleEnded', handleBattleEnded);
    };
  }, [socket]);

  const handleBattleClick = (battleId) => {
    navigate(`/case-battles/${battleId}`);
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '20px' }}>
      {/* Mobile Header - only shows on mobile */}
      <div className="md:hidden mb-4">
        <MobileGameHeader title="Battles" onOpenChat={onOpenChat} />
      </div>
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        {/* Hero Header Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
          border: '1px solid rgba(0, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '30px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
        }}>
          <h1 style={{
            margin: '0 0 6px 0',
            color: '#fff',
            fontSize: '28px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00ffff, #ffd700)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            ⚔️ ACTIVE BATTLES
          </h1>
          <p style={{
            color: '#aaa',
            margin: '0',
            fontSize: '12px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            {battles.length} {battles.length === 1 ? 'battle' : 'battles'} available to join
          </p>
        </div>

        {/* Create Battle Button */}
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/case-battles/create')}
            style={{
              background: 'linear-gradient(135deg, #00ffff, #00ccff)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.6)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ➕ Create New Battle
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(255, 100, 100, 0.1)',
            border: '1px solid rgba(255, 100, 100, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: '#ff6464',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#888',
            fontSize: '14px',
          }}>
            Loading battles...
          </div>
        )}

        {/* Battles Grid */}
        {!loading && battles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {battles.map((battle) => (
              <div
                key={battle.id}
                onClick={() => handleBattleClick(battle.id)}
                style={{
                  backgroundColor: 'rgba(26, 26, 46, 0.6)',
                  border: '1px solid rgba(0, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: '24px',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(26, 26, 46, 0.8)';
                  e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(26, 26, 46, 0.6)';
                  e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Left: Player Team Info */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '120px',
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}>
                    {battle.players && battle.players.slice(0, 3).map((player, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0, 255, 255, 0.2)',
                          border: '1px solid rgba(0, 255, 255, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 700,
                        }}
                        title={player.username}
                      >
                        {player.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    ))}
                  </div>
                  <div style={{
                    color: '#9fb',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    textAlign: 'center',
                  }}>
                    {battle.teamSize}v{battle.teamSize}
                  </div>
                  <div style={{
                    color: battle.mode === 'normal' ? '#00ffff' : battle.mode === 'crazy' ? '#ff6464' : '#64c864',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginTop: '4px',
                  }}>
                    {battle.mode === 'normal' ? '⚔️' : battle.mode === 'crazy' ? '🔥' : '👥'} {battle.mode}
                  </div>
                </div>

                {/* Middle: Case Cards and Info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  overflowX: 'auto',
                }}>
                  {/* Case Images */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    minWidth: '200px',
                  }}>
                    {battle.caseIds && battle.caseIds.slice(0, 5).map((caseId, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '60px',
                          height: '60px',
                          backgroundColor: 'rgba(0, 255, 255, 0.1)',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          color: '#00ffff',
                          fontWeight: 700,
                        }}
                        title={battle.caseName}
                      >
                        🎁
                      </div>
                    ))}
                  </div>

                  {/* Battle Details */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    <div style={{
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}>
                      {battle.caseName}
                    </div>
                    <div style={{
                      color: '#ffd700',
                      fontSize: '14px',
                      fontWeight: 700,
                    }}>
                      ${(battle.player1CaseValue || 0).toFixed(2)}
                    </div>
                    <div style={{
                      color: '#9fb',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                    }}>
                      {battle.status === 'waiting' ? '⏳ Waiting for opponent' : battle.status === 'spinning' ? '🎡 Spinning...' : '✓ ' + battle.status}
                    </div>
                  </div>
                </div>

                {/* Right: Join/View Button */}
                <button
                  style={{
                    background: 'linear-gradient(135deg, #00ffff, #ffd700)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBattleClick(battle.id);
                  }}
                >
                  {battle.players && battle.players.length > 1 ? 'View' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && battles.length === 0 && (
          <div style={{
            backgroundColor: 'rgba(26, 26, 46, 0.5)',
            border: '1px solid rgba(0, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '60px 20px',
            textAlign: 'center',
          }}>
            <div style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
              No active battles right now
            </div>
            <button
              onClick={() => navigate('/case-battles/create')}
              style={{
                background: 'linear-gradient(135deg, #00ffff, #00ccff)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
              }}
            >
              Be the first to create one!
            </button>
          </div>
        )}
      </div>

      {/* Live Games Feed */}
      <div style={{
        background: 'rgba(11, 11, 11, 0.8)',
        border: '1px solid rgba(0, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        marginTop: '40px'
      }}>
        <LiveGamesFeed />
      </div>
    </div>
  );
}
