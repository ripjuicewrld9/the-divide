import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function TicketDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [escalating, setEscalating] = useState(false);
    const [savingTranscript, setSavingTranscript] = useState(false);
    const [changingStatus, setChangingStatus] = useState(false);

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

    const handleEscalate = async () => {
        if (!confirm('Escalate this ticket to admins? This will mark it as urgent and notify admin staff.')) {
            return;
        }

        setEscalating(true);
        try {
            const res = await fetch(`${API_BASE}/api/support/tickets/${id}/escalate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                alert('Ticket escalated to admins successfully');
                await fetchTicket(); // Refresh ticket data
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to escalate ticket');
            }
        } catch (err) {
            console.error('Escalate error:', err);
            alert('Failed to escalate ticket');
        } finally {
            setEscalating(false);
        }
    };

    const handleSaveTranscript = async () => {
        if (!confirm('Save this ticket transcript to Discord? This will post the full conversation to the transcript channel.')) {
            return;
        }

        setSavingTranscript(true);
        try {
            const res = await fetch(`${API_BASE}/api/support/tickets/${id}/transcript`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                alert('Transcript saved to Discord successfully');
                await fetchTicket(); // Refresh ticket data
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save transcript');
            }
        } catch (err) {
            console.error('Save transcript error:', err);
            alert('Failed to save transcript');
        } finally {
            setSavingTranscript(false);
        }
    };

    const handleChangeStatus = async (newStatus) => {
        const statusLabels = {
            'open': 'Open',
            'in_progress': 'In Progress',
            'resolved': 'Resolved',
            'closed': 'Closed'
        };

        if (!confirm(`Change ticket status to "${statusLabels[newStatus]}"?`)) {
            return;
        }

        setChangingStatus(true);
        try {
            const res = await fetch(`${API_BASE}/api/support/tickets/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                const data = await res.json();
                setTicket(data.ticket);
                alert('Ticket status updated successfully');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update status');
            }
        } catch (err) {
            console.error('Change status error:', err);
            alert('Failed to update status');
        } finally {
            setChangingStatus(false);
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

                {/* Moderator Controls Panel */}
                {(user.role === 'moderator' || user.role === 'admin') && (
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-6 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <h3 className="text-lg font-bold text-purple-400">Moderator Controls</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <button
                                onClick={handleEscalate}
                                disabled={escalating || ticket.escalated}
                                className="px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg font-semibold hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {ticket.escalated ? (
                                    <>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Already Escalated
                                    </>
                                ) : (
                                    <>
                                        🚨 {escalating ? 'Escalating...' : 'Escalate to Admin'}
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleSaveTranscript}
                                disabled={savingTranscript || ticket.transcriptSaved}
                                className="px-4 py-3 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg font-semibold hover:bg-cyan-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {ticket.transcriptSaved ? (
                                    <>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Transcript Saved
                                    </>
                                ) : (
                                    <>
                                        📋 {savingTranscript ? 'Saving...' : 'Save Transcript'}
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => handleChangeStatus('closed')}
                                disabled={changingStatus || ticket.status === 'closed'}
                                className="px-4 py-3 bg-gray-500/20 border border-gray-500/30 text-gray-400 rounded-lg font-semibold hover:bg-gray-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {ticket.status === 'closed' ? (
                                    <>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Ticket Closed
                                    </>
                                ) : (
                                    <>
                                        🔒 {changingStatus ? 'Closing...' : 'Close Ticket'}
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Quick Status Change Buttons */}
                        {ticket.status !== 'closed' && (
                            <div className="flex gap-2">
                                <span className="text-sm text-gray-400 self-center mr-2">Quick Status:</span>
                                <button
                                    onClick={() => handleChangeStatus('open')}
                                    disabled={changingStatus || ticket.status === 'open'}
                                    className={`px-3 py-1.5 text-xs rounded ${
                                        ticket.status === 'open'
                                            ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50'
                                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
                                    } transition disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    Open
                                </button>
                                <button
                                    onClick={() => handleChangeStatus('in_progress')}
                                    disabled={changingStatus || ticket.status === 'in_progress'}
                                    className={`px-3 py-1.5 text-xs rounded ${
                                        ticket.status === 'in_progress'
                                            ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20'
                                    } transition disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    In Progress
                                </button>
                                <button
                                    onClick={() => handleChangeStatus('resolved')}
                                    disabled={changingStatus || ticket.status === 'resolved'}
                                    className={`px-3 py-1.5 text-xs rounded ${
                                        ticket.status === 'resolved'
                                            ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                                            : 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20'
                                    } transition disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    Resolved
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                        </div>

                        {ticket.escalated && (
                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm">
                                <p className="text-red-400">
                                    ⚠️ Escalated by <span className="font-semibold">{ticket.escalatedBy?.username || 'Unknown'}</span> on{' '}
                                    {new Date(ticket.escalatedAt).toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>
                )}

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
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (message.trim() && !sending) {
                                        handleSendMessage(e);
                                    }
                                }
                            }}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none resize-none mb-3"
                            rows="4"
                            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
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
