import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function MobileGameHeader({ title, onOpenChat }) {
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0b0b0b]/95 backdrop-blur-md">
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

                {/* Game Title */}
                <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    {title}
                </h1>

                {/* Chat Button */}
                <button
                    onClick={onOpenChat}
                    className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/5 transition-colors"
                >
                    <span className="text-xl">💬</span>
                </button>
            </div>
        </header>
    );
}
