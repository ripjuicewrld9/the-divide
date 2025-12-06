import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer style={{
      background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.8) 0%, rgba(0, 0, 0, 0.95) 100%)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '48px 24px 24px',
      marginTop: 'auto',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* Main Footer Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px',
          marginBottom: '40px',
        }}>
          {/* Brand */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '16px',
                color: '#fff',
              }}>
                D
              </div>
              <span style={{
                fontSize: '18px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                The Divide
              </span>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.5)',
              lineHeight: '1.6',
              maxWidth: '280px',
            }}>
              A contrarian prediction market where the minority wins. 
              Short the crowd, take bold positions, and profit from being different.
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#fff',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Legal
            </h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <FooterLink to="/terms">Terms of Service</FooterLink>
              <FooterLink to="/privacy">Privacy Policy</FooterLink>
              <FooterLink to="/cookies">Cookie Policy</FooterLink>
              <FooterLink to="/disclaimer">Disclaimer</FooterLink>
              <FooterLink to="/aml">AML Policy</FooterLink>
            </nav>
          </div>

          {/* Resources */}
          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#fff',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Resources
            </h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <FooterLink to="/responsible-gaming">Responsible Gaming</FooterLink>
              <FooterLink to="/support">Support</FooterLink>
              <FooterLink to="/feed">Community Feed</FooterLink>
            </nav>
          </div>

          {/* Connect */}
          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#fff',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Connect
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a 
                href="https://discord.gg/thedivide" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  transition: 'color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#5865F2'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Discord
              </a>
              <a 
                href="https://twitter.com/thedivide" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  transition: 'color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#1DA1F2'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X (Twitter)
              </a>
              <a 
                href="mailto:support@thedivide.io"
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  transition: 'color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#e53935'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z"/>
                  <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z"/>
                </svg>
                support@thedivide.io
              </a>
            </div>
          </div>
        </div>

        {/* Age Restriction Notice */}
        <div style={{
          background: 'rgba(229, 57, 53, 0.1)',
          border: '1px solid rgba(229, 57, 53, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#e53935',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '14px',
            color: '#fff',
            flexShrink: 0,
          }}>
            18+
          </div>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.7)',
            flex: 1,
            minWidth: '200px',
          }}>
            This platform is for adults only. Gambling can be addictive. Please play responsibly.
            If you have a gambling problem, visit{' '}
            <Link to="/responsible-gaming" style={{ color: '#e53935', textDecoration: 'underline' }}>
              our responsible gaming page
            </Link>
            {' '}for help.
          </p>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.4)',
          }}>
            © {currentYear} The Divide. All rights reserved.
          </p>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.3)',
          }}>
            Built with 🎯 for contrarians everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{
        color: 'rgba(255, 255, 255, 0.6)',
        textDecoration: 'none',
        fontSize: '14px',
        transition: 'color 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.color = '#e53935'}
      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
    >
      {children}
    </Link>
  );
}
