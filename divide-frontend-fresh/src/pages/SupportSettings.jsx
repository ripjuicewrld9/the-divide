import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SupportLayout from '../components/SupportLayout';

export default function SupportSettings() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const isModerator = user && (user.role === 'moderator' || user.role === 'admin');

    // Redirect non-moderators to tickets page
    useEffect(() => {
        if (user && !isModerator) {
            navigate('/support/tickets', { replace: true });
        }
    }, [user, isModerator, navigate]);

    return (
        <SupportLayout>
            <div className="p-4 md:p-8">
                <div className="max-w-[1200px] mx-auto">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" /></svg>
                            <span>Settings / Support Panel Configuration</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Settings</h1>
                        <p className="text-gray-400">Configure your support panel preferences</p>
                    </div>

                    <div className="space-y-6">
                        {/* Profile Section */}
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Profile</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                                    <input
                                        type="text"
                                        value={user?.username || ''}
                                        readOnly
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Role</label>
                                    <input
                                        type="text"
                                        value={user?.role?.toUpperCase() || ''}
                                        readOnly
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm capitalize"
                                    />
                                </div>
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition"
                                >
                                    Edit Full Profile
                                </button>
                            </div>
                        </div>

                        {/* Notification Preferences */}
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Notifications</h2>
                            <p className="text-sm text-gray-400 mb-4">
                                Discord notifications are currently managed through Discord settings.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">New ticket notifications</span>
                                    <span className="text-xs text-gray-500">Via Discord</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Escalation alerts</span>
                                    <span className="text-xs text-gray-500">Via Discord</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button
                                    onClick={() => navigate('/support')}
                                    className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition"
                                >
                                    <div className="font-semibold text-sm mb-1">Dashboard</div>
                                    <div className="text-xs text-gray-400">View your stats</div>
                                </button>
                                <button
                                    onClick={() => navigate('/support/tickets')}
                                    className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition"
                                >
                                    <div className="font-semibold text-sm mb-1">Tickets</div>
                                    <div className="text-xs text-gray-400">Manage support tickets</div>
                                </button>
                                <button
                                    onClick={() => navigate('/support/inbox')}
                                    className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition"
                                >
                                    <div className="font-semibold text-sm mb-1">Inbox</div>
                                    <div className="text-xs text-gray-400">Team communication</div>
                                </button>
                                <button
                                    onClick={() => navigate('/')}
                                    className="p-4 bg-white/5 hover:bg-white/10 rounded-lg text-left transition"
                                >
                                    <div className="font-semibold text-sm mb-1">Main Site</div>
                                    <div className="text-xs text-gray-400">Return to homepage</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SupportLayout>
    );
}
