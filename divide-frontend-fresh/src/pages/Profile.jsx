import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { formatCurrency } from '../utils/format';
import MobileGameHeader from '../components/MobileGameHeader';

export default function ProfilePage({ onOpenChat }) {
    const { user, logout, updateUser } = useAuth();

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
            <MobileGameHeader title="Profile" onOpenChat={onOpenChat} className="md:hidden" />

            <div className="max-w-4xl mx-auto p-4 md:p-8 pt-20 md:pt-8">
                {/* Profile Header */}
                <div className="bg-[#1a1a2e] rounded-2xl p-6 mb-6 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                        <div className="relative group">
                            <UserAvatar user={user} size={100} />
                            {/* Avatar is synced from Discord - no edit button */}
                            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-[#1a1a2e]" />
                        </div>

                        <div className="text-center md:text-left flex-1">
                            <h1 className="text-3xl font-bold mb-1">{user.username}</h1>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#1a1a2e', border: '2px solid #FFD700', color: '#FFD700' }}>
                                    Level {user.level || 1}
                                </span>
                                <span className="text-purple-400 text-sm font-semibold">
                                    {user.currentBadge || 'Sheep'}
                                </span>
                                <span className="text-gray-500 text-sm">
                                    {(user.xp || 0).toLocaleString()} XP
                                </span>
                            </div>
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
                                <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/10">
                                    <div className="text-xs text-gray-500 uppercase font-bold">Deposited</div>
                                    <div className="text-xl font-mono text-green-400">${formatCurrency(user.totalDeposited || 0)}</div>
                                </div>
                                <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/10">
                                    <div className="text-xs text-gray-500 uppercase font-bold">Withdrawn</div>
                                    <div className="text-xl font-mono text-orange-400">${formatCurrency(user.totalWithdrawn || 0)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings / Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1a1a2e] rounded-xl p-6 border border-white/5">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400"><path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" /></svg>
                            Account Settings
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
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-400"><path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" /></svg>
                            Statistics
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <span className="text-gray-400">Total Shorts</span>
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm10.72 4.72a.75.75 0 011.06 0l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H9a.75.75 0 010-1.5h10.94l-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
                    Sign Out
                </button>
            </div>
        </div>
    );
}
