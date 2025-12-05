import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function MobileBottomNav({ onOpenChat }) {
    const location = useLocation();

    const navItems = [
        { id: 'divides', label: 'Markets', icon: '/elections-poll-svgrepo-com.svg', path: '/' },
        { id: 'chat', label: 'Chat', icon: '💬', path: '/chat' },
        { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
    ];

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
                                <span className="text-xl">{item.icon}</span>
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
                            {item.icon.startsWith('/') ? (
                                <img
                                    src={item.icon}
                                    alt={item.label}
                                    className="w-5 h-5"
                                    style={{
                                        filter: isActive(item.path)
                                            ? 'brightness(0) saturate(100%) invert(27%) sepia(95%) saturate(5558%) hue-rotate(346deg) brightness(99%) contrast(107%)'
                                            : 'brightness(0) saturate(100%) invert(47%) sepia(6%) saturate(378%) hue-rotate(180deg) brightness(94%) contrast(87%)'
                                    }}
                                />
                            ) : (
                                <span className="text-xl">{item.icon}</span>
                            )}
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
