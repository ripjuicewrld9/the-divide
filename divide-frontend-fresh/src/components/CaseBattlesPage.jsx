import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { AuthContext, useAuth } from '../context/AuthContext';
// import api from '../services/api';
import useSocket from '../hooks/useSocket';
import CaseBattleCard from './CaseBattleCard';
import LiveGamesFeed from './LiveGamesFeed';
import '../styles/buttons.css';

export default function CaseBattlesPage() {
  const navigate = useNavigate();
  // const { refreshUser } = useContext(AuthContext); // Not needed here
  // const { user } = useAuth(); // Not needed here
  const socket = useSocket(null); // Connect to global socket (no specific room)
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(false);
  // const [error, setError] = useState(null); // Not needed here

  // Fetch available battles
  const fetchBattles = async () => {
    setLoading(true);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/case-battles' || 'http://localhost:3000/case-battles');
      const data = await res.json();
      setBattles(data.battles || []);
      // setError(null); // Removed, not needed
    } catch (err) {
      console.error('Error fetching battles:', err);
      // setError('Failed to load battles'); // Removed, not needed
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBattles();
  }, []);

  // Listen for caseBattleEnded socket event to refresh battles
  useEffect(() => {
    if (!socket) return;

    // Handle battle ended (removal)
    const handleBattleEnded = (data) => {
      console.log('[CaseBattlesPage] Battle ended, removing from list:', data?.battle?.id);
      setBattles(prev => prev.filter(b => b.id !== data?.battle?.id));
    };

    // Handle battle created (addition)
    const handleBattleCreated = (data) => {
      if (data?.battle) {
        setBattles(prev => [data.battle, ...prev]);
      }
    };

    // Listen for creation and removal events
    socket.on('battle:created', handleBattleCreated);
    socket.on('newBattle', handleBattleCreated); // legacy
    socket.on('caseBattleEnded', handleBattleEnded);

    return () => {
      socket.off('battle:created', handleBattleCreated);
      socket.off('newBattle', handleBattleCreated);
      socket.off('caseBattleEnded', handleBattleEnded);
    };
  }, [socket]);

  // All battle creation logic removed; handled in CreateBattlePage

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
            ⚔️ CASE BATTLES
          </h1>
          <p style={{
            color: '#aaa',
            margin: '0',
            fontSize: '12px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            Compete with other players and win big
          </p>
        </div>

        {/* Main Content Grid: Left (Controls) + Right (Battles) */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
          {/* Only show Active Battles and Create Battle button */}
          <div>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Active Battles</h2>
            <div style={{ minHeight: '300px', background: 'rgba(20,20,20,0.7)', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
              {loading ? (
                <div style={{ color: '#aaa', fontSize: '16px' }}>Loading battles...</div>
              ) : battles.length === 0 ? (
                <div style={{ color: '#aaa', fontSize: '16px', marginBottom: '24px' }}>No active battles. Create one using the button below!</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
                  {battles.map((battle) => (
                    <CaseBattleCard key={battle.id} battle={battle} />
                  ))}
                </div>
              )}
              <button
                onClick={() => navigate('/case-battles/create')}
                style={{
                  marginTop: '32px',
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #00ffff, #ffd700)',
                  color: '#1a1a1a',
                  fontWeight: 700,
                  fontSize: '18px',
                  borderRadius: '10px',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                + Create Battle
              </button>
            </div>
          </div>
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
    </div>
  );
}
