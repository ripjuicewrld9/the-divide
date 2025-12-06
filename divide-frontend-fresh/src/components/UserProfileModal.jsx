import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function UserProfileModal({ userId, username, isOpen, onClose }) {
    const { user: currentUser, token } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tipAmount, setTipAmount] = useState('');
    const [showTipModal, setShowTipModal] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const queryParam = userId ? `id=${userId}` : `username=${username}`;
            const res = await fetch(`${API_BASE}/api/user/profile?${queryParam}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await res.json();
            
            if (res.ok) {
                setProfileData(data.user);
            } else {
                setError(data.error || 'Failed to load profile');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    }, [userId, username, token]);

    useEffect(() => {
        if (isOpen && (userId || username)) {
            fetchProfile();
        }
    }, [isOpen, userId, username, fetchProfile]);

    const handleSendTip = async () => {
        setError('');
        setSuccess('');
        
        const amount = Number(tipAmount);
        if (!amount || amount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (amount > Number(currentUser?.balance || 0)) {
            setError('Insufficient balance');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/user/tip`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipientId: profileData._id,
                    amount: amount
                })
            });

            const data = await res.json();
            
            if (res.ok) {
                setSuccess(`Successfully sent $${amount.toFixed(2)} to ${profileData.username}!`);
                setTipAmount('');
                setTimeout(() => {
                    setShowTipModal(false);
                    setSuccess('');
                }, 2000);
            } else {
                setError(data.error || 'Failed to send tip');
            }
        } catch (err) {
            console.error('Error sending tip:', err);
            setError('Failed to send tip');
        }
    };

    const getUserLevel = (wagered) => {
        // Custom level thresholds with manual progression curve
        const wageredDollars = wagered / 100;
        
        const levels = [
            { level: 1, threshold: 0 },
            { level: 5, threshold: 400 },
            { level: 10, threshold: 2000 },
            { level: 15, threshold: 6000 },
            { level: 20, threshold: 13000 },
            { level: 25, threshold: 24000 },
            { level: 30, threshold: 38000 },
            { level: 35, threshold: 48000 },
            { level: 36, threshold: 50000 },
            { level: 37, threshold: 51262 },
            { level: 38, threshold: 54872 },
            { level: 39, threshold: 58900 },
            { level: 40, threshold: 63200 },
            { level: 41, threshold: 67800 },
            { level: 42, threshold: 72600 },
            { level: 43, threshold: 77700 },
            { level: 44, threshold: 83000 },
            { level: 45, threshold: 88600 },
            { level: 46, threshold: 94100 },
            { level: 47, threshold: 100300 },
            { level: 48, threshold: 106800 },
            { level: 49, threshold: 113600 },
            { level: 50, threshold: 120700 },
            { level: 55, threshold: 151000 },
            { level: 60, threshold: 188000 },
            { level: 65, threshold: 232000 },
            { level: 70, threshold: 285000 },
            { level: 75, threshold: 348000 },
            { level: 80, threshold: 423000 },
            { level: 85, threshold: 512000 },
            { level: 90, threshold: 620000 },
            { level: 95, threshold: 750000 },
            { level: 100, threshold: 900000 }
        ];
        
        // Find the highest level the user has reached
        for (let i = levels.length - 1; i >= 0; i--) {
            if (wageredDollars >= levels[i].threshold) {
                return levels[i].level;
            }
        }
        
        return 1;
    };

    const getLevelThreshold = (level) => {
        // Get threshold for a specific level
        const levels = [
            { level: 1, threshold: 0 },
            { level: 5, threshold: 400 },
            { level: 10, threshold: 2000 },
            { level: 15, threshold: 6000 },
            { level: 20, threshold: 13000 },
            { level: 25, threshold: 24000 },
            { level: 30, threshold: 38000 },
            { level: 35, threshold: 48000 },
            { level: 36, threshold: 50000 },
            { level: 37, threshold: 51262 },
            { level: 38, threshold: 54872 },
            { level: 39, threshold: 58900 },
            { level: 40, threshold: 63200 },
            { level: 41, threshold: 67800 },
            { level: 42, threshold: 72600 },
            { level: 43, threshold: 77700 },
            { level: 44, threshold: 83000 },
            { level: 45, threshold: 88600 },
            { level: 46, threshold: 94100 },
            { level: 47, threshold: 100300 },
            { level: 48, threshold: 106800 },
            { level: 49, threshold: 113600 },
            { level: 50, threshold: 120700 },
            { level: 55, threshold: 151000 },
            { level: 60, threshold: 188000 },
            { level: 65, threshold: 232000 },
            { level: 70, threshold: 285000 },
            { level: 75, threshold: 348000 },
            { level: 80, threshold: 423000 },
            { level: 85, threshold: 512000 },
            { level: 90, threshold: 620000 },
            { level: 95, threshold: 750000 },
            { level: 100, threshold: 900000 }
        ];
        
        const levelData = levels.find(l => l.level === level);
        return levelData ? levelData.threshold : 0;
    };

    const getNextLevelInfo = (currentLevel) => {
        // Get the next defined level milestone
        const levels = [1, 5, 10, 15, 20, 25, 30, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
        
        for (let i = 0; i < levels.length; i++) {
            if (levels[i] > currentLevel) {
                return levels[i];
            }
        }
        
        return currentLevel + 1; // If beyond defined levels, just increment by 1
    };

    const getLevelProgress = (wagered) => {
        const wageredDollars = wagered / 100;
        const currentLevel = getUserLevel(wagered);
        const nextLevel = getNextLevelInfo(currentLevel);
        
        if (currentLevel >= 100) {
            return 100; // Max defined level
        }
        
        const currentThreshold = getLevelThreshold(currentLevel);
        const nextThreshold = getLevelThreshold(nextLevel);
        const progress = ((wageredDollars - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
        
        return Math.min(100, Math.max(0, progress));
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#0b0b0b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold">User Profile</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : error && !profileData ? (
                    <div className="p-8 text-center">
                        <p className="text-red-400">{error}</p>
                    </div>
                ) : profileData ? (
                    <div className="p-6">
                        {/* User Header */}
                        <div className="flex items-center gap-4 mb-6">
                            <UserAvatar user={profileData} size={80} />
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold">{profileData.username}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-full text-sm font-bold text-cyan-400">
                                        Level {getUserLevel(profileData.wagered || 0)}
                                    </div>
                                    {profileData.role === 'admin' && (
                                        <div className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs font-bold text-red-400">
                                            ADMIN
                                        </div>
                                    )}
                                    {profileData.role === 'moderator' && (
                                        <div className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs font-bold text-purple-400">
                                            MOD
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Level Progress */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-gray-400">Level {getUserLevel(profileData.wagered || 0)} → {getNextLevelInfo(getUserLevel(profileData.wagered || 0))}</span>
                                <span className="text-cyan-400 font-bold">
                                    ${((profileData.wagered || 0) / 100).toLocaleString()} / ${getLevelThreshold(getNextLevelInfo(getUserLevel(profileData.wagered || 0))).toLocaleString()}
                                </span>
                            </div>
                            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                                    style={{ width: `${getLevelProgress(profileData.wagered || 0)}%` }}
                                />
                            </div>
                            <div className="text-xs text-gray-500 mt-1 text-right">
                                {getLevelProgress(profileData.wagered || 0).toFixed(1)}% complete
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <div className="text-sm text-gray-400 mb-1">Total Shorts</div>
                                <div className="text-2xl font-bold text-cyan-400">{profileData.totalBets || 0}</div>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <div className="text-sm text-gray-400 mb-1">Total Wagered</div>
                                <div className="text-2xl font-bold text-emerald-400">${((profileData.wagered || 0) / 100).toFixed(2)}</div>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <div className="text-sm text-gray-400 mb-1">Wins</div>
                                <div className="text-2xl font-bold text-green-400">{profileData.totalWins || 0}</div>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <div className="text-sm text-gray-400 mb-1">Losses</div>
                                <div className="text-2xl font-bold text-red-400">{profileData.totalLosses || 0}</div>
                            </div>
                        </div>

                        {/* Win Rate */}
                        {profileData.totalBets > 0 && (
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
                                <div className="text-sm text-gray-400 mb-2">Win Rate</div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                            style={{ width: `${((profileData.totalWins || 0) / profileData.totalBets * 100).toFixed(0)}%` }}
                                        />
                                    </div>
                                    <span className="text-lg font-bold text-white">
                                        {((profileData.totalWins || 0) / profileData.totalBets * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Tip Button - only show if viewing someone else's profile */}
                        {currentUser && profileData._id !== currentUser._id && (
                            <button
                                onClick={() => setShowTipModal(true)}
                                className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" /><path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" /><path d="M2.25 18a.75.75 0 000 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 00-.75-.75H2.25z" /></svg>
                                Send Tip
                            </button>
                        )}

                        {/* Tip Modal */}
                        <AnimatePresence>
                            {showTipModal && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center"
                                    onClick={() => setShowTipModal(false)}
                                >
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full max-w-sm bg-[#0b0b0b] border border-white/10 rounded-xl p-6"
                                    >
                                        <h3 className="text-xl font-bold mb-4">Send Tip to {profileData.username}</h3>
                                        
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Amount (USD)</label>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={tipAmount}
                                                onChange={(e) => setTipAmount(e.target.value)}
                                                placeholder="Enter amount"
                                                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors"
                                                autoFocus
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Your balance: ${((currentUser?.balance || 0) / 100).toFixed(2)}</p>
                                        </div>

                                        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
                                        {success && <p className="text-sm text-green-400 mb-4">{success}</p>}

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => {
                                                    setShowTipModal(false);
                                                    setTipAmount('');
                                                    setError('');
                                                    setSuccess('');
                                                }}
                                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSendTip}
                                                disabled={!tipAmount || Number(tipAmount) <= 0 || success}
                                                className="flex-1 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all active:scale-95"
                                            >
                                                Send ${tipAmount || '0'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : null}
            </motion.div>
        </div>
    );
}
