import React, { useEffect, useRef, useState, forwardRef, useCallback, useContext } from 'react';
import gsap from 'gsap';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { createEnhancedAudioContext, animationUtils, ENHANCEMENT_STYLES } from '../systems/caseBattleEnhancements';
import '../styles/CaseBattleArenaReel.css';
import { createSeededRng, shuffleSeeded } from '../utils/seededRng';

const ITEMS = [
  { emoji: '🔫', name: 'Weapon', value: 100 },
  { emoji: '🎮', name: 'Controller', value: 150 },
  { emoji: '💎', name: 'Diamond', value: 500 },
  { emoji: '💰', name: 'Money', value: 600 },
  { emoji: '🎯', name: 'Target', value: 350 },
  { emoji: '🔥', name: 'Fire', value: 450 },
  { emoji: '⚡', name: 'Lightning', value: 380 },
  { emoji: '🏆', name: 'Trophy', value: 700 },
  { emoji: '👑', name: 'Crown', value: 550 },
  { emoji: '🌟', name: 'Star', value: 400 },
];

// Web Audio API for sounds - using enhanced audio context
const enhancedAudio = createEnhancedAudioContext();

// Legacy sound manager for compatibility
const createAudioContext = () => {
  const playTickSound = (volume = 0.5) => {
    enhancedAudio.playSpinTick(800, volume * 0.5);
  };
  
  const playTone = (frequency, duration, volume = 0.3) => {
    const now = enhancedAudio.audioContext.currentTime;
    const osc = enhancedAudio.audioContext.createOscillator();
    const gain = enhancedAudio.audioContext.createGain();
    
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(enhancedAudio.audioContext.destination);
    
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.start(now);
    osc.stop(now + duration);
  };
  
  return { audioContext: enhancedAudio.audioContext, playTone, playTickSound };
};

const soundManager = createAudioContext();

