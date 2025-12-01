import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SupportLayout from '../components/SupportLayout';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ModeratorPanel() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('chat');
    const [chatMessages, setChatMessages] = useState([]);
    const [mutedUsers, setMutedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const isModerator = user && (user.role === 'moderator' || user.role === 'admin');

    // Redirect non-moderators to tickets page
    useEffect(() => {
        if (user && !isModerator) {
            navigate('/support/tickets', { replace: true });
        }
    }, [user, isModerator, navigate]);

    useEffect(() => {
        if (user && isModerator) {
            fetchChatMessages();
            fetchMutedUsers();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isModerator]);

    const fetchChatMessages = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/moderator/chat-messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setChatMessages(data.messages || []);
        } catch (err) {
            console.error('Failed to fetch chat messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMutedUsers = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/moderator/muted-users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setMutedUsers(data.mutedUsers || []);
        } catch (err) {
            console.error('Failed to fetch muted users:', err);
        }
    };

    const handleMuteUser = async (username, duration) => {
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/moderator/mute-user`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, duration })
            });

            if (res.ok) {
                await fetchMutedUsers();
                await fetchChatMessages();
                alert(`User ${username} muted for ${duration} minutes`);
            } else {
                alert('Failed to mute user');
            }
        } catch (err) {
            console.error('Error muting user:', err);
            alert('Error muting user');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnmuteUser = async (username) => {
        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/moderator/unmute-user`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });

            if (res.ok) {
                await fetchMutedUsers();
                alert(`User ${username} unmuted`);
            } else {
                alert('Failed to unmute user');
            }
        } catch (err) {
            console.error('Error unmuting user:', err);
            alert('Error unmuting user');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!confirm('Delete this message?')) return;

        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/moderator/delete-message`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messageId })
            });

            if (res.ok) {
                await fetchChatMessages();
                alert('Message deleted');
            } else {
                alert('Failed to delete message');
            }
        } catch (err) {
            console.error('Error deleting message:', err);
            alert('Error deleting message');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <SupportLayout>
            <div className="p-4 md:p-8">
                <div className="max-w-[1600px] mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <span>🛡️</span>
                            <span>Moderator / Chat Moderation</span>
                        </div>
                        <h1 className="text-3xl font-bold">Moderator Panel</h1>
                        <p className="text-gray-400">Manage chat messages and user timeouts</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 border-b border-white/10">
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`px-4 py-2 font-semibold transition ${
                                activeTab === 'chat'
                                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Recent Messages
                        </button>
                        <button
                            onClick={() => setActiveTab('muted')}
                            className={`px-4 py-2 font-semibold transition ${
                                activeTab === 'muted'
                                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Muted Users {mutedUsers.length > 0 && `(${mutedUsers.length})`}
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {/* Recent Messages Tab */}
                            {activeTab === 'chat' && (
                                <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                    <div className="p-4 bg-white/5 border-b border-white/10">
                                        <h3 className="font-semibold">Recent Chat Messages (Last 100)</h3>
                                    </div>
                                    <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                                        {chatMessages.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400">
                                                No recent messages
                                            </div>
                                        ) : (
                                            chatMessages.map((msg) => (
                                                <div key={msg._id} className="p-4 hover:bg-white/5 transition">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-semibold text-cyan-400">
                                                                    {msg.username}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(msg.timestamp).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-gray-300 break-words">
                                                                {msg.message}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 flex-shrink-0">
                                                            <button
                                                                onClick={() => handleDeleteMessage(msg._id)}
                                                                disabled={actionLoading}
                                                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-semibold transition border border-red-500/30"
                                                            >
                                                                Delete
                                                            </button>
                                                            <div className="relative group">
                                                                <button
                                                                    disabled={actionLoading}
                                                                    className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded text-xs font-semibold transition border border-orange-500/30"
                                                                >
                                                                    Mute
                                                                </button>
                                                                <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-lg p-2 hidden group-hover:block z-10 w-32">
                                                                    <button
                                                                        onClick={() => handleMuteUser(msg.username, 5)}
                                                                        className="w-full px-3 py-1 text-left hover:bg-white/10 rounded text-sm"
                                                                    >
                                                                        5 min
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleMuteUser(msg.username, 30)}
                                                                        className="w-full px-3 py-1 text-left hover:bg-white/10 rounded text-sm"
                                                                    >
                                                                        30 min
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleMuteUser(msg.username, 60)}
                                                                        className="w-full px-3 py-1 text-left hover:bg-white/10 rounded text-sm"
                                                                    >
                                                                        1 hour
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleMuteUser(msg.username, 1440)}
                                                                        className="w-full px-3 py-1 text-left hover:bg-white/10 rounded text-sm"
                                                                    >
                                                                        24 hours
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Muted Users Tab */}
                            {activeTab === 'muted' && (
                                <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                    <div className="p-4 bg-white/5 border-b border-white/10">
                                        <h3 className="font-semibold">Currently Muted Users</h3>
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {mutedUsers.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400">
                                                No users currently muted
                                            </div>
                                        ) : (
                                            mutedUsers.map((mute) => (
                                                <div key={mute._id} className="p-4 hover:bg-white/5 transition">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="font-semibold text-cyan-400">
                                                                {mute.username}
                                                            </div>
                                                            <div className="text-sm text-gray-400">
                                                                Muted by {mute.mutedBy} • 
                                                                Expires: {new Date(mute.mutedUntil).toLocaleString()}
                                                            </div>
                                                            {mute.reason && (
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    Reason: {mute.reason}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => handleUnmuteUser(mute.username)}
                                                            disabled={actionLoading}
                                                            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded font-semibold transition border border-green-500/30"
                                                        >
                                                            Unmute
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </SupportLayout>
    );
}
