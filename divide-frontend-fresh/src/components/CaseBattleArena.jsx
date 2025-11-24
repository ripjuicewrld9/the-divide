import React, { useState, useEffect, useRef } from 'react';
import { useTickSound } from '../hooks/useTickSound';
import { buildReelSystem, calculateSpinParams, generateTickPattern, isGoldTriggerWin } from '../utils/spinMechanics';
import '../styles/CaseBattleArena.css';
import '../styles/CaseBattleArenaEnhanced.css';

/**
 * Case Battle Arena - Compact Grid with Spin Animations
 * Shows 3-column grid of players with compact cards and spin reels when active
 */
export default function CaseBattleArena({
  battle,
  user,
  countdownActive,
  countdown,
  spinActive,
  spinComplete,
  battleEnded,
  battleItems,
  winningIndex,
  onSpinComplete,
  currentCaseIndex = 0,
  totalCases = 1,
  playerTicket = null,
}) {
  const [displayItems, setDisplayItems] = useState([]);
  const [reelSystem, setReelSystem] = useState(null);
  const [spinParams, setSpinParams] = useState(null);
  // legacy toggle removed - using rAF-driven animation instead
  // const [applySpinTransform, setApplySpinTransform] = useState(false);
  const [holdWinningItem, setHoldWinningItem] = useState(false);
  const { playTick } = useTickSound();
  // Precise animation state (rAF-driven)
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [displayedTotals, setDisplayedTotals] = useState({}); // Track displayed total per player (running total across all cases)
  const animRef = useRef(null);
  const spinStartRef = useRef(null);
  const [goldWinPending, setGoldWinPending] = useState(false);
  const [goldWinActive, setGoldWinActive] = useState(false);

  // Get all players from battle.players array, fallback to legacy fields
  const getAllPlayers = () => {
    if (battle.players && battle.players.length > 0) {
      return battle.players;
    }
    // Fallback to legacy player1/player2
    const legacyPlayers = [];
    if (battle.player1Id) {
      legacyPlayers.push({
        userId: battle.player1Id,
        username: battle.player1Username,
        team: 1,
        totalItemValue: battle.player1ItemValue || 0,
        isBot: false,
      });
    }
    if (battle.player2Id) {
      legacyPlayers.push({
        userId: battle.player2Id,
        username: battle.player2Username,
        team: 2,
        totalItemValue: battle.player2ItemValue || 0,
        isBot: battle.player2IsBot || false,
      });
    }
    return legacyPlayers;
  };

  // Determine layout type: 'sidebyside' for 1v1 & 2v2, 'topbottom' for 3v3+
  const isTopBottomLayout = () => {
    return battle.teamSize >= 3;
  };

  const players = getAllPlayers();

  // Initialize displayed totals when battle loads (starts at 0)
  useEffect(() => {
    if (battle && !Object.keys(displayedTotals).length) {
      const initialTotals = {};
      players.forEach(p => {
        initialTotals[p.userId] = 0; // Start at 0
      });
      setDisplayedTotals(initialTotals);
      console.log(`[Arena] Initialized displayedTotals to 0 for all players`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.id]); // Only run once per battle

  // Initialize reel system when battle items change
  useEffect(() => {
    if (battleItems && battleItems.length > 0) {
      console.log(`[Arena Init] battleItems:`, battleItems.map(i => `${i.name}($${(i.value/100).toFixed(2)})`).join(' | '), `playerTicket=${playerTicket}`);
      const newReelSystem = buildReelSystem(battleItems);
      setReelSystem(newReelSystem);
      // Determine winning index for the reel. Prefer the `winningIndex` prop (from server/RNG)
      // Map the logical winningIndex (index within original `battleItems`) to the index inside the shuffled reel
      let reelWinningIndex = 0;
      if (typeof winningIndex === 'number' && winningIndex >= 0 && winningIndex < battleItems.length) {
        const target = battleItems[winningIndex];
        const mapped = newReelSystem.reelItems.findIndex(r => r.name === target.name && r.value === target.value);
        console.log(`[Arena Reel] winningIndex=${winningIndex}, targetItem=${target.name}($${(target.value/100).toFixed(2)}), mappedToReelIndex=${mapped}`);
        reelWinningIndex = mapped >= 0 ? mapped : 0;
      } else {
        // Fallback: try to pick the first non-gold item that matches a battle item
        const computed = newReelSystem.reelItems.findIndex(item => {
          if (item.isGoldTrigger) return false;
          return battleItems.some(bi => bi.value === item.value && bi.name === item.name);
        });
        console.log(`[Arena Reel] NO winningIndex provided, computed=${computed}`);
        reelWinningIndex = computed >= 0 ? computed : 0;
      }

  const params = calculateSpinParams(newReelSystem.reelItems.length, Math.max(0, reelWinningIndex));
  // store the reelWinningIndex so rAF effect can reference it precisely
  params.reelWinningIndex = reelWinningIndex;
      setSpinParams(params);
    }
  }, [battleItems, winningIndex, playerTicket]);

  // Spin animation lifecycle - rAF-driven with deceleration curve for realistic slot-machine feel
  // Deceleration easing: starts fast (high velocity), smoothly slows down (low velocity at end)
  const decelerationCurve = (t) => 2 * t - t * t; // slope at t=0 is 2 (fast), slope at t=1 is 0 (stopped)
  
  useEffect(() => {
    // cleanup helper
    const cancelAnim = () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      spinStartRef.current = null;
    };

    if (spinActive && spinParams && reelSystem) {
      // reset
      setHoldWinningItem(false);
      setGoldWinActive(false);
      
      const reelWinningIndex = spinParams.reelWinningIndex ?? 0;
      
      // Gold trigger detection
      const possibleWinning = reelSystem.reelItems[reelWinningIndex] || null;
      const goldPending = possibleWinning ? isGoldTriggerWin(possibleWinning) : false;
      setGoldWinPending(goldPending);

      // schedule tick sounds (synced to deceleration pattern)
      const tickPattern = generateTickPattern((spinParams.spinDuration || 2.8) * 1000);
      const tickTimers = tickPattern.map(t => setTimeout(() => playTick(), t.delay));

      // Animation parameters
      const durationMs = (spinParams.spinDuration || 2.8) * 1000;
      const scrollDistance = spinParams.scrollAmount || 0;
      
      console.log(`[SPIN START] itemCount=${reelSystem.reelItems.length}, winIndex=${reelWinningIndex}, scrollDist=${scrollDistance}, duration=${durationMs}ms`);
      
      // Start at 0, animate TO scrollDistance
      const startPos = 0;
      const endPos = scrollDistance;

      spinStartRef.current = performance.now() + 50;

      // Set immediate initial position
      setCurrentTranslate(startPos);

      const animate = (now) => {
        if (!spinStartRef.current) return;
        const elapsed = now - spinStartRef.current;
        const clamped = Math.min(Math.max(elapsed, 0), durationMs);
        const progress = clamped / durationMs;
        
        // Apply deceleration: starts fast, smoothly slows down
        const eased = decelerationCurve(progress);
        const current = startPos + eased * (endPos - startPos);
        
        if (elapsed % 500 < 16) {
          console.log(`[ANIM FRAME] elapsed=${Math.round(elapsed)}ms progress=${progress.toFixed(2)} translate=${current.toFixed(0)}px`);
        }
        
        setCurrentTranslate(current);

        if (elapsed < durationMs) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          // finished - lock to end position
          console.log(`[SPIN END] elapsed=${elapsed}ms endPos=${endPos}px. Holding item at index ${reelWinningIndex}`);
          setCurrentTranslate(endPos);
          setHoldWinningItem(true);
          if (goldPending) setGoldWinActive(true);
          cancelAnim();
          
          // Update displayed totals to show newly updated values (after this case completes)
          const updated = { ...displayedTotals };
          players.forEach(p => {
            updated[p.userId] = p.totalItemValue || 0;
          });
          setDisplayedTotals(updated);
          console.log(`[SPIN COMPLETE] Updated displayedTotals:`, updated);
          
          // Signal parent that spin animation completed
          if (onSpinComplete) {
            console.log(`[SPIN COMPLETE] Calling parent callback`);
            onSpinComplete();
          }
        }
      };

      animRef.current = requestAnimationFrame(animate);

      return () => {
        cancelAnim();
        tickTimers.forEach(id => clearTimeout(id));
      };
    } else {
      // not spinning - ensure reset
      setCurrentTranslate(0);
      setHoldWinningItem(false);
      setGoldWinPending(false);
      setGoldWinActive(false);
      cancelAnim();
    }
  }, [spinActive, spinParams, playTick, reelSystem, displayItems.length, onSpinComplete, displayedTotals, players]);

  // Display reel items padded
  useEffect(() => {
    if (reelSystem && reelSystem.reelItems.length > 0) {
      const padded = [];
      for (let i = 0; i < 20; i++) {
        padded.push(...reelSystem.reelItems);
      }
      setDisplayItems(padded);
    }
  }, [reelSystem]);

  // Note: scroll amount is driven by rAF via `currentTranslate` and `spinParams.scrollAmount`

  return (
    <div className="case-battle-arena-compact">
      {countdownActive && (
        <div className="countdown-overlay">
          <div className="countdown-display">
            <div className="countdown-number">{countdown}</div>
          </div>
        </div>
      )}

      {spinActive && (
        <div className="spin-indicator">
          <div className="spin-pulse">⚡ ROLLING...</div>
          {totalCases > 1 && (
            <div style={{ fontSize: '14px', color: '#fff', marginTop: '8px', textAlign: 'center' }}>
              Case {currentCaseIndex + 1} of {totalCases}
            </div>
          )}
        </div>
      )}

      {/* Compact Grid Layout - Responsive: side-by-side for 1v1/2v2, top-bottom for 3v3+ */}
      <div className="compact-grid-container">
        {isTopBottomLayout() ? (
          // TOP-BOTTOM LAYOUT (3v3+)
          <div className="compact-grid-topbottom">
            {/* Top Row - Team 1 */}
            <div className="team-section-top">
              {players
                .filter(p => p.team === 1)
                .map((player, idx) => {
                  
                  const isCurrentUser = player.userId === user?.id;
                  const isWinner = battleEnded && battle.winnerId === player.userId;
                  
                  return (
                    <div key={idx} className="compact-player-card-wrapper">
                      <div 
                        className={`compact-player-card ${isWinner ? 'winner-card' : ''}`}
                      >
                        {/* Card Header - Avatar and Player Info */}
                        <div className="compact-card-header">
                          <div className="compact-player-avatar">
                            {player.isBot ? '🤖' : '👤'}
                          </div>
                          <div className="compact-player-details">
                            <div className="compact-player-name">
                              {player.username}
                              {isCurrentUser && <span className="you-badge">(YOU)</span>}
                            </div>
                            <div className="compact-player-value">
                              ${((displayedTotals[player.userId] ?? 0) / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Spin Animation - shown during spinning */}
                        {spinActive && displayItems.length > 0 && (
                          <div className="spin-container-compact">
                            <div className={`spin-window-compact ${spinActive ? 'spinning' : ''} ${goldWinActive ? 'gold-win-active' : (goldWinPending ? 'gold-win-pending' : '')}`}>
                              <div
                                className="spin-reel-compact"
                                data-spinning="true"
                                data-hold={holdWinningItem}
                                style={{
                                  transform: `translate3d(0, -${currentTranslate}px, 0)`,
                                }}
                              >
                                {displayItems.map((item, itemIdx) => (
                                  <div key={itemIdx} className={`spin-item-compact rarity-${item.rarity || 'common'}`}>
                                    <div className="item-icon-compact">🎁</div>
                                    <div className="item-value-compact">${(item.value / 100).toFixed(2)}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="spin-indicator-line-compact" />
                            </div>
                          </div>
                        )}

                        {/* Cases Grid - shown when not spinning */}
                        {!spinActive && (
                          <div className="compact-cases-grid">
                            {player.cases && player.cases.slice(0, 4).map((caseItem, caseIdx) => (
                              <div key={caseIdx} className="compact-case-item">
                                <div className="compact-case-icon">📦</div>
                                <div className="compact-case-value">
                                  ${(caseItem.value / 100).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Total Amount Box */}
                        <div className="compact-total-box">
                          <span className="total-label">Total:</span>
                          <span className="total-amount">
                            ${((displayedTotals[player.userId] ?? 0) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Divider - Horizontal */}
            <div className="battle-divider-horizontal">
              <div className="divider-sword-horizontal">⚔️</div>
              <div className="divider-vs-horizontal">VS</div>
            </div>

            {/* Bottom Row - Team 2 */}
            <div className="team-section-bottom">
              {players
                .filter(p => p.team === 2)
                .map((player, idx) => {
                  
                  const isCurrentUser = player.userId === user?.id;
                  const isWinner = battleEnded && battle.winnerId === player.userId;
                  
                  return (
                    <div key={idx} className="compact-player-card-wrapper">
                      <div 
                        className={`compact-player-card ${isWinner ? 'winner-card' : ''}`}
                      >
                        {/* Card Header - Avatar and Player Info */}
                        <div className="compact-card-header">
                          <div className="compact-player-avatar">
                            {player.isBot ? '🤖' : '👤'}
                          </div>
                          <div className="compact-player-details">
                            <div className="compact-player-name">
                              {player.username}
                              {isCurrentUser && <span className="you-badge">(YOU)</span>}
                            </div>
                            <div className="compact-player-value">
                              ${((displayedTotals[player.userId] ?? 0) / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Spin Animation - shown during spinning */}
                        {spinActive && displayItems.length > 0 && (
                          <div className="spin-container-compact">
                            <div className={`spin-window-compact ${spinActive ? 'spinning' : ''} ${goldWinActive ? 'gold-win-active' : (goldWinPending ? 'gold-win-pending' : '')}`}>
                              <div
                                className="spin-reel-compact"
                                data-spinning="true"
                                data-hold={holdWinningItem}
                                style={{
                                  transform: `translate3d(0, -${currentTranslate}px, 0)`,
                                }}
                              >
                                {displayItems.map((item, itemIdx) => (
                                  <div key={itemIdx} className={`spin-item-compact rarity-${item.rarity || 'common'}`}>
                                    <div className="item-icon-compact">🎁</div>
                                    <div className="item-value-compact">${(item.value / 100).toFixed(2)}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="spin-indicator-line-compact" />
                            </div>
                          </div>
                        )}

                        {/* Cases Grid - shown when not spinning */}
                        {!spinActive && (
                          <div className="compact-cases-grid">
                            {player.cases && player.cases.slice(0, 4).map((caseItem, caseIdx) => (
                              <div key={caseIdx} className="compact-case-item">
                                <div className="compact-case-icon">📦</div>
                                <div className="compact-case-value">
                                  ${(caseItem.value / 100).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Total Amount Box */}
                        <div className="compact-total-box">
                          <span className="total-label">Total:</span>
                          <span className="total-amount">
                            ${((displayedTotals[player.userId] ?? 0) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          // SIDE-BY-SIDE LAYOUT (1v1, 2v2)
          <div className="compact-grid">
            {/* Team 1 (Left) */}
            <div className="team-section-left">
              {players
                .filter(p => p.team === 1)
                .map((player, idx) => {
                  
                  const isCurrentUser = player.userId === user?.id;
                  const isWinner = battleEnded && battle.winnerId === player.userId;
                  
                  return (
                    <div key={idx} className="compact-player-card-wrapper">
                      <div 
                        className={`compact-player-card ${isWinner ? 'winner-card' : ''}`}
                      >
                        {/* Card Header - Avatar and Player Info */}
                        <div className="compact-card-header">
                          <div className="compact-player-avatar">
                            {player.isBot ? '🤖' : '👤'}
                          </div>
                          <div className="compact-player-details">
                            <div className="compact-player-name">
                              {player.username}
                              {isCurrentUser && <span className="you-badge">(YOU)</span>}
                            </div>
                            <div className="compact-player-value">
                              ${((displayedTotals[player.userId] ?? 0) / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Spin Animation - shown during spinning */}
                        {spinActive && displayItems.length > 0 && (
                          <div className="spin-container-compact">
                            <div className={`spin-window-compact ${spinActive ? 'spinning' : ''} ${goldWinActive ? 'gold-win-active' : (goldWinPending ? 'gold-win-pending' : '')}`}>
                              <div
                                className="spin-reel-compact"
                                data-spinning="true"
                                data-hold={holdWinningItem}
                                style={{
                                  transform: `translate3d(0, -${currentTranslate}px, 0)`,
                                }}
                              >
                                {displayItems.map((item, itemIdx) => (
                                  <div key={itemIdx} className={`spin-item-compact rarity-${item.rarity || 'common'}`}>
                                    <div className="item-icon-compact">🎁</div>
                                    <div className="item-value-compact">${(item.value / 100).toFixed(2)}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="spin-indicator-line-compact" />
                            </div>
                          </div>
                        )}

                        {/* Cases Grid - shown when not spinning */}
                        {!spinActive && (
                          <div className="compact-cases-grid">
                            {player.cases && player.cases.slice(0, 4).map((caseItem, caseIdx) => (
                              <div key={caseIdx} className="compact-case-item">
                                <div className="compact-case-icon">📦</div>
                                <div className="compact-case-value">
                                  ${(caseItem.value / 100).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Total Amount Box */}
                        <div className="compact-total-box">
                          <span className="total-label">Total:</span>
                          <span className="total-amount">
                            ${((displayedTotals[player.userId] ?? 0) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Battle Divider - Middle (Vertical) */}
            <div className="battle-divider">
              <div className="divider-sword">⚔️</div>
              <div className="divider-vs">VS</div>
            </div>

            {/* Team 2 (Right) */}
            <div className="team-section-right">
              {players
                .filter(p => p.team === 2)
                .map((player, idx) => {
                  
                  const isCurrentUser = player.userId === user?.id;
                  const isWinner = battleEnded && battle.winnerId === player.userId;
                  
                  return (
                    <div key={idx} className="compact-player-card-wrapper">
                      <div 
                        className={`compact-player-card ${isWinner ? 'winner-card' : ''}`}
                      >
                        {/* Card Header - Avatar and Player Info */}
                        <div className="compact-card-header">
                          <div className="compact-player-avatar">
                            {player.isBot ? '🤖' : '👤'}
                          </div>
                          <div className="compact-player-details">
                            <div className="compact-player-name">
                              {player.username}
                              {isCurrentUser && <span className="you-badge">(YOU)</span>}
                            </div>
                            <div className="compact-player-value">
                              ${((displayedTotals[player.userId] ?? 0) / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Spin Animation - shown during spinning */}
                        {spinActive && displayItems.length > 0 && (
                          <div className="spin-container-compact">
                            <div className={`spin-window-compact ${spinActive ? 'spinning' : ''}`}>
                              <div
                                className="spin-reel-compact"
                                data-spinning="true"
                                data-hold={holdWinningItem}
                                style={{
                                  transform: `translate3d(0, -${currentTranslate}px, 0)`,
                                }}
                              >
                                {displayItems.map((item, itemIdx) => (
                                  <div key={itemIdx} className={`spin-item-compact rarity-${item.rarity || 'common'}`}>
                                    <div className="item-icon-compact">🎁</div>
                                    <div className="item-value-compact">${(item.value / 100).toFixed(2)}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="spin-indicator-line-compact" />
                            </div>
                          </div>
                        )}

                        {/* Cases Grid - shown when not spinning */}
                        {!spinActive && (
                          <div className="compact-cases-grid">
                            {player.cases && player.cases.slice(0, 4).map((caseItem, caseIdx) => (
                              <div key={caseIdx} className="compact-case-item">
                                <div className="compact-case-icon">📦</div>
                                <div className="compact-case-value">
                                  ${(caseItem.value / 100).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Total Amount Box */}
                        <div className="compact-total-box">
                          <span className="total-label">Total:</span>
                          <span className="total-amount">
                            ${((displayedTotals[player.userId] ?? 0) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Pot Display - shown during spinning and after battle ends */}
      {(spinActive || battleEnded) && (
        <div className={`compact-pot-display ${spinActive ? 'spinning' : ''} ${goldWinActive ? 'gold-win' : ''}`}>
          <div className="pot-content">
            <div className="pot-icon">🏆</div>
            <div className="pot-info">
              <div className="pot-label">TOTAL POT</div>
              <div className="pot-amount">
                {spinComplete || battleEnded ? `$${(Object.values(displayedTotals).reduce((sum, val) => sum + (val || 0), 0) / 100).toFixed(2)}` : '$0.00'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Battle Result Section - shown after battle ends */}
      {battleEnded && (
        <div className="compact-battle-result">
          <div className="result-content">
            <div className="result-title">🎯 BATTLE COMPLETE</div>
            <button 
              onClick={() => {
                const queryParams = new URLSearchParams({
                  mode: battle.mode || 'normal',
                  recreateFrom: battle._id
                });
                window.location.href = `/case-battles?${queryParams.toString()}`;
              }}
              className="recreate-battle-btn"
            >
              <span>🔄 RECREATE BATTLE</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}