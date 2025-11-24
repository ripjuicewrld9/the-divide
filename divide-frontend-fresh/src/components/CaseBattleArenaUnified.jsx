import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { buildReelSystem, isPremiumItem } from '../utils/spinMechanics';
import { getItemTicketRanges, getWinningItem } from '../utils/rng';
import { useTickSound } from '../hooks/useTickSound';
import { useGoldSound } from '../hooks/useGoldSound';
import { createSeededRng, pickSeeded } from '../utils/seededRng';
import '../styles/CaseBattleArenaUnified.css';

/**
 * Case Battle Arena - Unified Vertical Carousel
 * Single container with all player carousels visible together
 * Minimal top bar + Large carousel container
 */
export default function CaseBattleArena({
  battle,
  spinActive,
  battleEnded,
  battleItems,
  playerWinningIndices = {},
  onSpinComplete,
  currentCaseIndex = 0,
  totalCases = 1,
  canSummonBot = false,
  canStartCountdown = false,
  onSummonBot,
  onStartCountdown,
  countdownActive = false,
}) {
  const [displayItems, setDisplayItems] = useState([]);
  const [reelItemsLength, setReelItemsLength] = useState(0);
  const [spinParams, setSpinParams] = useState(null);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [displayedTotals, setDisplayedTotals] = useState({});
  const [goldSpinActive, setGoldSpinActive] = useState(false);
  const [premiumItems, setPremiumItems] = useState([]);
  const [landedByPlayer, setLandedByPlayer] = useState({});
  const [showPriceReveal, setShowPriceReveal] = useState(false);
  const [premiumWinnersState, setPremiumWinnersState] = useState({}); // Track actual premium wins for gold spin
  const { playTick } = useTickSound();
  const { playGold } = useGoldSound();
  const animRef = useRef(null);
  const spinStartRef = useRef(null);
  const firstPlayerParamsRef = useRef(null);
  // use per-player refs so the unified arena can render fixed slots (up to 6)
  const reelWindowRefs = useRef({});
  const firstItemRefs = useRef({});
  const newReelSystemRef = useRef(null);
  const [uniqueReelItems, setUniqueReelItems] = useState([]);
  const correctionAppliedRef = useRef(false);

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
  const MAX_SLOTS = 6; // uniform arena supports up to 6 slots
  // Render only actual players up to MAX_SLOTS. This prevents always showing 6 placeholders.
  const renderSlots = players.slice(0, MAX_SLOTS);

  // Initialize displayed totals (only once when battle loads)
  useEffect(() => {
    const initialTotals = {};
    players.forEach(p => {
      initialTotals[p.userId] = 0;
    });
    setDisplayedTotals(initialTotals);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize reel system
  // Build reel system and prepare display items; measure sizes later to compute exact scroll amounts
  useEffect(() => {
    if (battleItems && battleItems.length > 0) {
      console.log(`[Arena] Initializing reel with ${battleItems.length} items`);
      const newReelSystem = buildReelSystem(battleItems);
      newReelSystemRef.current = newReelSystem;

      // Store premium items for secondary animation
      setPremiumItems(newReelSystem.premiumItems);
      console.log(`[Arena] Premium items available: ${newReelSystem.premiumItems.length}`);

      // Create a mapping of UNIQUE items in the FILTERED reel
      const uniques = [];
      const seen = new Set();
      newReelSystem.reelItems.forEach(item => {
        const key = `${item.id}_${item.value}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniques.push(item);
        }
      });
      setUniqueReelItems(uniques);
      console.log(`[Arena] Unique items in filtered reel: ${uniques.length}`, uniques.map(i => `${i.name}(${i.id})`));

      // Store the weighted reel length
      setReelItemsLength(newReelSystem.reelItems.length);

      // REPEAT items multiple times to create infinite scroll effect
      const repeated = [];
      const repetitions = Math.ceil(2860 / (newReelSystem.reelItems.length * 100)) + 2;
      for (let i = 0; i < repetitions; i++) {
        repeated.push(...newReelSystem.reelItems);
      }
      console.log(`[Arena] Created ${repeated.length} repeated items (${repetitions} repetitions), reel length=${newReelSystem.reelItems.length}`);
      setDisplayItems(repeated);
    }
  }, [battleItems, playerWinningIndices, players]);

  // Measure actual DOM sizes (item height + container height) and compute precise spin params
  useLayoutEffect(() => {
    // Only compute when display items are rendered and we have a reel system
    const newReelSystem = newReelSystemRef.current;
    if (!newReelSystem || displayItems.length === 0 || players.length === 0) return;

    // Find a rendered slot that has refs to measure base sizes
    let containerEl = null;
    let itemEl = null;
    const keys = Object.keys(reelWindowRefs.current || {});
    for (const k of keys) {
      const c = reelWindowRefs.current[k];
      const it = firstItemRefs.current[k];
      if (c && it) {
        containerEl = c;
        itemEl = it;
        break;
      }
    }
    // If measurements not ready, wait
    if (!containerEl || !itemEl) return;

    const containerRect = containerEl.getBoundingClientRect();
    const itemRect = itemEl.getBoundingClientRect();
    const itemHeight = Math.round(itemRect.height);
    const containerHeight = Math.round(containerRect.height);
    const centerPosition = (containerHeight / 2) - (itemHeight / 2);

    console.log(`[Arena] Measured sizes: itemHeight=${itemHeight}px, containerHeight=${containerHeight}px, centerPosition=${centerPosition}px`);

    const allSpinParams = {};
    const seedBase = (battle && battle.hybridSeed) || '';
    players.forEach((player, idx) => {
      const playerIndex = playerWinningIndices[player.userId];
      let weightedIndex = 0;

      if (typeof playerIndex === 'number' && playerIndex >= 0 && playerIndex < battleItems.length) {
        const targetItem = battleItems[playerIndex];

        // Map battleItems index to weighted reel index by calculating cumulative positions
        let accumulatedIndex = 0;
        let found = false;

        for (let i = 0; i < battleItems.length; i++) {
          const item = battleItems[i];
          const itemChance = item.chance || 0;
          const itemCount = Math.round(itemChance);

          if (i === playerIndex) {
            // Found our target item - it starts at accumulatedIndex
            weightedIndex = accumulatedIndex;
            found = true;
            console.log(`[Arena] Player ${player.username}: battleItems[${playerIndex}](${targetItem.name}) -> weighted reel index ${weightedIndex} (${itemChance}% = ${itemCount} slots)`);
            break;
          }

          accumulatedIndex += itemCount;
        }

        if (!found) {
          console.warn(`[Arena] Player ${player.username}: Item ${targetItem.name} not found in reel mapping; falling back to index 0`);
          weightedIndex = 0;
        }
      }

      // compute exact scroll using measured heights
      const baseScroll = 1.5 * newReelSystem.reelItems.length * itemHeight;
      const centerOffsetAmount = (weightedIndex * itemHeight) - centerPosition;
      const totalScroll = baseScroll + centerOffsetAmount;

      const params = {
        scrollAmount: totalScroll,
        spinDuration: 5.5,
        holdDuration: 1.8,
        itemHeight,
      };

      // add visible variation per-player (deterministic)
      const rngVar = createSeededRng(seedBase + '::variation', idx);
      const variation = (rngVar() - 0.5) * 1200;
      params.scrollAmount += variation;
      params.scrollAmountWithVariation = variation;

      allSpinParams[player.userId] = params;
      console.log(`[Arena] Player ${player.username}: scrollAmount=${params.scrollAmount} (base ${totalScroll.toFixed(0)} + variation ${variation.toFixed(0)})`);
    });

    setSpinParams(allSpinParams);
  }, [displayItems, uniqueReelItems, playerWinningIndices, players, battleItems]);

  // Spin animation loop
  useEffect(() => {
    if (!spinActive || !spinParams || typeof spinParams !== 'object' || !players.length) {
      console.log(`[Arena] Animation skipped: spinActive=${spinActive}, spinParams=${!!spinParams}, players=${players.length}`);
      return;
    }

    // Get first player's spin params for animation timing (all animate together)
    const firstPlayerParams = spinParams[players[0]?.userId];
    if (!firstPlayerParams) {
      console.log(`[Arena] No spin params for first player`);
      return;
    }

    // Store for use in render function
    firstPlayerParamsRef.current = firstPlayerParams;

    console.log(`[Arena] Starting animation with spinDuration=${firstPlayerParams.spinDuration}`);
    setCurrentTranslate(0);
    setGoldSpinActive(false);
    setLandedByPlayer({});
    spinStartRef.current = null;

    const animate = (timestamp) => {
      if (!spinStartRef.current) spinStartRef.current = timestamp;
      const elapsed = timestamp - spinStartRef.current;
      const progress = Math.min(elapsed / (firstPlayerParams.spinDuration * 1000), 1);

      // CRISP CASINO ANIMATION: Fast spin with smooth deceleration
      // Uses quadratic ease-out for smooth, natural slowdown
      let easing;
      if (progress < 0.15) {
        // Quick acceleration phase (15% of time at max speed)
        easing = 1;
      } else {
        // Smooth deceleration using ease-out: starts fast, ends slow
        const decelerationProgress = (progress - 0.15) / 0.85;
        easing = 1 - decelerationProgress ** 1.5; // Smooth slowdown curve
      }

      const distance = firstPlayerParams.scrollAmount * easing;
      setCurrentTranslate(-distance);  // NEGATIVE to scroll items UP through the window

      // Detect item passes and play tick sound
      // Each item is 100px, so we play tick when distance crosses a multiple of 100px
      const itemHeight = 100;
      const currentItem = Math.floor(distance / itemHeight);
      if (elapsed > 200) { // Start detecting after initial delay
        // Store previous item count to detect when we cross an item boundary
        if (!animRef.current || animRef.current.lastItemCount === undefined) {
          animRef.current = { lastItemCount: currentItem };
        }
        if (currentItem > (animRef.current.lastItemCount || 0) && progress < 0.95) {
          playTick();
          animRef.current.lastItemCount = currentItem;
        }
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        console.log(`[Arena] Animation complete`);

        // Calculate which item each player landed on using PRE-DETERMINED RNG indices
        const landedItems = {};
        const premiumWinners = {}; // Track who won a premium (for gold spin)

        players.forEach((player, idx) => {
          // Use the winning index determined by RNG
          const rngWinningIndex = playerWinningIndices[player.userId];

          // CRITICAL: Check if this player actually won a premium using their ticket
          let actualPremiumWon = null;
          if (battle && battleItems && battleItems.length > 0) {
            const ticketKey = idx === 0 ? 'player1Ticket' : `player${idx + 1}Ticket`;
            const ticket = battle[ticketKey];

            if (ticket !== undefined) {
              try {
                // Get the actual item from the ticket
                const ranges = getItemTicketRanges(battleItems);
                const result = getWinningItem(ticket, ranges);
                const resultName = result.item;

                // Check if this is a premium item name
                if (resultName === 'ps5' || resultName === 'xbox') {
                  actualPremiumWon = {
                    name: resultName,
                    value: result.itemValue,
                  };
                  console.log(`[Arena] Player ${player.username}: Ticket ${ticket} won PREMIUM ${resultName}`);
                }
              } catch (e) {
                console.warn(`[Arena] Error checking premium status:`, e.message);
              }
            }
          }

          // If premium was actually won, mark it for gold spin
          if (actualPremiumWon) {
            premiumWinners[player.userId] = actualPremiumWon;
            // Show a random regular item on the reel instead
            const regularItems = newReelSystemRef.current?.reelItems || displayItems;
            const uniqueRegular = [...new Map(regularItems.map(item => [`${item.id}_${item.value}`, item])).values()];
            const randomRegular = pickSeeded(uniqueRegular, createSeededRng(seedBase + '::regularPick', idx));
            landedItems[player.userId] = randomRegular;
            console.log(`[Arena] Player ${player.username}: Premium ${actualPremiumWon.name} will trigger gold spin, showing regular ${randomRegular?.name} on reel`);
          } else if (typeof rngWinningIndex === 'number' && rngWinningIndex >= 0) {
            // Regular item - show directly on reel
            const winningItem = battleItems[rngWinningIndex];
            landedItems[player.userId] = winningItem;
            console.log(`[Arena] Player ${player.username}: RNG index=${rngWinningIndex}, won regular item: ${winningItem?.name}`);
          } else {
            console.warn(`[Arena] Player ${player.username}: No valid RNG index found`);
            landedItems[player.userId] = null;
          }
        });

        // For rendering, store the display index of the first matching item in the repeating array
        const renderIndices = {};
        players.forEach(player => {
          const item = landedItems[player.userId];
          if (item) {
            // Find index of this item in displayItems (will be within first reelItems repeat)
            const displayIndex = displayItems.findIndex(i => i.id === item.id && i.value === item.value);
            renderIndices[player.userId] = displayIndex >= 0 ? displayIndex : 0;
          }
        });

        setLandedByPlayer(renderIndices);

        // Store premium winners for gold spin animation
        if (Object.keys(premiumWinners).length > 0) {
          console.log(`[Arena] Premium winners for gold spin:`, premiumWinners);
          setPremiumWinnersState(premiumWinners);
        } else {
          setPremiumWinnersState({});
        }

        // Show price reveal immediately
        setShowPriceReveal(true);

        // Settle all players to their final positions (they all use the same animation)
        const finalPos = -firstPlayerParams.scrollAmount;
        setCurrentTranslate(finalPos);

        // After settling, measure actual landing offsets in DOM to detect any mis-centering
        setTimeout(() => {
          try {
            const deltas = [];
            players.forEach(p => {
              const displayIdx = renderIndices[p.userId];
              if (displayIdx === undefined) return;

              const containerEl = reelWindowRefs.current[p.userId];
              if (!containerEl) return;
              const indicatorRect = containerEl.getBoundingClientRect();
              const indicatorCenterY = indicatorRect.top + (indicatorRect.height / 2);

              const carouselEl = containerEl.querySelector('.carousel-reel');
              if (!carouselEl) return;
              const itemEl = carouselEl.children[displayIdx];
              if (!itemEl) return;
              const itemRect = itemEl.getBoundingClientRect();
              const itemCenterY = itemRect.top + (itemRect.height / 2);
              const delta = Math.round(itemCenterY - indicatorCenterY);
              deltas.push({ userId: p.userId, username: p.username, delta });
              if (Math.abs(delta) > 2) {
                console.warn(`[Arena][CenterCheck] Player ${p.username}: landed item center is ${delta}px ${delta > 0 ? 'below' : 'above'} indicator center`);
              } else {
                console.log(`[Arena][CenterCheck] Player ${p.username}: landed item centered (delta=${delta}px)`);
              }
            });

            // If we detect a consistent offset and haven't applied correction yet, apply a one-time correction
            if (!correctionAppliedRef.current && deltas.length > 0) {
              // Use median delta to avoid outliers
              const sorted = deltas.map(d => d.delta).sort((a, b) => a - b);
              const mid = Math.floor(sorted.length / 2);
              const median = sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
              if (Math.abs(median) > 2) {
                // Adjust current translate by -median so items move into center
                setCurrentTranslate(prev => {
                  const adjusted = prev - median;
                  console.log(`[Arena][CenterCheck] Applying one-time centering correction: ${-median}px (prev=${prev}, adjusted=${adjusted})`);
                  return adjusted;
                });
                correctionAppliedRef.current = true;
              }
            }
          } catch (err) {
            console.error('[Arena][CenterCheck] Measurement failed', err);
          }

          // After 2 seconds of holding the revealed prices, proceed with the result
          setTimeout(() => {
            setShowPriceReveal(false);
            console.log(`[Arena] Proceeding after price reveal hold`);

            // Check if ANY player won a premium item (gold trigger secondary animation)
            // Premium winners are stored in premiumWinnersState
            const hasAnyGold = Object.keys(premiumWinnersState).length > 0;

            if (hasAnyGold) {
              console.log(`[Arena] At least one player got GOLD TRIGGER! Starting secondary animation...`, premiumWinnersState);
              playGold(); // Play gold sound
              setGoldSpinActive(true);
            } else {
              // No gold spin, call completion immediately
              console.log(`[Arena] No gold trigger, calling onSpinComplete`);
              onSpinComplete?.();
            }
          }, 2000);
        }, 80);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinActive, spinParams, displayItems, reelItemsLength, players, displayedTotals, onSpinComplete, premiumItems, battleItems, premiumWinnersState]);

  // Handle gold spin completion
  useEffect(() => {
    if (!goldSpinActive) return;

    console.log(`[Gold Spin] Gold spin showing premium items`);

    // After gold spin visuals, deactivate after 2 seconds
    const timeout = setTimeout(() => {
      console.log(`[Gold Spin] Gold spin animation complete`);
      setGoldSpinActive(false);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [goldSpinActive]);

  // Render player carousel
  const renderPlayerCarousel = (player) => {
    // Check if this player won a premium in the gold spin
    const playerPremiumWin = premiumWinnersState[player.userId];
    const isGoldWinning = goldSpinActive && playerPremiumWin;

    // Get this player's spin params and calculate their individual scroll position
    const playerSpinParams = spinParams ? spinParams[player.userId] : null;
    let reelTranslate = currentTranslate;

    if (playerSpinParams && spinActive && firstPlayerParamsRef.current) {
      // Scale currentTranslate by this player's scroll amount vs the base scroll amount
      // This makes each player scroll a different amount while maintaining animation timing
      const baseScrollAmount = firstPlayerParamsRef.current.scrollAmount;
      const playerScrollAmount = playerSpinParams.scrollAmount;
      const scrollRatio = playerScrollAmount / baseScrollAmount;
      reelTranslate = currentTranslate * scrollRatio;
    }

    // Determine which items to display
    let itemsToDisplay = displayItems;
    let goldenItem = null; // The premium item this player won

    if (isGoldWinning && premiumItems.length > 0) {
      // Create repeated premium items for gold spin, with the actual winner positioned at center
      goldenItem = playerPremiumWin;
      const repeated = [];
      const repetitions = 10;
      for (let i = 0; i < repetitions; i++) {
        repeated.push(...premiumItems);
      }
      itemsToDisplay = repeated;
      reelTranslate = currentTranslate; // Use main animation for gold spin on unified reel
    }

    return (
      <div key={player.userId} className="player-carousel" data-userid={player.userId}>
        <div className="carousel-header">
          <span className="player-name">{player.username}</span>
          {player.isBot && <span className="bot-badge">🤖</span>}
        </div>

        <div className="carousel-reel-container">
          <div className="carousel-reel-window" ref={el => {
            if (el) reelWindowRefs.current[player.userId] = el;
            else delete reelWindowRefs.current[player.userId];
          }}>
            <div
              className={`carousel-reel ${isGoldWinning ? 'gold-active' : ''}`}
              style={{
                transform: `translateY(${reelTranslate}px)`,
              }}
            >
              {itemsToDisplay.map((item, idx) => {
                // attach ref to first rendered item so we can measure sizes per-slot
                const itemRefProps = idx === 0 ? {
                  ref: el => {
                    if (el) firstItemRefs.current[player.userId] = el;
                    else delete firstItemRefs.current[player.userId];
                  }
                } : {};
                // Check if this item is at the center (landed position) for this player
                const playerLandedIndex = landedByPlayer[player.userId];
                const isLanded = playerLandedIndex !== null && playerLandedIndex !== undefined && idx % displayItems.length === playerLandedIndex % displayItems.length;

                // Show the div.png only during gold spin for the actual premium item this player won
                const shouldShowDiv = isGoldWinning && goldenItem && item.id === goldenItem.id && item.value === goldenItem.value && isLanded;

                return (
                  <div
                    key={idx}
                    {...itemRefProps}
                    className={`carousel-item rarity-${item.rarity || 'common'} ${isGoldWinning ? 'gold-item' : ''} ${isLanded ? 'landed' : ''}`}
                  >
                    <div className="item-content">
                      {shouldShowDiv ? (
                        <img src="/div.png" alt="Gold Trigger" className="gold-trigger-img" />
                      ) : item.image ? (
                        <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <div className="item-icon">{isGoldWinning ? '✨' : '🎁'}</div>
                          <div className="item-name">{item.name}</div>
                          {isLanded && showPriceReveal && !isPremiumItem(item) && <div className="item-value">${(item.value).toFixed(2)}</div>}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="carousel-indicator" />
          </div>
        </div>

        <div className="carousel-total">
          {displayedTotals[player.userId] ? `$${(displayedTotals[player.userId]).toFixed(2)}` : '$0.00'}
        </div>
      </div>
    );
  };

  return (
    <div className="battle-arena-unified">
      {/* MINIMAL TOP BAR */}
      <div className="top-bar">
        <div className="top-left">
          <span className="round-text">Round</span>
          <span className="round-display">{currentCaseIndex + 1}/{totalCases}</span>
        </div>

        <div className="top-right">
          <span className="value-label">Battle Value</span>
          <span className="value-amount">${((Object.values(displayedTotals).reduce((sum, val) => sum + (val || 0), 0))).toFixed(2)}</span>
        </div>
      </div>

      {/* MAIN UNIFIED CONTAINER - Teams separated by gap */}
      <div className="carousels-main">
        <div className="carousels-inner">
          {/* Team 1 reels */}
          <div className="team-group team-1">
            {renderSlots.filter(p => p.team === 1).map(slot => renderPlayerCarousel(slot))}
          </div>

          {/* Team 2 reels */}
          <div className="team-group team-2">
            {renderSlots.filter(p => p.team === 2).map(slot => renderPlayerCarousel(slot))}
          </div>
        </div>

        {/* Action Button - Call Bot or Start Battle */}
        {!spinActive && !countdownActive && !battleEnded && (
          <div className="battle-action-overlay">
            {canSummonBot && (
              <button
                onClick={onSummonBot}
                className="btn btn-bot-primary"
              >
                🤖 CALL BOT
              </button>
            )}

            {canStartCountdown && (
              <button
                onClick={onStartCountdown}
                className="btn btn-start-primary"
              >
                ▶️ START BATTLE
              </button>
            )}
          </div>
        )}
      </div>

      {/* BATTLE END TOAST */}
      {battleEnded && (
        <div className="battle-end-toast">
          <div className="toast-content">
            <span className="toast-icon">✨</span>
            <span className="toast-text">Battle Complete!</span>
          </div>
        </div>
      )}
    </div>
  );
}
