import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function TicketDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const fetchTicket = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/support/tickets/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!res.ok) {
                if (res.status === 404) {
                    alert('Ticket not found');
                    navigate('/support');
                    return;
                }
                throw new Error('Failed to fetch ticket');
            }

            const data = await res.json();
            setTicket(data.ticket);
        } catch (err) {
            console.error('Fetch ticket error:', err);
            alert('Failed to load ticket');
        } finally {
            setLoading(false);
        }
    }, [id, token, navigate]);

    useEffect(() => {
        if (user) {
            fetchTicket();
        }
    }, [user, fetchTicket]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        setSending(true);
        try {
            const res = await fetch(`${API_BASE}/api/support/tickets/${id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: message.trim() })
            });

            if (res.ok) {
                const data = await res.json();
                setTicket(data.ticket);
                setMessage('');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to send message');
            }
        } catch (err) {
            console.error('Send message error:', err);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Please Login</h1>
                    <p className="text-gray-400">You need to be logged in to view tickets.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
                <div className="inline-block w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!ticket) {
        return null;
    }

    const canReply = ticket.status !== 'closed';

    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link to="/support" className="text-cyan-400 hover:underline mb-4 inline-block">
                        ← Back to Tickets
                    </Link>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{ticket.subject}</h1>
                            <p className="text-gray-400">
                                Ticket #{ticket._id.substring(18).toUpperCase()} • {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}
                            </p>
                        </div>
                        <span className={`px-4 py-2 rounded-lg border font-semibold ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Ticket Info */}
                <div className="bg-white/5 rounded-lg border border-white/10 p-6 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-gray-400 mb-1">Created</p>
                            <p className="font-semibold">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 mb-1">Last Updated</p>
                            <p className="font-semibold">{new Date(ticket.updatedAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 mb-1">Priority</p>
                            <p className="font-semibold capitalize">{ticket.priority}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 mb-1">Discord</p>
                            <p className="font-semibold">{ticket.discordThreadId ? '✅ Linked' : '❌ Not Linked'}</p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="space-y-4 mb-6">
                    {ticket.messages.map((msg, index) => {
                        const isAdmin = msg.senderType === 'admin';
                        const isOwn = msg.sender._id === user._id;

                        return (
                            <div
                                key={index}
                                className={`flex gap-3 ${isOwn && !isAdmin ? 'flex-row-reverse' : ''}`}
                            >
                                <div className="flex-shrink-0">
                                    <UserAvatar user={msg.sender} size={40} />
                                </div>
                                <div className={`flex-1 ${isOwn && !isAdmin ? 'text-right' : ''}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold">{msg.sender.username}</span>
                                        {isAdmin && (
                                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                                                ADMIN
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-400">
                                            {new Date(msg.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className={`inline-block px-4 py-3 rounded-lg ${
                                        isAdmin 
                                            ? 'bg-red-500/10 border border-red-500/30' 
                                            : isOwn 
                                                ? 'bg-cyan-500/10 border border-cyan-500/30'
                                                : 'bg-white/5 border border-white/10'
                                    }`}>
                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Reply Form */}
                {canReply ? (
                    <form onSubmit={handleSendMessage} className="bg-white/5 rounded-lg border border-white/10 p-4">
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none resize-none mb-3"
                            rows="4"
                            placeholder="Type your message..."
                            disabled={sending}
                        />
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={sending || !message.trim()}
                                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
                            >
                                {sending ? 'Sending...' : 'Send Message'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 text-center">
                        <p className="text-gray-400">This ticket is closed and cannot receive new messages.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
