import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Support() {
    const { user, token } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        category: 'general',
        subject: '',
        description: '',
        email: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchTickets = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/support/tickets`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            console.log('📋 Fetched tickets:', data);
            setTickets(data.tickets || []);
        } catch (err) {
            console.error('Failed to fetch tickets:', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (user) {
            fetchTickets();
        }
    }, [user, fetchTickets]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch(`${API_BASE}/api/support/ticket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message);
                setShowCreateModal(false);
                setFormData({ category: 'general', subject: '', description: '', email: '' });
                // Refresh tickets list
                await fetchTickets();
            } else {
                alert(data.error || 'Failed to submit ticket');
            }
        } catch (err) {
            console.error('Submit error:', err);
            alert('Failed to submit ticket');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-blue-500/20 text-blue-400';
            case 'in_progress': return 'bg-yellow-500/20 text-yellow-400';
            case 'resolved': return 'bg-green-500/20 text-green-400';
            case 'closed': return 'bg-gray-500/20 text-gray-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'bug': return '🐛';
            case 'payment': return '💳';
            case 'complaint': return '😞';
            case 'general': return '💬';
            default: return '📋';
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Please Login</h1>
                    <p className="text-gray-400">You need to be logged in to view support tickets.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Support Tickets</h1>
                        <p className="text-gray-400">View and manage your support requests</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold hover:opacity-90 transition"
                    >
                        + New Ticket
                    </button>
                </div>

                {/* Discord Status */}
                {!user.discordId && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h3 className="font-semibold text-yellow-400 mb-1">Discord Not Linked</h3>
                                <p className="text-sm text-gray-300">
                                    Link your Discord account in your <Link to="/profile" className="text-cyan-400 underline">profile</Link> to receive support notifications in Discord.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tickets List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-gray-400 text-lg mb-4">No support tickets yet</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-2 bg-cyan-500 rounded-lg font-semibold hover:bg-cyan-600 transition"
                        >
                            Create Your First Ticket
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tickets.map(ticket => (
                            <Link
                                key={ticket._id}
                                to={`/support/${ticket._id}`}
                                className="block p-6 bg-white/5 rounded-lg border border-white/10 hover:border-cyan-500/50 transition"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{getCategoryIcon(ticket.category)}</span>
                                        <div>
                                            <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                                            <p className="text-sm text-gray-400">
                                                {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)} • 
                                                Ticket #{ticket._id.substring(18).toUpperCase()}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(ticket.status)}`}>
                                        {ticket.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-gray-300 text-sm mb-3 line-clamp-2">{ticket.description}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}</span>
                                    {ticket.discordThreadId && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <svg width="14" height="14" viewBox="0 0 71 55" fill="currentColor">
                                                    <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z"/>
                                                </svg>
                                                Discord Thread
                                            </span>
                                        </>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-[#1a1a1a] rounded-lg border border-cyan-500/30 p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-4">Create Support Ticket</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-2">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none"
                                    required
                                >
                                    <option value="general">General Question</option>
                                    <option value="bug">Bug Report</option>
                                    <option value="payment">Payment Issue</option>
                                    <option value="complaint">Complaint</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-2">Subject</label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none"
                                    placeholder="Brief summary of your issue"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none resize-none"
                                    rows="6"
                                    placeholder="Provide detailed information about your issue"
                                    required
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold mb-2">Email (Optional)</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none"
                                    placeholder="For email notifications"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-3 bg-white/10 rounded-lg font-semibold hover:bg-white/20 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
