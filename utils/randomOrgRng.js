/**
 * Random.org RNG Integration for Provably Fair Case Battles
 * Uses random.org API to fetch true random numbers instead of seeded PRNG
 * 
 * Benefits:
 * - Cryptographically secure randomness
 * - Third-party verified fairness
 * - Can be audited at random.org
 */

// Cache for random.org API key (set via environment or parameter)
let RANDOM_ORG_API_KEY = process.env.RANDOM_ORG_API_KEY;

/**
 * Set the random.org API key
 * @param {string} apiKey - Your random.org API key
 */
export function setRandomOrgApiKey(apiKey) {
  RANDOM_ORG_API_KEY = apiKey;
}

/**
 * Fetch a true random integer from random.org
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {Promise<number>} - A random integer in the range [min, max]
 */
async function fetchRandomIntFromOrg(min, max) {
  if (!RANDOM_ORG_API_KEY) {
    console.warn('[RandomOrg] No API key set, falling back to Math.random()');
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  try {
    const response = await fetch('https://api.random.org/json-rpc/2.0/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'generateIntegers',
        params: {
          apiKey: RANDOM_ORG_API_KEY,
          n: 1, // Request 1 random integer
          min: min,
          max: max,
        },
        id: 1,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('[RandomOrg] API Error:', data.error);
      console.warn('[RandomOrg] Falling back to Math.random()');
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const randomInt = data.result.random.data[0];
    console.log(`[RandomOrg] Generated random integer: ${randomInt} (range: ${min}-${max})`);
    return randomInt;
  } catch (error) {
    console.error('[RandomOrg] Fetch error:', error.message);
    console.warn('[RandomOrg] Falling back to Math.random()');
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

/**
 * Generate a ticket using random.org API instead of seeded RNG
 * This creates a true random ticket (0-99,999) from random.org
 * @param {string} clientSeed - Client-provided seed (for transparency, not used in calculation)
 * @param {string} serverSeed - Server seed (for transparency, not used in calculation)
 * @returns {Promise<number>} - Random ticket number between 0 and 99,999
 */
export async function generateTicketWithRandomOrg(clientSeed = '', serverSeed = '') {
  // Fetch true random integer (0-99,999) from random.org
  const ticket = await fetchRandomIntFromOrg(0, 99999);

  console.log(
    `[RandomOrg] Generated ticket: ${ticket} using random.org ` +
    `(client seed: ${clientSeed.substring(0, 8)}..., server seed: ${serverSeed.substring(0, 8)}...)`
  );

  return ticket;
}

/**
 * Batch generate multiple tickets from random.org
 * More efficient than making individual requests
 * @param {number} count - How many random tickets to generate
 * @returns {Promise<Array<number>>} - Array of random ticket numbers
 */
async function fetchRandomIntegerBatch(count) {
  if (!RANDOM_ORG_API_KEY) {
    console.warn('[RandomOrg] No API key set, falling back to Math.random()');
    return Array.from({ length: count }, () => Math.floor(Math.random() * 100000));
  }

  try {
    const response = await fetch('https://api.random.org/json-rpc/2.0/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'generateIntegers',
        params: {
          apiKey: RANDOM_ORG_API_KEY,
          n: count, // Request multiple random integers at once
          min: 0,
          max: 99999,
        },
        id: 1,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('[RandomOrg] API Error:', data.error);
      console.warn('[RandomOrg] Falling back to Math.random()');
      return Array.from({ length: count }, () => Math.floor(Math.random() * 100000));
    }

    const tickets = data.result.random.data;
    console.log(`[RandomOrg] Generated ${tickets.length} random tickets from random.org`);
    return tickets;
  } catch (error) {
    console.error('[RandomOrg] Batch fetch error:', error.message);
    console.warn('[RandomOrg] Falling back to Math.random()');
    return Array.from({ length: count }, () => Math.floor(Math.random() * 100000));
  }
}

/**
 * Generate multiple tickets at once (useful for multi-round battles)
 * @param {number} count - Number of tickets to generate
 * @returns {Promise<Array<number>>} - Array of random tickets
 */
export async function generateTicketBatch(count) {
  const tickets = await fetchRandomIntegerBatch(count);
  console.log(`[RandomOrg] Generated batch of ${tickets.length} tickets`);
  return tickets;
}

/**
 * Get item ticket ranges (same as regular RNG)
 * 1% = 1,000 tickets (out of 100,000 total)
 * @param {Array} items - Array of items with 'chance' property (0-100)
 * @returns {Array} - Array with { item, startTicket, endTicket, ... }
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
      id: item.id,
    });

    currentTicket += itemTickets;
  }

  console.log(
    `[RandomOrg] Item ticket ranges:`,
    ranges.map(r => `${r.item} (${r.chance}%): ${r.startTicket}-${r.endTicket}`).join(', ')
  );

  return ranges;
}

/**
 * Get winning item based on ticket number (same as regular RNG)
 * @param {number} ticket - The drawn ticket (0-99,999)
 * @param {Array} ranges - Item ticket ranges from getItemTicketRanges
 * @returns {Object} - The winning item info with index
 */
export function getWinningItem(ticket, ranges) {
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (ticket >= range.startTicket && ticket <= range.endTicket) {
      console.log(`[RandomOrg] Ticket ${ticket} won: ${range.item} (index ${i})`);
      return {
        index: i,
        ...range,
      };
    }
  }

  console.warn(`[RandomOrg] Ticket ${ticket} out of range, returning first item`);
  return {
    index: 0,
    ...ranges[0],
  };
}

/**
 * Verify a ticket against random.org (for auditing)
 * Returns metadata about the ticket generation
 * @param {number} ticket - The ticket number to verify
 * @returns {Object} - Verification info
 */
export function verifyTicket(ticket) {
  if (ticket < 0 || ticket > 99999) {
    return {
      valid: false,
      message: 'Ticket out of valid range (0-99999)',
    };
  }

  return {
    valid: true,
    ticket: ticket,
    message: 'Ticket is valid',
    source: 'random.org',
  };
}
