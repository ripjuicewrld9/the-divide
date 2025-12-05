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
    const [activeDivides, setActiveDivides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedDivide, setSelectedDivide] = useState(null);
    const [cancelReason, setCancelReason] = useState('player_request');

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
            fetchActiveDivides();
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

    const fetchActiveDivides = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/moderator/active-divides`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setActiveDivides(data.divides || []);
        } catch (err) {
            console.error('Failed to fetch active divides:', err);
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

    const handleCancelDivide = async () => {
        if (!selectedDivide) return;

        setActionLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/moderator/cancel-divide`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    divideId: selectedDivide._id,
                    reason: cancelReason
                })
            });

            const data = await res.json();

            if (res.ok) {
                await fetchActiveDivides();
                setShowCancelModal(false);
                setSelectedDivide(null);
                alert(`Divide cancelled. ${data.refundedCount} players refunded.`);
            } else {
                alert(data.error || 'Failed to cancel divide');
            }
        } catch (err) {
            console.error('Error cancelling divide:', err);
            alert('Error cancelling divide');
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
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
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
                        <button
                            onClick={() => setActiveTab('divides')}
                            className={`px-4 py-2 font-semibold transition ${
                                activeTab === 'divides'
                                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Active Divides {activeDivides.length > 0 && `(${activeDivides.length})`}
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

                            {/* Active Divides Tab */}
                            {activeTab === 'divides' && (
                                <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                    <div className="p-4 bg-white/5 border-b border-white/10">
                                        <h3 className="font-semibold">Active Divides</h3>
                                        <p className="text-sm text-gray-400 mt-1">Cancel divides that violate rules. All shorts will be refunded.</p>
                                    </div>
                                    <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                                        {activeDivides.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400">
                                                No active divides
                                            </div>
                                        ) : (
                                            activeDivides.map((divide) => (
                                                <div key={divide._id} className="p-4 hover:bg-white/5 transition">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-lg mb-2">{divide.title}</div>
                                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                                                    <div className="text-sm text-gray-400 mb-1">Option A</div>
                                                                    <div className="font-medium">{divide.optionA}</div>
                                                                    <div className="text-sm text-cyan-400 mt-1">${(divide.shortsA / 100).toFixed(2)} shorted</div>
                                                                </div>
                                                                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                                                    <div className="text-sm text-gray-400 mb-1">Option B</div>
                                                                    <div className="font-medium">{divide.optionB}</div>
                                                                    <div className="text-sm text-cyan-400 mt-1">${(divide.shortsB / 100).toFixed(2)} shorted</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                                                <span>Total Pot: <strong className="text-white">${(divide.pot / 100).toFixed(2)}</strong></span>
                                                                <span>Participants: <strong className="text-white">{divide.shorts.length}</strong></span>
                                                                {divide.endTime && (
                                                                    <span>Ends: <strong className="text-white">{new Date(divide.endTime).toLocaleString()}</strong></span>
                                                                )}
                                                            </div>
                                                            {divide.isUserCreated && (
                                                                <div className="mt-2 text-xs text-purple-400">
                                                                    User-created by {divide.creatorId}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedDivide(divide);
                                                                setShowCancelModal(true);
                                                            }}
                                                            disabled={actionLoading}
                                                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded font-semibold transition border border-red-500/30 whitespace-nowrap"
                                                        >
                                                            Cancel Divide
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

            {/* Cancel Divide Modal */}
            {showCancelModal && selectedDivide && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCancelModal(false)}>
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4 text-red-400">Cancel Divide</h2>
                        <div className="mb-4">
                            <p className="text-gray-300 mb-2"><strong>{selectedDivide.title}</strong></p>
                            <p className="text-sm text-gray-400">
                                This will cancel the divide and refund all {selectedDivide.shorts.length} participants.
                            </p>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-gray-300">
                                Cancellation Reason
                            </label>
                            <select
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none"
                                disabled={actionLoading}
                            >
                                <option value="player_request">Player Request</option>
                                <option value="inappropriate_content">Inappropriate Content / Topics</option>
                                <option value="suspected_abuse">Suspected Abuse</option>
                                <option value="technical_issue">Technical Issue</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setSelectedDivide(null);
                                }}
                                className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition"
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCancelDivide}
                                className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SupportLayout>
    );
}
