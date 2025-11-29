import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';
import DepositWithdrawModal from './DepositWithdrawModal';
import SupportTicket from './SupportTicket';

export default function MobileGameHeader({ className = "" }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);

    return (
        <>
            <header className={`fixed top-0 z-50 w-full border-b border-white/10 bg-[#0b0b0b]/95 backdrop-blur-md ${className}`}>
                <div className="flex h-14 items-center justify-between px-4">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/')}
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

                    {/* Balance Display (Centered) */}
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center rounded-lg border border-white/10 bg-black/40 px-4 py-1">
                            <span className="text-[9px] font-medium text-gray-500 uppercase">Balance</span>
                            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-sm font-bold text-transparent leading-none">
                                ${formatCurrency(Number(user?.balance || 0), 2)}
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
        </>
    );
}
