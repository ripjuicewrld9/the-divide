import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

const IconWithGradient = ({ src, isActive, id }) => {
    return (
        <div className="w-5 h-5 flex-shrink-0 relative">
            <svg className="w-5 h-5" viewBox="0 0 20 20">
                <defs>
                    <linearGradient id={`gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
                    </linearGradient>
                    <mask id={`mask-${id}`}>
                        <image href={src} width="20" height="20" style={{ filter: 'brightness(0) invert(1)' }} />
                    </mask>
                </defs>
                {isActive ? (
                    <rect width="20" height="20" fill={`url(#gradient-${id})`} mask={`url(#mask-${id})`} />
                ) : (
                    <image href={src} width="20" height="20" style={{ filter: 'brightness(0) saturate(100%) invert(47%) sepia(6%) saturate(378%) hue-rotate(180deg) brightness(94%) contrast(87%)' }} />
                )}
            </svg>
        </div>
    );
};

export default function Sidebar() {
    const location = useLocation();
    const { user, token } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const isModerator = user && (user.role === 'moderator' || user.role === 'admin');

    // Fetch unread support notifications for moderators
    useEffect(() => {
        if (!isModerator || !token) return;

        const fetchUnreadCount = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/notifications/unread`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                const supportNotifs = data.notifications?.filter(n => n.type === 'support') || [];
                setUnreadCount(supportNotifs.length);
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
            }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000); // Refresh every 30s

        return () => clearInterval(interval);
    }, [isModerator, token]);

    const links = [
        { name: 'Home', path: '/', icon: '/home-alt-svgrepo-com.svg' },
        { name: 'Keno', path: '/keno', icon: '/tiles-svgrepo-com.svg' },
        { name: 'Blackjack', path: '/blackjack', icon: '/cards-game-solitaire-poker-blackjack-casino-svgrepo-com.svg' },
        { name: 'Plinko', path: '/plinko', icon: '/ball-pyramid-svgrepo-com.svg' },
        { name: 'Wheel (Coming Soon)', path: '/wheel', icon: '/helm-wheel-svgrepo-com.svg' },
        { name: 'Divides', path: '/divides', icon: '/elections-poll-svgrepo-com.svg' },
        { name: 'Pump (Coming Soon)', path: '/rugged', icon: '/trend-down-svgrepo-com.svg' },
        { name: 'Support', path: '/support', icon: '/home-alt-svgrepo-com.svg' },
    ];

    return (
        <aside className="flex w-64 flex-col border-r border-white/10 bg-[#0b0b0b] pt-4 h-full overflow-y-auto shrink-0 no-scrollbar">
            <div className="px-4 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Menu</h3>
                <div className="space-y-1">
                    {links.map((link) => {
                        const isActive = location.pathname === link.path || location.pathname.startsWith(link.path + '/');
                        const isSupport = link.path === '/support';
                        const showBadge = isSupport && isModerator && unreadCount > 0;
                        
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <IconWithGradient src={link.icon} isActive={isActive} id={link.path.replace(/\//g, '-')} />
                                <span className="flex-1">{link.name}</span>
                                {showBadge && (
                                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeSidebar"
                                        className="absolute left-0 h-8 w-1 rounded-r-full bg-cyan-500"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="mt-auto p-4 border-t border-white/5">
                <div className="rounded-xl bg-gradient-to-br from-cyan-900/20 to-emerald-900/20 p-4 border border-white/5">
                    <h4 className="text-sm font-bold text-white mb-1">Daily Rewards</h4>
                    <p className="text-xs text-gray-400 mb-3">Claim your daily bonus now!</p>
                    <button className="w-full rounded-lg bg-white/10 py-2 text-xs font-bold text-white hover:bg-white/20 transition-colors">
                        Claim Now
                    </button>
                </div>
            </div>
        </aside>
    );
}
