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
          Responsible Gaming
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#e53935" style={{ width: '24px', height: '24px' }}>
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
            <h3 style={{ margin: 0, color: '#e53935', fontWeight: '600' }}>Important Notice</h3>
          </div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', lineHeight: '1.7' }}>
            Prediction markets and gambling can be addictive. Only risk money you can afford to lose. 
            If you or someone you know has a gambling problem, please seek help immediately.
          </p>
        </div>

        <div style={{ lineHeight: '1.8', color: 'rgba(255,255,255,0.85)' }}>
          <Section title="Our Commitment">
            <p>
              At The Divide, we are committed to promoting responsible gaming practices. While we offer an exciting 
              prediction market platform, we recognize that gambling activities can lead to harm if not approached responsibly.
            </p>
            <p style={{ marginTop: '12px' }}>
              We believe entertainment should never come at the cost of your financial stability, relationships, 
              or mental health. Our goal is to provide tools and information to help you maintain control.
            </p>
          </Section>

          <Section title="Know the Signs">
            <p style={{ fontWeight: '600', color: '#e53935' }}>
              Gambling may be becoming a problem if you:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Spend more time or money than you intended</li>
              <li>Feel the need to gamble with increasing amounts to get the same excitement</li>
              <li>Have tried to cut back or stop gambling but couldn't</li>
              <li>Feel restless or irritable when trying to reduce gambling</li>
              <li>Gamble to escape problems or relieve negative feelings</li>
              <li>Chase losses by continuing to gamble to try to win back money</li>
              <li>Lie to family members or others about your gambling</li>
              <li>Risk or lose important relationships, jobs, or opportunities due to gambling</li>
              <li>Rely on others to provide money for gambling debts</li>
              <li>Feel anxious, depressed, or suicidal because of gambling</li>
            </ul>
            <p style={{ marginTop: '16px', color: '#22c55e', fontWeight: '500' }}>
              If you answered "yes" to any of these, please consider seeking help.
            </p>
          </Section>

          <Section title="Self-Help Tools">
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
                Set daily, weekly, or monthly deposit limits to control your spending. Contact support to enable limits on your account.
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
                Take a break from gambling by requesting a cool-off period of 24 hours, 7 days, or 30 days.
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
                Permanently or temporarily exclude yourself from the platform. Self-exclusion requests are processed within 24 hours and cannot be reversed during the exclusion period.
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
                Review your complete betting history, including wins, losses, and time spent on the platform in your profile settings.
              </p>
            </div>
          </Section>

          <Section title="Tips for Responsible Gaming">
            <ul style={{ marginLeft: '20px' }}>
              <li><strong>Set a budget:</strong> Decide how much you can afford to lose before you start, and stick to it.</li>
              <li><strong>Set time limits:</strong> Decide in advance how long you will play and stick to it.</li>
              <li><strong>Don't chase losses:</strong> Accept losses as part of the game. Never try to win back lost money.</li>
              <li><strong>Don't gamble when upset:</strong> Avoid gambling when you're angry, depressed, or stressed.</li>
              <li><strong>Take regular breaks:</strong> Step away frequently to maintain perspective.</li>
              <li><strong>Balance gambling with other activities:</strong> Don't let gambling be your only recreational activity.</li>
              <li><strong>Never borrow money to gamble:</strong> Only gamble with money you can afford to lose.</li>
              <li><strong>Don't gamble under the influence:</strong> Alcohol and drugs impair judgment.</li>
            </ul>
          </Section>

          <Section title="Understanding the Odds">
            <p>
              The Divide operates as a prediction market where the minority position wins. This means:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>All positions carry risk of total loss</li>
              <li>Past results do not predict future outcomes</li>
              <li>The house takes a 2.5% fee from all pots</li>
              <li>There is no guaranteed winning strategy</li>
            </ul>
            <p style={{ marginTop: '16px', color: '#e53935', fontWeight: '500' }}>
              Remember: Gambling is not a way to make money. The odds are designed such that the house maintains an edge.
            </p>
          </Section>

          <Section title="Resources for Help">
            <p style={{ marginBottom: '16px' }}>
              If you or someone you know is struggling with gambling addiction, please reach out to these resources:
            </p>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <ResourceCard
                name="National Council on Problem Gambling"
                phone="1-800-522-4700"
                website="www.ncpgambling.org"
                description="24/7 confidential helpline"
              />
              <ResourceCard
                name="Gamblers Anonymous"
                phone="N/A"
                website="www.gamblersanonymous.org"
                description="12-step recovery program"
              />
              <ResourceCard
                name="National Problem Gambling Helpline"
                phone="1-800-522-4700"
                website="www.1800gambler.net"
                description="Free, confidential, 24/7"
              />
              <ResourceCard
                name="SAMHSA National Helpline"
                phone="1-800-662-4357"
                website="www.samhsa.gov"
                description="Mental health and substance abuse"
              />
            </div>

            <div style={{ marginTop: '24px' }}>
              <h4 style={{ color: '#fff', marginBottom: '12px' }}>International Resources:</h4>
              <ul style={{ marginLeft: '20px' }}>
                <li><strong>UK:</strong> GamCare - 0808 8020 133 | www.gamcare.org.uk</li>
                <li><strong>Canada:</strong> ConnexOntario - 1-866-531-2600</li>
                <li><strong>Australia:</strong> Gambling Help Online - 1800 858 858</li>
                <li><strong>New Zealand:</strong> Gambling Helpline - 0800 654 655</li>
              </ul>
            </div>
          </Section>

          <Section title="Underage Gambling Prevention">
            <p>
              The Divide strictly prohibits anyone under 18 years of age (or the legal gambling age in your jurisdiction) 
              from using our platform. We take the following measures:
            </p>
            <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
              <li>Age verification during registration</li>
              <li>Account reviews and identity verification</li>
              <li>Immediate account termination upon discovery of underage users</li>
              <li>Cooperation with regulatory authorities</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              If you discover someone underage is using our platform, please report it immediately to support@thedivide.io
            </p>
          </Section>

          <Section title="Contact Support">
            <p>
              Our support team is trained to assist with responsible gaming concerns. If you need help or want to 
              implement any self-exclusion measures, contact us:
            </p>
            <div style={{ marginTop: '16px' }}>
              <p style={{ color: '#1e88e5', fontWeight: '500' }}>Email: support@thedivide.io</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                Subject line: "Responsible Gaming Assistance"
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
