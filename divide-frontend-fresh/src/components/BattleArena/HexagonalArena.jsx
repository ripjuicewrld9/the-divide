/**
 * HEXAGONAL BATTLE ARENA
 * 3v3 battle layout with 6 player pods in hexagonal formation
 * CSS-based geometry + glassmorphism
 */

import React, { useEffect, useState } from 'react';
import './HexArena.css';

/**
 * Individual Player Pod Component
 */
export const PlayerPod = ({
  player,
  isWinner,
  isRevealing,
  revealedItem,
  position // "top-left", "top-right", "center-left", "center-right", "bottom-left", "bottom-right"
}) => {
  const [itemValue, setItemValue] = useState(0);

  useEffect(() => {
    if (revealedItem && revealedItem.value) {
      // Animate value counter
      let current = 0;
      const target = revealedItem.value;
      const increment = target / 30; // Animate over ~300ms
      const timer = setInterval(() => {
        current = Math.min(current + increment, target);
        setItemValue(current);
        if (current >= target) clearInterval(timer);
      }, 10);
    }
  }, [revealedItem]);

  return (
    <div className={`player-pod pod-${position}`}>
      {/* OUTER GLOW RING */}
      <div className={`pod-glow ${isWinner ? 'winner-glow' : ''}`} />

      {/* AVATAR CIRCLE */}
      <div className={`pod-avatar ${isWinner ? 'avatar-winner' : ''}`}>
        <img
          src={player.avatar || 'https://via.placeholder.com/60'}
          alt={player.name}
          className="avatar-image"
        />
        {isWinner && <div className="avatar-crown">👑</div>}
      </div>

      {/* PLAYER NAME */}
      <div className="pod-name">{player.name || player.username || 'Player'}</div>

      {/* TEAM INDICATOR */}
      <div className={`pod-team team-${player.team || 1}`}>
        Team {player.team || 1}
      </div>

      {/* CASE PREVIEW (small 3D case) */}
      <div className={`pod-case-preview ${isRevealing ? 'case-spinning' : ''}`}>
        <div className="case-icon">📦</div>
      </div>

      {/* REVEALED ITEM CARD */}
      {revealedItem && (
        <div className={`revealed-item rarity-${revealedItem.rarity}`}>
          <div className="item-icon">
            {revealedItem.emoji || '⭐'}
          </div>
          <div className="item-name">{revealedItem.name}</div>
          <div className="item-value">
            ${itemValue.toFixed(2)}
          </div>
          <div className="rarity-badge">{revealedItem.rarity}</div>
        </div>
      )}

      {/* TOTAL SCORE */}
      <div className="pod-score">
        <div className="score-label">Total</div>
        <div className="score-value">${(player.totalValue || 0).toFixed(2)}</div>
      </div>

      {/* CONNECTING LINE TO CENTER (hexagon edge) */}
      <div className="pod-connector" />
    </div>
  );
};

/**
 * Hexagonal Arena Component
 */
export const HexagonalArena = ({
  players = [],
  winners = [],
  revealingStates = {},
  revealedItems = {}
}) => {
  // Get actual player data - handle both new and legacy formats
  const actualPlayers = (players && players.length > 0) ? players : [];
  
  if (actualPlayers.length === 0) {
    return (
      <div className="hex-arena" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#00f0ff', fontSize: '18px', textAlign: 'center' }}>
          ⏳ Waiting for players to join...
        </div>
      </div>
    );
  }

  const positions = [
    'top-left',
    'top-right',
    'center-right',
    'bottom-right',
    'bottom-left',
    'center-left'
  ];

  return (
    <div className="hex-arena">
      {/* CENTRAL HEXAGON DISPLAY */}
      <div className="arena-center">
        <div className="center-circle">
          <div className="center-text">BATTLE</div>
          <div className="center-vs">VS</div>
        </div>
      </div>

      {/* PLAYER PODS IN HEXAGON */}
      <div className="pods-container">
        {actualPlayers.map((player, index) => (
          <PlayerPod
            key={player.id || player.userId || `player-${index}`}
            player={player}
            position={positions[index % 6]}
            isWinner={winners.includes(player.id) || winners.includes(player.userId)}
            isRevealing={revealingStates[player.id] || revealingStates[player.userId]}
            revealedItem={revealedItems[player.id] || revealedItems[player.userId]}
          />
        ))}
      </div>

      {/* HEXAGON BACKGROUND GRID */}
      <svg className="hex-grid" viewBox="0 0 1000 900" preserveAspectRatio="none">
        <defs>
          <pattern id="hex-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#00f0ff" strokeWidth="1" opacity="0.1" />
          </pattern>
        </defs>
        <rect width="1000" height="900" fill="url(#hex-pattern)" />
      </svg>

      {/* ENERGY BEAMS (connecting pods) */}
      <svg className="energy-beams" viewBox="0 0 1000 900" preserveAspectRatio="none">
        <line x1="250" y1="150" x2="750" y2="150" stroke="#00f0ff" strokeWidth="2" opacity="0.3" />
        <line x1="850" y1="450" x2="850" y2="450" stroke="#00f0ff" strokeWidth="2" opacity="0.3" />
        <line x1="750" y1="750" x2="250" y2="750" stroke="#00f0ff" strokeWidth="2" opacity="0.3" />
        <line x1="150" y1="450" x2="150" y2="450" stroke="#00f0ff" strokeWidth="2" opacity="0.3" />
      </svg>
    </div>
  );
};

export default HexagonalArena;
