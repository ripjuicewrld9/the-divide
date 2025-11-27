import React, { useState, useEffect, useCallback } from 'react';
import UserAvatar from './UserAvatar';
import ProvenFairModal from './ProvenFairModal';

export default function LiveGames({ isMobile = false }) {
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [selectedGame, setSelectedGame] = useState(null);
  const [showProvenFair, setShowProvenFair] = useState(false);

  // Map game names to SVG icons
  const getGameIcon = (gameName) => {
    const iconMap = {
      'Keno': '/tiles-svgrepo-com.svg',
      'Plinko': '/ball-pyramid-svgrepo-com.svg',
      'Blackjack': '/cards-game-solitaire-poker-blackjack-casino-svgrepo-com.svg',
      'Case Battle': '/swords-power-svgrepo-com.svg'
    };
    return iconMap[gameName] || '/tiles-svgrepo-com.svg';
  };

  // Map game names to colors
  const getGameColor = (gameName) => {
    const colorMap = {
      'Keno': { color: '#ffd700', gradient: 'linear-gradient(135deg, #ffd700 0%, #ff8800 100%)' },
      'Plinko': { color: '#a78bfa', gradient: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)' },
      'Blackjack': { color: '#ff6b6b', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)' },
      'Case Battle': { color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }
    };
    return colorMap[gameName] || { color: '#00ffff', gradient: 'linear-gradient(135deg, #00ffff 0%, #0088ff 100%)' };
  };

  const fetchRecentGames = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      let url = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/recent-games?limit=20';
      
      if (activeTab === 'my' && token) {
        url = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/my-games?limit=20';
      }
      
      const headers = {};
      if (activeTab === 'my' && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, { headers });
      const data = await response.json();
      setRecentGames(data.games || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching recent games:', err);
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRecentGames();
    const interval = setInterval(fetchRecentGames, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [activeTab, fetchRecentGames]);

  if (isMobile) {
    return (
      <div className="bg-gradient-to-b from-black/40 to-black/20 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
            🎮 Live Games
          </h2>
          <div className="flex items-center gap-2">
            {/* Tab Buttons - Compact */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-[10px] font-semibold rounded transition-all ${
                  activeTab === 'all' 
                    ? 'bg-cyan-500 text-black' 
                    : 'text-gray-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`px-3 py-1 text-[10px] font-semibold rounded transition-all ${
                  activeTab === 'my' 
                    ? 'bg-cyan-500 text-black' 
                    : 'text-gray-400'
                }`}
              >
                Mine
              </button>
            </div>
            
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-gray-500 uppercase">Live</span>
            </div>
          </div>
        </div>

        {/* Games List - Mobile Optimized */}
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center text-gray-500 text-sm py-8">
              Loading games...
            </div>
          ) : recentGames.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No games yet. Play to see live updates!
            </div>
          ) : (
            recentGames.map((game, idx) => {
              const multiplierNum = parseFloat(game.multiplier);
              const isWin = multiplierNum > 0;
              const isHighWin = multiplierNum >= 2;
              const isLuckyWin = multiplierNum >= 10;
              const gameStyle = getGameColor(game.game);
              
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-white/5 border border-white/5 active:bg-white/10 transition-all"
                  onClick={() => {
                    setSelectedGame({ ...game, gameId: game._id || game.id });
                    setShowProvenFair(true);
                  }}
                >
                  {/* Top Row: User & Game */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <UserAvatar user={{ username: game.username, profileImage: game.profileImage }} size={24} />
                      <span className="text-xs font-medium text-cyan-400 truncate">{game.username}</span>
                    </div>
                    
                    {/* Game Badge */}
                    <div 
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
                      style={{
                        background: gameStyle.gradient,
                        color: '#000'
                      }}
                    >
                      {game.game}
                    </div>
                  </div>

                  {/* Bottom Row: Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[9px] text-gray-500 uppercase mb-0.5">Wager</div>
                      <div className="text-xs font-semibold text-gray-300">${game.wager.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-500 uppercase mb-0.5">Multi</div>
                      <div className={`text-xs font-bold ${
                        isLuckyWin ? 'text-yellow-400' : isHighWin ? 'text-green-400' : isWin ? 'text-cyan-400' : 'text-gray-600'
                      }`}>
                        {game.multiplier}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-500 uppercase mb-0.5">Payout</div>
                      <div className={`text-xs font-bold ${isWin ? 'text-green-400' : 'text-gray-600'}`}>
                        ${game.payout.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Proven Fair Modal */}
        {showProvenFair && selectedGame && (
          <ProvenFairModal
            isOpen={showProvenFair}
            game={selectedGame}
            onClose={() => {
              setShowProvenFair(false);
              setSelectedGame(null);
            }}
          />
        )}
      </div>
    );
  }

  // Desktop version (original style from Home.jsx)
  return (
    <div style={{
      background: 'rgba(11, 11, 11, 0.8)',
      border: '1px solid rgba(0, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '24px',
      marginTop: '40px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(0, 255, 255, 0.1)'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #00ffff, #00ccff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          🎮 Live Games
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Tab Buttons */}
          <div style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid rgba(0, 255, 255, 0.1)'
          }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 600,
                color: activeTab === 'all' ? '#000' : '#9ca3af',
                background: activeTab === 'all' ? '#00ffff' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              All Games
            </button>
            <button
              onClick={() => setActiveTab('my')}
              style={{
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 600,
                color: activeTab === 'my' ? '#000' : '#9ca3af',
                background: activeTab === 'my' ? '#00ffff' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              My Wagers
            </button>
          </div>
          
          <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            Live
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1.2fr 1fr 1fr 1fr 1fr',
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
        <div>Game</div>
        <div>Username</div>
        <div>Time</div>
        <div style={{ textAlign: 'right' }}>Wager</div>
        <div style={{ textAlign: 'right' }}>Multiplier</div>
        <div style={{ textAlign: 'right' }}>Payout</div>
      </div>

      {/* Games List */}
      <div 
        className="games-list-scroll"
        style={{
          maxHeight: '600px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        {loading ? (
          <div style={{
            textAlign: 'center',
            color: '#666',
            padding: '40px',
            fontSize: '14px'
          }}>
            Loading recent games...
          </div>
        ) : recentGames.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#666',
            padding: '40px',
            fontSize: '14px'
          }}>
            No games played yet. Be the first!
          </div>
        ) : (
          recentGames.map((game, idx) => {
            const multiplierNum = parseFloat(game.multiplier);
            const isWin = multiplierNum > 0;
            const isHighWin = multiplierNum >= 2;
            const isLuckyWin = multiplierNum >= 10;
            
            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1.2fr 1fr 1fr 1fr 1fr',
                  gap: '16px',
                  padding: '14px 16px',
                  background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                  borderRadius: '6px',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  border: isLuckyWin ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid transparent',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setSelectedGame({ ...game, gameId: game._id || game.id });
                  setShowProvenFair(true);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent';
                  e.currentTarget.style.borderColor = isLuckyWin ? 'rgba(255, 215, 0, 0.3)' : 'transparent';
                }}
              >
                {/* Game */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fff'
                }}>
                  <img 
                    src={getGameIcon(game.game)} 
                    alt={game.game}
                    style={{
                      width: '20px',
                      height: '20px',
                      filter: 'brightness(0) saturate(100%) invert(100%)'
                    }}
                  />
                  {game.game}
                </div>

                {/* Username */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#00ffff'
                }}>
                  <UserAvatar user={{ username: game.username, profileImage: game.profileImage }} size={24} />
                  {game.username}
                </div>

                {/* Time */}
                <div style={{
                  fontSize: '12px',
                  color: '#9ca3af'
                }}>
                  {new Date(game.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Wager */}
                <div style={{
                  textAlign: 'right',
                  fontSize: '13px',
                  color: '#9ca3af'
                }}>
                  C${game.wager.toFixed(2)}
                </div>

                {/* Multiplier */}
                <div style={{
                  textAlign: 'right',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isLuckyWin ? '#ffd700' : isHighWin ? '#10b981' : isWin ? '#00ffff' : '#666'
                }}>
                  {game.multiplier}
                </div>

                {/* Payout */}
                <div style={{
                  textAlign: 'right',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isWin ? '#10b981' : '#666'
                }}>
                  C${game.payout.toFixed(2)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Proven Fair Modal */}
      {showProvenFair && selectedGame && (
        <ProvenFairModal
          isOpen={showProvenFair}
          game={selectedGame}
          onClose={() => {
            setShowProvenFair(false);
            setSelectedGame(null);
          }}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Hide scrollbar but keep functionality */
        .games-list-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .games-list-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          borderRadius: 3px;
        }
        .games-list-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 255, 0.2);
          borderRadius: 3px;
        }
        .games-list-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
