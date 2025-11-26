import React, { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';

export default function MobileMainLayout() {
  const { user, balance } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const games = [
    { id: 'plinko', name: 'Plinko', emoji: '🎯', path: '/plinko', color: 'from-blue-600 to-blue-800' },
    { id: 'blackjack', name: 'Blackjack', emoji: '🃏', path: '/blackjack', color: 'from-green-600 to-green-800' },
    { id: 'keno', name: 'Keno', emoji: '🎱', path: '/keno', color: 'from-purple-600 to-purple-800' },
    { id: 'rugged', name: 'Rugged', emoji: '📈', path: '/rugged', color: 'from-red-600 to-red-800' },
    { id: 'battles', name: 'Battles', emoji: '⚔️', path: '/battles', color: 'from-orange-600 to-orange-800' },
    { id: 'divides', name: 'Divides', emoji: '🎲', path: '/divides', color: 'from-cyan-600 to-cyan-800' },
  ];

  const navItems = [
    { id: 'browse', label: 'Browse', icon: '☰', path: '/' },
    { id: 'games', label: 'Games', icon: '🎮', path: '/games' },
    { id: 'chat', label: 'Chat', icon: '💬', path: '/chat' },
    { id: 'casino', label: 'Casino', icon: '🎰', path: '/casino' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#1a2332] to-[#0f1419] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1a2332]/95 backdrop-blur-sm border-b border-gray-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="text-2xl font-black tracking-tight">
              <span className="text-cyan-400">The</span>
              <span className="text-white"> Divide</span>
            </div>
          </div>

          {/* Auth Buttons */}
          {!user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsRegister(false);
                  setShowAuthModal(true);
                }}
                className="px-4 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-sm font-medium transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setIsRegister(true);
                  setShowAuthModal(true);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Register
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-green-900/30 border border-green-600/30 px-3 py-1.5 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <span className="text-green-400 text-xs font-medium">💰</span>
                  <span className="text-white text-sm font-bold">${balance?.toFixed(2) ?? '0.00'}</span>
                </div>
              </div>
              <div className="bg-gray-800/50 px-3 py-1.5 rounded-lg">
                <span className="text-sm font-medium text-gray-300">{user.username}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 pb-24 overflow-y-auto">
        {/* Welcome Section */}
        {location.pathname === '/' && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">
              {user ? `Welcome back, ${user.username}!` : "America's Favorite Social Casino"}
            </h1>
            <p className="text-gray-400 text-sm">
              {user ? 'Choose your game and start playing' : 'Sign up to start playing'}
            </p>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search your game"
              className="w-full px-4 py-3 pl-12 rounded-xl bg-gray-800/40 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              🔍
            </div>
          </div>
        </div>

        {/* Start Playing Section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
            <h2 className="text-lg font-bold">Start Playing</h2>
          </div>

          {/* Game Grid */}
          <div className="grid grid-cols-2 gap-3">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => navigate(game.path)}
                className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${game.color} p-4 aspect-square flex flex-col items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-transform shadow-lg`}
              >
                <div className="text-4xl">{game.emoji}</div>
                <div className="text-white font-bold text-base">{game.name}</div>

                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
              </button>
            ))}
          </div>
        </div>

        {/* Featured Games Section */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
            <h2 className="text-lg font-bold">Featured Games</h2>
          </div>

          <div className="space-y-3">
            {games.slice(0, 3).map((game) => (
              <button
                key={`featured-${game.id}`}
                onClick={() => navigate(game.path)}
                className="w-full bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-800/60 active:bg-gray-800/80 transition-colors"
              >
                <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center text-3xl shadow-lg`}>
                  {game.emoji}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-base">{game.name}</div>
                  <div className="text-gray-400 text-xs">Tap to play</div>
                </div>
                <div className="text-gray-500">→</div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1a2332]/95 backdrop-blur-sm border-t border-gray-800/50 z-50">
        <div className="flex justify-around items-center py-3 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${isActive(item.path)
                  ? 'text-cyan-400'
                  : 'text-gray-400 hover:text-gray-300'
                }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Bottom Browser Bar (Stake.us style) */}
      <div className="fixed bottom-16 left-0 right-0 mx-4 mb-2 z-40">
        <div className="bg-[#0f1419]/95 backdrop-blur-sm border border-gray-700/50 rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl">
          <button className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50 transition-colors">
            <span className="text-gray-400">←</span>
          </button>

          <div className="flex-1 mx-3 bg-gray-800/50 rounded-full px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">🌐</span>
            <span className="text-xs text-gray-400 font-medium">thedivide.app</span>
          </div>

          <button className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50 transition-colors">
            <span className="text-gray-400">↻</span>
          </button>

          <button className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center hover:bg-gray-700/50 transition-colors ml-2">
            <span className="text-gray-400">⋯</span>
          </button>
        </div>
      </div>

      {/* Auth Modal (placeholder - you can implement this) */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a2332] rounded-2xl p-6 w-full max-w-md border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{isRegister ? 'Register' : 'Login'}</h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                className="w-full px-4 py-3 rounded-lg bg-gray-800/40 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 rounded-lg bg-gray-800/40 border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />

              <button className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold transition-colors">
                {isRegister ? 'Create Account' : 'Sign In'}
              </button>

              <button
                onClick={() => setIsRegister(!isRegister)}
                className="w-full text-sm text-gray-400 hover:text-cyan-400 transition-colors"
              >
                {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
