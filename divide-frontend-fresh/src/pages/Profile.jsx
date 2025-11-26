import React from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { formatCurrency } from '../utils/format';
import MobileGameHeader from '../components/MobileGameHeader';

export default function ProfilePage({ onOpenChat }) {
    const { user, logout } = useAuth();
    const isMobile = window.innerWidth <= 768;

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0b0b0b] text-white flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Please Login</h1>
                    <p className="text-gray-400 mb-6">You need to be logged in to view your profile.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white pb-24">
            {/* Mobile Header */}
            {/* Mobile Header */}
            <MobileGameHeader title="Profile" onOpenChat={onOpenChat} className="md:hidden" />

            <div className="max-w-4xl mx-auto p-4 md:p-8 pt-20 md:pt-8">
                {/* Profile Header */}
                <div className="bg-[#1a1a2e] rounded-2xl p-6 mb-6 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                        <div className="relative">
                            <UserAvatar user={user} size={100} />
                            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-[#1a1a2e]" />
                        </div>

                        <div className="text-center md:text-left flex-1">
                            <h1 className="text-3xl font-bold mb-1">{user.username}</h1>
                            <p className="text-gray-400 text-sm mb-4">Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}</p>

                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/10">
                                    <div className="text-xs text-gray-500 uppercase font-bold">Balance</div>
                                    <div className="text-xl font-mono text-cyan-400">${formatCurrency(user.balance || 0)}</div>
                                </div>
                                <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/10">
                                    <div className="text-xs text-gray-500 uppercase font-bold">Wagered</div>
                                    <div className="text-xl font-mono text-purple-400">${formatCurrency(user.wagered || 0)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings / Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1a1a2e] rounded-xl p-6 border border-white/5">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span>⚙️</span> Account Settings
                        </h2>
                        <div className="space-y-3">
                            <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition flex justify-between items-center group">
                                <span>Change Password</span>
                                <span className="text-gray-500 group-hover:text-white transition">→</span>
                            </button>
                            <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition flex justify-between items-center group">
                                <span>Email Preferences</span>
                                <span className="text-gray-500 group-hover:text-white transition">→</span>
                            </button>
                            <button className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition flex justify-between items-center group">
                                <span>Two-Factor Auth</span>
                                <span className="text-gray-500 group-hover:text-white transition">→</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#1a1a2e] rounded-xl p-6 border border-white/5">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span>📊</span> Statistics
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <span className="text-gray-400">Total Bets</span>
                                <span className="font-mono">{user.totalBets || 0}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <span className="text-gray-400">Total Wins</span>
                                <span className="font-mono text-green-400">{user.totalWins || 0}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <span className="text-gray-400">Total Losses</span>
                                <span className="font-mono text-red-400">{user.totalLosses || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={logout}
                    className="w-full mt-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold py-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                    <span>🚪</span> Sign Out
                </button>
            </div>
        </div>
    );
}
