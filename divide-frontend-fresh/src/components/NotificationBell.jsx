import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function NotificationBell() {
    const { user, token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef(null);
    const socket = useSocket();

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Listen for real-time notifications
    useEffect(() => {
        if (!socket) return;

        socket.on('notification:new', (notification) => {
            setNotifications(prev => [notification, ...prev]);
        });

        return () => {
            socket.off('notification:new');
        };
    }, [socket]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setNotifications(data.notifications || []);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = async (notificationIds) => {
        try {
            await fetch(`${API_BASE}/api/notifications/mark-read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notificationIds })
            });

            setNotifications(prev => 
                prev.map(n => 
                    notificationIds.includes(n._id) ? { ...n, read: true } : n
                )
            );
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await fetch(`${API_BASE}/api/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead([notification._id]);
        }
        if (notification.link) {
            window.location.href = notification.link;
        }
    };

    const markAllAsRead = () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
        if (unreadIds.length > 0) {
            markAsRead(unreadIds);
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'support': return 'text-blue-400';
            case 'system': return 'text-orange-400';
            case 'jackpot': return 'text-yellow-400';
            case 'case': return 'text-purple-400';
            case 'achievement': return 'text-green-400';
            case 'promo': return 'text-pink-400';
            default: return 'text-gray-400';
        }
    };

    const formatTime = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-white/10 rounded-lg transition"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 max-h-[500px] flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-cyan-400 hover:text-cyan-300 transition"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="inline-block w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                                <p>No notifications</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    className={`p-4 border-b border-white/5 hover:bg-white/5 transition cursor-pointer ${
                                        !notification.read ? 'bg-cyan-500/5' : ''
                                    }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="text-2xl flex-shrink-0">
                                            {notification.icon || '🔔'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className={`font-semibold text-sm ${getTypeColor(notification.type)}`}>
                                                    {notification.title}
                                                </h4>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification._id);
                                                    }}
                                                    className="text-gray-500 hover:text-red-400 transition flex-shrink-0"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-300 mb-1">{notification.message}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">
                                                    {formatTime(notification.createdAt)}
                                                </span>
                                                {!notification.read && (
                                                    <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
