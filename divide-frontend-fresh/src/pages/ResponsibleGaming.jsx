import React from 'react';
import { Link } from 'react-router-dom';

export default function ResponsibleGaming() {
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
          Responsible Play
        </h1>
        
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '32px' }}>
          Last Updated: {lastUpdated}
        </p>

        {/* Notice Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 136, 229, 0.2) 0%, rgba(30, 136, 229, 0.1) 100%)',
          border: '1px solid rgba(30, 136, 229, 0.4)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1e88e5" style={{ width: '24px', height: '24px' }}>
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
            <h3 style={{ margin: 0, color: '#1e88e5', fontWeight: '600' }}>Skill-Based Social Strategy Game</h3>
          </div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', lineHeight: '1.7' }}>
            The Divide is a skill-based social strategy game. Success requires research, psychological insight, and strategic decision-making. 
            However, we encourage all users to play responsibly and within their means.
          </p>
        </div>

        <div style={{ lineHeight: '1.8', color: 'rgba(255,255,255,0.85)' }}>
          <Section title="Our Commitment">
            <p>
              At The Divide, we are committed to promoting responsible play practices. Our platform rewards users who 
              apply skill, research, and strategic thinking to make informed predictions about real-world outcomes.
            </p>
            <p style={{ marginTop: '12px' }}>
              We believe entertainment should never come at the cost of your financial stability, relationships, 
              or mental health. Our goal is to provide tools and information to help you maintain control.
            </p>
          </Section>

          <Section title="Why The Divide is Skill-Based">
            <p>Unlike games of pure chance, The Divide rewards:</p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li><strong>Research & Analysis:</strong> Understanding the topics, trends, and public sentiment</li>
              <li><strong>Strategic Positioning:</strong> Identifying contrarian opportunities in the minority-wins mechanic</li>
              <li><strong>Market Timing:</strong> Knowing when to enter positions based on market dynamics</li>
              <li><strong>Risk Management:</strong> Allocating capital wisely across multiple predictions</li>
              <li><strong>Information Gathering:</strong> Staying informed about relevant news and developments</li>
            </ul>
            <p style={{ marginTop: '16px', color: '#22c55e', fontWeight: '500' }}>
              Skilled players consistently outperform by making better-informed predictions.
            </p>
          </Section>

          <Section title="Know Your Limits">
            <p style={{ fontWeight: '600', color: '#1e88e5' }}>
              Your experience may need attention if you:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Spend more time or money on the platform than you intended</li>
              <li>Feel the need to increase position sizes to maintain excitement</li>
              <li>Have difficulty stepping away from the platform</li>
              <li>Use the platform to escape problems or relieve negative feelings</li>
              <li>Chase losses by making hasty, unresearched predictions</li>
              <li>Hide your platform activity from family or friends</li>
              <li>Risk important relationships or responsibilities due to platform use</li>
              <li>Feel anxious or stressed about your platform activity</li>
            </ul>
            <p style={{ marginTop: '16px', color: '#22c55e', fontWeight: '500' }}>
              If any of these apply, consider using our self-management tools below.
            </p>
          </Section>

          <Section title="Self-Management Tools">
            <p>We provide several features to help you stay in control:</p>
            
            <div style={{ 
              background: 'rgba(30, 136, 229, 0.1)', 
              border: '1px solid rgba(30, 136, 229, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '16px',
            }}>
              <h4 style={{ color: '#1e88e5', margin: '0 0 8px 0' }}>💰 Deposit Limits</h4>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Set daily, weekly, or monthly deposit limits to manage your spending. Contact support to enable limits on your account.
              </p>
            </div>

            <div style={{ 
              background: 'rgba(30, 136, 229, 0.1)', 
              border: '1px solid rgba(30, 136, 229, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '12px',
            }}>
              <h4 style={{ color: '#1e88e5', margin: '0 0 8px 0' }}>⏸️ Cool-Off Period</h4>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Take a break from the platform by requesting a cool-off period of 24 hours, 7 days, or 30 days.
              </p>
            </div>

            <div style={{ 
              background: 'rgba(30, 136, 229, 0.1)', 
              border: '1px solid rgba(30, 136, 229, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '12px',
            }}>
              <h4 style={{ color: '#1e88e5', margin: '0 0 8px 0' }}>🚫 Self-Exclusion</h4>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Temporarily or permanently exclude yourself from the platform. Self-exclusion requests are processed within 24 hours.
              </p>
            </div>

            <div style={{ 
              background: 'rgba(30, 136, 229, 0.1)', 
              border: '1px solid rgba(30, 136, 229, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '12px',
            }}>
              <h4 style={{ color: '#1e88e5', margin: '0 0 8px 0' }}>📊 Activity History</h4>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Review your complete prediction history, including wins, losses, and time spent on the platform in your profile settings.
              </p>
            </div>
          </Section>

          <Section title="Tips for Responsible Play">
            <ul style={{ marginLeft: '20px' }}>
              <li><strong>Set a budget:</strong> Decide how much you can afford to allocate before you start, and stick to it.</li>
              <li><strong>Set time limits:</strong> Decide in advance how long you will participate and stick to it.</li>
              <li><strong>Don't chase losses:</strong> Accept losses as part of the learning process. Never make hasty decisions to recover.</li>
              <li><strong>Stay rational:</strong> Avoid making predictions when you're emotional, tired, or stressed.</li>
              <li><strong>Take regular breaks:</strong> Step away frequently to maintain perspective and clarity.</li>
              <li><strong>Diversify your activities:</strong> Don't let The Divide be your only recreational activity.</li>
              <li><strong>Never use borrowed money:</strong> Only participate with funds you can afford to lose.</li>
              <li><strong>Stay sober:</strong> Alcohol and substances impair judgment and decision-making.</li>
            </ul>
          </Section>

          <Section title="Understanding the Platform">
            <p>
              The Divide operates as a skill-based game where strategic thinking is rewarded:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Success correlates with research quality and market understanding</li>
              <li>The minority-wins mechanic rewards contrarian thinking and early identification of trends</li>
              <li>The platform takes a 2.5% service fee from completed markets</li>
              <li>Historical performance can indicate skill level over time</li>
            </ul>
            <p style={{ marginTop: '16px', color: '#1e88e5', fontWeight: '500' }}>
              Remember: Even skilled participants experience losses. Proper bankroll management is essential.
            </p>
          </Section>

          <Section title="Support Resources">
            <p style={{ marginBottom: '16px' }}>
              If you need support with managing your platform activity, these resources may help:
            </p>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <ResourceCard
                name="SAMHSA National Helpline"
                phone="1-800-662-4357"
                website="www.samhsa.gov"
                description="Mental health and substance abuse support"
              />
              <ResourceCard
                name="Crisis Text Line"
                phone="Text HOME to 741741"
                website="www.crisistextline.org"
                description="Free 24/7 crisis support via text"
              />
            </div>

            <div style={{ marginTop: '24px' }}>
              <h4 style={{ color: '#fff', marginBottom: '12px' }}>International Mental Health Resources:</h4>
              <ul style={{ marginLeft: '20px' }}>
                <li><strong>UK:</strong> Mind - 0300 123 3393 | www.mind.org.uk</li>
                <li><strong>Canada:</strong> Crisis Services Canada - 1-833-456-4566</li>
                <li><strong>Australia:</strong> Beyond Blue - 1300 22 4636</li>
                <li><strong>New Zealand:</strong> Lifeline - 0800 543 354</li>
              </ul>
            </div>
          </Section>

          <Section title="Age Restriction">
            <p>
              The Divide strictly prohibits anyone under 18 years of age (or the legal age in your jurisdiction) 
              from using our platform. We take the following measures:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Age verification during registration</li>
              <li>Account reviews and identity verification</li>
              <li>Immediate account termination upon discovery of underage users</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              If you discover someone underage is using our platform, please <Link to="/support" style={{ color: '#1e88e5' }}>submit a support ticket</Link> immediately.
            </p>
          </Section>

          <Section title="Contact Support">
            <p>
              Our support team is available to assist with responsible play concerns. If you need help or want to 
              implement any self-management measures:
            </p>
            <div style={{ marginTop: '16px' }}>
              <Link to="/support" style={{ color: '#1e88e5', textDecoration: 'underline', fontWeight: '500' }}>
                Submit a Support Ticket
              </Link>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                Select "Responsible Play Assistance" as the ticket category
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

function ResourceCard({ name, phone, website, description }) {
  return (
    <div style={{
      background: 'rgba(34, 197, 94, 0.1)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      borderRadius: '12px',
      padding: '16px',
    }}>
      <h4 style={{ color: '#22c55e', margin: '0 0 4px 0', fontSize: '16px' }}>{name}</h4>
      <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{description}</p>
      {phone !== 'N/A' && (
        <p style={{ margin: '0', fontSize: '14px' }}>
          <strong>Phone:</strong> <span style={{ color: '#22c55e' }}>{phone}</span>
        </p>
      )}
      <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
        <strong>Website:</strong> <span style={{ color: '#1e88e5' }}>{website}</span>
      </p>
    </div>
  );
}
