import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Support() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [sortBy, setSortBy] = useState('newest');

    // Check if user is moderator or admin
    const isModerator = user && (user.role === 'moderator' || user.role === 'admin');

    const fetchTickets = useCallback(async () => {
        try {
            // Moderators fetch all tickets, users fetch only their own
            const endpoint = isModerator ? '/api/support/tickets/all' : '/api/support/tickets';
            console.log(`🔍 Fetching tickets from ${endpoint}, isModerator: ${isModerator}, user role: ${user?.role}`);
            const res = await fetch(`${API_BASE}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            console.log(`📋 Received ${data.tickets?.length || 0} tickets:`, data);
            setTickets(data.tickets || []);
        } catch (err) {
            console.error('Failed to fetch tickets:', err);
        } finally {
            setLoading(false);
        }
    }, [token, isModerator, user]);

    useEffect(() => {
        if (user) {
            fetchTickets();
        }
    }, [user, fetchTickets]);

    const getStatusBadge = (status) => {
        const styles = {
            'open': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            'in_progress': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            'resolved': 'bg-green-500/20 text-green-400 border-green-500/30',
            'closed': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        };
        return styles[status] || styles.open;
    };

    const getPriorityBadge = (priority) => {
        const styles = {
            'low': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
            'medium': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            'high': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            'urgent': 'bg-red-500/20 text-red-400 border-red-500/30'
        };
        return styles[priority] || styles.medium;
    };

    // Filter and sort tickets
    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = !searchQuery || 
            ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.userId?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket._id.substring(18).toUpperCase().includes(searchQuery.toUpperCase());
        
        const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
        
        return matchesSearch && matchesStatus && matchesPriority;
    }).sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'priority') {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return 0;
    });

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

    if (!isModerator) {
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
                                    onClick={() => navigate(`/support/${ticket._id}`)}
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

    // Moderator/Admin view - table layout like the reference image
    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white flex">
            {/* Sidebar */}
            <div className="w-64 bg-[#1a1a1a] border-r border-white/10 flex flex-col">
                {/* Logo/Brand */}
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold">Support Panel</h2>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4">
                    <div className="space-y-1">
                        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/10 text-white font-medium">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            Tickets
                        </button>
                        <button 
                            onClick={() => navigate('/')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition font-medium"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Dashboard
                        </button>
                        <button 
                            onClick={() => navigate('/profile')}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition font-medium"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                        </button>
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-4 py-2">
                        <UserAvatar user={user} size={32} />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{user.username}</div>
                            <div className="text-xs text-gray-400 capitalize">{user.role}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="p-4 md:p-8">
                    <div className="max-w-[1600px] mx-auto">
                        {/* Header */}
                        <div className="mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                                <span>📋</span>
                                <span>Tickets / Support Management</span>
                            </div>
                            <h1 className="text-3xl font-bold">All Tickets</h1>
                        </div>

                        {/* Search and Filters */}
                        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search for ticket by subject, customer or number..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none text-sm"
                                />
                            </div>

                            {/* Filter and Sort Controls */}
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition text-sm">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                    View
                                </button>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none text-sm"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="priority">Priority</option>
                                </select>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none text-sm"
                                >
                                    <option value="all">All Status</option>
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                                <select
                                    value={filterPriority}
                                    onChange={(e) => setFilterPriority(e.target.value)}
                                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none text-sm"
                                >
                                    <option value="all">All Priorities</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                        </div>

                        {/* Tickets Table */}
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
                                <p className="text-gray-400">No tickets found</p>
                            </div>
                        ) : (
                            <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/5 border-b border-white/10 text-sm font-semibold text-gray-400">
                                    <div className="col-span-1">Ticket ID</div>
                                    <div className="col-span-2">Customer</div>
                                    <div className="col-span-3">Subject</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-1">Priority</div>
                                    <div className="col-span-1">Agent</div>
                                    <div className="col-span-2">Date</div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y divide-white/5">
                                    {filteredTickets.map((ticket) => (
                                        <button
                                            key={ticket._id}
                                            onClick={() => navigate(`/support/${ticket._id}`)}
                                            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-white/5 transition text-left w-full items-center"
                                        >
                                            {/* Ticket ID */}
                                            <div className="col-span-1">
                                                <span className="text-cyan-400 font-mono text-sm">
                                                    #{ticket._id.substring(18).toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Customer */}
                                            <div className="col-span-2 flex items-center gap-2">
                                                <UserAvatar user={ticket.userId} size={32} />
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-sm truncate">
                                                        {ticket.userId?.username || 'Unknown'}
                                                    </div>
                                                    <div className="text-xs text-gray-400 truncate">
                                                        {ticket.userId?.email || ticket.email || ''}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Subject */}
                                            <div className="col-span-3">
                                                <div className="text-sm font-medium truncate">{ticket.subject}</div>
                                                <div className="text-xs text-gray-400 capitalize">{ticket.category}</div>
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-2">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(ticket.status)}`}>
                                                    {ticket.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Priority */}
                                            <div className="col-span-1">
                                                <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold border ${getPriorityBadge(ticket.priority)}`}>
                                                    {ticket.priority?.toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Agent */}
                                            <div className="col-span-1">
                                                {ticket.assignedTo ? (
                                                    <UserAvatar user={ticket.assignedTo} size={28} />
                                                ) : ticket.escalated ? (
                                                    <span className="text-xs text-red-400">🚨 Escalated</span>
                                                ) : (
                                                    <span className="text-xs text-gray-500">-</span>
                                                )}
                                            </div>

                                            {/* Date */}
                                            <div className="col-span-2 text-xs text-gray-400">
                                                {new Date(ticket.createdAt).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric', 
                                                    year: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Stats Footer */}
                        {!loading && filteredTickets.length > 0 && (
                            <div className="mt-4 text-sm text-gray-400">
                                Showing {filteredTickets.length} of {tickets.length} tickets
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
