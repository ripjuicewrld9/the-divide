import React from 'react';
import { Link } from 'react-router-dom';

export default function CookiePolicy() {
  const lastUpdated = 'December 6, 2025';
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0b0b0b 0%, #111827 100%)',
      color: '#fff',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'rgba(17, 24, 39, 0.6)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '40px',
      }}>
        <Link 
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#e53935',
            textDecoration: 'none',
            fontSize: '14px',
            marginBottom: '24px',
          }}
        >
          ← Back to The Divide
        </Link>
        
        <h1 style={{
          fontSize: '36px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #e53935 0%, #1e88e5 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>
          Cookie Policy
        </h1>
        
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '32px' }}>
          Last Updated: {lastUpdated}
        </p>

        <div style={{ lineHeight: '1.8', color: 'rgba(255,255,255,0.85)' }}>
          <Section title="1. What Are Cookies?">
            <p>
              Cookies are small text files that are placed on your device when you visit a website. They are widely used 
              to make websites work more efficiently, provide a better user experience, and give us information about 
              how our site is being used.
            </p>
          </Section>

          <Section title="2. How We Use Cookies">
            <p>The Divide uses cookies and similar technologies for the following purposes:</p>
            
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>2.1 Essential Cookies</h4>
            <p>
              These cookies are necessary for the website to function properly. They enable core functionality such as:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>User authentication and session management</li>
              <li>Security features and fraud prevention</li>
              <li>Remembering your login status</li>
              <li>Processing transactions</li>
            </ul>
            <p style={{ marginTop: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
              Without these cookies, the website cannot function properly. They cannot be disabled.
            </p>

            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>2.2 Functional Cookies</h4>
            <p>
              These cookies allow us to remember choices you make and provide enhanced features:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>Language preferences</li>
              <li>Display settings (dark/light mode)</li>
              <li>User interface customizations</li>
              <li>Remembering your preferences across sessions</li>
            </ul>

            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>2.3 Analytics Cookies</h4>
            <p>
              We use analytics cookies to understand how visitors interact with our website:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>Pages visited and time spent</li>
              <li>How users navigate through the site</li>
              <li>Error messages encountered</li>
              <li>General usage patterns</li>
            </ul>
            <p style={{ marginTop: '8px' }}>
              This information helps us improve our website and user experience. Analytics data is aggregated and anonymized.
            </p>

            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>2.4 Marketing Cookies</h4>
            <p>
              We may use marketing cookies to:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>Track the effectiveness of our marketing campaigns</li>
              <li>Deliver relevant advertisements</li>
              <li>Limit the number of times you see an ad</li>
              <li>Measure ad performance</li>
            </ul>
          </Section>

          <Section title="3. Cookies We Use">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: '#e53935' }}>Cookie Name</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: '#e53935' }}>Purpose</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: '#e53935' }}>Duration</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: '#e53935' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '12px 8px' }}>token</td>
                    <td style={{ padding: '12px 8px' }}>Authentication JWT token</td>
                    <td style={{ padding: '12px 8px' }}>Session</td>
                    <td style={{ padding: '12px 8px' }}>Essential</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '12px 8px' }}>socket.io</td>
                    <td style={{ padding: '12px 8px' }}>Real-time connection management</td>
                    <td style={{ padding: '12px 8px' }}>Session</td>
                    <td style={{ padding: '12px 8px' }}>Essential</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '12px 8px' }}>preferences</td>
                    <td style={{ padding: '12px 8px' }}>User interface preferences</td>
                    <td style={{ padding: '12px 8px' }}>1 year</td>
                    <td style={{ padding: '12px 8px' }}>Functional</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="4. Third-Party Cookies">
            <p>
              Some cookies on our website are placed by third-party services:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li><strong>Google Analytics:</strong> Website usage analytics</li>
              <li><strong>Cloudflare:</strong> Security and performance</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              These third parties have their own privacy policies governing how they use information collected through cookies.
            </p>
          </Section>

          <Section title="5. Managing Cookies">
            <p>
              You can control and manage cookies in various ways:
            </p>
            
            <h4 style={{ color: '#1e88e5', marginTop: '16px', marginBottom: '8px' }}>Browser Settings</h4>
            <p>
              Most web browsers allow you to manage cookies through their settings. You can:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>View cookies stored on your device</li>
              <li>Delete all or specific cookies</li>
              <li>Block third-party cookies</li>
              <li>Block all cookies</li>
              <li>Clear cookies when you close your browser</li>
            </ul>
            
            <p style={{ marginTop: '16px', color: '#e53935' }}>
              Note: Blocking essential cookies will prevent you from using the website effectively. You may not be 
              able to log in or use core features.
            </p>
          </Section>

          <Section title="6. Local Storage">
            <p>
              In addition to cookies, we use browser local storage to:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Store authentication tokens</li>
              <li>Cache user preferences</li>
              <li>Improve performance by reducing server requests</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              Local storage data is managed similarly to cookies through your browser settings.
            </p>
          </Section>

          <Section title="7. Updates to This Policy">
            <p>
              We may update this Cookie Policy from time to time. Changes will be posted on this page with an 
              updated "Last Updated" date. We encourage you to review this policy periodically.
            </p>
          </Section>

          <Section title="8. Contact Us">
            <p>For questions about our use of cookies:</p>
            <div style={{ marginTop: '12px' }}>
              <Link to="/support" style={{ color: '#1e88e5', textDecoration: 'underline' }}>
                Submit a Support Ticket
              </Link>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#fff',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
