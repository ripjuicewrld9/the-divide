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

  // Game data - Divides only
  const games = [
    {
      id: 'divides',
      title: 'Divides',
      description: 'The Psychology Game. Blind betting where the minority wins. Trust no one.',
      icon: '/elections-poll-svgrepo-com.svg',
      color: '#e53935',
      gradient: 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)',
      path: '/divides',
      tagline: 'The Psychology Game'
    }
  ];

  const navItems = [
    { id: 'home', label: 'Browse', icon: '/home-alt-svgrepo-com.svg', path: '/' },
    { id: 'divides', label: 'Divides', icon: '/elections-poll-svgrepo-com.svg', path: '/divides' },
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
            <span style={{ 
              background: 'linear-gradient(90deg, #ff1744 0%, #2979ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }} className="text-lg font-black tracking-tight">
              The Divide
            </span>
          </Link>

          {/* User Area */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Balance with + Button */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end rounded-lg border border-[#2a2a30] bg-[#16161a] px-3 py-1">
                    <span className="text-[9px] font-medium text-[#666] uppercase">Balance</span>
                    <span className="text-white text-sm font-bold leading-none">
                      ${formatCurrency(Number(user.balance || 0), 2)}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)', boxShadow: '0 2px 8px rgba(229, 57, 53, 0.3)' }}
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
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#1e88e5] hover:bg-[#1e88e5]/10 mb-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" /></svg>
                          Admin Dashboard
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)' }}
              >
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        {/* Hero Section - Larger */}
        <div className="px-4 pt-8 pb-6 text-center relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -z-10" />
          <h1 className="text-4xl font-black mb-3 tracking-tight" style={{ 
            background: 'linear-gradient(90deg, #ff1744 0%, #2979ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            The Divide
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            The Psychology Game. Where the minority wins and trust is optional.
          </p>

          {/* Search Bar - Like Stake.us */}
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-11 rounded-xl bg-[#111] border border-[#1a1a1a] text-white placeholder-gray-500 focus:outline-none focus:border-[#e53935]/50 transition-colors"
              style={{
                WebkitTextFillColor: 'white',
                opacity: 1
              }}
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" /></svg>
            </div>
          </div>
        </div>

        {/* Game Cards Grid - Single Divides Card */}
        <div className="px-4 pb-8">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
            Featured Game
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
                        filter: 'brightness(0) saturate(100%) invert(27%) sepia(95%) saturate(5558%) hue-rotate(346deg) brightness(99%) contrast(107%)',
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
