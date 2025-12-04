// src/pages/DividesPage.jsx
import React from 'react';
import './styles/Divides.css';          // ← container + grid + card styles
import DivideCard from '../components/DivideCard'; // ← neon-pie component
import LiveGamesFeed from '../components/LiveGamesFeed';

// Sample data removed. This page should use live data; leaving empty to avoid showing mock polls.
const samplePolls = [];

export default function DividesPage() {
  return (
    <div className="divides-container">
      {/* Optional header */}
      <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', textShadow: '0 0 12px #0ff' }}>
        THE DIVIDE
      </h1>

      <div className="divides-grid">
        {samplePolls.map((poll, index) => (
          <DivideCard
            key={index}
            title={poll.title}
            left={poll.left}
            right={poll.right}
            leftVotes={poll.leftVotes}
            rightVotes={poll.rightVotes}
          />
        ))}
      </div>

      {/* Live Games Feed */}
      <div style={{ marginTop: 40, maxWidth: 1400, margin: '40px auto 0', padding: '0 24px' }}>
        <div style={{
          background: 'rgba(11, 11, 11, 0.8)',
          border: '1px solid rgba(255, 50, 50, 0.1)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <LiveGamesFeed />
        </div>
      </div>
    </div>
  );
}