// Single Player Card Component - with forwardRef to expose reveal method
const PlayerCard = forwardRef(({ player, battleId, onSummon, onReveal, caseItemsData, goldSpinActive, goldSpinPlayer }, ref) => {
  const isEmpty = player.id.startsWith('empty-');
  const [buttonState, setButtonState] = useState('SUMMON');
  const [isRevealing, setIsRevealing] = useState(false);
  const cardRef = useRef(null);
  const reelRef = useRef(null);

  // Expose revealCard method to parent via ref
  React.useImperativeHandle(ref, () => ({
    reveal: revealCard,
  }));

  const handleSummon = async () => {
    if (buttonState !== 'SUMMON') return;
    
    setButtonState('FILLING');
    try {
      const res = await api.post(`/case-battles/${battleId}/summon-bot`, {});
      if (res.success) {
        setButtonState('FILLED');
        onSummon?.();
      } else {
        setButtonState('SUMMON');
      }
    } catch (err) {
      console.error('Error summoning bot:', err);
      // If server indicates battle became full while attempting to summon, treat as filled
      const errMsg = err?.error || err?.message || '';
      if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('battle is already full')) {
        setButtonState('FILLED');
        onSummon?.();
      } else {
        setButtonState('SUMMON');
      }
    }
  };

  const revealCard = async () => {
    if (isRevealing || isEmpty) {
      console.log('[Reveal] Skipped:', { isRevealing, isEmpty, playerId: player.id });
      return Promise.resolve();
    }
    
    console.log('[Reveal] Starting reveal for', player.id, 'with', player.cases?.length, 'cases');
    return new Promise((resolve) => {
      setIsRevealing(true);

      const playerCases = player.cases || [];
      let runningTotal = 0;

      // Function to reveal one case at a time
      const revealNextCase = async (caseIndex) => {
        if (caseIndex >= playerCases.length) {
          // All cases revealed - wait for gold spin to complete if one was triggered
          const waitForGoldSpin = async () => {
            // Check if this player triggered a gold spin
            const hasGoldSpin = goldSpinPlayer === player.id;
            if (hasGoldSpin && goldSpinActive) {
              console.log('[Reveal] Waiting for gold spin to complete for', player.id);
              // Wait up to 10 seconds for gold spin to finish
              let waitTime = 0;
              while (goldSpinActive && waitTime < 10000) {
                await new Promise(r => setTimeout(r, 100));
                waitTime += 100;
              }
              console.log('[Reveal] Gold spin complete, proceeding for', player.id);
            }
            
            // All cases revealed - round to 2 decimal places for currency
            const finalTotal = Math.round(runningTotal * 100) / 100;
            console.log('[Reveal] Complete for', player.id, 'value:', finalTotal);
            setIsRevealing(false);
            onReveal?.({ playerId: player.id, value: finalTotal });
            resolve({ playerId: player.id, value: finalTotal });
          };
          
          waitForGoldSpin();
          return;
        }

        const caseItem = playerCases[caseIndex];
        const caseValue = caseItem.itemValue || 0;
        runningTotal += caseValue;
        // Round to prevent floating point errors
        runningTotal = Math.round(runningTotal * 100) / 100;

        console.log(`[Reveal] Case ${caseIndex + 1}/${playerCases.length} for ${player.id}: ${caseItem.drawnItem} = ${caseValue}, running total = ${runningTotal}`);

        // Prepare reel with items BEFORE animation
        if (reelRef.current) {
          reelRef.current.innerHTML = '';
          reelRef.current.style.visibility = 'visible';
          reelRef.current.style.opacity = '1';
          
          // Get all items from battle's case items data
          const caseItems = caseItemsData || [];
          const drawnItemName = caseItem.drawnItem || '❓';
          
          console.log(`[Reel] Building reel for ${caseItem.caseName}, items available: ${caseItems.length}, drawn: ${drawnItemName}`);
          
          // Find the drawn item
          const drawnItem = caseItems.find(it => it.name === drawnItemName) || { name: drawnItemName, image: null };
          
          // Check if this is a gold spin item (≤2% chance)
          const isGoldSpinItem = (drawnItem.chance || 0) <= 2;
          
            console.log(`[Reel] Drawn item: ${drawnItem.name}, chance: ${drawnItem.chance}%, isGoldSpin: ${isGoldSpinItem}`);

            // Preload drawn item image to avoid visual mismatch during landing
            const preloadImage = (url, timeout = 700) => new Promise(resolve => {
              if (!url) return resolve();
              let settled = false;
              const img = new Image();
              const onDone = () => {
                if (settled) return;
                settled = true;
                resolve();
              };
              img.onload = onDone;
              img.onerror = onDone;
              img.src = url;
              // Safety timeout in case image never resolves
              setTimeout(onDone, timeout);
            });

            // Wait for the drawn item's image (or timeout) before building the wheel DOM
              try {
              await preloadImage(drawnItem?.image);
              console.debug('[Reel] Preloaded drawn item image for', drawnItem?.name);
            } catch (e) {
              console.warn('[Reel] Preload error (ignored):', e);
            }

            // Build a reel sequence with items weighted by their odds
          // This creates a realistic spinning effect where item frequency matches odds
          const reelSequence = [];
          const seedBase = (player && (player.hybridSeed || player.seed)) || battleId || '';
          
          // Helper to pick weighted random items
          const pickWeightedRandomItem = (items, rng) => {
            const totalChance = items.reduce((sum, item) => sum + (item.chance || 0), 0);
            const ticket = Math.floor(rng() * 100000); // 0-99999
            let runningTotal = 0;
            
            for (const item of items) {
              const itemChanceScaled = ((item.chance || 0) / totalChance) * 100000;
              if (ticket < runningTotal + itemChanceScaled) {
                return item;
              }
              runningTotal += itemChanceScaled;
            }
            return items[items.length - 1]; // Fallback
          };
          
          // Build reel with 50 randomly selected items weighted by odds
          // This is much longer than before and respects actual probabilities
          for (let i = 0; i < 50; i++) {
            const rng = createSeededRng(seedBase + '::reel_item', caseIndex * 100 + i);
            const selectedItem = pickWeightedRandomItem(caseItems, rng);
            reelSequence.push(selectedItem);
          }
          
          console.log(`[Reel] Built reel with 50 weighted random items from ${caseItems.length} available`);
          
          // Add the drawn item at the end
          // For gold spins: add the actual drawn item so the reel lands on it
          // (the secondary gold spin animation will show afterwards)
          // For regular items: add the drawn item directly
          reelSequence.push(drawnItem);
          
          console.log(`[Reel] Sequence length: ${reelSequence.length}, drawn item:`, drawnItem, 'isGoldSpin:', isGoldSpinItem);
          
          // Filter reel sequence to hide gold items unless we're in gold spin mode
          const filteredSequence = reelSequence.filter((item, index) => {
            // Always show the final item (drawnItem)
            if (index === reelSequence.length - 1) {
              return true;
            }
            // Skip gold items in main reel (only show regular items)
            if (item?.isGoldTrigger) {
              return false;
            }
            return true;
          });
          
          console.log(`[Reel] Filtered sequence length: ${filteredSequence.length} (was ${reelSequence.length})`);
          console.log(`[Reel DEBUG] Last item in filtered sequence (should be drawn item):`, filteredSequence[filteredSequence.length - 1]?.name, 'drawnItem was:', drawnItem.name, 'Match:', filteredSequence[filteredSequence.length - 1]?.name === drawnItem.name);
          
          // EARLY CALCULATION: Calculate landing index before building wheel
          const repeatCount = 8; // Repeat the sequence 8 times for a long wheel
          const ITEM_HEIGHT = 90; // 80px image + 10px padding
          const WINDOW_HEIGHT = 165;
          const CENTER_OFFSET = (WINDOW_HEIGHT - ITEM_HEIGHT) / 2; // 37.5px
          const landingCycle = repeatCount - 1; // Land in the final cycle
          const drawnItemIndexInCycle = filteredSequence.length - 1;
          const landingIndex = (landingCycle * filteredSequence.length) + drawnItemIndexInCycle;
          
          // Create a repeating reel wheel - duplicate the sequence multiple times so it loops infinitely
          // This creates the illusion of a spinning wheel rather than linear scrolling
          const wheelSequence = [];
          for (let r = 0; r < repeatCount; r++) {
            wheelSequence.push(...filteredSequence);
          }
          
          console.log(`[Reel] Created wheel with ${wheelSequence.length} items (${repeatCount} repeats of ${filteredSequence.length})`);
          console.log(`[Reel DEBUG] PRE-DOM Landing calculation: cycle=${landingCycle}, indexInCycle=${drawnItemIndexInCycle}, totalIndex=${landingIndex}, should land on:`, wheelSequence[landingIndex]?.name, 'with image:', wheelSequence[landingIndex]?.image);
          
          // EXTREME DEBUG: Log every 50th item to verify wheel sequence
          console.log('[Reel DEBUG] Wheel sample at every 50 items:');
          for (let s = 0; s < wheelSequence.length; s += 50) {
            console.log(`  [${s}]: ${wheelSequence[s]?.name}`);
          }
          console.log(`  [${landingIndex}]: ${wheelSequence[landingIndex]?.name} <-- LANDING POSITION`);
          
          // Ensure reel container is properly set up
          if (reelRef.current) {
            reelRef.current.style.position = 'absolute';
            reelRef.current.style.top = '0';
            reelRef.current.style.left = '0';
            reelRef.current.style.display = 'flex';
            reelRef.current.style.flexDirection = 'column';
            reelRef.current.style.width = '100%';
            reelRef.current.style.zIndex = '1';
          }
          
          // Clear and rebuild reel with wheel items
          // Preload all images used in this wheel to avoid layout shifts / mismatches
          const uniqueWheelImages = Array.from(new Set(wheelSequence.map(it => it?.image).filter(Boolean)));
              if (uniqueWheelImages.length) {
            try {
              await Promise.all(uniqueWheelImages.map(url => preloadImage(url)));
              console.debug('[Reel] Preloaded wheel images count:', uniqueWheelImages.length);
            } catch (e) {
              console.warn('[Reel] Error preloading wheel images (ignored):', e);
            }
          }

          if (reelRef.current) {
            reelRef.current.innerHTML = '';
          }

          console.log(`[Reel] Building DOM with ${wheelSequence.length} items. First 5:`, wheelSequence.slice(0, 5).map(i => i.name), '... Last 5:', wheelSequence.slice(-5).map(i => i.name));
          
          // DEBUG: Log the landing position item
          console.log(`[Reel DEBUG] Landing index ${landingIndex} should have:`, wheelSequence[landingIndex]?.name, 'with image:', wheelSequence[landingIndex]?.image);
          
          for (let i = 0; i < wheelSequence.length; i++) {
            const item = wheelSequence[i];
            
            // DEBUG: Log items being rendered at critical positions
            if (i === landingIndex || i === landingIndex - 1 || i === landingIndex + 1) {
              console.log(`[Reel DEBUG] Building DOM item at index ${i}: ${item?.name} (image: ${item?.image})`);
            }
            
            const itemEl = document.createElement('div');
            itemEl.className = 'reel-item';
            // DEBUG: Mark landing position item
            if (i === landingIndex) {
              itemEl.id = `landing-item-${player.id}`;
              itemEl.dataset.landingPosition = 'true';
              console.log(`[Reel DEBUG] Marked element at index ${i} with id landing-item-${player.id}`);
            }
            
            // For gold spin items in gold spin mode, show div.png
            if (item?.isGoldTrigger) {
              const img = document.createElement('img');
              img.src = '/div.png';
              img.alt = 'Gold Spin';
              img.style.width = '80px';
              img.style.height = '80px';
              img.style.objectFit = 'contain';
              img.style.padding = '5px';
              itemEl.appendChild(img);
            } else {
              // Display item image or placeholder
              const imageUrl = item?.image || `https://via.placeholder.com/80/${(item?.color || '#808080').substring(1)}?text=${encodeURIComponent((item?.name || 'Item').substring(0, 3))}`;
              const img = document.createElement('img');
              img.src = imageUrl;
              img.alt = item?.name || 'Item';
              img.style.width = '80px';
              img.style.height = '80px';
              img.style.objectFit = 'contain';
              img.style.padding = '5px';
              img.onerror = () => {
                // If image fails, fallback to colored box with text
                img.style.display = 'none';
                itemEl.style.backgroundColor = item?.color || '#808080';
                itemEl.style.width = '80px';
                itemEl.style.height = '80px';
                itemEl.style.display = 'flex';
                itemEl.style.alignItems = 'center';
                itemEl.style.justifyContent = 'center';
                itemEl.style.color = 'white';
                itemEl.style.fontSize = '10px';
                itemEl.style.fontWeight = 'bold';
                itemEl.style.textAlign = 'center';
                itemEl.style.padding = '5px';
                itemEl.style.overflow = 'hidden';
                itemEl.textContent = item?.name || '?';
              };
              itemEl.appendChild(img);
            }
            reelRef.current.appendChild(itemEl);
          }

          // Kill any existing GSAP animations on this reel
          gsap.killTweensOf(reelRef.current);
          
          // Reset reel position to 0 for fresh animation
          gsap.set(reelRef.current, { y: 0 });
          
          // Ensure reel items container is visible
          if (reelRef.current) {
            reelRef.current.style.visibility = 'visible';
            reelRef.current.style.opacity = '1';
            reelRef.current.style.pointerEvents = 'none';
          }
          
          soundManager.playTone(400, 0.1, 0.2);

          // ALREADY CALCULATED ABOVE - just use the values
          const finalPosition = -(landingIndex * ITEM_HEIGHT) + CENTER_OFFSET;
          const landingItem = wheelSequence[landingIndex]; // Get the actual item at landing position
          
          console.log(`[Reel] Landing calculation: cycle=${landingCycle}, indexInCycle=${drawnItemIndexInCycle}, totalIndex=${landingIndex}, landingItem=`, landingItem?.name, `(image: ${landingItem?.image}), drawnItem=`, drawnItem.name);

          // Realistic slot machine spin: smooth acceleration, long coast, gradual deceleration
          // Single easing curve creates natural feel without jank
          
          let spinTimeline = gsap.timeline();
          
          // Single smooth animation: accelerate quickly, coast, then decelerate smoothly to landing
          // Total duration: 4.5s with natural easing throughout
          spinTimeline.to(reelRef.current, {
            y: finalPosition,
            duration: 4.5,
            ease: 'sine.inOut', // Sine easing drifts to a smooth stop (very gentle deceleration)
            onStart: () => {
              // Play tick sounds throughout most of the spin (after initial acceleration)
              let tickCount = 0;
              setTimeout(() => {
                const tickInterval = setInterval(() => {
                  if (tickCount >= 12) { // 12 ticks over ~2.4s of coast/decel
                    clearInterval(tickInterval);
                    return;
                  }
                  soundManager.playTickSound(0.3);
                  tickCount++;
                }, 200); // Every 200ms
              }, 600); // Start ticks after 0.6s (acceleration phase)
            },
            onComplete: () => {
              gsap.set(reelRef.current, { y: finalPosition });
            }
          });
          
          spinTimeline.eventCallback('onComplete', () => {
              // Hold the final position - don't wrap back
              // Play landing sound
              soundManager.playTone(800, 0.2, 0.3);
              // This keeps the drawn item visible
              gsap.set(reelRef.current, { y: finalPosition });
              
              // Apply item reveal animation
              animationUtils.itemRevealFlash(reelRef.current);
              
              // DEBUG: Check what's actually visible at window center
              setTimeout(() => {
                const currentTransform = gsap.getProperty(reelRef.current, 'y');
                // Derive index from the formula used when positioning: y = -index*ITEM_HEIGHT + CENTER_OFFSET
                const visibleItemIndex = Math.round((CENTER_OFFSET - currentTransform) / ITEM_HEIGHT);
                const visibleItem = wheelSequence[visibleItemIndex];
                console.log(`[Reveal] Window center check: transform=${currentTransform}, calculated visible index=${visibleItemIndex}, visible item=${visibleItem?.name}, expected=${drawnItem.name}, match=${visibleItem?.name === drawnItem.name}`);
              }, 100);
              
              soundManager.playTone(800, 0.1, 0.2);
              
              // Show item reveal panel
              const revealPanel = document.getElementById(`reveal-panel-${player.id}`);
              const revealName = document.getElementById(`reveal-name-${player.id}`);
              const revealValue = document.getElementById(`reveal-value-${player.id}`);
              
              console.log('[Reveal] Panel lookup:', { revealPanel: !!revealPanel, revealName: !!revealName, revealValue: !!revealValue });
              console.log('[Reveal] Drawn item data:', { name: drawnItem.name, value: drawnItem.value, chance: drawnItem.chance, caseValue });

              // Ensure the visual landing element actually shows the drawn item
              // There have been issues where the reel scrolled to the correct index
              // but due to layout shifts or timing the displayed image didn't match
              // the drawn item. Force the landing element's content to the drawn
              // item's image to guarantee visual consistency.
              try {
                const landingEl = document.getElementById(`landing-item-${player.id}`);
                  if (landingEl) {
                  // Replace landing element contents with a stable image element
                  landingEl.innerHTML = '';
                  const img = document.createElement('img');
                  // Use drawnItem.image if available otherwise a small placeholder
                  const imageUrl = drawnItem?.image || (drawnItem?.color ? `https://via.placeholder.com/80/${(drawnItem.color || '#808080').replace('#','')}` : `https://via.placeholder.com/80?text=${encodeURIComponent((drawnItem?.name||'Item').substring(0,3))}`);
                  img.src = imageUrl;
                  img.alt = drawnItem?.name || 'Item';
                  img.style.width = '80px';
                  img.style.height = '80px';
                  img.style.objectFit = 'contain';
                  img.style.padding = '5px';
                  landingEl.appendChild(img);
                  // Tag the element so debugging can confirm we forced content
                  landingEl.dataset.forcedLanding = 'true';
                  console.debug('[Reel] Forced visual landing element to drawnItem for', player.id, drawnItem?.name);
                }
              } catch (e) {
                console.warn('[Reel] Error forcing landing element content:', e);
              }

              // Deterministic visible-index check: compute visible index from the
              // current transform value (GSAP) and compare the wheelSequence value.
              // ElementFromPoint can return overlay elements or null; using the
              // transform math avoids that flakiness.
              try {
                const currentTransform = gsap.getProperty(reelRef.current, 'y');
                const visibleItemIndex = Math.round((CENTER_OFFSET - currentTransform) / ITEM_HEIGHT);
                const visibleItem = wheelSequence[visibleItemIndex];
                const visibleMatches = visibleItem?.name === drawnItem.name;
                console.debug('[Reveal] Transform center check:', { transform: currentTransform, visibleItemIndex, visibleItem: visibleItem?.name, matches: visibleMatches });

                if (!visibleMatches) {
                  // Replace landing element to guarantee the visible asset matches drawn item
                  const landingEl2 = document.getElementById(`landing-item-${player.id}`);
                  if (landingEl2) {
                    landingEl2.innerHTML = '';
                    const img2 = document.createElement('img');
                    const imageUrl2 = drawnItem?.image || (drawnItem?.color ? `https://via.placeholder.com/80/${(drawnItem.color || '#808080').replace('#','')}` : `https://via.placeholder.com/80?text=${encodeURIComponent((drawnItem?.name||'Item').substring(0,3))}`);
                    img2.src = imageUrl2;
                    img2.alt = drawnItem?.name || 'Item';
                    img2.style.width = '80px';
                    img2.style.height = '80px';
                    img2.style.objectFit = 'contain';
                    img2.style.padding = '5px';
                    landingEl2.appendChild(img2);
                    landingEl2.dataset.forcedLanding = 'true';
                    console.warn('[Reel] Visible-index mismatch detected — forced landing element replaced for', player.id, drawnItem?.name, 'expected:', drawnItem.name, 'saw:', visibleItem?.name);
                  }

                  // Ensure reveal panel text matches the drawn item if we're not doing a gold spin
                  if (!isGoldSpinItem) {
                    if (revealName && revealValue && revealPanel) {
                      const displayName = drawnItem.name || 'Unknown Item';
                      const displayValue = caseValue || drawnItem.value || 0;
                      revealName.textContent = displayName;
                      revealValue.textContent = `$${displayValue}`;
                      // Defer showing the reveal panel until after paint so forced image is visible
                      requestAnimationFrame(() => requestAnimationFrame(() => {
                        revealPanel.classList.add('show');
                      }));
                      console.warn('[Reel] Reveal panel overridden to drawn item for', player.id);
                    }
                  }
                }
              } catch (errCenter) {
                console.warn('[Reveal] Transform-based center check failed:', errCenter);
              }
              
              // If this is a gold spin item, DON'T show reveal yet - wait for secondary spin
              if (!isGoldSpinItem && revealPanel && revealName && revealValue) {
                const displayName = drawnItem.name || 'Unknown Item';
                const displayValue = caseValue || drawnItem.value || 0; // Use caseValue which is the actual drawn item's value
                console.log('[Reveal] Displaying (expected to match landing):', { displayName, displayValue });
                revealName.textContent = displayName;
                revealValue.textContent = `$${displayValue}`;
                // Defer showing the reveal panel until after paint so forced image is visible
                requestAnimationFrame(() => requestAnimationFrame(() => {
                  revealPanel.classList.add('show');
                }));
              }
              
              // If this is a gold spin item, trigger secondary spin
              if (isGoldSpinItem) {
                console.log('[Reel] Triggering secondary gold spin animation');
                
                // Hold on div.png for 2 seconds
                setTimeout(async () => {
                  // Now build the gold spin sequence: spin through gold items only
                  // Find premium items (≤2% chance)
                  const goldItems = caseItems.filter(it => (it.chance || 0) <= 2);
                  
                  console.log(`[GoldSpin] Secondary spin with ${goldItems.length} gold items`);
                  
                  // Build secondary reel with only gold items
                  const goldReelSequence = [];
                  
                  // Shuffle gold items deterministically and add multiple times
                  for (let s = 0; s < 2; s++) {
                    const rngG = createSeededRng(seedBase + '::gold', caseIndex * 100 + s);
                    goldReelSequence.push(...shuffleSeeded(goldItems, rngG));
                  }
                  
                  // Add the actual drawn item at the end (for second spin)
                  goldReelSequence.push(drawnItem);
                  
                  // Hide reveal panel during secondary spin
                  if (revealPanel) {
                    revealPanel.classList.remove('show');
                  }
                  
                  // Update reel HTML with gold items only
                  reelRef.current.innerHTML = '';
                  
                  // Preload gold spin images before building DOM to avoid flicker
                  const uniqueGoldImages = Array.from(new Set(goldReelSequence.map(it => it?.image).filter(Boolean)));
                  if (uniqueGoldImages.length) {
                    try {
                      await Promise.all(uniqueGoldImages.map(url => preloadImage(url)));
                      console.debug('[GoldSpin] Preloaded gold images count:', uniqueGoldImages.length);
                    } catch (e) {
                      console.warn('[GoldSpin] Error preloading gold images (ignored):', e);
                    }
                  }

                  for (let i = 0; i < goldReelSequence.length; i++) {
                    const item = goldReelSequence[i];
                    const itemEl = document.createElement('div');
                    itemEl.className = 'reel-item';
                    
                    if (item && item.image) {
                      const img = document.createElement('img');
                      img.src = item.image;
                      img.alt = item.name || 'Item';
                      img.style.width = '80px';
                      img.style.height = '80px';
                      img.style.objectFit = 'contain';
                      img.style.padding = '5px';
                      itemEl.appendChild(img);
                    } else {
                      itemEl.textContent = '🎁';
                    }
                    reelRef.current.appendChild(itemEl);
                  }
                  
                  
                  // Reset and animate secondary spin
                  gsap.set(reelRef.current, { y: 0 });
                  
                  soundManager.playTone(600, 0.1, 0.15);
                  
                  const goldLandingIndex = goldReelSequence.length - 1;
                  const goldFinalPosition = -(goldLandingIndex * ITEM_HEIGHT) + CENTER_OFFSET;
                  
                  // Secondary spin: slightly faster and more dramatic
                  gsap.to(reelRef.current, {
                    y: goldFinalPosition,
                    duration: 2.5,
                    ease: 'power2.inOut',
                    onComplete: () => {
                      gsap.set(reelRef.current, { y: goldFinalPosition });
                      
                      soundManager.playTone(1000, 0.15, 0.25);
                      
                      // Show reveal panel for gold item
                      if (revealName && revealValue) {
                        revealName.textContent = drawnItem.name || 'Unknown Item';
                        revealValue.textContent = `$${caseValue || drawnItem.value || 0}`; // Use caseValue which is the actual drawn item's value
                        if (revealPanel) {
                          // Defer showing until after paint so forced image is visible
                          requestAnimationFrame(() => requestAnimationFrame(() => {
                            revealPanel.classList.add('show');
                          }));
                        }
                      }
                      
                      // Gold glow with enhanced effect
                      gsap.to(cardRef.current, {
                        boxShadow: '0 0 40px rgba(255, 215, 0, 1)',
                        duration: 0.3,
                        yoyo: true,
                        repeat: 3,
                      });

                      soundManager.playTone(1400, 0.15, 0.2);
                      
                      // Cyan glow
                      gsap.to(cardRef.current, {
                        boxShadow: '0 10px 50px rgba(0, 255, 255, 0.8)',
                        duration: 0.5,
                        yoyo: true,
                        repeat: 1,
                      });

                      // Move to next case after animations complete
                      setTimeout(() => {
                        if (revealPanel) {
                          revealPanel.classList.remove('show');
                        }
                        onReveal?.({ 
                          playerId: player.id, 
                          itemName: drawnItemName,
                          itemRarity: drawnItem.rarity || 'common',
                          value: caseValue,
                          isGoldSpinWin: true
                        });
                        revealNextCase(caseIndex + 1);
                      }, 2000);
                    },
                  });
                }, 2000);
              } else {
                // Regular item - no secondary spin
                // Glow animations
                gsap.to(cardRef.current, {
                  boxShadow: '0 0 30px rgba(255, 215, 0, 0.8)',
                  duration: 0.2,
                  yoyo: true,
                  repeat: 2,
                });

                soundManager.playTone(1200, 0.15, 0.2);
                
                gsap.to(cardRef.current, {
                  boxShadow: '0 10px 40px rgba(0, 255, 255, 0.6)',
                  duration: 0.4,
                  yoyo: true,
                  repeat: 1,
                });

                // Move to next case after animations complete
                setTimeout(() => {
                  if (revealPanel) {
                    revealPanel.classList.remove('show');
                  }
                  // Pass rarity for gold spin detection
                  onReveal?.({ 
                    playerId: player.id, 
                    itemName: drawnItemName,
                    itemRarity: caseItem.rarity || 'common',
                    value: caseValue,
                    isGoldSpinWin: false
                  });
                  revealNextCase(caseIndex + 1);
                }, 1500);
              }
            });
        } else {
          console.log('[Reveal] No reel ref for', player.id);
          setIsRevealing(false);
          onReveal?.({ playerId: player.id, value: runningTotal });
          resolve({ playerId: player.id, value: runningTotal });
        }
      };

      // Start revealing from case 0
      revealNextCase(0);
    });
  };

  return (
    <div 
      className={`player-card ${isEmpty ? 'player-card-empty' : ''}`}
      ref={cardRef}
      data-player-id={player.id}
      data-rarity={player.rarity}
    >
      <div className="player-overlay">
        <div className="player-overlay-avatar">{player.avatar}</div>
        <div className="player-overlay-name">{player.name}{player.isBot ? ' 🤖' : ''}</div>
      </div>

      <div className="case-reel-container">
        <div className="reel-flapper left"></div>
        <div className="reel-window">
          <div className="reel-items" ref={reelRef} id={`reel-items-${player.id}`}></div>
          <div className="item-reveal-panel" id={`reveal-panel-${player.id}`}>
            <div className="item-reveal-name" id={`reveal-name-${player.id}`}></div>
            <div className="item-reveal-value" id={`reveal-value-${player.id}`}></div>
          </div>
        </div>
        <div className="reel-flapper right"></div>
      </div>

      {isEmpty ? (
        <button
          className="btn-summon"
          onClick={handleSummon}
          disabled={buttonState !== 'SUMMON'}
        >
          {buttonState === 'SUMMON' && '🤖 SUMMON'}
          {buttonState === 'FILLING' && '⏳ FILLING...'}
          {buttonState === 'FILLED' && '✓ FILLED'}
        </button>
      ) : (
        <button className="btn-summon" disabled>
          {player.isBot ? '✓ BOT' : '✓ PLAYER'}
        </button>
      )}
    </div>
  );
});

