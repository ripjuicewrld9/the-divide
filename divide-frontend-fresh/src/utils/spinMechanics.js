/**
 * Professional Case Spin Mechanics
 * Inspired by top case sites (Plunder.gg, Clash.gg, Cases.gg)
 * 
 * Features:
 * - Reel contains only common/rare items (no super rares)
 * - Gold item triggers secondary animation (draws from top items)
 * - Crisp, snappy animations with professional easing
 */

/**
 * Filter case items into reel items and premium pool
 * Reel contains only items >1% chance (common/rare)
 * Premium items (≤1%) ONLY won during gold spin secondary animation
 * Creates weighted reel where item count = probability (e.g., 80% chance = 80 items)
 * @param {Array} caseItems - All items in the case
 * @returns {Object} { reelItems, premiumItems, reelItemsLength }
 */
export function buildReelSystem(caseItems) {
  if (!caseItems || caseItems.length === 0) {
    console.warn('[buildReelSystem] No case items provided');
    return { reelItems: [], premiumItems: [], reelItemsLength: 1 };
  }

  // Ensure every item has a stable id for matching later
  caseItems.forEach((it, idx) => {
    if (!it.id) {
      it.id = `__gen_${idx}_${(it.name || 'item').replace(/\s+/g, '_')}`;
      it.__generatedId = true;
      console.log(`[buildReelSystem] Generated id for item '${it.name}': ${it.id}`);
    }
  });

  // Split items: only >2% go in reel, ≤2% are premium (gold spin only)
  const premiumItems = caseItems.filter(item => (item.chance || 0) <= 2);
  const regularItems = caseItems.filter(item => (item.chance || 0) > 2);
  
  console.log(`[buildReelSystem] Raw items count: ${caseItems.length}`);
  console.log(`[buildReelSystem] After filtering - Regular items (>2%): ${regularItems.length}, Premium items (≤2%): ${premiumItems.length}`);
  regularItems.forEach(item => {
    console.log(`  Regular: ${item.name} (chance=${item.chance}%, id=${item.id})`);
  });

  // Create weighted reel: ONLY regular items (>2%), each appears N times where N = its percentage chance
  const weightedReelItems = [];
  
  console.log(`[buildReelSystem] Processing ${regularItems.length} regular items (>2% chance):`);
  regularItems.forEach(item => {
    const chance = item.chance || 0;
    const itemCount = Math.round(chance); // Each 1% = 1 item in reel
    console.log(`  Adding ${item.name}: chance=${chance}%, count=${itemCount}, id=${item.id}, value=${item.value}`);
    for (let i = 0; i < itemCount; i++) {
      weightedReelItems.push(item);
    }
  });

  // Log proportions for verification
  console.log(`[buildReelSystem] Weighted reel created with ${weightedReelItems.length} total items`);
  console.log(`[buildReelSystem] Detailed breakdown:`);
  regularItems.forEach(item => {
    const count = weightedReelItems.filter(i => i.id === item.id && i.value === item.value).length;
    const percentage = weightedReelItems.length > 0 ? ((count / weightedReelItems.length) * 100).toFixed(2) : 0;
    console.log(`  ${item.name}: id=${item.id}, count=${count}, percentage=${percentage}%`);
  });
  
  console.log(`[buildReelSystem] Premium items for gold spin only (≤2% chance): ${premiumItems.length}`);
  premiumItems.forEach(item => {
    console.log(`  ${item.name}: ${item.chance}%`);
  });

  return {
    reelItems: weightedReelItems,
    premiumItems: premiumItems,
    reelItemsLength: regularItems.length, // Number of UNIQUE regular items
    winningItemIndex: null,
  };
}

/**
 * Calculate spin parameters for crisp animation
 * @param {Number} reelLength - Number of items in reel
 * @param {Number} winningIndex - Index to land on
 * @returns {Object} { scrollAmount, spinDuration, deceleration }
 */
export function calculateSpinParams(reelLength, winningIndex) {
  const itemHeight = 100; // EXACT HEIGHT: matches .carousel-item height in CSS (100px)
  const containerHeight = 380; // matches .carousel-reel-window height in CSS (380px)
  const centerPosition = (containerHeight / 2) - (itemHeight / 2); // 140px from top - center of the 100px indicator
  
  // To center winning item in window:
  // The carousel scrolls UP (negative translateY)
  // scrollAmount = how far to scroll UP so winning item lands at center position
  const centerOffsetAmount = (winningIndex * itemHeight) - centerPosition;

  // Total scroll distance: spin multiple times + land on winning item centered
  // KEY: Use exactly 1.5 rotations for a clean animation that fits within 2 rendered repetitions
  // This creates visual drama while avoiding wraparound artifacts
  const baseScroll = 1.5 * reelLength * itemHeight;
  const totalScroll = baseScroll + centerOffsetAmount;

  // Timing: premium feel with dramatic deceleration
  const spinDuration = 5.5; // Increased to 5.5 seconds for more dramatic effect
  const holdDuration = 1.8; // Longer hold for premium feel

  console.log(`[spinMechanics] calculateSpinParams: reelLength=${reelLength}, winningIndex=${winningIndex}`);
  console.log(`  itemHeight=${itemHeight}px, containerHeight=${containerHeight}px`);
  console.log(`  centerPosition=${centerPosition}px, centerOffsetAmount=${centerOffsetAmount}px`);
  console.log(`  baseScroll=${baseScroll}px, totalScroll=${totalScroll}px`);
  console.log(`  spinDuration=${spinDuration}s, premium easing curve applied`);

  return {
    scrollAmount: totalScroll,
    spinDuration,
    holdDuration,
    itemHeight,
    spinEasing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Smooth easing with more natural deceleration
  };
}

/**
 * Generate tick sound intervals that match spin curve
 * Starts fast, slows down dramatically
 * @param {Number} duration - Spin duration in ms
 * @returns {Array} Array of { delay, duration }
 */
export function generateTickPattern(duration) {
  const ticks = [];
  const minInterval = 30; // Fastest tick
  const maxInterval = 350; // Slowest tick
  const easingPower = 3; // Cubic ease for aggressive deceleration

  let currentTime = 0;

  while (currentTime < duration) {
    // Progress through animation (0 to 1)
    const progress = currentTime / duration;
    
    // Cubic ease-out: 1 - (1 - progress)^3
    const easeProgress = 1 - Math.pow(1 - progress, easingPower);
    
    // Calculate interval: fast start, slow end
    const interval = minInterval + easeProgress * (maxInterval - minInterval);

    ticks.push({
      delay: currentTime,
      duration: 80, // Tick sound length
      interval,
    });

    currentTime += interval;
  }

  return ticks;
}

/**
 * Determine if winning item is a gold trigger
 */
export function isGoldTriggerWin(winningItem) {
  return winningItem?.isGoldTrigger === true || winningItem?.id === 'gold-trigger';
}

/**
 * Determine if item is premium (≤1% chance - triggers gold spin)
 */
export function isPremiumItem(item) {
  if (!item) return false;
  // Premium items are those with ≤1% chance
  return (item.chance || 0) <= 1;
}

/**
 * Format reel display: show 5 items around center
 */
export function formatReelDisplay(reelItems, centerIndex) {
  const buffer = 2; // Show 2 items before and after
  const displayItems = [];

  for (let i = centerIndex - buffer; i <= centerIndex + buffer; i++) {
    const index = ((i % reelItems.length) + reelItems.length) % reelItems.length;
    displayItems.push(reelItems[index]);
  }

  return displayItems;
}
