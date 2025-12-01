import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SupportLayout from '../components/SupportLayout';

export default function SupportAnalytics() {
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
                <div className="max-w-[1600px] mx-auto">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <span>📈</span>
                            <span>Analytics / Performance Insights</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
                        <p className="text-gray-400">Track performance metrics and trends</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="mb-6">
                                <svg className="w-24 h-24 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
                            <p className="text-gray-400 mb-6">
                                Advanced analytics features are currently under development. This section will provide:
                            </p>
                            <ul className="text-left text-gray-400 space-y-2 mb-6">
                                <li className="flex items-center gap-2">
                                    <span className="text-cyan-400">•</span>
                                    Detailed performance charts and graphs
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-cyan-400">•</span>
                                    Response time trends
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-cyan-400">•</span>
                                    Customer satisfaction metrics
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-cyan-400">•</span>
                                    Team performance comparisons
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-cyan-400">•</span>
                                    Ticket volume forecasting
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
