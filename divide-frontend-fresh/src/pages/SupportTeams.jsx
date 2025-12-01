import React from 'react';
import SupportLayout from '../components/SupportLayout';

export default function SupportTeams() {
    return (
        <SupportLayout>
            <div className="p-4 md:p-8">
                <div className="max-w-[1600px] mx-auto">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <span>👥</span>
                            <span>Teams / Team Management</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Teams</h1>
                        <p className="text-gray-400">Manage your support team members and permissions</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="mb-6">
                                <svg className="w-24 h-24 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
                            <p className="text-gray-400 mb-6">
                                Team management features are currently under development. This section will allow you to:
                            </p>
                            <ul className="text-left text-gray-400 space-y-2 mb-6">
                                <li className="flex items-center gap-2">
                                    <span className="text-cyan-400">•</span>
                                    View all moderators and admins
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-cyan-400">•</span>
                                    Assign roles and permissions
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-cyan-400">•</span>
                                    Track team member activity
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-cyan-400">•</span>
                                    Manage team availability
                                </li>
                            </ul>
                            <div className="text-sm text-gray-500">
                                Check back soon for updates!
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SupportLayout>
    );
}
