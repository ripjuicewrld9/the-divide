import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCurrency } from '../utils/format';
import UserAvatar from './UserAvatar.jsx';
import AuthModal from './AuthModal.jsx';

export default function MobileMainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Game data - using exact same data as desktop Home.jsx
  const games = [
    {
      id: 'divides',
      title: 'Divides',
      description: 'Community-driven voting games',
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
      description: 'Quick-bet lottery with provably fair seeds',
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
      description: 'Classic 21 with smooth animations',
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
      description: 'Drop balls to massive multipliers',
      icon: '/ball-pyramid-svgrepo-com.svg',
      color: '#a78bfa',
      gradient: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)',
      path: '/plinko',
      label: 'Play Plinko',
      tagline: 'Drop & Win'
    },
    {
      id: 'battles',
      title: 'Case Battles',
      description: 'Battle other players to win big',
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
      description: 'Live meme coin market with rugpull mechanics',
      icon: '/trend-down-svgrepo-com.svg',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      path: '/rugged',
      label: 'Trade Now',
      tagline: 'Pump or Dump',
      isActive: true
    }
  ];

  const navItems = [
    { id: 'home', label: 'Home', icon: '/home-alt-svgrepo-com.svg', path: '/' },
    { id: 'games', label: 'Games', icon: '/tiles-svgrepo-com.svg', path: '/keno' },
    { id: 'battles', label: 'Battles', icon: '/swords-power-svgrepo-com.svg', path: '/case-battles' },
    { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
  ];

  const fetchRecentGames = useCallback(async () => {
    try {
      const url = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/recent-games?limit=10';
      const response = await fetch(url);
      const data = await response.json();
      setRecentGames(data.games || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching recent games:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentGames();
    const interval = setInterval(fetchRecentGames, 10000);
    return () => clearInterval(interval);
  }, [fetchRecentGames]);

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0b0b0b]/95 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-xl font-black tracking-tight text-transparent">
              The Divide
            </span>
          </Link>

          {/* User Area */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Balance */}
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-3 py-1.5">
                  <span className="text-[10px] font-medium text-gray-400 uppercase">Bal</span>
                  <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-sm font-bold text-transparent">
                    ${formatCurrency(Number(user.balance || 0), 2)}
                  </span>
                </div>

                {/* User Button */}
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1.5"
                >
                  <UserAvatar user={user} size={20} />
                  <span className="text-xs font-medium max-w-[60px] truncate">{user.username}</span>
                </button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-4 top-16 mt-2 w-48 rounded-xl border border-white/10 bg-[#111] shadow-2xl z-50">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg"
              >
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6">
        {/* Hero Section */}
        <div className="text-center mb-8 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
          <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2 tracking-tight">
            The Divide
          </h1>
          <p className="text-sm text-gray-400">
            Premium crypto gaming experience
          </p>
        </div>

        {/* Game Cards Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {games.map((game) => (
            <Link
              key={game.id}
              to={game.path}
              className="block"
              onTouchStart={() => setHoveredCard(game.id)}
              onTouchEnd={() => setHoveredCard(null)}
            >
              <div
                style={{
                  background: hoveredCard === game.id
                    ? 'linear-gradient(135deg, rgba(11, 11, 11, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)'
                    : '#0b0b0b',
                  border: hoveredCard === game.id
                    ? `2px solid ${game.color}`
                    : '2px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '16px',
                  minHeight: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  transform: hoveredCard === game.id ? 'scale(0.98)' : 'scale(1)',
                }}
              >
                {/* Background Gradient */}
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-50%',
                  width: '200%',
                  height: '200%',
                  background: game.gradient,
                  opacity: hoveredCard === game.id ? 0.08 : 0.03,
                  transition: 'opacity 0.2s ease',
                  pointerEvents: 'none'
                }} />

                {/* Active Badge */}
                {game.isActive && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: game.gradient,
                    color: '#000',
                    fontSize: '8px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    textTransform: 'uppercase',
                  }}>
                    Live
                  </div>
                )}

                {/* Icon */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  marginBottom: '12px',
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

                {/* Content */}
                <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                  <h3 style={{
                    margin: '0 0 4px 0',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#fff',
                  }}>
                    {game.title}
                  </h3>
                  <div style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    color: game.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px'
                  }}>
                    {game.tagline}
                  </div>
                  <p style={{
                    color: '#9ca3af',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    margin: 0
                  }}>
                    {game.description}
                  </p>
                </div>

                {/* Play Button */}
                <div style={{
                  background: hoveredCard === game.id ? game.gradient : 'rgba(255, 255, 255, 0.05)',
                  color: hoveredCard === game.id ? '#000' : game.color,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginTop: '12px',
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
        <div className="bg-[#0b0b0b] border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              🎮 Live Games
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
          </div>

          {/* Games List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="text-center text-gray-500 text-sm py-4">Loading...</div>
            ) : recentGames.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">No recent games</div>
            ) : (
              recentGames.map((game, idx) => {
                const multiplierNum = parseFloat(game.multiplier);
                const isWin = multiplierNum > 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <UserAvatar user={{ username: game.username, profileImage: game.profileImage }} size={24} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-cyan-400 truncate">{game.username}</div>
                        <div className="text-[10px] text-gray-500">{game.game}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold" style={{ color: isWin ? '#10b981' : '#666' }}>
                        C${game.payout.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-gray-500">{game.multiplier}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0b0b0b]/95 backdrop-blur-md border-t border-white/10 z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors"
              style={{
                color: isActive(item.path) ? '#00ffff' : '#9ca3af'
              }}
            >
              {item.icon.startsWith('/') ? (
                <img
                  src={item.icon}
                  alt={item.label}
                  className="w-5 h-5"
                  style={{
                    filter: isActive(item.path)
                      ? 'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(2476%) hue-rotate(150deg) brightness(104%) contrast(101%)'
                      : 'brightness(0) saturate(100%) invert(47%) sepia(6%) saturate(378%) hue-rotate(180deg) brightness(94%) contrast(87%)'
                  }}
                />
              ) : (
                <span className="text-lg">{item.icon}</span>
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          isRegister={isRegister}
          setIsRegister={setIsRegister}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
