import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function TeamManagement({ isOpen, onClose }) {
    const { user } = useAuth();
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [selectedRole, setSelectedRole] = useState('moderator');

    const isAdmin = user?.role === 'admin';

    // Fetch team members
    const fetchTeam = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/team`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.team) {
                setTeam(data.team);
            }
        } catch (err) {
            console.error('Failed to fetch team:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchTeam();
        }
    }, [isOpen]);

    // Search users for adding to team
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const debounce = setTimeout(async () => {
            setSearching(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setSearchResults(data.users || []);
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleAddMember = async (username) => {
        setMessage({ type: '', text: '' });
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/team`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, role: selectedRole })
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                setSearchQuery('');
                setSearchResults([]);
                fetchTeam();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to add team member' });
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/team/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                fetchTeam();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update role' });
        }
    };

    const handleRemoveMember = async (userId, username) => {
        if (!confirm(`Remove ${username} from the team?`)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/team/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                fetchTeam();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to remove team member' });
        }
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, rgba(20,20,24,0.98) 0%, rgba(10,10,12,0.99) 100%)',
                    padding: '32px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    width: '100%',
                    maxWidth: '600px',
                    maxHeight: '85vh',
                    overflow: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', margin: 0 }}>
                        👥 Team Management
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '18px',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Message */}
                {message.text && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        background: message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        color: message.type === 'success' ? '#22c55e' : '#ef4444',
                        fontSize: '14px',
                    }}>
                        {message.text}
                    </div>
                )}

                {/* Add Member Section (Admin only) */}
                {isAdmin && (
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#3B82F6', marginBottom: '12px' }}>
                            ➕ Add Team Member
                        </h3>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search username..."
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                }}
                            />
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                style={{
                                    padding: '10px 12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {searchResults.map((u) => (
                                    <div
                                        key={u._id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px',
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <UserAvatar user={u} size={32} />
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{u.username}</div>
                                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Level {u.level || 1}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddMember(u.username)}
                                            style={{
                                                padding: '6px 12px',
                                                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: '#fff',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Add as {selectedRole}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searching && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Searching...</div>}
                    </div>
                )}

                {/* Current Team */}
                <div>
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '12px',
                    }}>
                        Current Team ({team.length})
                    </h3>

                    {loading ? (
                        <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px' }}>Loading...</div>
                    ) : team.length === 0 ? (
                        <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px' }}>No team members found</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {team.map((member) => (
                                <div
                                    key={member._id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px',
                                        background: member.role === 'admin'
                                            ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)'
                                            : 'rgba(255,255,255,0.03)',
                                        borderRadius: '10px',
                                        border: member.role === 'admin'
                                            ? '1px solid rgba(255, 215, 0, 0.3)'
                                            : '1px solid rgba(255,255,255,0.05)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <UserAvatar user={member} size={40} />
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{member.username}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: '600',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    textTransform: 'uppercase',
                                                    background: member.role === 'admin' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                                                    color: member.role === 'admin' ? '#FFD700' : '#8B5CF6',
                                                }}>
                                                    {member.role}
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                                    Level {member.level || 1}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions (Admin only, can't modify self) */}
                                    {isAdmin && member._id !== user?.id && (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleUpdateRole(member._id, e.target.value)}
                                                style={{
                                                    padding: '6px 8px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.15)',
                                                    borderRadius: '6px',
                                                    color: '#fff',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <option value="moderator">Moderator</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <button
                                                onClick={() => handleRemoveMember(member._id, member.username)}
                                                style={{
                                                    padding: '6px 10px',
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: '6px',
                                                    color: '#ef4444',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
