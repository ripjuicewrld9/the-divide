import crypto from 'crypto';
import fetch from 'node-fetch';

/**
 * Keno Provably Fair System
 * Uses Random.org API for server seed + EOS blockchain for external entropy
 * Generates 10 unique drawn numbers from 1-40
 */

// Random.org API configuration
const RANDOM_ORG_API_URL = 'https://api.random.org/json-rpc/2.0/invoke';
const RANDOM_ORG_API_KEY = process.env.RANDOM_ORG_API_KEY || 'demo-key';

/**
 * Generate a cryptographically secure server seed from Random.org
 * Returns a 32-character alphanumeric string
 */
export async function generateServerSeedFromRandomOrg() {
  try {
    const payload = {
      jsonrpc: '2.0',
      method: 'generateStrings',
      params: {
        apiKey: RANDOM_ORG_API_KEY,
        n: 1,
        length: 32,
        characters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        replacement: true,
      },
      id: 1,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(RANDOM_ORG_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Random.org returned ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      console.warn(`[Keno] Random.org error: ${data.error.message}, using crypto fallback`);
      return crypto.randomBytes(16).toString('hex').slice(0, 32);
    }

    return data.result?.random?.data?.[0] || crypto.randomBytes(16).toString('hex').slice(0, 32);
  } catch (error) {
    console.warn(`[Keno] Random.org fetch failed: ${error.message}, using crypto fallback`);
    return crypto.randomBytes(16).toString('hex').slice(0, 32);
  }
}

/**
 * Get the latest EOS block hash for external entropy
 */
export async function getEOSBlockHash() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch('https://api.eosflare.io/v1/chain/get_info', {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`EOS API returned ${response.status}`);
    }

    const data = await response.json();
    const lastBlockId = data.last_irreversible_block_id;

    if (!lastBlockId) {
      throw new Error('No block ID in response');
    }

    return lastBlockId;
  } catch (error) {
    console.warn(`[Keno] EOS API failed: ${error.message}, using crypto fallback`);
    return crypto.randomBytes(32).toString('hex');
  }
}

/**
 * Create a deterministic game seed from server seed + block hash
 */
export function createGameSeed(serverSeed, blockHash) {
  const combined = serverSeed + blockHash;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  return hash;
}

/**
 * Generate 10 unique drawn numbers from 1-40 using the game seed
 * Uses Fisher-Yates shuffle algorithm with deterministic seeding
 */
export function generateDrawnNumbers(gameSeed) {
  try {
    // Convert hex seed to a number for seeding the PRNG
    const seedBigInt = BigInt('0x' + gameSeed);
    let state = Number(seedBigInt % BigInt(2147483647)); // JS safe integer

    // Simple LCG PRNG (Linear Congruential Generator)
    function random() {
      state = (state * 1103515245 + 12345) & 2147483647;
      return state / 2147483647;
    }

    // Create array of numbers 1-40
    const numbers = Array.from({ length: 40 }, (_, i) => i + 1);

    // Fisher-Yates shuffle
    for (let i = numbers.length - 1; i > numbers.length - 11; i--) {
      const j = Math.floor(random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    // Return the last 10 numbers (most shuffled)
    const drawn = numbers.slice(30).sort((a, b) => a - b);
    
    console.log(`[Keno] generateDrawnNumbers: gameSeed=${gameSeed.slice(0, 8)}..., drawn=${drawn}`);
    return drawn;
  } catch (error) {
    console.error('[Keno] generateDrawnNumbers error:', error);
    // Fallback to random selection
    const shuffled = Array.from({ length: 40 }, (_, i) => i + 1)
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)
      .sort((a, b) => a - b);
    return shuffled;
  }
}

/**
 * Verify a Keno round was fair
 * Returns true if the drawn numbers match what would be generated from the seeds
 */
export function verifyKenoRound(serverSeed, blockHash, claimedDrawnNumbers) {
  try {
    const gameSeed = createGameSeed(serverSeed, blockHash);
    const calculatedDrawn = generateDrawnNumbers(gameSeed);
    
    // Compare as sorted arrays
    const claimed = Array.from(claimedDrawnNumbers).sort((a, b) => a - b);
    const matches = JSON.stringify(claimed) === JSON.stringify(calculatedDrawn);
    
    console.log(`[Keno] verifyKenoRound: claimed=${claimed}, calculated=${calculatedDrawn}, matches=${matches}`);
    return matches;
  } catch (error) {
    console.error('[Keno] Verification error:', error);
    return false;
  }
}

/**
 * Hash the server seed for proof of fair
 */
export function hashServerSeed(serverSeed) {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}
