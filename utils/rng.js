// Seeded RNG utilities for provably fair case battles
// Uses both player seeds to generate a deterministic random number

/**
 * Simple seeded random number generator (LCG)
 * @param {string} seed - The seed string
 * @returns {number} - A number between 0 and 1
 */
function seededRandom(seed) {
  // Convert seed string to a number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // LCG (Linear Congruential Generator)
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;

  hash = Math.abs(hash);
  hash = (a * hash + c) % m;

  return hash / m;
}

/**
 * Combine two seeds and generate a ticket number (0-99,999)
 * Both seeds are used in the RNG to generate the final ticket
 * @param {string} seed1 - First seed (e.g., player 1 seed)
 * @param {string} seed2 - Second seed (e.g., player 2 seed)
 * @returns {number} - Ticket number between 0 and 99,999
 */
export function generateTicket(seed1, seed2) {
  // Combine seeds
  const combinedSeed = `${seed1}-${seed2}`;

  // Generate random value between 0-1
  const randomValue = seededRandom(combinedSeed);

  // Convert to ticket range (0-99,999)
  const ticket = Math.floor(randomValue * 100000);

  console.log(`[RNG] Generated ticket: ${ticket} from seeds (${seed1.substring(0, 8)}..., ${seed2.substring(0, 8)}...)`);

  return ticket;
}

/**
 * Get item ticket ranges
 * 1% = 1,000 tickets (out of 100,000 total)
 * @param {Array} items - Array of items with 'chance' property (0-100)
 * @returns {Array} - Array with { item, startTicket, endTicket }
 */
export function getItemTicketRanges(items) {
  const ranges = [];
  let currentTicket = 0;

  for (const item of items) {
    const itemChance = item.chance || 0;
    const itemTickets = itemChance * 1000; // 1% = 1,000 tickets

    ranges.push({
      item: item.name,
      startTicket: currentTicket,
      endTicket: currentTicket + itemTickets - 1,
      chance: itemChance,
      value: item.value,
      rarity: item.rarity,
      color: item.color,
    });

    currentTicket += itemTickets;
  }

  console.log(`[RNG] Item ticket ranges:`, ranges.map(r => `${r.item} (${r.chance}%): ${r.startTicket}-${r.endTicket}`).join(', '));

  return ranges;
}

/**
 * Get winning item based on ticket number
 * @param {number} ticket - The drawn ticket (0-99,999)
 * @param {Array} ranges - Item ticket ranges from getItemTicketRanges
 * @returns {Object} - The winning item info with index
 */
export function getWinningItem(ticket, ranges) {
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (ticket >= range.startTicket && ticket <= range.endTicket) {
      console.log(`[RNG] Ticket ${ticket} won: ${range.item} (index ${i})`);
      return {
        index: i,
        ...range,
      };
    }
  }

  // Fallback to last item (should not happen if chances sum to 100%)
  const lastRange = ranges[ranges.length - 1];
  console.log(`[RNG] Ticket ${ticket} out of range, fallback to: ${lastRange.item}`);
  return {
    index: ranges.length - 1,
    ...lastRange,
  };
}

/**
 * Generate a seed string (random hex string)
 * @returns {string} - Random seed
 */
export function generateSeed() {
  return Math.random().toString(16).substring(2) + Date.now().toString(16);
}
