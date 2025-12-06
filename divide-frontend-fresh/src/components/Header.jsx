// src/components/Header.jsx
// Premium minimalist header - Billion dollar aesthetic

import React, { useState } from 'react';
import { formatCurrency } from '../utils/format';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import AuthModal from './AuthModal.jsx';
import UserAvatar from './UserAvatar.jsx';
import UserSettingsModal from './UserSettingsModal.jsx';
import DepositWithdrawModal from './DepositWithdrawModal.jsx';
import SupportTicket from './SupportTicket.jsx';
import NotificationBell from './NotificationBell.jsx';
import HowItWorksModal from './HowItWorksModal.jsx';
import VipModal from './VipModal.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator' || isAdmin;

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);

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

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(5,5,7,0.9)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          height: '60px',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}>

          {/* Logo */}
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{
              fontSize: '20px',
              fontWeight: '800',
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #ff1744 0%, #d32f2f 40%, #7c4dff 60%, #2979ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              The Divide
            </span>
          </Link>

          {/* Navigation */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: '32px',
          }}>
            <Link
              to="/"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.85)',
                background: 'linear-gradient(135deg, rgba(255,23,68,0.15) 0%, rgba(124,77,255,0.15) 100%)',
                border: '1px solid rgba(255,23,68,0.2)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,23,68,0.25) 0%, rgba(124,77,255,0.25) 100%)';
                e.currentTarget.style.borderColor = 'rgba(255,23,68,0.4)';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,23,68,0.15) 0%, rgba(124,77,255,0.15) 100%)';
                e.currentTarget.style.borderColor = 'rgba(255,23,68,0.2)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              Divides
            </Link>
            <Link
              to="/hedge"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.85)',
                background: 'linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(255,111,0,0.15) 100%)',
                border: '1px solid rgba(255,193,7,0.2)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,193,7,0.25) 0%, rgba(255,111,0,0.25) 100%)';
                e.currentTarget.style.borderColor = 'rgba(255,193,7,0.4)';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(255,111,0,0.15) 100%)';
                e.currentTarget.style.borderColor = 'rgba(255,193,7,0.2)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <img src="/hedge-icon.svg" width="18" height="18" alt="Hedge" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
              Hedge
            </Link>
            <Link
              to="/feed"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.85)',
                background: 'linear-gradient(135deg, rgba(41,121,255,0.15) 0%, rgba(0,230,118,0.15) 100%)',
                border: '1px solid rgba(41,121,255,0.2)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(41,121,255,0.25) 0%, rgba(0,230,118,0.25) 100%)';
                e.currentTarget.style.borderColor = 'rgba(41,121,255,0.4)';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(41,121,255,0.15) 0%, rgba(0,230,118,0.15) 100%)';
                e.currentTarget.style.borderColor = 'rgba(41,121,255,0.2)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
              </svg>
              Feed
            </Link>
          </nav>

          {/* User Area */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            {/* How It Works Button */}
            <button
              onClick={() => setShowHowItWorks(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>How It Works</span>
            </button>

            {/* VIP Button */}
            <button
              onClick={() => setShowVipModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,215,0,0.2)',
                background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.05) 100%)',
                color: 'rgba(255,215,0,0.8)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,165,0,0.1) 100%)';
                e.currentTarget.style.color = '#FFD700';
                e.currentTarget.style.borderColor = 'rgba(255,215,0,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.05) 100%)';
                e.currentTarget.style.color = 'rgba(255,215,0,0.8)';
                e.currentTarget.style.borderColor = 'rgba(255,215,0,0.2)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              <span>VIP</span>
            </button>

            {/* Support Button */}
            <button
              onClick={() => setShowSupportModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {user ? (
              <>

                {/* Balance */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                  }}>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '500',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.35)',
                    }}>
                      Balance
                    </span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'rgba(255,255,255,0.95)',
                      fontFamily: 'SF Mono, Monaco, monospace',
                      letterSpacing: '-0.02em',
                    }}>
                      ${formatCurrency(Number(user.balance || 0), 2)}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDepositModal(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    }}
                  >
                    +
                  </button>
                  <DepositWithdrawModal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} />
                </div>

                {/* User Menu */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={handleUserButton}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <UserAvatar user={user} size={28} />
                    <span style={{ letterSpacing: '-0.01em' }}>{user.username}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.5 }}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          marginTop: '8px',
                          width: '180px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(15,15,17,0.95)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                          overflow: 'hidden',
                          zIndex: 50,
                        }}
                      >
                        <div style={{ padding: '6px' }}>
                          <Link
                            to="/profile"
                            onClick={() => setMenuOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              color: 'rgba(255,255,255,0.7)',
                              fontSize: '13px',
                              fontWeight: '500',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                            }}
                          >
                            Profile
                          </Link>

                          {isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setMenuOpen(false)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                color: '#dc2626',
                                fontSize: '13px',
                                fontWeight: '500',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(220,38,38,0.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              Admin
                            </Link>
                          )}

                          {isModerator && (
                            <Link
                              to="/support"
                              onClick={() => setMenuOpen(false)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                color: '#06b6d4',
                                fontSize: '13px',
                                fontWeight: '500',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(6,182,212,0.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              Support Dashboard
                            </Link>
                          )}

                          <div style={{
                            height: '1px',
                            background: 'rgba(255,255,255,0.06)',
                            margin: '4px 0',
                          }} />

                          <button
                            onClick={handleLogout}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'transparent',
                              color: 'rgba(255,255,255,0.5)',
                              fontSize: '13px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                            }}
                          >
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notification Bell - Right of profile */}
                <NotificationBell />
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ff1744 0%, #d32f2f 40%, #7c4dff 60%, #2979ff 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  letterSpacing: '-0.01em',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(255, 23, 68, 0.25), 0 4px 16px rgba(41, 121, 255, 0.25)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(255, 23, 68, 0.35), 0 6px 24px rgba(41, 121, 255, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 23, 68, 0.25), 0 4px 16px rgba(41, 121, 255, 0.25)';
                }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} isRegister={isRegister} setIsRegister={setIsRegister} />
        )}
        <UserSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
      </header>

      {showSupportModal && <SupportTicket isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />}
      <HowItWorksModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
      <VipModal
        isOpen={showVipModal}
        onClose={() => setShowVipModal(false)}
        currentTier={user?.vipTier || 'none'}
        wagerLast30Days={user?.wagerLast30Days || 0}
      />
    </>
  );
}
