import React, { useState, useEffect, useRef } from 'react';
import { buildReelSystem, calculateSpinParams } from '../utils/spinMechanics';
import '../styles/CaseBattleArenaNew.css';

/**
 * Case Battle Arena - Vertical Carousel Redesign
 * Unified container with all player carousels visible together
 * Carousels rotate downward vertically
 * Minimal layout: Top info bar + Large carousel container
 */
export default function CaseBattleArena({
  battle,
  spinActive,
  battleEnded,
  battleItems,
  winningIndex,
  onSpinComplete,
  currentCaseIndex = 0,
  totalCases = 1,
}) {
  const [displayItems, setDisplayItems] = useState([]);
  const [spinParams, setSpinParams] = useState(null);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [displayedTotals, setDisplayedTotals] = useState({});
  const animRef = useRef(null);
  const spinStartRef = useRef(null);

  // Get all players
  const getAllPlayers = () => {
    if (battle.players && battle.players.length > 0) {
      return battle.players;
    }
    const legacyPlayers = [];
    if (battle.player1Id) {
      legacyPlayers.push({
        userId: battle.player1Id,
        username: battle.player1Username,
        team: 1,
        totalItemValue: battle.player1ItemValue || 0,
        cases: [],
        isBot: false,
      });
    }
    if (battle.player2Id) {
      legacyPlayers.push({
        userId: battle.player2Id,
        username: battle.player2Username,
        team: 2,
        totalItemValue: battle.player2ItemValue || 0,
        cases: [],
        isBot: battle.player2IsBot || false,
      });
    }
    return legacyPlayers;
  };

  const players = getAllPlayers();

  // Initialize displayed totals
  useEffect(() => {
    if (battle && !Object.keys(displayedTotals).length) {
      const initialTotals = {};
      players.forEach(p => {
        initialTotals[p.userId] = 0;
      });
      setDisplayedTotals(initialTotals);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.id]);

  // Initialize reel system
  useEffect(() => {
    if (battleItems && battleItems.length > 0) {
      const newReelSystem = buildReelSystem(battleItems);
      
      let reelWinningIndex = 0;
      if (typeof winningIndex === 'number' && winningIndex >= 0 && winningIndex < battleItems.length) {
        const target = battleItems[winningIndex];
        const mapped = newReelSystem.reelItems.findIndex(r => r.name === target.name && r.value === target.value);
        if (mapped >= 0) reelWinningIndex = mapped;
      }

      const newSpinParams = calculateSpinParams(reelWinningIndex, newReelSystem.reelItems.length);
      setSpinParams(newSpinParams);

      const filtered = newReelSystem.reelItems.filter(item => !item.isGoldTrigger);
      setDisplayItems(filtered);

      console.log(`[Arena Init] Battle items loaded, winning index: ${reelWinningIndex}`);
    }
  }, [battleItems, winningIndex]);

  // Spin animation loop
  useEffect(() => {
    if (!spinActive || !spinParams) return;

    setCurrentTranslate(0);
    spinStartRef.current = null;

    const animate = (timestamp) => {
      if (!spinStartRef.current) spinStartRef.current = timestamp;
      const elapsed = timestamp - spinStartRef.current;
      const progress = Math.min(elapsed / spinParams.duration, 1);

      const easing = progress < 0.8 
        ? progress ** 2 
        : 1 - (1 - progress) ** 2;

      const distance = spinParams.distance * easing;
      setCurrentTranslate(distance);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentTranslate(spinParams.distance);

        const completionTimeout = setTimeout(() => {
          setTimeout(() => {
            const updated = { ...displayedTotals };
            players.forEach(p => {
              updated[p.userId] = p.totalItemValue || 0;
            });
            setDisplayedTotals(updated);

            if (onSpinComplete) {
              onSpinComplete();
            }
          }, 300);
        }, 500);

        return () => clearTimeout(completionTimeout);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [spinActive, spinParams, displayItems, players, displayedTotals, onSpinComplete]);

  // Calculate team totals
  const calculateTeamTotal = (teamNum) => {
    return players
      .filter(p => p.team === teamNum)
      .reduce((sum, p) => sum + (p.totalItemValue || 0), 0);
  };

  // Render player carousel
  const renderPlayerCarousel = (player) => {
    return (
      <div key={player.userId} className="player-carousel-wrapper">
        <div className="carousel-header">
          <span className="player-name">{player.username}</span>
          {player.isBot && <span className="bot-badge">🤖</span>}
        </div>

        <div className="carousel-container">
          <div className="carousel-window">
            <div 
              className="carousel-reel"
              style={{
                transform: `translateY(${currentTranslate}px)`,
              }}
            >
              {displayItems.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`carousel-item rarity-${item.rarity || 'common'} ${spinActive && spinParams?.winningIndex === idx ? 'winning-item' : ''}`}
                >
                  <div className="item-display">
                    <div className="item-icon">🎁</div>
                    <div className="item-value">${(item.value / 100).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="carousel-center-line" />
          </div>
        </div>

        <div className="carousel-footer">
          <div className="player-round-value">
            {displayItems.length > 0 && spinParams ? `$${(displayItems[spinParams.winningIndex]?.value / 100).toFixed(2)}` : '$0.00'}
          </div>
        </div>
      </div>
    );
  };

  // Render next cases preview
  const renderNextCases = () => {
    const casesToShow = 4;
    return (
      <div className="next-cases-preview">
        {[...Array(casesToShow)].map((_, idx) => {
          const caseIdx = currentCaseIndex + idx;
          return (
            <div key={idx} className={`case-preview ${idx === 0 ? 'current' : ''}`}>
              {caseIdx < totalCases ? (
                <>
                  <div className="case-icon">📦</div>
                  <div className="case-label">Case {caseIdx + 1}</div>
                </>
              ) : (
                <div className="case-empty">Done</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="battle-arena-new">
      {/* TOP SECTION - Battle Info */}
      <div className="arena-header">
        <div className="header-left">
          <div className="round-counter">
            Round <span className="round-number">{currentCaseIndex + 1}</span> of <span className="total-rounds">{totalCases}</span>
          </div>
        </div>

        <div className="header-center">
          {renderNextCases()}
        </div>

        <div className="header-right">
          <div className="battle-value">
            <span className="label">Battle Value</span>
            <span className="amount">${((Object.values(displayedTotals).reduce((sum, val) => sum + (val || 0), 0)) / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION - Player Carousels */}
      <div className="arena-middle">
        <div className="carousels-grid">
          {players.map(player => renderPlayerCarousel(player))}
        </div>
      </div>

      {/* TEAM SCORES */}
      <div className="arena-team-scores">
        {[1, 2].map(teamNum => {
          const teamPlayers = players.filter(p => p.team === teamNum);
          if (teamPlayers.length === 0) return null;
          
          return (
            <div key={teamNum} className="team-score-card">
              <span className="team-label">Team {teamNum}</span>
              <span className="team-amount">${(calculateTeamTotal(teamNum) / 100).toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      {/* BOTTOM SECTION - Player Stats & Items Won */}
      <div className="arena-footer">
        {players.map(player => (
          <div key={player.userId} className="player-stats-card">
            <div className="stats-header">
              <span className="player-name">{player.username}</span>
              <span className="total-value">${(displayedTotals[player.userId] || 0).toFixed(2)}</span>
            </div>
            <div className="items-won">
              {player.cases && player.cases.length > 0 ? (
                player.cases.map((caseItem, idx) => (
                  <div key={idx} className="item-badge">
                    <span className="item-name">🎁</span>
                    <span className="item-price">${(caseItem.itemValue).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <span className="no-items">No items yet</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Battle End Modal */}
      {battleEnded && (
        <div className="battle-end-modal">
          <div className="modal-content">
            <div className="result-title">Battle Complete!</div>
            {battle.winnerId && (
              <div className="winner-announcement">
                🏆 {players.find(p => p.userId === battle.winnerId)?.username || 'Unknown'} Won!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
