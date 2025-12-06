import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
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
          Privacy Policy
        </h1>
        
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '32px' }}>
          Last Updated: {lastUpdated}
        </p>

        <div style={{ lineHeight: '1.8', color: 'rgba(255,255,255,0.85)' }}>
          <Section title="1. Introduction">
            <p>
              The Divide ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how 
              we collect, use, disclose, and safeguard your information when you use our prediction market platform (the "Service").
            </p>
            <p style={{ marginTop: '12px' }}>
              By using the Service, you consent to the data practices described in this policy. If you do not agree with 
              our policies and practices, please do not use the Service.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>2.1 Information You Provide</h4>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li><strong>Account Information:</strong> Email address, username, password (hashed)</li>
              <li><strong>Profile Information:</strong> Avatar, display name, bio</li>
              <li><strong>Financial Information:</strong> Cryptocurrency wallet addresses, transaction history</li>
              <li><strong>Communications:</strong> Support tickets, chat messages, comments</li>
              <li><strong>User-Generated Content:</strong> Divides you create, comments, social posts</li>
            </ul>

            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>2.2 Information Collected Automatically</h4>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent, clicks, interactions</li>
              <li><strong>Cookies & Tracking:</strong> Session cookies, authentication tokens, analytics data</li>
              <li><strong>Location Data:</strong> Approximate location based on IP address</li>
            </ul>

            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>2.3 Information from Third Parties</h4>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li><strong>OAuth Providers:</strong> If you log in via Google or Discord, we receive basic profile information</li>
              <li><strong>Payment Processors:</strong> Transaction confirmations from cryptocurrency networks</li>
              <li><strong>Analytics Services:</strong> Aggregated usage statistics</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use the collected information for:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Providing, maintaining, and improving the Service</li>
              <li>Processing transactions and managing your account</li>
              <li>Sending transactional notifications (position results, withdrawals, etc.)</li>
              <li>Communicating about updates, security alerts, and support</li>
              <li>Preventing fraud, detecting abuse, and ensuring platform integrity</li>
              <li>Complying with legal obligations and responding to legal requests</li>
              <li>Analyzing usage patterns to improve user experience</li>
              <li>Personalizing content and recommendations</li>
              <li>Enforcing our Terms of Service</li>
            </ul>
          </Section>

          <Section title="4. Information Sharing & Disclosure">
            <p>We may share your information in the following circumstances:</p>
            
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>4.1 With Your Consent</h4>
            <p>We may share information when you explicitly consent to such sharing.</p>
            
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>4.2 Service Providers</h4>
            <p>
              We engage third-party companies to perform services on our behalf (hosting, analytics, payment processing). 
              These providers have access to your information only to perform specific tasks and are obligated to protect it.
            </p>
            
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>4.3 Legal Requirements</h4>
            <p>We may disclose information if required by law, legal process, or government request.</p>
            
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>4.4 Protection of Rights</h4>
            <p>
              We may disclose information when we believe it's necessary to investigate, prevent, or take action regarding 
              illegal activities, suspected fraud, threats to safety, or violations of our Terms.
            </p>
            
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>4.5 Business Transfers</h4>
            <p>
              In connection with a merger, acquisition, or sale of assets, your information may be transferred. 
              We will provide notice before your information becomes subject to a different privacy policy.
            </p>

            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>4.6 Public Information</h4>
            <p>
              Certain information is publicly visible, including your username, avatar, public activity (positions placed, 
              Divides created), and content you post. Think carefully before sharing information publicly.
            </p>
          </Section>

          <Section title="5. Data Security">
            <p>We implement industry-standard security measures including:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Encryption of data in transit (TLS/SSL)</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>JWT-based authentication with secure tokens</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and principle of least privilege</li>
              <li>Database encryption at rest</li>
            </ul>
            <p style={{ marginTop: '12px', color: '#e53935' }}>
              However, no method of transmission or storage is 100% secure. We cannot guarantee absolute security, 
              and you use the Service at your own risk.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <p>We retain your information for as long as:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Your account is active</li>
              <li>Necessary to provide the Service</li>
              <li>Required by law (financial records, regulatory requirements)</li>
              <li>Needed to resolve disputes or enforce agreements</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              Upon account deletion request, we will delete or anonymize your personal information within 90 days, 
              except for data required for legal or regulatory compliance.
            </p>
          </Section>

          <Section title="7. Your Rights & Choices">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
              <li><strong>Opt-Out:</strong> Opt out of marketing communications</li>
              <li><strong>Restrict Processing:</strong> Request limitation on how we use your data</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              To exercise these rights, contact us at privacy@thedivide.io
            </p>
          </Section>

          <Section title="8. Cookies & Tracking Technologies">
            <p>We use cookies and similar technologies for:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li><strong>Essential Cookies:</strong> Required for authentication and core functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the Service</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              You can control cookies through your browser settings. Disabling essential cookies may affect functionality.
            </p>
          </Section>

          <Section title="9. International Data Transfers">
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. 
              These countries may have different data protection laws. We implement appropriate safeguards, including 
              Standard Contractual Clauses, where required.
            </p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>
              The Service is not intended for individuals under 18 years of age. We do not knowingly collect personal 
              information from children. If we discover that a child has provided us with personal information, we will 
              delete it immediately. If you believe we have collected information from a child, please contact us.
            </p>
          </Section>

          <Section title="11. California Privacy Rights (CCPA)">
            <p>If you are a California resident, you have additional rights including:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Right to know what personal information is collected, used, and shared</li>
              <li>Right to delete personal information (with exceptions)</li>
              <li>Right to opt-out of the sale of personal information (we do not sell personal information)</li>
              <li>Right to non-discrimination for exercising your privacy rights</li>
            </ul>
          </Section>

          <Section title="12. European Privacy Rights (GDPR)">
            <p>If you are in the European Economic Area (EEA), you have rights under GDPR including:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Right to access, rectify, erase, and port your data</li>
              <li>Right to restrict or object to processing</li>
              <li>Right to withdraw consent at any time</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              Our legal basis for processing includes: contract performance, legitimate interests, consent, and legal obligations.
            </p>
          </Section>

          <Section title="13. Changes to This Policy">
            <p>
              We may update this Privacy Policy periodically. We will notify you of material changes by posting the new 
              policy on this page and updating the "Last Updated" date. We encourage you to review this policy regularly.
            </p>
          </Section>

          <Section title="14. Contact Us">
            <p>For questions, concerns, or requests regarding this Privacy Policy, contact us at:</p>
            <div style={{ marginTop: '12px' }}>
              <p style={{ color: '#1e88e5' }}>Email: privacy@thedivide.io</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                Data Protection Officer: dpo@thedivide.io
              </p>
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
