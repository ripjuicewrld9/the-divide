import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { formatCurrency } from '../utils/format';
import MobileGameHeader from '../components/MobileGameHeader';
import MobileFooter from '../components/MobileFooter.jsx';
import DiscordOAuthButton from '../components/DiscordOAuthButton';
import DiscordLinkHandler from '../components/DiscordLinkHandler';
import SecuritySettings from '../components/SecuritySettings';

export default function ProfilePage({ onOpenChat }) {
    const { user, logout, updateUser } = useAuth();
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [showEmailPrefsModal, setShowEmailPrefsModal] = useState(false);
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [isChangingUsername, setIsChangingUsername] = useState(false);

    const handleUsernameChange = async () => {
        setUsernameError('');
        setIsChangingUsername(true);

        try {
            const API_BASE = import.meta.env.VITE_API_URL || '';
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_BASE}/api/change-username`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newUsername })
            });

            const data = await response.json();

            if (!response.ok) {
                setUsernameError(data.error || 'Failed to change username');
                setIsChangingUsername(false);
                return;
            }

            // Update user context
            await updateUser({ username: data.username });
            setShowUsernameModal(false);
            setNewUsername('');
        } catch (error) {
            console.error('Failed to change username:', error);
            setUsernameError('Server error. Please try again.');
        } finally {
            setIsChangingUsername(false);
        }
    };

    const canChangeUsername = () => {
        if (!user?.lastUsernameChange) return true;
        const daysSinceLastChange = (Date.now() - new Date(user.lastUsernameChange).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastChange >= 30;
    };

    const getDaysUntilUsernameChange = () => {
        if (!user?.lastUsernameChange) return 0;
        const daysSinceLastChange = (Date.now() - new Date(user.lastUsernameChange).getTime()) / (1000 * 60 * 60 * 24);
        return Math.ceil(30 - daysSinceLastChange);
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
            {/* Discord Link Handler - handles Discord account linking */}
            <DiscordLinkHandler />

            {/* Mobile Header */}
            <MobileGameHeader title="Profile V2" onOpenChat={onOpenChat} className="md:hidden" />

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
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                <h1 className="text-3xl font-bold">{user.username}</h1>
                                <button
                                    onClick={() => canChangeUsername() ? setShowUsernameModal(true) : null}
                                    disabled={!canChangeUsername()}
                                    className={`p-2 rounded-lg transition-all ${canChangeUsername()
                                        ? 'bg-white/5 hover:bg-white/10 cursor-pointer'
                                        : 'bg-white/5 opacity-50 cursor-not-allowed'
                                        }`}
                                    title={canChangeUsername() ? 'Change username' : `Change username in ${getDaysUntilUsernameChange()} days`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                </button>
                            </div>
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
                            <DiscordOAuthButton />
                            <button
                                onClick={() => setShowSecurityModal(true)}
                                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition flex justify-between items-center group"
                            >
                                <span>Change Password</span>
                                <span className="text-gray-500 group-hover:text-white transition">→</span>
                            </button>
                            <button
                                onClick={() => setShowEmailPrefsModal(true)}
                                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition flex justify-between items-center group"
                            >
                                <span>Email Preferences</span>
                                <span className="text-gray-500 group-hover:text-white transition">→</span>
                            </button>
                            <button
                                onClick={() => setShowSecurityModal(true)}
                                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition flex justify-between items-center group"
                            >
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

            <SecuritySettings
                isOpen={showSecurityModal}
                onClose={() => setShowSecurityModal(false)}
            />

            {/* Username Change Modal */}
            {showUsernameModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowUsernameModal(false)}>
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Change Username</h2>
                            <button onClick={() => setShowUsernameModal(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-gray-400 mb-4">
                                You can change your username once every 30 days.
                            </p>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Enter new username"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition"
                                maxLength={20}
                            />
                            {usernameError && (
                                <p className="text-red-400 text-sm mt-2">{usernameError}</p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowUsernameModal(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUsernameChange}
                                disabled={isChangingUsername || !newUsername.trim() || newUsername.trim().length < 3}
                                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition"
                            >
                                {isChangingUsername ? 'Changing...' : 'Change Username'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Preferences Modal */}
            {showEmailPrefsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowEmailPrefsModal(false)}>
                    <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Email Preferences</h2>
                            <button onClick={() => setShowEmailPrefsModal(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-black/30 p-4 rounded-lg border border-white/10">
                                <p className="text-sm text-gray-400 mb-2">Email notifications and preferences will be available soon.</p>
                                <p className="text-xs text-gray-500">You can manage your marketing consent and notification settings here.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Footer with Legal Links, How it Works, VIP */}
            <MobileFooter />
        </div>
    );
}
