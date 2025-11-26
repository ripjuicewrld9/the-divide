import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';

export default function MobileGameHeader({ title, onOpenChat, className = "" }) {
    const navigate = useNavigate();
    const { user } = useAuth();

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
                    <div className="flex flex-col items-center rounded-lg border border-white/10 bg-black/40 px-4 py-1">
                        <span className="text-[9px] font-medium text-gray-500 uppercase">Balance</span>
                        <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-sm font-bold text-transparent leading-none">
                            ${formatCurrency(Number(user?.balance || 0), 2)}
                        </span>
                    </div>

                    {/* Placeholder to balance layout (since chat button is removed) */}
                    <div className="w-10" />
                </div>
            </header>
            {/* Spacer to prevent content from hiding behind fixed header */}
            <div className="h-14 w-full flex-shrink-0" />
        </>
    );
}
