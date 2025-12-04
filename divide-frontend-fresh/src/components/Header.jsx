import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/format';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import AuthModal from './AuthModal.jsx';
import UserAvatar from './UserAvatar.jsx';
import UserSettingsModal from './UserSettingsModal.jsx';
import DepositWithdrawModal from './DepositWithdrawModal.jsx';
import SupportTicket from './SupportTicket.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Header() {
  const { user, logout, addFunds } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [promoteError, setPromoteError] = useState('');
  const [promoteSuccess, setPromoteSuccess] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

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
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/promote-to-admin`, {
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
    <>
    <header className="sticky top-0 z-50 w-full border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo & Nav */}
        <nav className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight transition-transform hover:scale-105">
            <span className="text-[#d4d4d4]">
              The Divide
            </span>
          </Link>
        </nav>

        {/* User Area */}
        <div className="flex items-center gap-3">
          {/* Support Button - Always visible */}
          <button
            onClick={() => setShowSupportModal(true)}
            className="flex items-center gap-2 rounded-md border border-[#1a1a1a] bg-[#111] px-3 py-1.5 text-xs font-medium text-[#888] transition-all hover:bg-[#161616] hover:text-[#d4d4d4] hover:border-[#2a2a2a]"
            title="Contact Support"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="hidden sm:inline">Support</span>
          </button>

          {user ? (
            <>
              {/* Notification Bell */}
              <NotificationBell />

              {/* Balance & Add Funds */}
              <div className="flex items-center gap-2 rounded-md border border-[#1a1a1a] bg-[#111] px-2 py-1.5">
                <div className="flex flex-col items-end leading-none mr-1">
                  <span className="text-[9px] font-medium text-[#444] uppercase tracking-wider">Balance</span>
                  <span className="text-[#6b1c1c] text-sm font-bold">
                    ${formatCurrency(Number(user.balance || 0), 2)}
                  </span>
                </div>
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="flex h-6 w-6 items-center justify-center rounded bg-[#6b1c1c] text-white transition-all hover:bg-[#7d2121] active:scale-95"
                  title="Add funds"
                >
                  <span className="font-bold text-sm leading-none">+</span>
                </button>
                <DepositWithdrawModal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} />
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={handleUserButton}
                  className="flex items-center gap-2 rounded-md border border-[#1a1a1a] bg-[#111] px-3 py-1.5 text-xs font-medium text-[#888] transition-all hover:bg-[#161616] hover:text-[#d4d4d4]"
                >
                  <UserAvatar user={user} size={20} />
                  {user.username}
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute right-0 top-full mt-1.5 w-48 overflow-hidden rounded-md border border-[#1a1a1a] bg-[#111] shadow-xl z-50"
                    >
                      <div className="p-1.5">
                        <Link
                          to="/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[#888] transition-colors hover:bg-[#161616] hover:text-[#d4d4d4]"
                        >
                          👤 Profile
                        </Link>
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setMenuOpen(false)}
                            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[#6b1c1c] transition-colors hover:bg-[#161616] hover:text-[#a33]"
                          >
                            🛠️ Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[#733] transition-colors hover:bg-[#1a1212] hover:text-[#a44]"
                        >
                          🚪 Logout
                        </button>
                      </div>

                      {(promoteError || promoteSuccess) && (
                        <div className="border-t border-[#1a1a1a] bg-[#0a0a0a] p-2 text-[10px]">
                          {promoteError && <p className="text-[#a33]">{promoteError}</p>}
                          {promoteSuccess && <p className="text-[#3a3]">{promoteSuccess}</p>}
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
              className="rounded-md bg-[#6b1c1c] px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#7d2121]"
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
    {showSupportModal && <SupportTicket onClose={() => setShowSupportModal(false)} />}
    </>
  );
}
