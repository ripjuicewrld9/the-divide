import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SupportLayout from '../components/SupportLayout';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SupportDashboard() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    const isModerator = user && (user.role === 'moderator' || user.role === 'admin');

    // Redirect non-moderators to tickets page
    useEffect(() => {
        if (user && !isModerator) {
            navigate('/support/tickets', { replace: true });
        }
    }, [user, isModerator, navigate]);

    useEffect(() => {
        if (user && token && isModerator) {
            fetchDashboardData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, token, isModerator]);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/support/tickets/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const allTickets = data.tickets || [];
            setTickets(allTickets);
            calculateStats(allTickets);
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (allTickets) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());

        // My stats (tickets assigned to current moderator)
        const myTickets = allTickets.filter(t => 
            t.assignedTo?._id === user._id || t.assignedTo === user._id
        );
        
        const myClosedTickets = myTickets.filter(t => t.status === 'closed');
        const myOpenTickets = myTickets.filter(t => t.status === 'open' || t.status === 'in_progress');

        // Calculate average response time for my tickets
        let totalResponseTime = 0;
        let responsedTickets = 0;
        myTickets.forEach(ticket => {
            if (ticket.messages && ticket.messages.length > 1) {
                const firstMessage = new Date(ticket.messages[0].timestamp);
                const firstResponse = new Date(ticket.messages[1].timestamp);
                totalResponseTime += (firstResponse - firstMessage);
                responsedTickets++;
            }
        });
        const avgResponseTime = responsedTickets > 0 ? totalResponseTime / responsedTickets : 0;

        // Calculate resolution rate
        const resolutionRate = myTickets.length > 0 
            ? Math.round((myClosedTickets.length / myTickets.length) * 100)
            : 0;

        // Overall team stats
        const openTickets = allTickets.filter(t => t.status === 'open');
        const inProgressTickets = allTickets.filter(t => t.status === 'in_progress');
        const urgentTickets = allTickets.filter(t => 
            t.priority === 'urgent' && 
            (t.status === 'open' || t.status === 'in_progress')
        );
        const todayTickets = allTickets.filter(t => new Date(t.createdAt) >= today);
        const weekTickets = allTickets.filter(t => new Date(t.createdAt) >= thisWeekStart);

        setStats({
            // Personal stats
            myTotalTickets: myTickets.length,
            myOpenTickets: myOpenTickets.length,
            myClosedTickets: myClosedTickets.length,
            myAvgResponseTime: avgResponseTime,
            myResolutionRate: resolutionRate,
            
            // Team stats
            totalTickets: allTickets.length,
            openTickets: openTickets.length,
            inProgressTickets: inProgressTickets.length,
            urgentTickets: urgentTickets.length,
            todayTickets: todayTickets.length,
            weekTickets: weekTickets.length,
        });
    };

    const formatTime = (ms) => {
        const minutes = Math.floor(ms / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ${minutes % 60}m`;
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
    };

    const getRecentTickets = () => {
        return tickets
            .filter(t => t.status !== 'closed')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
    };

    const StatCard = ({ title, value, subtitle, icon, color = 'cyan', trend, onClick }) => (
        <button
            onClick={onClick}
            className="bg-white/5 border border-white/10 rounded-lg p-6 hover:border-cyan-500/50 hover:bg-white/10 transition text-left w-full cursor-pointer"
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${color}-500/10 border border-${color}-500/20`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`text-xs font-semibold ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className="text-3xl font-bold mb-1">{value}</div>
            <div className="text-sm text-gray-400">{title}</div>
            {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
        </button>
    );

    if (loading) {
        return (
            <SupportLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </SupportLayout>
        );
    }

    return (
        <SupportLayout>
            <div className="p-4 md:p-8">
                <div className="max-w-[1600px] mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <span>📊</span>
                            <span>Dashboard / Overview</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Support Dashboard</h1>
                        <p className="text-gray-400">Welcome back, {user?.username}! Here's your support performance overview.</p>
                    </div>

                    {/* My Performance Stats */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <span>👤</span>
                            My Performance
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                title="My Total Tickets"
                                value={stats?.myTotalTickets || 0}
                                subtitle="All time"
                                color="blue"
                                onClick={() => navigate('/support/tickets?assigned=me')}
                                icon={
                                    <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                }
                            />
                            <StatCard
                                title="Active Tickets"
                                value={stats?.myOpenTickets || 0}
                                subtitle="Currently assigned"
                                color="yellow"
                                onClick={() => navigate('/support/tickets?assigned=me&status=open')}
                                icon={
                                    <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                }
                            />
                            <StatCard
                                title="Resolution Rate"
                                value={`${stats?.myResolutionRate || 0}%`}
                                subtitle={`${stats?.myClosedTickets || 0} resolved`}
                                color="green"
                                icon={
                                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                }
                            />
                            <StatCard
                                title="Avg Response Time"
                                value={formatTime(stats?.myAvgResponseTime || 0)}
                                subtitle="First response"
                                color="purple"
                                icon={
                                    <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                }
                            />
                        </div>
                    </div>

                    {/* Team Overview */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <span>👥</span>
                            Team Overview
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <StatCard
                                title="Open Tickets"
                                value={stats?.openTickets || 0}
                                subtitle="Waiting for assignment"
                                color="cyan"
                                onClick={() => navigate('/support/tickets?status=open')}
                                icon={
                                    <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                }
                            />
                            <StatCard
                                title="In Progress"
                                value={stats?.inProgressTickets || 0}
                                subtitle="Being worked on"
                                color="blue"
                                onClick={() => navigate('/support/tickets?status=in_progress')}
                                icon={
                                    <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                }
                            />
                            <StatCard
                                title="Urgent Tickets"
                                value={stats?.urgentTickets || 0}
                                subtitle="Requires immediate attention"
                                color="red"
                                onClick={() => navigate('/support/tickets?priority=urgent')}
                                icon={
                                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                }
                            />
                        </div>
                    </div>

                    {/* Activity Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Activity */}
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span>📋</span>
                                Recent Open Tickets
                            </h3>
                            <div className="space-y-3">
                                {getRecentTickets().length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-4">No open tickets</p>
                                ) : (
                                    getRecentTickets().map(ticket => (
                                        <button
                                            key={ticket._id}
                                            onClick={() => navigate(`/support/tickets/${ticket._id}`)}
                                            className="w-full text-left p-3 bg-white/5 rounded-lg border border-white/10 hover:border-cyan-500/50 transition"
                                        >
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="font-semibold text-sm truncate flex-1">
                                                    {ticket.subject}
                                                </div>
                                                <span className={`
                                                    text-[10px] px-2 py-0.5 rounded-full font-semibold
                                                    ${ticket.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                                      ticket.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                                      ticket.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                                                      'bg-gray-500/20 text-gray-400'}
                                                `}>
                                                    {ticket.priority?.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {ticket.userId?.username || 'Unknown'} • {new Date(ticket.createdAt).toLocaleDateString()}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                            <button
                                onClick={() => navigate('/support/tickets')}
                                className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition"
                            >
                                View All Tickets →
                            </button>
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span>📈</span>
                                Activity Trends
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">Today's Tickets</span>
                                    <span className="text-xl font-bold">{stats?.todayTickets || 0}</span>
                                </div>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                        style={{ width: `${Math.min((stats?.todayTickets || 0) / 10 * 100, 100)}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between mt-6">
                                    <span className="text-gray-400 text-sm">This Week</span>
                                    <span className="text-xl font-bold">{stats?.weekTickets || 0}</span>
                                </div>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                        style={{ width: `${Math.min((stats?.weekTickets || 0) / 50 * 100, 100)}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between mt-6">
                                    <span className="text-gray-400 text-sm">Total Tickets</span>
                                    <span className="text-xl font-bold">{stats?.totalTickets || 0}</span>
                                </div>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/10">
                                <div className="text-xs text-gray-400 mb-2">Quick Actions</div>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => navigate('/support/tickets')}
                                        className="w-full py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 rounded-lg text-sm font-medium transition border border-cyan-500/30"
                                    >
                                        View All Tickets
                                    </button>
                                    <button
                                        onClick={() => navigate('/support/inbox')}
                                        className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition"
                                    >
                                        Open Moderator Chat
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SupportLayout>
    );
}
