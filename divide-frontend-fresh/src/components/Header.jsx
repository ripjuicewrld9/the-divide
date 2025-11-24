import React, { useState } from 'react';
import { formatCurrency } from '../utils/format';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './UserAvatar.jsx';
import UserSettingsModal from './UserSettingsModal.jsx';

export default function Header() {
  const { user, logout, addFunds } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [promoteError, setPromoteError] = useState('');
  const [promoteSuccess, setPromoteSuccess] = useState('');
  const [showFundInput, setShowFundInput] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleUserButton = () => {
    if (!user) {
      setIsRegister(false);
      setShowAuthModal(true);
      return;
    }
    setMenuOpen((s) => !s);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  const handlePromoteToAdmin = async () => {
    setPromoteError('');
    setPromoteSuccess('');

    const adminCode = prompt('Enter ADMIN_CODE:');
    if (!adminCode) return;

    try {
      const response = await fetch('http://localhost:3000/api/promote-to-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ adminCode })
      });

      const data = await response.json();

      if (!response.ok) {
        setPromoteError(data.error || 'Failed to promote to admin');
        return;
      }

      setPromoteSuccess('Successfully promoted to admin! Refreshing...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setPromoteError('Error: ' + err.message);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0b0b0b]/80 backdrop-blur-md shadow-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo & Nav */}
        <nav className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight transition-transform hover:scale-105">
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              The Divide
            </span>
          </Link>
        </nav>

        {/* User Area */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* Balance & Add Funds */}
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-1 py-1 pr-4">
                <div className="relative">
                  <button
                    onClick={() => setShowFundInput(!showFundInput)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-black shadow-lg transition-transform hover:scale-105 active:scale-95"
                  >
                    <span className="font-bold text-lg leading-none">+</span>
                  </button>

                  {/* Add Funds Popover */}
                  <AnimatePresence>
                    {showFundInput && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: -10 }}
                        className="absolute left-full ml-2 top-0 flex items-center gap-2 rounded-lg border border-white/10 bg-[#1a1a1a] p-1 shadow-xl"
                      >
                        <input
                          type="number"
                          min="1"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          placeholder="$"
                          className="w-16 rounded bg-black/50 px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-green-500"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            const v = Number(fundAmount || 0);
                            if (v > 0 && addFunds) {
                              addFunds(v);
                              setFundAmount('');
                              setShowFundInput(false);
                            }
                          }}
                          className="rounded bg-green-500/20 px-2 py-1 text-xs font-bold text-green-400 hover:bg-green-500/30"
                        >
                          ADD
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex flex-col items-end leading-none">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Balance</span>
                  <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-sm font-bold text-transparent">
                    ${formatCurrency(Number(user.balance || 0), 2)}
                  </span>
                </div>
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={handleUserButton}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10 hover:border-cyan-500/30"
                >
                  <UserAvatar user={user} size={24} />
                  {user.username}
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#111] shadow-2xl backdrop-blur-xl z-50"
                    >
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            setShowSettingsModal(true);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          👤 Profile
                        </button>
                        {!isAdmin && (
                          <button
                            onClick={handlePromoteToAdmin}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                          >
                            👑 Promote to Admin
                          </button>
                        )}
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setMenuOpen(false)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-cyan-400 transition-colors hover:bg-white/5 hover:text-cyan-300"
                          >
                            🛠️ Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                        >
                          🚪 Logout
                        </button>
                      </div>

                      {(promoteError || promoteSuccess) && (
                        <div className="border-t border-white/5 bg-black/20 p-3 text-xs">
                          {promoteError && <p className="text-red-400">{promoteError}</p>}
                          {promoteSuccess && <p className="text-green-400">{promoteSuccess}</p>}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 hover:shadow-cyan-500/40"
            >
              Login / Sign Up
            </button>
          )}
        </div>
      </div>

      {
        showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} isRegister={isRegister} setIsRegister={setIsRegister} />
        )
      }
      <UserSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </header >
  );
}
