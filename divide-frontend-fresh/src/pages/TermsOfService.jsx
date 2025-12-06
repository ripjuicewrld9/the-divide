import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
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
          Terms of Service
        </h1>
        
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '32px' }}>
          Last Updated: {lastUpdated}
        </p>

        <div style={{ lineHeight: '1.8', color: 'rgba(255,255,255,0.85)' }}>
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using The Divide platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
              If you do not agree to these Terms, you may not access or use the Service.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you and The Divide ("Company," "we," "us," or "our"). 
              We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>You must meet ALL of the following requirements to use The Divide:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Be at least 18 years of age (or the legal age of majority in your jurisdiction, whichever is higher)</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Not be a resident of any jurisdiction where online prediction markets or similar activities are prohibited</li>
              <li>Not be on any sanctions lists or prohibited from engaging in financial transactions</li>
              <li>Provide accurate and complete registration information</li>
            </ul>
            <p style={{ marginTop: '16px', color: '#e53935', fontWeight: '500' }}>
              IMPORTANT: Gambling and prediction markets may be illegal in your jurisdiction. It is YOUR responsibility to verify that your use of this Service complies with all applicable local, state, national, and international laws.
            </p>
          </Section>

          <Section title="3. Account Registration & Security">
            <p>To use certain features, you must create an account. You agree to:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and accept responsibility for all activities under your account</li>
              <li>Immediately notify us of any unauthorized use of your account</li>
              <li>Not create multiple accounts or share your account credentials</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              We reserve the right to suspend or terminate accounts that violate these Terms or for any reason at our sole discretion.
            </p>
          </Section>

          <Section title="4. Platform Description & Mechanics">
            <p>The Divide is a prediction market platform where users can:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Create and participate in prediction markets ("Divides")</li>
              <li>Place "short" positions betting against one side of a binary outcome</li>
              <li>Win or lose based on the minority-wins mechanic</li>
              <li>Engage with social features including likes, dislikes, and comments</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              <strong>Minority-Wins Mechanic:</strong> Unlike traditional betting, The Divide operates on a contrarian model. 
              The side with FEWER total shorts wins. This means being in the minority position results in higher payouts. 
              In the event of a tie, a provably fair random coin flip determines the outcome.
            </p>
          </Section>

          <Section title="5. Financial Terms">
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>5.1 Deposits & Withdrawals</h4>
            <p>
              Users may deposit funds using supported cryptocurrency payment methods. All deposits are subject to blockchain 
              confirmation times and network fees. Withdrawals are processed subject to verification requirements and minimum thresholds.
            </p>
            
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>5.2 House Fee</h4>
            <p>
              A 2.5% house fee is deducted from each pot upon resolution. This fee supports platform operations, maintenance, and development.
            </p>
            
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>5.3 Creator Bonus Pool</h4>
            <p>
              0.5% of each pot is allocated to a creator bonus pool for users who create popular Divides.
            </p>
            
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>5.4 VIP Rakeback</h4>
            <p>
              Eligible users may receive rakeback based on their VIP tier, calculated as a percentage of the house fee on their losing positions.
            </p>
            
            <h4 style={{ color: '#e53935', marginTop: '16px', marginBottom: '8px' }}>5.5 No Refunds</h4>
            <p>
              All positions placed are final. We do not offer refunds except in cases of proven platform error or at our sole discretion.
            </p>
          </Section>

          <Section title="6. Prohibited Activities">
            <p>You agree NOT to:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Attempt to manipulate markets through collusion, wash trading, or other deceptive practices</li>
              <li>Use bots, scripts, or automated tools to place positions</li>
              <li>Create Divides with misleading, defamatory, or harmful content</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to hack, reverse engineer, or compromise platform security</li>
              <li>Circumvent geographic restrictions or age verification</li>
              <li>Engage in money laundering or terrorist financing</li>
              <li>Use the platform if you are a politically exposed person (PEP) without disclosure</li>
            </ul>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              All content, features, and functionality of the Service (including but not limited to text, graphics, logos, 
              icons, images, audio clips, and software) are the exclusive property of The Divide and are protected by 
              international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p style={{ marginTop: '12px' }}>
              By submitting content to the platform (Divides, comments, etc.), you grant us a non-exclusive, royalty-free, 
              perpetual, worldwide license to use, reproduce, modify, and display such content.
            </p>
          </Section>

          <Section title="8. Disclaimers & Limitation of Liability">
            <p style={{ textTransform: 'uppercase', fontWeight: '600', color: '#e53935' }}>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
            </p>
            <p style={{ marginTop: '12px' }}>
              We do not warrant that the Service will be uninterrupted, secure, or error-free. We are not responsible for 
              any losses due to market movements, technical failures, or user error.
            </p>
            <p style={{ marginTop: '12px' }}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE DIVIDE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p style={{ marginTop: '12px' }}>
              OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU HAVE DEPOSITED WITH US IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
          </Section>

          <Section title="9. Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless The Divide, its officers, directors, employees, agents, and 
              affiliates from any claims, liabilities, damages, losses, and expenses (including reasonable attorney's fees) 
              arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
            </p>
          </Section>

          <Section title="10. Dispute Resolution & Arbitration">
            <p>
              Any dispute arising out of or relating to these Terms or the Service shall be resolved through binding arbitration 
              in accordance with the rules of the American Arbitration Association. You waive any right to participate in a 
              class action lawsuit or class-wide arbitration.
            </p>
            <p style={{ marginTop: '12px' }}>
              These Terms shall be governed by the laws of [Jurisdiction], without regard to conflict of law principles.
            </p>
          </Section>

          <Section title="11. Termination">
            <p>
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, 
              for any reason, including breach of these Terms. Upon termination, your right to use the Service will immediately cease.
            </p>
          </Section>

          <Section title="12. Changes to Terms">
            <p>
              We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting 
              the updated Terms on the Service and updating the "Last Updated" date. Your continued use of the Service after 
              such changes constitutes acceptance of the new Terms.
            </p>
          </Section>

          <Section title="13. Contact Information">
            <p>For questions about these Terms, please contact us at:</p>
            <p style={{ marginTop: '12px', color: '#1e88e5' }}>
              support@thedivide.io
            </p>
          </Section>

          <Section title="14. Severability">
            <p>
              If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
            </p>
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
