import React from 'react';
import { Link } from 'react-router-dom';

export default function AMLPolicy() {
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
          Anti-Money Laundering Policy
        </h1>
        
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '32px' }}>
          Last Updated: {lastUpdated}
        </p>

        <div style={{ lineHeight: '1.8', color: 'rgba(255,255,255,0.85)' }}>
          <Section title="1. Introduction & Purpose">
            <p>
              The Divide is committed to the highest standards of Anti-Money Laundering (AML) and Counter-Terrorist 
              Financing (CTF) compliance. This policy outlines our procedures to detect, prevent, and report money 
              laundering and terrorist financing activities.
            </p>
            <p style={{ marginTop: '12px' }}>
              We are committed to complying with all applicable laws and regulations, including but not limited to the 
              Bank Secrecy Act (BSA), USA PATRIOT Act, Financial Crimes Enforcement Network (FinCEN) regulations, 
              and international AML/CTF standards.
            </p>
          </Section>

          <Section title="2. Risk-Based Approach">
            <p>
              We employ a risk-based approach to AML/CTF compliance, focusing resources on areas of highest risk. 
              This includes:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Customer risk assessment and profiling</li>
              <li>Transaction monitoring based on risk levels</li>
              <li>Enhanced due diligence for high-risk customers</li>
              <li>Regular risk assessments and policy updates</li>
            </ul>
          </Section>

          <Section title="3. Know Your Customer (KYC)">
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>3.1 Customer Identification</h4>
            <p>We collect and verify the following information from all users:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Full legal name</li>
              <li>Date of birth</li>
              <li>Email address</li>
              <li>Cryptocurrency wallet addresses</li>
            </ul>

            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>3.2 Enhanced Due Diligence</h4>
            <p>For high-risk customers or transactions above certain thresholds, we may require:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Government-issued photo ID</li>
              <li>Proof of address (utility bill, bank statement)</li>
              <li>Source of funds documentation</li>
              <li>Video verification call</li>
            </ul>

            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>3.3 Ongoing Monitoring</h4>
            <p>
              We continuously monitor customer activity and update risk profiles based on transaction patterns, 
              behavior changes, and new information.
            </p>
          </Section>

          <Section title="4. Transaction Monitoring">
            <p>Our automated monitoring systems detect:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Unusually large transactions</li>
              <li>Rapid movement of funds (quick deposits followed by withdrawals)</li>
              <li>Structuring (multiple transactions designed to avoid reporting thresholds)</li>
              <li>Transactions with high-risk jurisdictions</li>
              <li>Patterns inconsistent with stated customer profile</li>
              <li>Connections to known illicit addresses</li>
            </ul>
          </Section>

          <Section title="5. Suspicious Activity Reporting">
            <p>
              We are committed to filing Suspicious Activity Reports (SARs) with appropriate authorities when we 
              detect or suspect:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Money laundering or attempted money laundering</li>
              <li>Terrorist financing</li>
              <li>Fraud or other financial crimes</li>
              <li>Transactions involving proceeds of criminal activity</li>
              <li>Violations of sanctions or embargoes</li>
            </ul>
            <p style={{ marginTop: '16px', color: '#e53935' }}>
              We will not inform customers if a SAR has been filed regarding their activity.
            </p>
          </Section>

          <Section title="6. Sanctions Compliance">
            <p>
              We screen all customers and transactions against relevant sanctions lists including:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>OFAC Specially Designated Nationals (SDN) List</li>
              <li>EU Consolidated List</li>
              <li>UN Security Council Consolidated List</li>
              <li>Other applicable national and international sanctions lists</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              We will immediately freeze accounts and block transactions involving sanctioned individuals or entities.
            </p>
          </Section>

          <Section title="7. Cryptocurrency-Specific Controls">
            <p>Given the nature of cryptocurrency transactions, we implement additional controls:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Blockchain analysis to trace transaction origins</li>
              <li>Screening against known illicit wallet addresses</li>
              <li>Monitoring for mixing services and privacy coins</li>
              <li>Address clustering analysis</li>
              <li>Transaction velocity monitoring</li>
            </ul>
          </Section>

          <Section title="8. Politically Exposed Persons (PEPs)">
            <p>
              We conduct enhanced due diligence on Politically Exposed Persons, their family members, and close associates. 
              This includes:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Senior approval for account opening</li>
              <li>Enhanced source of wealth/funds verification</li>
              <li>Ongoing enhanced monitoring</li>
              <li>Annual review of relationship</li>
            </ul>
          </Section>

          <Section title="9. Record Keeping">
            <p>We maintain records for the legally required periods, typically including:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Customer identification and verification documents</li>
              <li>Transaction records and blockchain data</li>
              <li>Risk assessments and due diligence files</li>
              <li>Internal communications regarding suspicious activity</li>
              <li>SAR filings and supporting documentation</li>
              <li>Training records</li>
            </ul>
          </Section>

          <Section title="10. Employee Training">
            <p>All employees receive:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Initial AML/CTF training upon hiring</li>
              <li>Annual refresher training</li>
              <li>Role-specific training for compliance staff</li>
              <li>Updates on new regulations and typologies</li>
            </ul>
          </Section>

          <Section title="11. Internal Controls & Governance">
            <p>Our AML program includes:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Designated AML Compliance Officer</li>
              <li>Independent testing and audits</li>
              <li>Board and senior management oversight</li>
              <li>Regular policy review and updates</li>
              <li>Whistleblower protection and reporting channels</li>
            </ul>
          </Section>

          <Section title="12. Cooperation with Authorities">
            <p>
              We cooperate fully with law enforcement and regulatory authorities in their investigations. 
              This includes responding to subpoenas, production orders, and information requests in a timely manner.
            </p>
          </Section>

          <Section title="13. User Obligations">
            <p>By using The Divide, you agree to:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Provide accurate and complete information</li>
              <li>Update your information when it changes</li>
              <li>Not use the platform for money laundering or illicit purposes</li>
              <li>Cooperate with verification requests</li>
              <li>Report suspicious activity to our support team</li>
            </ul>
          </Section>

          <Section title="14. Contact">
            <p>To report suspicious activity or for compliance inquiries:</p>
            <div style={{ marginTop: '12px' }}>
              <Link to="/support" style={{ color: '#1e88e5', textDecoration: 'underline' }}>
                Submit a Support Ticket
              </Link>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                Select "Compliance" as the ticket category
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
