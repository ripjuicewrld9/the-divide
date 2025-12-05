import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function MobileBottomNav({ onOpenChat }) {
    const location = useLocation();

    const navItems = [
        { id: 'divides', label: 'Divides', icon: 'divides', path: '/' },
        { id: 'feed', label: 'Feed', icon: 'feed', path: '/feed' },
        { id: 'chat', label: 'Chat', icon: 'chat', path: '/chat' },
        { id: 'profile', label: 'Profile', icon: 'profile', path: '/profile' },
    ];

    // SVG icons for high-end look
    const icons = {
        divides: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
            </svg>
        ),
        feed: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <path d="M22 6l-10 7L2 6"/>
            </svg>
        ),
        chat: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
        ),
        profile: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
        )
    };

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0b0b0b]/95 backdrop-blur-md border-t border-white/10 z-50">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    // Chat button opens overlay instead of navigating
                    if (item.id === 'chat') {
                        return (
                            <button
                                key={item.id}
                                onClick={onOpenChat}
                                className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[60px]"
                                style={{ color: '#6b7280' }}
                            >
                                <span className="w-5 h-5">{icons[item.icon]}</span>
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </button>
                        );
                    }

                    // Other nav items use Link
                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[60px]"
                            style={{
                                color: isActive(item.path) ? '#ff1744' : '#6b7280'
                            }}
                        >
                            <span className="w-5 h-5">{icons[item.icon]}</span>
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
