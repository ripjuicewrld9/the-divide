import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import SupportLayout from '../components/SupportLayout';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SupportTeams() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const isModerator = user && (user.role === 'moderator' || user.role === 'admin');
    const isAdmin = user && user.role === 'admin';

    // Redirect non-moderators to tickets page
    useEffect(() => {
        if (user && !isModerator) {
            navigate('/support/tickets', { replace: true });
        }
    }, [user, isModerator, navigate]);

    useEffect(() => {
        if (user && token && isModerator) {
            fetchTeamMembers();
        }
    }, [user, token, isModerator]);

    const fetchTeamMembers = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/support/team`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setTeamMembers(data.team || []);
        } catch (err) {
            console.error('Failed to fetch team members:', err);
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadge = (role) => {
        if (role === 'admin') {
            return (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold">
                    ADMIN
                </span>
            );
        }
        return (
            <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-xs font-bold">
                MODERATOR
            </span>
        );
    };

    return (
        <SupportLayout>
            <div className="p-4 md:p-8">
                <div className="max-w-[1600px] mx-auto">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <span>👥</span>
                            <span>Teams / Team Management</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">Support Team</h1>
                                <p className="text-gray-400">Manage moderators and administrators</p>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg font-semibold flex items-center gap-2 transition"
                                >
                                    <span className="text-xl">+</span>
                                    Add Team Member
                                </button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {teamMembers.map((member) => (
                                <div
                                    key={member._id}
                                    className="bg-white/5 border border-white/10 rounded-lg p-6 hover:border-cyan-500/30 transition"
                                >
                                    <div className="flex items-start gap-4">
                                        <UserAvatar user={member} size={56} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-semibold truncate">{member.username}</h3>
                                            </div>
                                            {getRoleBadge(member.role)}
                                            {member.email && (
                                                <p className="text-sm text-gray-400 mt-2 truncate">{member.email}</p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2">
                                                Joined {new Date(member.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && teamMembers.length === 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                            <p className="text-gray-400">No team members found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Team Member Modal - Coming Soon */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">Add Team Member</h2>
                        <p className="text-gray-400 mb-6">
                            This feature is coming soon. For now, team members can be added through the admin panel.
                        </p>
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </SupportLayout>
    );
}
