import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { formatCurrency } from '../utils/format';
import MobileGameHeader from '../components/MobileGameHeader';

export default function ProfilePage({ onOpenChat }) {
    const { user, logout, updateUser } = useAuth();
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    const presetAvatars = [
        '/profilesvg/account-avatar-profile-user-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-2-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-3-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-4-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-5-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-6-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-7-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-9-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-10-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-11-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-12-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-13-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-14-svgrepo-com.svg',
        '/profilesvg/account-avatar-profile-user-16-svgrepo-com.svg',
    ];

    const handleAvatarSelect = async (avatarPath) => {
        try {
            await updateUser({ profileImage: avatarPath });
            setShowAvatarModal(false);
        } catch (error) {
            console.error('Failed to update avatar:', error);
        }
    };

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
                            <button
                                onClick={() => setShowAvatarModal(true)}
                                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer border-2 border-dashed border-white/50"
                            >
                                <span className="text-xs font-bold">EDIT</span>
                            </button>
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

            {/* Avatar Selection Modal */}
            {showAvatarModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowAvatarModal(false)}>
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Select Avatar</h2>
                            <button onClick={() => setShowAvatarModal(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            {presetAvatars.map((avatar, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleAvatarSelect(avatar)}
                                    className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all ${user.profileImage === avatar ? 'border-cyan-400 scale-105 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'border-white/10 hover:border-white/50 hover:scale-105'}`}
                                >
                                    <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
