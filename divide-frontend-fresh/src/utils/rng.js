/**
 * Frontend RNG utility module for provably fair case draws
 * Uses seeded random number generation with ticket-based lottery system
 */

/**
 * Seeded random number generator using Linear Congruential Generator (LCG)
 * @param {string} seed - Seed string (will be hashed to number)
 * @returns {number} - Random value between 0 and 1
 */
function seededRandom(seed) {
  // Simple hash function to convert string seed to number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Linear Congruential Generator
  const m = 2147483647; // 2^31 - 1 (Mersenne prime)
  const a = 16807;
  const c = 0;
  const x = Math.abs(hash) % m;
  const next = (a * x + c) % m;
  return next / m;
}

/**
 * Generate a ticket number (0-99,999) from two seeds using LCG
 * Both seeds are combined to create the final ticket
 * @param {string} seed1 - First seed (player 1)
 * @param {string} seed2 - Second seed (player 2)
 * @returns {number} - Ticket number between 0 and 99,999
 */
function generateTicket(seed1, seed2) {
  // Combine seeds using simple concatenation
  const combinedSeed = `${seed1}${seed2}`;
  
  // Generate random value using combined seed
  const randomValue = seededRandom(combinedSeed);
  
  // Scale to 0-99,999 range (100,000 tickets total)
  const ticket = Math.floor(randomValue * 100000);
  
  console.log(`[RNG] generateTicket: seed1='${seed1}' seed2='${seed2}' -> ticket=${ticket}`);
  
  return ticket;
}

/**
 * Calculate ticket ranges for each item based on drop chances
 * 1% chance = 1,000 tickets (out of 100,000 total)
 * @param {Array} items - Array of items with chance property (0-100)
 * @returns {Array} - Array of ticket ranges for each item
 */
function getItemTicketRanges(items) {
  const ranges = [];
  let currentTicket = 0;

  for (const item of items) {
    const chance = item.chance || 0;
    const itemTickets = Math.round(chance * 1000); // 1% = 1,000 tickets
    
    ranges.push({
      itemName: item.name,
      itemValue: item.value,
      itemIndex: ranges.length,
      rarity: item.rarity,
      chance: chance,
      startTicket: currentTicket,
      endTicket: currentTicket + itemTickets - 1,
      ticketCount: itemTickets,
    });

    currentTicket += itemTickets;
  }

  console.log(`[RNG] getItemTicketRanges: ${ranges.length} items, total tickets=${currentTicket}`);
  for (const range of ranges) {
    console.log(`  ${range.itemName}: ${range.startTicket}-${range.endTicket} (${range.chance}% = ${range.ticketCount} tickets)`);
  }

  return ranges;
}

/**
 * Map a ticket number to the winning item
 * @param {number} ticket - Ticket number (0-99,999)
 * @param {Array} ranges - Ticket ranges from getItemTicketRanges
 * @returns {Object} - Winning item info with itemName, itemValue, itemIndex, etc.
 */
function getWinningItem(ticket, ranges) {
  for (const range of ranges) {
    if (ticket >= range.startTicket && ticket <= range.endTicket) {
      console.log(`[RNG] getWinningItem: ticket=${ticket} matches ${range.itemName} (${range.startTicket}-${range.endTicket})`);
      return {
        itemName: range.itemName,
        itemValue: range.itemValue,
        itemIndex: range.itemIndex,
        rarity: range.rarity,
        chance: range.chance,
        ticket: ticket,
        range: range,
      };
    }
  }

  // Fallback (should not reach here if ranges are correct)
  console.warn(`[RNG] getWinningItem: ticket=${ticket} out of range, returning first item`);
  return {
    itemName: ranges[0]?.itemName || 'Unknown',
    itemValue: ranges[0]?.itemValue || 0,
    itemIndex: 0,
    rarity: ranges[0]?.rarity || 'common',
    chance: ranges[0]?.chance || 0,
    ticket: ticket,
  };
}

/**
 * Generate a random hex seed string
 * @returns {string} - Random hex seed
 */
function generateSeed() {
  const seed = Math.random().toString(16).slice(2);
  console.log(`[RNG] generateSeed: ${seed}`);
  return seed;
}

export { seededRandom, generateTicket, getItemTicketRanges, getWinningItem, generateSeed };
