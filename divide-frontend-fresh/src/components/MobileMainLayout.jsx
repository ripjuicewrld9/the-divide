import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCurrency } from '../utils/format';
import UserAvatar from './UserAvatar.jsx';
import AuthModal from './AuthModal.jsx';
import DepositWithdrawModal from './DepositWithdrawModal.jsx';
import GlobalLeaderboard from './GlobalLeaderboard.jsx';
import LiveGames from './LiveGames.jsx';

export default function MobileMainLayout({ onOpenChat }) {
  const { user, logout, addFunds } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Game data - using exact same data as desktop Home.jsx
  const games = [
    {
      id: 'divides',
      title: 'Divides',
      description: 'BLIND SHORTS: Bet on what will LOSE without seeing picks!',
      icon: '/blind-short-divide.svg',
      color: '#ff6b6b',
      gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
      path: '/divides',
      tagline: '🎭 Blind Shorts'
    },
    {
      id: 'keno',
      title: 'Keno',
      description: 'Traditional keno-style quick-bet lottery',
      icon: '/tiles-svgrepo-com.svg',
      color: '#ffd700',
      gradient: 'linear-gradient(135deg, #ffd700 0%, #ff8800 100%)',
      path: '/keno',
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
      tagline: 'Beat the Dealer'
    },
    {
      id: 'plinko',
      title: 'Plinko',
      description: 'Drop balls and watch them bounce to multipliers',
      icon: '/ball-pyramid-svgrepo-com.svg',
      color: '#a78bfa',
      gradient: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)',
      path: '/plinko',
      tagline: 'Drop & Win'
    },
    {
      id: 'battles',
      title: 'Case Battles',
      description: 'Create custom cases and battle players',
      icon: '/swords-power-svgrepo-com.svg',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      path: '/case-battles',
      tagline: 'Compete & Conquer'
    },
    {
      id: 'pump',
      title: 'Rugged — DC',
      description: 'Live meme coin market with dynamic pricing',
      icon: '/trend-down-svgrepo-com.svg',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      path: '/rugged',
      tagline: 'Pump or Dump',
      isActive: true
    }
  ];

  const navItems = [
    { id: 'home', label: 'Browse', icon: '/home-alt-svgrepo-com.svg', path: '/' },
    { id: 'games', label: 'Games', icon: '/tiles-svgrepo-com.svg', path: '/keno' },
    { id: 'chat', label: 'Chat', icon: '💬', path: '/chat' },
    { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white flex flex-col pb-24">
      {/* Header - Minimal like Stake.us */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0b0b0b]/95 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-lg font-black tracking-tight text-transparent">
              The Divide
            </span>
          </Link>

          {/* User Area */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Balance with + Button */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end rounded-lg border border-white/10 bg-black/40 px-3 py-1">
                    <span className="text-[9px] font-medium text-gray-500 uppercase">Balance</span>
                    <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-sm font-bold text-transparent leading-none">
                      ${formatCurrency(Number(user.balance || 0), 2)}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-500 hover:to-emerald-500 transition-all active:scale-95"
                    style={{ boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)' }}
                    title="Add funds"
                  >
                    <span className="text-black font-bold text-lg leading-none">+</span>
                  </button>
                </div>

                {/* User Button */}
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5"
                >
                  <UserAvatar user={user} size={20} />
                </button>

                {/* User Menu */}
                {showUserMenu && (
                  <div className="absolute right-4 top-14 mt-2 w-48 rounded-xl border border-white/10 bg-[#111] shadow-2xl z-50">
                    <div className="p-2">
                      {user.role === 'admin' && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate('/admin');
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-cyan-400 hover:bg-cyan-500/10 mb-1"
                        >
                          ⚡ Admin Dashboard
                        </button>
                      )}
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
                className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-bold text-white"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        {/* Hero Section - Larger */}
        <div className="px-4 pt-8 pb-6 text-center relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
          <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent mb-3 tracking-tight">
            The Divide
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            Premium crypto gaming experience
          </p>

          {/* Search Bar - Like Stake.us */}
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-11 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              style={{
                WebkitTextFillColor: 'white',
                opacity: 1
              }}
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
              🔍
            </div>
          </div>
        </div>

        {/* Game Cards Grid - LARGER with MORE SPACING */}
        <div className="px-4 pb-8">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
            Popular Games
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    borderRadius: '16px',
                    padding: '20px',
                    minHeight: '220px',
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
                      top: '12px',
                      right: '12px',
                      background: game.gradient,
                      color: '#000',
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Live
                    </div>
                  )}

                  {/* Icon - Larger */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    marginBottom: '16px',
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
                      margin: '0 0 6px 0',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#fff',
                      letterSpacing: '-0.5px'
                    }}>
                      {game.title}
                    </h3>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: game.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '10px'
                    }}>
                      {game.tagline}
                    </div>
                    <p style={{
                      color: '#9ca3af',
                      fontSize: '12px',
                      lineHeight: '1.5',
                      margin: 0
                    }}>
                      {game.description}
                    </p>
                  </div>

                  {/* Play Button */}
                  <div style={{
                    background: hoveredCard === game.id ? game.gradient : 'rgba(255, 255, 255, 0.05)',
                    color: hoveredCard === game.id ? '#000' : game.color,
                    padding: '10px 16px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginTop: '16px',
                    position: 'relative',
                    zIndex: 1,
                    border: hoveredCard === game.id ? 'none' : `1px solid ${game.color}30`
                  }}>
                    Play Now →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Additional Content Below (Scrollable) */}
        <div className="px-4 pb-8 space-y-6">
          {/* Global Leaderboard */}
          <div>
            <GlobalLeaderboard />
          </div>

          {/* Live Games Feed */}
          <div>
            <LiveGames isMobile={true} />
          </div>
        </div>
      </main>



      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          isRegister={isRegister}
          setIsRegister={setIsRegister}
        />
      )}

      {/* Deposit/Withdraw Modal */}
      <DepositWithdrawModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
      />
    </div>
  );
}
