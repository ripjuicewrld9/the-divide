import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Support() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Check if user is moderator or admin - redirect to new dashboard
    const isModerator = user && (user.role === 'moderator' || user.role === 'admin');

    const fetchTickets = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/support/tickets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setTickets(data.tickets || []);
        } catch (err) {
            console.error('Failed to fetch tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isModerator) {
            navigate('/support', { replace: true });
            return;
        }
        if (user && !isModerator) {
            fetchTickets();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isModerator, user, navigate]);

    const getStatusBadge = (status) => {
        const styles = {
            'open': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            'in_progress': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            'resolved': 'bg-green-500/20 text-green-400 border-green-500/30',
            'closed': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        };
        return styles[status] || styles.open;
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

    // Hide support page from regular users who haven't created any tickets
    if (!loading && !isModerator && tickets.length === 0) {
        return (
            <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="mb-6">
                        <svg className="w-24 h-24 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold mb-4">No Tickets Yet</h1>
                    <p className="text-gray-400 mb-6">
                        You haven't created any support tickets yet. Use the Support button in the header to submit your first ticket.
                    </p>
                    <p className="text-sm text-gray-500">
                        Once you create a ticket, you'll be able to view and track all your support requests here.
                    </p>
                </div>
            </div>
        );
    }

    if (isModerator) {
        // This shouldn't show because of redirect, but just in case
        return null;
    }

    // Simple user view - show their tickets in list format
    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">My Support Tickets</h1>
                    <p className="text-gray-400">View and track your support requests</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tickets.map(ticket => (
                            <button
                                key={ticket._id}
                                onClick={() => navigate(`/support/tickets/${ticket._id}`)}
                                className="block w-full p-6 bg-white/5 rounded-lg border border-white/10 hover:border-cyan-500/50 transition text-left"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-lg mb-1">{ticket.subject}</h3>
                                        <p className="text-sm text-gray-400">
                                            Ticket #{ticket._id.substring(18).toUpperCase()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(ticket.status)}`}>
                                            {ticket.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-gray-300 text-sm mb-3 line-clamp-2">{ticket.description}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
