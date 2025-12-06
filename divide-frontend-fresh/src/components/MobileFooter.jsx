import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VipModal from './VipModal';
import HowItWorksModal from './HowItWorksModal';

export default function MobileFooter() {
    const { user } = useAuth();
    const [showVipModal, setShowVipModal] = useState(false);
    const [showHowItWorks, setShowHowItWorks] = useState(false);
    const currentYear = new Date().getFullYear();

    return (
        <>
            <footer style={{
                background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.9) 0%, rgba(0, 0, 0, 0.98) 100%)',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '24px 16px 100px', // Extra bottom padding for bottom nav
                marginTop: 'auto',
            }}>
                {/* Quick Action Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '24px',
                }}>
                    {/* How it Works Button */}
                    <button
                        onClick={() => setShowHowItWorks(true)}
                        style={{
                            flex: 1,
                            padding: '14px 16px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, rgba(30, 136, 229, 0.2) 0%, rgba(30, 136, 229, 0.1) 100%)',
                            color: '#1e88e5',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        How it Works
                    </button>

                    {/* VIP Button */}
                    <button
                        onClick={() => setShowVipModal(true)}
                        style={{
                            flex: 1,
                            padding: '14px 16px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.25) 0%, rgba(255, 152, 0, 0.15) 100%)',
                            color: '#ffc107',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        VIP Program
                    </button>
                </div>

                {/* Legal Links Grid */}
                <div style={{
                    marginBottom: '20px',
                }}>
                    <h4 style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'rgba(255, 255, 255, 0.5)',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        Legal & Resources
                    </h4>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px',
                    }}>
                        <FooterLink to="/terms">Terms of Service</FooterLink>
                        <FooterLink to="/privacy">Privacy Policy</FooterLink>
                        <FooterLink to="/cookies">Cookie Policy</FooterLink>
                        <FooterLink to="/disclaimer">Disclaimer</FooterLink>
                        <FooterLink to="/aml">AML Policy</FooterLink>
                        <FooterLink to="/responsible-gaming">Responsible Gaming</FooterLink>
                    </div>
                </div>

                {/* Social Links */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '20px',
                }}>
                    <a
                        href="https://discord.gg/thedividegg"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '10px',
                            background: 'rgba(88, 101, 242, 0.15)',
                            color: '#5865F2',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                        Discord
                    </a>
                    <a
                        href="https://x.com/thedivideGG"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '10px',
                            background: 'rgba(29, 161, 242, 0.15)',
                            color: '#1DA1F2',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        X
                    </a>
                    <Link
                        to="/support"
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '10px',
                            background: 'rgba(229, 57, 53, 0.15)',
                            color: '#e53935',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                        </svg>
                        Help
                    </Link>
                </div>

                {/* Age Restriction + Copyright */}
                <div style={{
                    background: 'rgba(229, 57, 53, 0.1)',
                    border: '1px solid rgba(229, 57, 53, 0.2)',
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#e53935',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '11px',
                        color: '#fff',
                        flexShrink: 0,
                    }}>
                        18+
                    </div>
                    <p style={{
                        margin: 0,
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        lineHeight: '1.4',
                    }}>
                        Adults only. Play responsibly within your means.
                    </p>
                </div>

                {/* Copyright */}
                <div style={{
                    textAlign: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                    <p style={{
                        margin: 0,
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.3)',
                    }}>
                        © {currentYear} The Divide. All rights reserved.
                    </p>
                </div>
            </footer>

            {/* Modals */}
            <VipModal
                isOpen={showVipModal}
                onClose={() => setShowVipModal(false)}
                currentTier={user?.vipTier || 'none'}
                wagerLast30Days={user?.wagerLast30Days || 0}
            />
            <HowItWorksModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
        </>
    );
}

function FooterLink({ to, children }) {
    return (
        <Link
            to={to}
            style={{
                color: 'rgba(255, 255, 255, 0.55)',
                textDecoration: 'none',
                fontSize: '12px',
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.03)',
                transition: 'all 0.2s',
                textAlign: 'center',
            }}
        >
            {children}
        </Link>
    );
}
