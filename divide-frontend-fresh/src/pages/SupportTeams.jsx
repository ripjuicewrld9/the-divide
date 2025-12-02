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
    const [newUsername, setNewUsername] = useState('');
    const [newRole, setNewRole] = useState('moderator');
    const [addError, setAddError] = useState('');
    const [addLoading, setAddLoading] = useState(false);

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

    const handleAddTeamMember = async (e) => {
        e.preventDefault();
        setAddError('');
        
        if (!newUsername.trim()) {
            setAddError('Please enter a username');
            return;
        }
        
        setAddLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/support/team/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username: newUsername.trim(), role: newRole })
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                setAddError(data.error || 'Failed to add team member');
                return;
            }
            
            // Add new member to list
            setTeamMembers(prev => [...prev, data.user]);
            setShowAddModal(false);
            setNewUsername('');
            setNewRole('moderator');
            setAddError('');
        } catch (err) {
            setAddError('Network error. Please try again.');
            console.error('Failed to add team member:', err);
        } finally {
            setAddLoading(false);
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

            {/* Add Team Member Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">Add Team Member</h2>
                        <form onSubmit={handleAddTeamMember}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-gray-300">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    placeholder="Enter username"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none"
                                    disabled={addLoading}
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-gray-300">
                                    Role
                                </label>
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-cyan-500 outline-none"
                                    disabled={addLoading}
                                >
                                    <option value="moderator">Moderator</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            
                            {addError && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                    {addError}
                                </div>
                            )}
                            
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setNewUsername('');
                                        setNewRole('moderator');
                                        setAddError('');
                                    }}
                                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition"
                                    disabled={addLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={addLoading || !newUsername.trim()}
                                >
                                    {addLoading ? 'Adding...' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </SupportLayout>
    );
}
