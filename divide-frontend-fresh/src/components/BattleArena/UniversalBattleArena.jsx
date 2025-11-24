/**
 * UNIVERSAL BATTLE ARENA - CLEAN REBUILD
 * Premium case battle arena using React + GSAP
 * No unnecessary complexity, just solid animations
 */

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { HexagonalArena } from './HexagonalArena';
import { WinnerScreen } from './WinnerScreen';
import './BattleArena.css';

/**
 * Extract players from battle data (supports both formats)
 */
function extractPlayers(battleData) {
  if (!battleData) return [];
  if (battleData.teams && Array.isArray(battleData.teams)) {
    return battleData.teams.flatMap(t => t.players || []);
  }
  if (battleData.players && Array.isArray(battleData.players)) {
    return battleData.players;
  }
  return [];
}

/**
 * Main Battle Arena - Clean, simple, works
 */
export const UniversalBattleArena = ({
  battleData = {}
}) => {
  const [players, setPlayers] = useState(() => extractPlayers(battleData));
  const [phase, setPhase] = useState('waiting');
  const [winners, setWinners] = useState([]);
  const [revealingPlayer, setRevealingPlayer] = useState(null);
  const containerRef = useRef(null);
  // Update players when battle data changes
  useEffect(() => {
    const newPlayers = extractPlayers(battleData);
    setPlayers(newPlayers);
  }, [battleData]);

  /**
   * Start the reveal sequence
   */
  const handleStartBattle = async () => {
    if (phase !== 'waiting' || players.length === 0) return;

    setPhase('revealing');

    // Reveal each player sequentially
    for (const player of players) {
      setRevealingPlayer(player.id);

      // GSAP timeline: case spin → reveal → particles
      const timeline = gsap.timeline();

      // Animate case spin
      const podElement = document.querySelector(
        `[data-player-id="${player.id}"] .case-model`
      );
      if (podElement) {
        timeline.to(podElement, {
          rotationZ: 1080,
          duration: 2,
          ease: 'power2.inOut'
        });

        // Item reveal with fly-in
        timeline.to(
          `[data-player-id="${player.id}"] .item-card`,
          {
            opacity: 1,
            scale: 1,
            y: 0,
            rotationZ: 0,
            duration: 0.8,
            ease: 'back.out'
          },
          '-=0.5'
        );

        // Value counter animation
        const valueElement = podElement.parentElement?.querySelector('.item-value');
        if (valueElement && player.totalItemValue) {
          const counter = { value: 0 };
          timeline.to(
            counter,
            {
              value: player.totalItemValue,
              duration: 1,
              ease: 'power2.out',
              onUpdate: () => {
                valueElement.textContent = '$' + Math.round(counter.value).toLocaleString();
              }
            },
            '-=0.3'
          );
        }
      }

      // Wait for animation to complete
      await timeline;

      // Brief pause between reveals
      await new Promise(r => setTimeout(r, 500));
    }

    setRevealingPlayer(null);
    setPhase('complete');

    // Calculate winners (simple: highest total item value)
    const sorted = [...players].sort(
      (a, b) => (b.totalItemValue || 0) - (a.totalItemValue || 0)
    );
    setWinners([sorted[0]?.id]);
  };

  /**
   * Reset and play again
   */
  const handlePlayAgain = () => {
    setPhase('waiting');
    setRevealingPlayer(null);
    setWinners([]);
  };

  return (
    <div className="battle-arena-container" ref={containerRef}>
      {/* Main Arena */}
      <div className="arena-wrapper">
        <HexagonalArena
          players={players}
          revealingPlayerId={revealingPlayer}
        />
      </div>

      {/* Control Buttons */}
      <div className="battle-controls">
        {phase === 'waiting' && (
          <button
            className="btn-primary"
            onClick={handleStartBattle}
            disabled={players.length === 0}
          >
            START BATTLE
          </button>
        )}

        {phase === 'complete' && (
          <>
            <button className="btn-primary" onClick={handlePlayAgain}>
              PLAY AGAIN
            </button>
            <button
              className="btn-secondary"
              onClick={() => window.history.back()}
            >
              EXIT
            </button>
          </>
        )}
      </div>

      {/* Status Indicator */}
      <div className={`battle-status status-${phase}`}>
        <span>
          {phase === 'waiting' && `${players.length} players ready...`}
          {phase === 'revealing' && 'Opening cases...'}
          {phase === 'complete' && 'Battle complete!'}
        </span>
      </div>

      {/* Winner Screen Overlay */}
      {phase === 'complete' && winners.length > 0 && (
        <WinnerScreen
          winners={winners.map(id => players.find(p => p.id === id))}
          totalPot={players.reduce((sum, p) => sum + (p.totalItemValue || 0), 0)}
          onPlayAgain={handlePlayAgain}
          onClose={() => window.history.back()}
        />
      )}
    </div>
  );
};

export default UniversalBattleArena;
