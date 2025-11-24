import React, { useState, useEffect, useRef } from 'react';
import { buildReelSystem, calculateSpinParams, isGoldTriggerWin, isPremiumItem } from '../utils/spinMechanics';
import '../styles/CaseBattlePremium.css';

/**
 * Premium Case Battle Arena - Luxury Design
 * High-end 1-of-1 case battle experience with professional animations
 */
export default function CaseBattlePremium({
  battle,
  spinActive,
  battleItems,
  winningIndex,
  onSpinComplete,
  currentCaseIndex = 0,
  totalCases = 1,
}) {
  const [spinnerStates, setSpinnerStates] = useState({});
  const [goldActive, setGoldActive] = useState(false);
  const [goldWinner, setGoldWinner] = useState(null);
  const [displayTotals, setDisplayTotals] = useState({});
  const animationRefs = useRef({});

  const getAllPlayers = () => {
    if (battle.players && battle.players.length > 0) {
      return battle.players;
    }
    const legacyPlayers = [];
    if (battle.player1Id) {
      legacyPlayers.push({
        userId: battle.player1Id,
        username: battle.player1Username,
        totalItemValue: battle.player1ItemValue || 0,
        team: 1,
      });
    }
    if (battle.player2Id) {
      legacyPlayers.push({
        userId: battle.player2Id,
        username: battle.player2Username,
        totalItemValue: battle.player2ItemValue || 0,
        team: 2,
      });
    }
    return legacyPlayers;
  };

  const players = getAllPlayers();

  // Initialize reel system
  useEffect(() => {
    if (!battleItems?.length) return;

    const reelSystem = buildReelSystem(battleItems);
    const newSpinParams = calculateSpinParams(reelSystem.reelItems.length, winningIndex || 0);

    // Initialize each player's spinner
    const newStates = {};
    players.forEach(p => {
      newStates[p.userId] = {
        items: reelSystem.reelItems,
        params: newSpinParams,
        translate: 0,
        goldItems: reelSystem.premiumItems,
        goldTranslate: 0,
      };
    });
    setSpinnerStates(newStates);

    const initialTotals = {};
    players.forEach(p => {
      initialTotals[p.userId] = 0;
    });
    setDisplayTotals(initialTotals);
  }, [battleItems, winningIndex, players]);

  // MAIN SPIN ANIMATION - Premium physics
  useEffect(() => {
    if (!spinActive || Object.keys(spinnerStates).length === 0) return;

    const handleImpactSequence = (userId) => {
      const bounces = [
        { amount: 50, delay: 0 },
        { amount: -20, delay: 100 },
        { amount: 8, delay: 180 },
        { amount: 0, delay: 260 },
      ];

      bounces.forEach(bounce => {
        setTimeout(() => {
          setSpinnerStates(prev => ({
            ...prev,
            [userId]: { 
              ...prev[userId], 
              translate: (prev[userId].translate || 0) + bounce.amount 
            }
          }));
        }, bounce.delay);
      });

      // Trigger gold animation if winner
      setTimeout(() => {
        if (isGoldTriggerWin(battleItems[winningIndex])) {
          setGoldActive(true);
          const goldWinItem = battleItems.find(item => isPremiumItem(item));
          setGoldWinner(goldWinItem);
        }

        // Final completion
        setTimeout(() => {
          const updated = {};
          players.forEach(p => {
            updated[p.userId] = (p.totalItemValue || 0) * 100;
          });
          setDisplayTotals(updated);

          if (onSpinComplete) {
            onSpinComplete();
          }
        }, goldActive ? 3000 : 500);
      }, 300);
    };

    const animRefs = animationRefs.current;
    const rafs = [];

    players.forEach(player => {
      const state = spinnerStates[player.userId];
      if (!state) return;

      if (!animRefs[player.userId]) {
        animRefs[player.userId] = { startTime: null };
      }

      const animate = (timestamp) => {
        const ref = animRefs[player.userId];
        if (!ref.startTime) ref.startTime = timestamp;

        const elapsed = timestamp - ref.startTime;
        const duration = state.params.spinDuration * 1000; // 5.5s
        const progress = Math.min(elapsed / duration, 1);

        // PREMIUM PHYSICS: Power curve deceleration
        let easing;
        if (progress < 0.1) {
          easing = progress / 0.1; // Fast start
        } else if (progress < 0.9) {
          const spinProg = (progress - 0.1) / 0.8;
          easing = 0.1 + 0.8 * (1 - (1 - spinProg) ** 3); // Heavy deceleration
        } else {
          const brakeProg = (progress - 0.9) / 0.1;
          easing = 0.9 + 0.1 * (1 - (1 - brakeProg) ** 2);
        }

        const distance = state.params.scrollAmount * easing;
        setSpinnerStates(prev => ({
          ...prev,
          [player.userId]: { ...prev[player.userId], translate: -distance }
        }));

        if (progress < 1) {
          const raf = requestAnimationFrame(animate);
          animRefs[player.userId].raf = raf;
          rafs.push(raf);
        } else {
          // IMPACT SEQUENCE - Multiple bounces with damping
          handleImpactSequence(player.userId);
        }
      };

      const raf = requestAnimationFrame(animate);
      animRefs[player.userId].raf = raf;
      rafs.push(raf);
    });

    return () => {
      rafs.forEach(raf => cancelAnimationFrame(raf));
    };
  }, [spinActive, spinnerStates, players, battleItems, winningIndex, goldActive, onSpinComplete]);

  const renderReel = (userId) => {
    const state = spinnerStates[userId];
    if (!state?.items) return null;

    return (
      <div className="reel-window" key={`reel-${userId}`}>
        <div 
          className="reel-content spinning"
          style={{ transform: `translateY(${state.translate}px)` }}
        >
          {state.items.map((item, idx) => (
            <div 
              key={idx} 
              className={`reel-item rarity-${item.rarity || 'base'}`}
            >
              <div className="reel-item-content">
                <div className="reel-item-icon">{item.icon || '📦'}</div>
                <div className="reel-item-name">{item.name}</div>
                <div className="reel-item-value">${item.value?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="reel-indicator" />
      </div>
    );
  };

  return (
    <div className="battle-arena-premium">
      <div className="arena-background">
        {[...Array(30)].map((_, i) => (
          <div 
            key={i} 
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 20}s`,
              top: '-10px'
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="battle-header">
        <div className="header-left">
          <div className="round-info">
            <div className="round-label">Round</div>
            <div className="round-value">{currentCaseIndex + 1}/{totalCases}</div>
          </div>
          <div className="vs-badge">VS</div>
        </div>

        <div className="pot-display">
          <div className="pot-label">Total Pot</div>
          <div className="pot-value">
            ${players.reduce((sum, p) => sum + (p.totalItemValue || 0), 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Main Stage */}
      <div className="battle-stage">
        <div className="battle-arena">
          {players.map(player => (
            <div key={player.userId} className="spinner-wrapper">
              <div className="spinner-player-info">
                <div className="spinner-player-name">{player.username}</div>
                <div className="spinner-player-value">
                  ${displayTotals[player.userId] 
                    ? (displayTotals[player.userId] / 100).toFixed(2) 
                    : '0.00'}
                </div>
              </div>

              <div className="reel-container">
                {renderReel(player.userId)}
              </div>

              <div className="player-total">
                Total: ${(player.totalItemValue || 0).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Golden Jackpot Overlay */}
      {goldActive && (
        <div className={`golden-jackpot ${goldActive ? 'active' : ''}`}>
          <div className="jackpot-beacon" />
          <div className="jackpot-icon">✨</div>

          {goldWinner && (
            <div className="jackpot-item-showcase">
              <div className="jackpot-item">
                <div className="jackpot-item-icon">{goldWinner.icon || '💎'}</div>
                <div className="jackpot-item-name">{goldWinner.name}</div>
                <div className="jackpot-item-value">${goldWinner.value?.toFixed(2) || '0.00'}</div>
                <div className="winner-badge">🏆</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
