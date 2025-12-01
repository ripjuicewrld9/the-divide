import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SupportLayout from '../components/SupportLayout';

export default function SupportSettings() {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <SupportLayout>
            <div className="p-4 md:p-8">
                <div className="max-w-[1200px] mx-auto">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <span>⚙️</span>
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
