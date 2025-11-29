import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import RuggedCard from '../components/RuggedCard';
import UserAvatar from '../components/UserAvatar';
import ProvenFairModal from '../components/ProvenFairModal';

export default function Home() {
  const [hoveredCard, setHoveredCard] = useState(null);
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
      'Wheel': '/helm-wheel-svgrepo-com.svg',
      'Case Battle': '/swords-power-svgrepo-com.svg'
    };
    return iconMap[gameName] || '/tiles-svgrepo-com.svg';
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

  const games = [
    {
      id: 'divides',
      title: 'Divides',
      description: 'Community-driven voting games with real-time updates',
      icon: '/elections-poll-svgrepo-com.svg',
      color: '#00ffff',
      gradient: 'linear-gradient(135deg, #00ffff 0%, #0088ff 100%)',
      path: '/divides',
      label: 'Play Now',
      tagline: 'Vote & Win'
    },
    {
      id: 'keno',
      title: 'Keno',
      description: 'Traditional keno-style quick-bet lottery with provably fair seeds',
      icon: '/tiles-svgrepo-com.svg',
      color: '#ffd700',
      gradient: 'linear-gradient(135deg, #ffd700 0%, #ff8800 100%)',
      path: '/keno',
      label: 'Play Keno',
      tagline: 'Pick & Match'
    },
    {
      id: 'blackjack',
      title: 'Blackjack',
      description: 'Classic 21 with smooth animations and fair deck shuffling',
      icon: '/cards-game-solitaire-poker-blackjack-casino-svgrepo-com.svg',
      color: '#ff6b6b',
      gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
      path: '/blackjack',
      label: 'Play Blackjack',
      tagline: 'Beat the Dealer'
    },
    {
      id: 'plinko',
      title: 'Plinko',
      description: 'Drop balls and watch them bounce to massive multipliers',
      icon: '/ball-pyramid-svgrepo-com.svg',
      color: '#a78bfa',
      gradient: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)',
      path: '/plinko',
      label: 'Play Plinko',
      tagline: 'Drop & Win'
    },
    {
      id: 'wheel',
      title: 'Lucky Wheel',
      description: 'Reserve your seat and spin the wheel for massive prizes',
      icon: '/helm-wheel-svgrepo-com.svg',
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      path: '/wheel',
      label: 'Coming Soon',
      tagline: 'Spin & Win'
    },
    {
      id: 'battles',
      title: 'Case Battles',
      description: 'Create custom item cases and battle other players to win big',
      icon: '/swords-power-svgrepo-com.svg',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      path: '/case-battles',
      label: 'Join Battle',
      tagline: 'Compete & Conquer'
    },
    {
      id: 'pump',
      title: 'Rugged — DC',
      description: 'Live meme coin market with dynamic pricing and rugpull mechanics',
      icon: '/trend-down-svgrepo-com.svg',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      path: '/rugged',
      label: 'Trade Now',
      tagline: 'Pump or Dump',
      isActive: true
    }
  ];

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '40px 20px',
      minHeight: '100%'
    }}>
      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '60px',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(0, 255, 255, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0
        }} />
        <h1 style={{
          fontSize: '56px',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #00ffff 0%, #00ccff 50%, #0088ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
          letterSpacing: '-2px',
          position: 'relative',
          zIndex: 1
        }}>
          The Divide
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#9ca3af',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.6'
        }}>
          Premium crypto gaming experience. Choose your game, place your bets, and win big.
        </p>
      </div>

      {/* Game Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        {games.map((game) => (
          <Link
            key={game.id}
            to={game.path}
            style={{ textDecoration: 'none' }}
            onMouseEnter={() => setHoveredCard(game.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{
              background: hoveredCard === game.id 
                ? 'linear-gradient(135deg, rgba(11, 11, 11, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)'
                : '#0b0b0b',
              border: hoveredCard === game.id 
                ? `2px solid ${game.color}`
                : '2px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '24px',
              minHeight: '280px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: hoveredCard === game.id ? 'translateY(-8px)' : 'translateY(0)',
              boxShadow: hoveredCard === game.id 
                ? `0 20px 60px ${game.color}40, 0 0 0 1px ${game.color}20`
                : '0 4px 20px rgba(0, 0, 0, 0.5)',
              cursor: 'pointer'
            }}>
              {/* Background Gradient Effect */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-50%',
                width: '200%',
                height: '200%',
                background: game.gradient,
                opacity: hoveredCard === game.id ? 0.08 : 0.03,
                transition: 'opacity 0.3s ease',
                pointerEvents: 'none'
              }} />

              {/* Active Badge */}
              {game.isActive && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: game.gradient,
                  color: '#000',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  Active
                </div>
              )}

              {/* Icon */}
              <div style={{
                width: '64px',
                height: '64px',
                marginBottom: '16px',
                filter: hoveredCard === game.id ? 'drop-shadow(0 0 12px rgba(0, 255, 255, 0.6))' : 'none',
                transition: 'filter 0.3s ease',
                position: 'relative',
                zIndex: 1
              }}>
                <img 
                  src={game.icon} 
                  alt={game.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    filter: 'brightness(0) invert(1)'
                  }}
                />
              </div>

              {/* Title & Tagline */}
              <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '-0.5px'
                }}>
                  {game.title}
                </h3>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: game.color,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '12px'
                }}>
                  {game.tagline}
                </div>
                <p style={{
                  color: '#9ca3af',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  margin: '0 0 20px 0'
                }}>
                  {game.description}
                </p>
              </div>

              {/* Play Button */}
              <div style={{
                background: hoveredCard === game.id ? game.gradient : 'rgba(255, 255, 255, 0.05)',
                color: hoveredCard === game.id ? '#000' : game.color,
                padding: '14px 24px',
                borderRadius: '10px',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.3s ease',
                position: 'relative',
                zIndex: 1,
                border: hoveredCard === game.id ? 'none' : `1px solid ${game.color}30`
              }}>
                {game.label} →
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Live Games Feed */}
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
                  background: activeTab === 'all' ? '#00ffff' : 'rgba(0, 0, 0, 0)',
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
                  background: activeTab === 'my' ? '#00ffff' : 'rgba(0, 0, 0, 0)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                My Games
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
                    e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0)';
                    e.currentTarget.style.borderColor = isLuckyWin ? 'rgba(255, 215, 0, 0.3)' : 'rgba(0, 0, 0, 0)';
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
    </div>
  );
}
