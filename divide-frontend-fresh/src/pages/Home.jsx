import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import ProvenFairModal from '../components/ProvenFairModal';
import UserProfileModal from '../components/UserProfileModal';

export default function Home() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [selectedGame, setSelectedGame] = useState(null);
  const [showProvenFair, setShowProvenFair] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Map game names to SVG icons
  const getGameIcon = (gameName) => {
    const iconMap = {
      'Divides': '/elections-poll-svgrepo-com.svg'
    };
    return iconMap[gameName] || '/elections-poll-svgrepo-com.svg';
  };

  const fetchRecentGames = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      let url = (import.meta.env.VITE_API_URL || '') + '/api/recent-games?limit=20';
      
      if (activeTab === 'my' && token) {
        url = (import.meta.env.VITE_API_URL || '') + '/api/my-games?limit=20';
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
      description: 'The Psychology Game. Blind betting where the minority wins. Trust no one.',
      icon: '/blind-short-divide.svg',
      color: '#ff6b6b',
      gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
      path: '/divides',
      label: 'Play Now',
      tagline: 'The Psychology Game'
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
          The Psychology Game. Where the minority wins and trust is optional.
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
          }}>          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}><path d="M11.25 3v4.046a3 3 0 00-4.277 4.204H1.5v-6A2.25 2.25 0 013.75 3h7.5zM12.75 3v4.011a3 3 0 014.239 4.239H22.5v-6A2.25 2.25 0 0020.25 3h-7.5zM22.5 12.75h-8.983a4.125 4.125 0 004.108 3.75.75.75 0 010 1.5 5.623 5.623 0 01-4.875-2.817V21h7.5a2.25 2.25 0 002.25-2.25v-6zM11.25 21v-5.817A5.623 5.623 0 016.375 18a.75.75 0 010-1.5 4.126 4.126 0 004.108-3.75H1.5v6A2.25 2.25 0 003.75 21h7.5z" /><path d="M11.085 10.354c.03.297.038.575.036.805a7.484 7.484 0 01-.805-.036c-.833-.084-1.677-.325-2.195-.843a1.5 1.5 0 012.122-2.12c.517.517.759 1.36.842 2.194zM12.877 10.354c-.03.297-.038.575-.036.805.23.002.508-.006.805-.036.833-.084 1.677-.325 2.195-.843A1.5 1.5 0 0013.72 8.158c-.518.518-.76 1.362-.843 2.196z" /></svg>
            Live Games
          </div>
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
                    <UserAvatar 
                      user={{ username: game.username, profileImage: game.profileImage }} 
                      size={24}
                      onClick={() => {
                        setSelectedUser(game.username);
                        setShowUserProfile(true);
                      }}
                    />
                    <span 
                      onClick={() => {
                        setSelectedUser(game.username);
                        setShowUserProfile(true);
                      }}
                      style={{
                        cursor: 'pointer',
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#00ccff'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#00ffff'}
                    >
                      {game.username}
                    </span>
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

      <UserProfileModal
        isOpen={showUserProfile}
        onClose={() => {
          setShowUserProfile(false);
          setSelectedUser(null);
        }}
        username={selectedUser}
      />
    </div>
  );
}
