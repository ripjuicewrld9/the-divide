import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';
import DepositWithdrawModal from './DepositWithdrawModal';
import SupportTicket from './SupportTicket';
import AuthModal from './AuthModal';

export default function MobileGameHeader({ className = "", showBackButton = false }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isRegister, setIsRegister] = useState(false);

    return (
        <>
            <header className={`fixed top-0 z-50 w-full border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-md ${className}`}>
                <div className="flex h-14 items-center justify-between px-4">
                    {/* Left: Back Button or Logo */}
                    {showBackButton ? (
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <svg
                                className="w-6 h-6 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>
                    ) : (
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
                    )}

                    {/* Center/Right: User Area */}
                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                {/* Balance Display */}
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col items-end rounded-lg border border-[#2a2a30] bg-[#16161a] px-3 py-1">
                                        <span className="text-[9px] font-medium text-[#666] uppercase">Balance</span>
                                        <span className="text-white text-sm font-bold leading-none">
                                            ${formatCurrency(Number(user?.balance || 0), 2)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setShowDepositModal(true)}
                                        className="flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-95"
                                        style={{ background: 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)', boxShadow: '0 2px 8px rgba(229, 57, 53, 0.3)' }}
                                        title="Add funds"
                                    >
                                        <span className="text-white font-bold text-lg leading-none">+</span>
                                    </button>
                                </div>

                                {/* Support Button */}
                                <button
                                    onClick={() => setShowSupportModal(true)}
                                    className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/5 transition-colors"
                                    title="Support"
                                >
                                    <svg
                                        className="w-5 h-5 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </button>
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
            {/* Spacer to prevent content from hiding behind fixed header */}
            <div className="h-14 w-full flex-shrink-0" />

            <DepositWithdrawModal
                isOpen={showDepositModal}
                onClose={() => setShowDepositModal(false)}
            />

            {showSupportModal && (
                <SupportTicket onClose={() => setShowSupportModal(false)} />
            )}

            {showAuthModal && (
                <AuthModal 
                    onClose={() => setShowAuthModal(false)} 
                    isRegister={isRegister} 
                    setIsRegister={setIsRegister} 
                />
            )}
        </>
    );
}