PlayerCard.displayName = 'PlayerCard';

// Main Arena Component
export default function CaseBattleArenaReelNative({ battleData, onBattleComplete }) {
  const { refreshUser } = useContext(AuthContext);
  const [players, setPlayers] = useState([]);
  const [, setCumulativeValues] = useState({}); // Track cumulative value per player
  const [, setWinnerTeam] = useState(null); // Tracks winning team for animations
  const [goldSpinActive, setGoldSpinActive] = useState(false);
  const [goldSpinItem, setGoldSpinItem] = useState(null);
  const [goldSpinPlayer, setGoldSpinPlayer] = useState(null);
  const [battleEnded, setBattleEnded] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [debugOverlay, setDebugOverlay] = useState(false);
  const [countdown, setCountdown] = useState(null); // null = not started, 3-0 = counting down
  const cardRefsMap = useRef({});
  const isAutoSummoningRef = useRef(false);
  const isBattleStartedRef = useRef(false);
  const tiebreakAttemptRef = useRef(0);  // Track RPS respin attempts

  useEffect(() => {
    // Inject enhancement styles once on mount
    if (!document.getElementById('caseBattleEnhancements')) {
      const style = document.createElement('style');
      style.id = 'caseBattleEnhancements';
      style.textContent = ENHANCEMENT_STYLES;
      document.head.appendChild(style);
    }
    
    if (!battleData) return;

    // Ensure mode and teamSize have defaults
    const mode = battleData.mode || 'normal';
    const teamSize = battleData.teamSize || 1;
    
    const maxPlayersNeeded = mode === 'group' 
      ? teamSize 
      : teamSize * 2;

    const avatars = ['👤', '🎮', '💻', '🔥', '⚡', '💎'];
    
    const seedBase = (battleData && battleData.hybridSeed) || '';
    const existingPlayers = (battleData.players || []).map((p, idx) => {
      const team = mode === 'group' 
        ? 'A' 
        : (idx < teamSize ? 'A' : 'B');
      const rng = createSeededRng(seedBase, idx);
      const rarityIndex = Math.floor(rng() * 5);
      return {
        id: p.userId || `p${idx}`,
        name: p.username || `Player ${idx + 1}`,
        value: p.totalItemValue || 0,
        team,
        avatar: avatars[idx % avatars.length],
        userId: p.userId,
        isBot: p.isBot || false,
        rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary'][rarityIndex],
        cases: p.cases || [],
      };
    });

    const allPlayers = [...existingPlayers];
    while (allPlayers.length < maxPlayersNeeded) {
      const idx = allPlayers.length;
      const team = mode === 'group' ? 'A' : (idx < teamSize ? 'A' : 'B');
      
      allPlayers.push({
        id: `empty-${idx}`,
        name: 'Empty Slot',
        value: 0,
        team,
        avatar: '❓',
        userId: null,
        isBot: false,
        rarity: 'common',
        cases: [],
      });
    }

    // Initialize refs for all players
    allPlayers.forEach(p => {
      if (!cardRefsMap.current[p.id]) {
        cardRefsMap.current[p.id] = React.createRef();
      }
    });

    // Initialize cumulative values to 0 for all players
    const initialCumulativeValues = {};
    allPlayers.forEach(p => {
      initialCumulativeValues[p.id] = 0;
    });
    setCumulativeValues(initialCumulativeValues);

    setPlayers(allPlayers);
  }, [battleData]);

  const handleReveal = ({ playerId, value, itemEmoji, itemRarity }) => {
    // Check if this is a legendary/premium item - trigger gold spin
    if (itemRarity === 'legendary' || itemRarity === 'epic') {
      const player = players.find(p => p.id === playerId);
      console.log('[Gold Spin] Triggered for', player?.name, 'with rarity:', itemRarity);
      setGoldSpinItem(itemEmoji);
      setGoldSpinPlayer(playerId); // Store player ID for comparison
      setGoldSpinActive(true);
      
      // Keep gold spin active long enough for full secondary spin (2s hold + 2.5s spin + animations)
      setTimeout(() => {
        console.log('[Gold Spin] Ending gold spin');
        setGoldSpinActive(false);
        setGoldSpinPlayer(null); // Clear player ID
      }, 7000); // 7 seconds total
    }
    
    // Update cumulative value if item was revealed
    if (value !== undefined && value > 0) {
      setCumulativeValues(prev => {
        const currentTotal = prev[playerId] || 0;
        const newTotal = currentTotal + value;
        
        // Update player with new cumulative value
        setPlayers(prevPlayers => 
          prevPlayers.map(p => p.id === playerId ? { ...p, value: newTotal } : p)
        );
        
        return { ...prev, [playerId]: newTotal };
      });
    }
  };

  const teamA = players.filter(p => p.team === 'A');
  const teamB = players.filter(p => p.team === 'B');

  const handleSummon = async () => {
    const filledCount = players.filter(p => !p.id.startsWith('empty-')).length;
    console.log('[Battle] Summon called. Filled:', filledCount, 'Total:', players.length);
    
    // Check if ALL slots are now filled
    if (filledCount >= players.length) {
      console.log('[Battle] Battle is full, starting...');
      startBattle();
    } else if (!isAutoSummoningRef.current) {
      // Not full yet - summon bots
      const botsNeeded = players.length - filledCount;
      console.log('[Battle] Need', botsNeeded, 'more bots, summoning...');
      
      // Auto-summon remaining bots with a slight delay
      isAutoSummoningRef.current = true;
      setTimeout(() => {
        api.post(`/case-battles/${battleData.id}/summon-bot`, {})
          .then(res => {
            console.log('[Battle] Summon response:', res);
            isAutoSummoningRef.current = false;
            // Don't need to auto-call again - parent polling will update state
            // and trigger handleSummon callback again if still not full
          })
          .catch(err => {
            console.error('[Battle] Error summoning:', err);
            isAutoSummoningRef.current = false;
            // If "already full" error, that's actually success - battle will auto-start via polling
            if (err?.error === 'Battle is already full') {
              console.log('[Battle] Battle became full during summon');
            }
          });
      }, 500);
    }
  };

  // RPS logic: rock beats scissors, scissors beats paper, paper beats rock
  const getRpsWinner = useCallback((choice1, choice2) => {
    const c1 = choice1.toLowerCase();
    const c2 = choice2.toLowerCase();
    if (c1 === c2) return 'TIE'; // Another tie?
    if (c1 === 'rock' && c2 === 'scissors') return 'A';
    if (c1 === 'scissors' && c2 === 'paper') return 'A';
    if (c1 === 'paper' && c2 === 'rock') return 'A';
    return 'B';
  }, []);

  // Tiebreaker function - triggers RPS spin
  const startTiebreaker = useCallback(() => {
    const teamSize = battleData?.teamSize || 1;
    const roundsNeeded = teamSize >= 3 ? 2 : 1; // Best of 3 (first to 2) for 3v3+, single round for 1v1 and 2v2
    
    console.log(`[Tiebreaker] Starting rock-paper-scissors tiebreaker (teamSize: ${teamSize}, rounds needed to win: ${roundsNeeded})`);
    
    // Fetch rock, paper, scissors items from database
    const fetchRpsItems = async () => {
      try {
        const res = await fetch('http://localhost:3000/items');
        const data = await res.json();
        
        // Filter for rock, paper, scissors items
        const allItems = data.items || [];
        const rpsItems = allItems.filter(item => 
          item.name.toLowerCase().includes('rock') ||
          item.name.toLowerCase().includes('paper') ||
          item.name.toLowerCase().includes('scissor')
        );
        
        if (rpsItems.length >= 3) {
          console.log('[Tiebreaker] Found RPS items from database:', rpsItems.map(it => it.name));
          // Add chance values if missing
          return rpsItems.slice(0, 3).map((item, idx) => ({
            ...item,
            chance: item.chance || (idx === 1 ? 29.6 : 35.2), // Paper 29.6%, Rock/Scissors 35.2% each
          }));
        } else {
          console.log('[Tiebreaker] Not enough RPS items found, creating fallback SVG items');
          // Fallback to hardcoded SVG items if not enough database items
          return createFallbackRpsItems();
        }
      } catch (err) {
        console.error('[Tiebreaker] Error fetching items:', err);
        return createFallbackRpsItems();
      }
    };
    
    const createFallbackRpsItems = () => {
      const rockSvg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23888888"/%3E%3Cpath d="M30 40 L50 20 L70 40 L70 70 Q70 80 60 80 L40 80 Q30 80 30 70 Z" fill="%23ffffff" stroke="%23333" stroke-width="2"/%3E%3C/svg%3E';
      const paperSvg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23AAAAAA"/%3E%3Crect x="25" y="15" width="50" height="70" fill="%23ffffff" stroke="%23333" stroke-width="2" rx="2"/%3E%3Cline x1="35" y1="30" x2="65" y2="30" stroke="%23333" stroke-width="1.5"/%3E%3Cline x1="35" y1="40" x2="65" y2="40" stroke="%23333" stroke-width="1.5"/%3E%3Cline x1="35" y1="50" x2="65" y2="50" stroke="%23333" stroke-width="1.5"/%3E%3Cline x1="35" y1="60" x2="55" y2="60" stroke="%23333" stroke-width="1.5"/%3E%3C/svg%3E';
      const scissorsSvg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23CCCCCC"/%3E%3Ccircle cx="30" cy="35" r="8" fill="none" stroke="%23333" stroke-width="2"/%3E%3Ccircle cx="30" cy="65" r="8" fill="none" stroke="%23333" stroke-width="2"/%3E%3Cpath d="M38 35 L60 20" stroke="%23333" stroke-width="2" fill="none"/%3E%3Cpath d="M38 65 L60 80" stroke="%23333" stroke-width="2" fill="none"/%3E%3C/svg%3E';
      
      return [
        { name: 'Rock', value: 0, chance: 35.4, rarity: 'common', color: '#888888', id: 'rps_rock', image: rockSvg },
        { name: 'Paper', value: 0, chance: 29.6, rarity: 'common', color: '#AAAAAA', id: 'rps_paper', image: paperSvg },
        { name: 'Scissors', value: 0, chance: 35.0, rarity: 'common', color: '#CCCCCC', id: 'rps_scissors', image: scissorsSvg }
      ];
    };
    
    fetchRpsItems().then(rpsItems => {
      console.log('[Tiebreaker] RPS items loaded:', rpsItems.map(it => `${it.name} (${it.chance}%)`));
    
      // Helper function: Get weighted item based on chance percentages
      const pickWeightedItem = (items, rng) => {
        // Build ticket ranges for weighted selection
        const ranges = [];
        let currentTicket = 0;
        
        for (const item of items) {
          const chance = item.chance || 0;
          const itemTickets = Math.ceil((chance / 100) * 100000);
          ranges.push({
            item: item,
            startTicket: currentTicket,
            endTicket: currentTicket + itemTickets - 1,
          });
          currentTicket += itemTickets;
        }
        
        console.log('[Tiebreaker] Ticket ranges:', ranges.map(r => `${r.item.name} (${r.item.chance}%): ${r.startTicket}-${r.endTicket}`).join(', '));
        
        // Generate ticket from RNG
        const ticket = Math.floor(rng() * 100000);
        
        // Find which item's range the ticket falls into
        for (const range of ranges) {
          if (ticket >= range.startTicket && ticket <= range.endTicket) {
            console.log('[Tiebreaker] Ticket', ticket, 'selected:', range.item.name, `(${range.item.chance}% chance)`);
            return range.item;
          }
        }
        
        // Fallback (shouldn't happen)
        console.warn('[Tiebreaker] Ticket', ticket, 'out of range! Fallback to:', items[0].name);
        return items[0];
      };
    
      // Start reel spins for all non-empty players (deterministic via hybrid seed)
      const nonEmptyPlayers = players.filter(p => !p.id.startsWith('empty-'));
      const seedBaseTiebreak = (battleData && battleData.hybridSeed) || '';
      const MAX_TIEBREAK_ATTEMPTS = 10; // Prevent infinite loop
      
      const spinPromises = nonEmptyPlayers.map((player, idx) => {
        return new Promise((resolve) => {
          const playerName = player.name || player.userId || player.id;
          // Deterministically pick an RPS result using weighted seeded RNG
          // Include attempt number to get different results on respin
          const rngPick = createSeededRng(seedBaseTiebreak + '::tiebreak::attempt' + tiebreakAttemptRef.current, idx);
          const drawnItem = pickWeightedItem(rpsItems, rngPick);
          console.log('[Tiebreaker]', playerName, 'will draw (weighted):', drawnItem.name);
          
          // Find the player's reel element
          const reelRef = document.getElementById(`reel-items-${player.id}`);
          if (!reelRef) {
            console.error('[Tiebreaker] No reel found for player:', player.id, '- looking for ID: reel-items-' + player.id);
            console.log('[Tiebreaker] Available elements with reel:', Array.from(document.querySelectorAll('[id*="reel"]')).map(e => e.id));
            resolve({ playerId: player.id, playerTeam: player.team, result: drawnItem });
            return;
          }
          
          console.log('[Tiebreaker] Found reel for', playerName, 'at:', reelRef);
          
          // Build RPS reel as a repeating wheel - same as main reel but with RPS items
          reelRef.innerHTML = '';
          
          // Create base sequence of RPS items
          const baseSequence = [];
          for (let s = 0; s < 6; s++) {
            const rngS = createSeededRng(seedBaseTiebreak + '::tiebreak_item', idx * 100 + s);
            // Pick weighted random RPS items
            const rpsTicket = Math.floor(rngS() * 100000);
            let runningTotal = 0;
            let selectedItem = rpsItems[0];
            
            for (const rpsItem of rpsItems) {
              const itemChanceScaled = (rpsItem.chance / 100) * 100000;
              if (rpsTicket < runningTotal + itemChanceScaled) {
                selectedItem = rpsItem;
                break;
              }
              runningTotal += itemChanceScaled;
            }
            baseSequence.push(selectedItem);
          }
          
          // Create repeating wheel with 8 repeats (same as main reel)
          const rpsWheelSequence = [];
          const rpsRepeatCount = 8;
          for (let r = 0; r < rpsRepeatCount; r++) {
            rpsWheelSequence.push(...baseSequence);
          }
          
          // Add drawn item at the very end
          rpsWheelSequence.push(drawnItem);
          
          console.log('[Tiebreaker] Built RPS wheel with', rpsWheelSequence.length, 'items');
          
          // Create visual reel elements with images
          for (const item of rpsWheelSequence) {
            const itemEl = document.createElement('div');
            itemEl.className = 'reel-item';
            
            // Display RPS item using image or placeholder
            const imageUrl = item.image || `https://via.placeholder.com/80?text=${encodeURIComponent((item.name || 'Item').substring(0, 3))}`;
            itemEl.innerHTML = `<img src="${imageUrl}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" />`;
            
            reelRef.appendChild(itemEl);
          }
          
          // Kill any existing animations
          gsap.killTweensOf(reelRef);
          gsap.set(reelRef, { y: 0 });
          
          // Calculate landing position for RPS wheel
          const ITEM_HEIGHT = 90;
          const WINDOW_HEIGHT = 165;
          const CENTER_OFFSET = (WINDOW_HEIGHT - ITEM_HEIGHT) / 2;
          const landingCycleRps = rpsRepeatCount - 1;
          const drawnItemIndexRps = baseSequence.length;
          const landingIndexRps = (landingCycleRps * baseSequence.length) + drawnItemIndexRps;
          const finalPositionRps = -(landingIndexRps * ITEM_HEIGHT) + CENTER_OFFSET;
          
          // Lottery wheel spin effect - natural deceleration like a real slot machine
          let spinTimeline = gsap.timeline();
          
          // Single smooth animation: accelerate, coast, then decelerate smoothly to landing
          // Total duration: 4.0s with natural easing throughout
          spinTimeline.to(reelRef, {
            y: finalPositionRps,
            duration: 4.0,
            ease: 'cubic.inOut', // Cubic curve decelerates sooner than power1
            onStart: () => {
              // Play tick sounds throughout most of the spin (after initial acceleration)
              let tickCount = 0;
              setTimeout(() => {
                const tickInterval = setInterval(() => {
                  if (tickCount >= 10) { // 10 ticks over ~2.0s of coast/decel
                    clearInterval(tickInterval);
                    return;
                  }
                  soundManager.playTickSound(0.25);
                  tickCount++;
                }, 200); // Every 200ms
              }, 600); // Start ticks after 0.6s (acceleration phase)
            },
            onComplete: () => {
              gsap.set(reelRef, { y: finalPositionRps });
              // Play final landing sound
              soundManager.playTone(600, 0.15, 0.3);
              console.log('[Tiebreaker] Spin complete for', playerName, '- landed on:', drawnItem.name);
              resolve({ playerId: player.id, playerTeam: player.team, result: drawnItem });
            }
          });
        });
      });

      Promise.all(spinPromises).then(async (results) => {
      console.log('[Tiebreaker] All spins complete:', results.map(r => ({ player: r.playerId, team: r.playerTeam, result: r.result.name })));
      
      // Count individual wins per team (each player's RPS result)
      let teamAWins = 0;
      let teamBWins = 0;
      const teamSize = battleData?.teamSize || 1;
      const roundsNeeded = teamSize >= 3 ? 2 : 1; // Best of 3 for 3v3+ means first to 2 wins
      
      // Separate players by team
      const teamAPlayers = results.filter(r => r.playerTeam === 'A');
      const teamBPlayers = results.filter(r => r.playerTeam === 'B');
      
      // Compare each Team A player against corresponding Team B player (by position)
      const playerMatches = [];
      for (let i = 0; i < Math.min(teamAPlayers.length, teamBPlayers.length); i++) {
        const playerA = teamAPlayers[i];
        const playerB = teamBPlayers[i];
        
        const winner = getRpsWinner(playerA.result.name, playerB.result.name);
        if (winner === 'A') {
          teamAWins++;
        } else if (winner === 'B') {
          teamBWins++;
        }
        
        playerMatches.push({
          playerA: playerA.playerId,
          playerB: playerB.playerId,
          choiceA: playerA.result.name,
          choiceB: playerB.result.name,
          winner: winner
        });
      }
      
      console.log('[Tiebreaker] Player matches:', playerMatches.map(m => `${m.choiceA} vs ${m.choiceB} = ${m.winner}`).join(', '));
      console.log(`[Tiebreaker] Round results - Team A: ${teamAWins} wins, Team B: ${teamBWins} wins (need ${roundsNeeded} to win)`);
      
      let rpsWinner = null;
      
      // Determine winner based on round wins
      if (teamAWins >= roundsNeeded) {
        rpsWinner = 1;
        console.log(`[Tiebreaker] Team A wins with ${teamAWins} round wins!`);
      } else if (teamBWins >= roundsNeeded) {
        rpsWinner = 2;
        console.log(`[Tiebreaker] Team B wins with ${teamBWins} round wins!`);
      } else if (teamAWins === teamBWins && teamAWins === 0) {
        // All ties - need to respin
        tiebreakAttemptRef.current++;
        if (tiebreakAttemptRef.current >= MAX_TIEBREAK_ATTEMPTS) {
          console.warn('[Tiebreaker] Max respin attempts reached, forcing Team A as winner');
          rpsWinner = 1;
        } else {
          console.log('[Tiebreaker] All draws! Respinning... (attempt', tiebreakAttemptRef.current + '/' + MAX_TIEBREAK_ATTEMPTS + ')');
          await new Promise(resolve => setTimeout(resolve, 1500));
          startTiebreaker();
          return;
        }
      }
      
      console.log('[Tiebreaker] RPS Winner:', rpsWinner);
      
      // Reset attempt counter for next tie
      tiebreakAttemptRef.current = 0;
      
      // Wait a bit after spins complete before settling (let animation finish)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // NOW settle the battle with the tiebreaker result
      console.log('[Tiebreaker] Settling battle after tiebreaker with winner:', rpsWinner);
      let settleRes = null;
      try {
        settleRes = await api.post(`/case-battles/${battleData.id}/settle`, { tiebreakWinner: rpsWinner });
        console.log('[Tiebreaker] Settle response:', settleRes);
        // Refresh user balance after settlement
        if (refreshUser) {
          await refreshUser();
          console.log('[Tiebreaker] User balance refreshed after settlement');
        }
      } catch (settleErr) {
        console.error('[Tiebreaker] Settle API error:', settleErr);
      }
      
      // Get pot total and winner count from settle response
      const potTotal = settleRes?.battle?.potTotal || 0;
      const winnerCount = settleRes?.battle?.winners?.length || 1;
      const perWinnerAmount = winnerCount > 0 ? (potTotal / winnerCount).toFixed(2) : potTotal.toFixed(2);
      
      // Play victory or defeat sound based on current user's result
      const currentUserId = battleData?.players?.[0]?.userId; // Current user
      const isCurrentUserWinner = settleRes?.battle?.winners?.some(w => w.userId === currentUserId);
      if (isCurrentUserWinner) {
        enhancedAudio.playVictory();
      }
      
      // Apply green/red tints to all player reels
      const nonEmptyPlayers = players.filter(p => !p.id.startsWith('empty-'));
      nonEmptyPlayers.forEach(player => {
        const reelEl = document.getElementById(`reel-items-${player.id}`);
        const cardEl = document.querySelector(`[data-player-id="${player.id}"]`);
        
        const isWinner = (rpsWinner === 1 && player.team === 'A') || (rpsWinner === 2 && player.team === 'B');
        const tintColor = isWinner ? 'rgba(76, 175, 80, 0.4)' : 'rgba(244, 67, 54, 0.4)'; // Green or Red
        const borderColor = isWinner ? '#4CAF50' : '#F44336';
        
        if (reelEl) {
          gsap.to(reelEl, { backgroundColor: tintColor, duration: 0.5 });
          reelEl.style.borderRadius = '8px';
          reelEl.style.border = `3px solid ${borderColor}`;
        }
        
        if (cardEl) {
          gsap.to(cardEl, { 
            boxShadow: `0 0 30px 8px ${borderColor}`,
            duration: 0.5 
          });
        }
      });
      
      // Display pot information overlay
      const infoOverlay = document.createElement('div');
      infoOverlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        backgroundColor: rgba(15, 20, 25, 0.95);
        border: 3px solid #ffc107;
        borderRadius: 16px;
        padding: 30px;
        zIndex: 10000;
        textAlign: center;
        color: white;
        fontFamily: Arial, sans-serif;
        maxWidth: 400px;
        boxShadow: 0 0 40px rgba(255, 193, 7, 0.5);
      `;
      
      infoOverlay.innerHTML = `
        <div style="fontSize: 28px; fontWeight: bold; marginBottom: 20px; color: #ffc107;">
          🏆 BATTLE COMPLETE
        </div>
        <div style="fontSize: 20px; marginBottom: 15px;">
          Total Pot: <span style="color: #4CAF50; fontWeight: bold;">$${potTotal.toFixed(2)}</span>
        </div>
        <div style="fontSize: 18px; marginBottom: 15px;">
          Winners: <span style="color: #4CAF50; fontWeight: bold;">${winnerCount}</span>
        </div>
        <div style="fontSize: 18px; color: #ffc107; fontWeight: bold;">
          Each Winner Gets: $${perWinnerAmount}
        </div>
        <div style="marginTop: 25px; fontSize: 14px; color: #bbb;">
          Closing in 5 seconds...
        </div>
      `;
      
      document.body.appendChild(infoOverlay);
      
      // Auto-close after 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      infoOverlay.remove();
      onBattleComplete?.();
    });
    });
  }, [players, battleData, onBattleComplete, getRpsWinner, refreshUser]);

  const startBattle = useCallback(async () => {
    console.log('[Battle] Starting battle with players:', players);
    
    // Play whoosh sound as battle starts
    enhancedAudio.playWhoosh();
    
    // Get all non-empty player card refs
    const playerCardRefs = players
      .filter(p => !p.id.startsWith('empty-'))
      .map(p => cardRefsMap.current[p.id]);

    console.log('[Battle] Player card refs:', playerCardRefs.length);

    // Trigger all reveals simultaneously via Promise.all
    try {
      const revealPromises = playerCardRefs
        .map(ref => ref?.current?.reveal?.())
        .filter(Boolean);

      console.log('[Battle] Starting', revealPromises.length, 'reveals...');
      const revealResults = await Promise.all(revealPromises);
      console.log('[Battle] All reveals complete, results:', revealResults);
      
      // Calculate team totals from revealed values (not state)
      const teamAValues = revealResults
        .filter(r => {
          const player = players.find(p => p.id === r.playerId);
          return player?.team === 'A';
        })
        .reduce((sum, r) => sum + (r.value || 0), 0);
      
      const teamBValues = revealResults
        .filter(r => {
          const player = players.find(p => p.id === r.playerId);
          return player?.team === 'B';
        })
        .reduce((sum, r) => sum + (r.value || 0), 0);
      
      console.log('[Battle] All reveals complete, settling...');
      console.log('[Battle] Checking for tie - Team A total:', teamAValues, 'Team B total:', teamBValues);

      // Check for tie BEFORE settling
      let winner = null;
      let potTotal = teamAValues + teamBValues; // Total pot is sum of all drawn items
      
      if (teamAValues > teamBValues) {
        winner = 'A';
      } else if (teamBValues > teamAValues) {
        winner = 'B';
      }
      
      console.log('[Battle] Tie check result - Winner:', winner, 'Pot total:', potTotal);
      
      // If tie, trigger tiebreaker (rock-paper-scissors) INSTEAD of settling
      if (!winner) {
        console.warn('[Battle] Tie detected - triggering tiebreaker BEFORE settling');
        // Directly invoke tiebreaker logic instead of relying on state
        startTiebreaker();
        return; // Exit early - DO NOT call settle yet
      }
      
      // Only settle if there's no tie
      console.log('[Battle] Attempting to settle battle:', battleData.id);
      try {
        const res = await api.post(`/case-battles/${battleData.id}/settle`, {});
        console.log('[Battle] Settle response:', res);
        // Refresh user balance after settlement
        if (refreshUser) {
          await refreshUser();
          console.log('[Battle] User balance refreshed after settlement');
        }
        
        // Play victory sound if current user won
        const currentUserId = battleData?.players?.[0]?.userId;
        const isCurrentUserWinner = res?.battle?.winners?.some(w => w.userId === currentUserId);
        if (isCurrentUserWinner) {
          enhancedAudio.playVictory();
        }
      } catch (settleErr) {
        console.error('[Battle] Settle API error (non-fatal):', settleErr);
      }
      
      // Show overlay for normal winner
      console.log('[Battle] Setting battleEnded to true');
      setWinnerTeam(winner);
      setWinAmount(potTotal);
      setBattleEnded(true);
      
      setTimeout(() => {
        onBattleComplete?.();
      }, 5000);
    } catch (err) {
      console.error('Error during battle:', err);
      onBattleComplete?.();
    }
  }, [players, battleData, onBattleComplete, startTiebreaker, refreshUser]);

  // Auto-start battle when it becomes full - with countdown
  useEffect(() => {
    const filledCount = players.filter(p => !p.id.startsWith('empty-')).length;
    console.log('[Battle] Effect check - Filled:', filledCount, 'Total:', players.length, 'Already started:', isBattleStartedRef.current);
    
    if (filledCount >= players.length && filledCount > 0 && !isBattleStartedRef.current) {
      console.log('[Battle] Detected battle is full, starting countdown...');
      isBattleStartedRef.current = true;
      setCountdown(3); // Start 3-second countdown
    }
  }, [players]);
  
  // Countdown timer effect
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      // Countdown complete - start battle
      setCountdown(null);
      startBattle();
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, startBattle]);

  const hasCases = battleData?.caseIds && battleData.caseIds.length > 0;
  const isMultiCase = hasCases && battleData.caseIds.length > 1;
  
  // Build cases array from first player's cases (all players see the same cases)
  const displayCases = battleData?.players?.[0]?.cases || [];
  
  // Calculate team totals for winners display
  const teamATotals = teamA.reduce((sum, p) => sum + (p.value || 0), 0);
  const teamBTotals = teamB.reduce((sum, p) => sum + (p.value || 0), 0);
  const winnerTeamDisplay = teamATotals > teamBTotals ? 'A' : teamBTotals > teamATotals ? 'B' : 'TIE';

  return (
    <div className="arena-wrapper">
      {/* Countdown Overlay - shown when battle is full and loading */}
      {countdown !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(5px)',
        }}>
          <div style={{
            textAlign: 'center',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
          }}>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              marginBottom: '30px',
              color: '#ffd700',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
              animation: countdown <= 1 ? 'pulse 0.6s infinite' : 'none',
            }}>
              {countdown > 0 ? countdown : 'START!'}
            </div>
            <div style={{
              fontSize: '18px',
              color: '#aaa',
              marginTop: '20px',
            }}>
              {countdown > 0 ? 'Battle starting in...' : 'Get ready!'}
            </div>
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.7; }
            }
          `}</style>
        </div>
      )}
      {/* DEBUG: Test button to show overlay */}
      {!battleEnded && debugOverlay === false && (
        <button 
          onClick={() => setDebugOverlay(true)}
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            padding: '10px 20px',
            background: 'red',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            zIndex: 10000
          }}
        >
          DEBUG: Show Overlay
        </button>
      )}
      {/* DEBUG: Force show overlay */}
      {(battleEnded || debugOverlay) ? (
        <div className="winners-overlay">
          <div className="winners-container">
            <div className="winners-content">
              {/* Loser Team */}
              <div className={`team-display loser ${winnerTeamDisplay !== 'A' ? 'winner-team' : ''}`}>
                <div className="team-header">Team A</div>
                <div className="team-players">
                  {teamA.map(player => (
                    <div key={player.id} className="player-display">
                      <div className="player-avatar-large">{player.avatar}</div>
                      <div className="player-name-display">{player.name}</div>
                    </div>
                  ))}
                </div>
                {winnerTeamDisplay === 'A' && (
                  <div className="team-result winner-result">WINNER 👑</div>
                )}
                {winnerTeamDisplay === 'B' && (
                  <div className="team-result loser-result">LOSER</div>
                )}
                {winnerTeamDisplay === 'TIE' && (
                  <div className="team-result tie-result">TIE 🤝</div>
                )}
              </div>

              {/* Center Divider with Win Amount */}
              <div className="winners-divider">
                <div className="sword-divider">⚔️</div>
                <div className="win-amount-display">
                  <div className="win-label">{winnerTeamDisplay === 'TIE' ? 'It\'s a Tie!' : 'Amount Won'}</div>
                  <div className="win-value">${(winAmount || 0).toFixed(2)}</div>
                </div>
              </div>

              {/* Winner Team */}
              <div className={`team-display winner ${winnerTeamDisplay === 'B' ? 'winner-team' : ''}`}>
                <div className="team-header">Team B</div>
                <div className="team-players">
                  {teamB.map(player => (
                    <div key={player.id} className="player-display">
                      <div className="player-avatar-large">{player.avatar}</div>
                      <div className="player-name-display">{player.name}</div>
                    </div>
                  ))}
                </div>
                {winnerTeamDisplay === 'B' && (
                  <div className="team-result winner-result">WINNER 👑</div>
                )}
                {winnerTeamDisplay === 'A' && (
                  <div className="team-result loser-result">LOSER</div>
                )}
                {winnerTeamDisplay === 'TIE' && (
                  <div className="team-result tie-result">TIE 🤝</div>
                )}
              </div>
            </div>

            {/* Return to Battles Button */}
            <button
              onClick={() => window.location.href = '/case-battles'}
              style={{
                marginTop: '30px',
                padding: '12px 30px',
                backgroundColor: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#229954'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#27ae60'}
            >
              ← Return to Battles
            </button>
          </div>
        </div>
      ) : null}

      {/* Case Display Section - Hidden when battle ends */}
      {!battleEnded && hasCases && displayCases.length > 0 && (
        <div className="case-display-section">
          <div className="case-display-card current">
            <div className="case-display-label">Current Case</div>
            <div className="case-display-content">
              <div className="case-display-name">{displayCases[0]?.caseName || 'Loading...'}</div>
              <div className="case-display-meta">
                <span className="case-display-value">${(displayCases[0]?.price || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          {isMultiCase && displayCases.length > 1 && (
            <>
              <div className="case-display-arrow">→</div>
              <div className="case-display-card upcoming">
                <div className="case-display-label">Upcoming Case</div>
                <div className="case-display-content">
                  <div className="case-display-name">{displayCases[1]?.caseName || 'Next...'}</div>
                  <div className="case-display-meta">
                    <span className="case-display-value">${(displayCases[1]?.price || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="unified-arena-container">
        {!battleEnded ? (
          <>
            {/* Team A */}
            <div className="unified-team-group">
              <div className="unified-team-header">Team A</div>
              <div className="unified-team-players">
                {teamA.map(player => (
                  <PlayerCard
                    key={player.id}
                    ref={cardRefsMap.current[player.id]}
                    player={player}
                    battleId={battleData?.id}
                    onSummon={handleSummon}
                    onReveal={handleReveal}
                    caseItemsData={battleData?.caseItemsData}
                    goldSpinActive={goldSpinActive}
                    goldSpinPlayer={goldSpinPlayer}
                  />
                ))}
              </div>
            </div>

            {/* Team Separator */}
            <div className="unified-team-separator">
              <div className="separator-line"></div>
              <div className="separator-icon">⚔️</div>
              <div className="separator-line"></div>
            </div>

            {/* Team B */}
            <div className="unified-team-group">
              <div className="unified-team-header">Team B</div>
              <div className="unified-team-players">
                {teamB.map(player => (
                  <PlayerCard
                    key={player.id}
                    ref={cardRefsMap.current[player.id]}
                    player={player}
                    battleId={battleData?.id}
                    onSummon={handleSummon}
                    onReveal={handleReveal}
                    caseItemsData={battleData?.caseItemsData}
                    goldSpinActive={goldSpinActive}
                    goldSpinPlayer={goldSpinPlayer}
                  />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Global Battle Footer - Hidden when battle ends */}
      {!battleEnded && (
        <div className="battle-footer">
          {/* Team A Footer Section */}
          <div className="battle-footer-content">
            {players
              .filter(player => player.team === 'A')
              .map(player => (
                <div key={player.id} className="battle-footer-player">
                  <div className="footer-player-info">
                    <div className="footer-player-avatar">{player.avatar}</div>
                    <div className="footer-player-details">
                      <p className="footer-player-name">{player.name}{player.isBot ? ' 🤖' : ''}</p>
                      <p className="footer-player-team">Team {player.team}</p>
                    </div>
                  </div>
                  <div className="footer-player-value">
                    ${(player.value || 0).toFixed(2)}
                  </div>
                </div>
              ))}
          </div>

          {/* Separator */}
          <div className="unified-team-separator"></div>

          {/* Team B Footer Section */}
          <div className="battle-footer-content">
            {players
              .filter(player => player.team === 'B')
              .map(player => (
                <div key={player.id} className="battle-footer-player">
                  <div className="footer-player-info">
                    <div className="footer-player-avatar">{player.avatar}</div>
                    <div className="footer-player-details">
                      <p className="footer-player-name">{player.name}{player.isBot ? ' 🤖' : ''}</p>
                      <p className="footer-player-team">Team {player.team}</p>
                    </div>
                  </div>
                  <div className="footer-player-value">
                    ${(player.value || 0).toFixed(2)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Gold Spin Overlay */}
      {goldSpinActive && (
        <div className="gold-spin-overlay">
          <div className="gold-spin-content">
            <h2 className="gold-spin-title">✨ LEGENDARY! ✨</h2>
            <p className="gold-spin-message">
              {players.find(p => p.id === goldSpinPlayer)?.name} hit a PREMIUM ITEM!
            </p>
            <div className="gold-spin-items">
              <div className="gold-spin-item">💎</div>
              <div className="gold-spin-item">{goldSpinItem || '🏆'}</div>
              <div className="gold-spin-item">👑</div>
            </div>
            <button
              className="gold-spin-button"
              onClick={() => setGoldSpinActive(false)}
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
