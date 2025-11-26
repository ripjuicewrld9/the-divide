import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './UserAvatar';
import ProvenFairModal from './ProvenFairModal';

// Memoized game row component for performance
const GameRow = memo(({ game, idx, onGameClick, isNew }) => {
  const multiplierNum = parseFloat(game.multiplier);
  const isWin = multiplierNum > 0;
  const isHighWin = multiplierNum >= 2;
  const isLuckyWin = multiplierNum >= 10;

  const getGameIcon = (gameName) => {
    const iconMap = {
      'Keno': '/tiles-svgrepo-com.svg',
      'Plinko': '/ball-pyramid-svgrepo-com.svg',
      'Blackjack': '/cards-game-solitaire-poker-blackjack-casino-svgrepo-com.svg',
      'Case Battle': '/swords-power-svgrepo-com.svg'
    };
    return iconMap[gameName] || '/tiles-svgrepo-com.svg';
  };

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, x: -20 } : false}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1.2fr 1fr 1fr 1fr 1fr',
        gap: '16px',
        padding: '14px 16px',
        background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
        borderRadius: '6px',
        alignItems: 'center',
        border: isLuckyWin ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid transparent',
        cursor: 'pointer'
      }}
      onClick={() => onGameClick(game)}
      whileHover={{
        background: 'rgba(0, 255, 255, 0.05)',
        borderColor: 'rgba(0, 255, 255, 0.2)',
        transition: { duration: 0.2 }
      }}
    >
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
      <div style={{
        fontSize: '12px',
        color: '#9ca3af'
      }}>
        {new Date(game.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div style={{
        textAlign: 'right',
        fontSize: '13px',
        color: '#9ca3af'
      }}>
        C${game.wager.toFixed(2)}
      </div>
      <div style={{
        textAlign: 'right',
        fontSize: '14px',
        fontWeight: 700,
        color: isLuckyWin ? '#ffd700' : isHighWin ? '#10b981' : isWin ? '#00ffff' : '#666'
      }}>
        {game.multiplier}
      </div>
      <div style={{
        textAlign: 'right',
        fontSize: '14px',
        fontWeight: 700,
        color: isWin ? '#10b981' : '#666'
      }}>
        C${game.payout.toFixed(2)}
      </div>
    </motion.div>
  );
});

GameRow.displayName = 'GameRow';

export default function LiveGamesFeed({ maxGames = 20 }) {
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedGame, setSelectedGame] = useState(null);
  const [showProvenFair, setShowProvenFair] = useState(false);
  const [prevGameIds, setPrevGameIds] = useState(new Set());

  // Cap max games to prevent performance issues
  const effectiveMaxGames = Math.min(maxGames, 50);

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

  const fetchRecentGames = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      let url = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + `/api/recent-games?limit=${effectiveMaxGames}`;

      if (activeTab === 'my' && token) {
        url = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + `/api/my-games?limit=${effectiveMaxGames}`;
      }

      const headers = {};
      if (activeTab === 'my' && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();

      // Only update if games actually changed to prevent unnecessary re-renders
      const newGames = data.games || [];
      setRecentGames(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newGames)) {
          // Track new game IDs for animation
          const newIds = new Set(newGames.map(g => g._id || g.id));
          setPrevGameIds(newIds);
          return newGames;
        }
        return prev;
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching recent games:', err);
      setLoading(false);
    }
  }, [effectiveMaxGames, activeTab]);

  useEffect(() => {
    fetchRecentGames();
    // Refresh every 10 seconds to reduce server load
    const interval = setInterval(fetchRecentGames, 10000);
    return () => clearInterval(interval);
  }, [fetchRecentGames]);

  return (
    <>
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

      {/* Scrollable Table Container */}
      <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
        <div style={{ minWidth: '600px' }}>
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
          <AnimatePresence mode="popLayout">
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
                  {activeTab === 'my' ? 'No wagers found. Play a game!' : 'No games played yet. Be the first!'}
                </div>
              ) : (
                recentGames.map((game, idx) => {
                  const gameId = game._id || game.id || `${game.username}-${game.time}-${idx}`;
                  const isNew = !prevGameIds.has(gameId);

                  return (
                    <GameRow
                      key={gameId}
                      game={game}
                      idx={idx}
                      isNew={isNew}
                      onGameClick={(g) => {
                        setSelectedGame({ ...g, gameId: g._id || g.id });
                        setShowProvenFair(true);
                      }}
                    />
                  );
                })
              )}
            </div>
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Hide scrollbar but keep functionality */
        .games-list-scroll {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        .games-list-scroll::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>

      <ProvenFairModal
        isOpen={showProvenFair}
        onClose={() => setShowProvenFair(false)}
        gameData={selectedGame}
      />
    </>
  );
}
