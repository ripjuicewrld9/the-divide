import React from 'react';
import { Link } from 'react-router-dom';

export default function Disclaimer() {
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
          Disclaimer
        </h1>
        
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '32px' }}>
          Last Updated: {lastUpdated}
        </p>

        {/* Warning Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(229, 57, 53, 0.2) 0%, rgba(229, 57, 53, 0.1) 100%)',
          border: '1px solid rgba(229, 57, 53, 0.4)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px',
        }}>
          <p style={{ margin: 0, color: '#fff', fontWeight: '600', textTransform: 'uppercase' }}>
            ⚠️ Risk Warning: Prediction markets involve significant risk. You may lose all funds you deposit.
          </p>
        </div>

        <div style={{ lineHeight: '1.8', color: 'rgba(255,255,255,0.85)' }}>
          <Section title="General Disclaimer">
            <p>
              The information and services provided on The Divide platform are for entertainment and informational 
              purposes only. The Divide does not provide financial, investment, legal, or tax advice.
            </p>
            <p style={{ marginTop: '12px' }}>
              By using this platform, you acknowledge that you understand the risks involved and that you are solely 
              responsible for your decisions and any resulting outcomes.
            </p>
          </Section>

          <Section title="No Financial Advice">
            <p>
              Nothing on this platform constitutes:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Financial advice or recommendations</li>
              <li>Investment advice or recommendations</li>
              <li>Trading advice or recommendations</li>
              <li>Legal or tax advice</li>
              <li>Advice of any kind that should replace consultation with qualified professionals</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              You should always conduct your own research and consult with qualified financial, legal, and tax 
              professionals before making any financial decisions.
            </p>
          </Section>

          <Section title="Risk Disclosure">
            <p style={{ color: '#e53935', fontWeight: '600' }}>
              IMPORTANT: You can lose all the money you deposit on this platform.
            </p>
            <p style={{ marginTop: '12px' }}>
              Prediction markets carry inherent risks including but not limited to:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li><strong>Total Loss:</strong> You may lose 100% of your position in any market</li>
              <li><strong>Volatility:</strong> Market outcomes can be unpredictable</li>
              <li><strong>Liquidity Risk:</strong> You cannot exit a position once placed</li>
              <li><strong>Technical Risk:</strong> Platform outages or errors may occur</li>
              <li><strong>Smart Contract Risk:</strong> Blockchain-based systems carry inherent risks</li>
              <li><strong>Regulatory Risk:</strong> Laws may change affecting platform operations</li>
              <li><strong>Counterparty Risk:</strong> The platform may face operational challenges</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              Only participate with funds you can afford to lose completely.
            </p>
          </Section>

          <Section title="Platform Mechanics">
            <p>
              The Divide operates on a minority-wins mechanic. Key points:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>The side with fewer total shorts wins</li>
              <li>Outcomes are determined after the market closes</li>
              <li>A 2.5% house fee is deducted from all pots</li>
              <li>In case of a tie, a provably fair coin flip determines the winner</li>
              <li>Past performance does not predict future results</li>
            </ul>
          </Section>

          <Section title="No Guarantees">
            <p>
              We make no guarantees regarding:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Accuracy of information on the platform</li>
              <li>Continuous, uninterrupted service</li>
              <li>Profitability of any position or strategy</li>
              <li>Security of the platform (though we strive for best practices)</li>
              <li>Availability of the service in your jurisdiction</li>
            </ul>
          </Section>

          <Section title="Legal Compliance">
            <p style={{ color: '#e53935', fontWeight: '500' }}>
              It is YOUR responsibility to ensure that your use of The Divide complies with all applicable laws 
              in your jurisdiction.
            </p>
            <p style={{ marginTop: '12px' }}>
              Online gambling, prediction markets, and similar activities may be:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Illegal in your jurisdiction</li>
              <li>Restricted to certain ages</li>
              <li>Subject to licensing requirements</li>
              <li>Taxable as gambling winnings</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              The Divide does not provide legal advice and cannot determine whether your use of the platform 
              is legal in your location.
            </p>
          </Section>

          <Section title="Third-Party Content">
            <p>
              The platform may contain:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>User-generated content (Divides, comments)</li>
              <li>Links to external websites</li>
              <li>Third-party services and integrations</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              We are not responsible for the accuracy, legality, or appropriateness of third-party content. 
              User-generated content represents the views of its authors, not The Divide.
            </p>
          </Section>

          <Section title="Limitation of Liability">
            <p style={{ textTransform: 'uppercase', fontWeight: '600', color: '#e53935' }}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE DIVIDE AND ITS AFFILIATES SHALL NOT BE LIABLE FOR:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Any losses incurred through use of the platform</li>
              <li>Technical failures or service interruptions</li>
              <li>Unauthorized access to your account</li>
              <li>Errors in market resolution</li>
              <li>Changes to platform rules or operations</li>
              <li>Any indirect, incidental, or consequential damages</li>
            </ul>
          </Section>

          <Section title="Changes to Disclaimer">
            <p>
              We reserve the right to modify this disclaimer at any time. Changes are effective immediately upon 
              posting. Your continued use of the platform constitutes acceptance of any changes.
            </p>
          </Section>

          <Section title="Contact">
            <p>For questions about this disclaimer:</p>
            <div style={{ marginTop: '12px' }}>
              <p style={{ color: '#1e88e5' }}>Email: legal@thedivide.io</p>
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
