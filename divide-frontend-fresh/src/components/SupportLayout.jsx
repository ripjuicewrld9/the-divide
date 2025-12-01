import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SupportLayout({ children }) {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [supportNotificationCount, setSupportNotificationCount] = useState(0);

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
    
    // Check if user has moderator or admin role
    const isModerator = user && (user.role === 'moderator' || user.role === 'admin');

    useEffect(() => {
        if (user && token) {
            fetchSupportNotifications();
            // Refresh every 30 seconds
            const interval = setInterval(fetchSupportNotifications, 30000);
            return () => clearInterval(interval);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchSupportNotifications = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const supportUnread = data.notifications?.filter(n => n.type === 'support' && !n.read).length || 0;
            setSupportNotificationCount(supportUnread);
        } catch (err) {
            console.error('Failed to fetch support notifications:', err);
        }
    };

    const navItems = [
        // Dashboard - moderators only
        ...(isModerator ? [{
            path: '/support',
            label: 'Dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        }] : []),
        // Tickets - everyone can see
        {
            path: '/support/tickets',
            label: 'Tickets',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            ),
            showNotificationBadge: true,
        },
        // Moderator-only tabs
        ...(isModerator ? [
        {
            path: '/support/inbox',
            label: 'Inbox',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            ),
            badge: '💬',
        },
        {
            path: '/support/moderation',
            label: 'Moderation',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            ),
            badge: '🛡️',
        },
        {
            path: '/support/teams',
            label: 'Teams',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            path: '/support/analytics',
            label: 'Analytics',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            comingSoon: true,
        },
        {
            path: '/support/settings',
            label: 'Settings',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        }] : []),
    ];

    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white flex">
            {/* Sidebar */}
            <div className="w-64 bg-[#1a1a1a] border-r border-white/10 flex flex-col">
                {/* Logo/Brand */}
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        Support Panel
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                        {isModerator ? 'Moderator Dashboard' : 'My Tickets'}
                    </p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-1">
                        {navItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => !item.comingSoon && navigate(item.path)}
                                disabled={item.comingSoon}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition relative
                                    ${isActive(item.path)
                                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white border border-cyan-500/30'
                                        : item.comingSoon
                                        ? 'text-gray-500 cursor-not-allowed'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }
                                `}
                            >
                                <div className="relative">
                                    {item.icon}
                                    {item.showNotificationBadge && supportNotificationCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-[#1a1a1a]">
                                            {supportNotificationCount > 9 ? '9+' : supportNotificationCount}
                                        </span>
                                    )}
                                </div>
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.badge && (
                                    <span className="text-xs">{item.badge}</span>
                                )}
                                {item.comingSoon && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-gray-500 uppercase">
                                        Soon
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-4 py-2">
                        <UserAvatar user={user} size={36} />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{user?.username}</div>
                            <div className="text-xs text-gray-400 capitalize">{user?.role}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    );
}
