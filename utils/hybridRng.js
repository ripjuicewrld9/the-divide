/**
 * Hybrid RNG System: Random.org + EOS Block Hashes
 * 
 * Architecture:
 * 1. Random.org provides true random seed
 * 2. EOS blockchain provides unpredictable block hash
 * 3. Combine both using XOR of hex values
 * 4. Use combined hash for provably fair ticket generation
 * 
 * Result: Cryptographically secure, blockchain-verified randomness
 */

import crypto from 'crypto';
import axios from 'axios';
import seedrandom from 'seedrandom';

/**
 * Fetch true random string from Random.org
 * @returns {Promise<string>} Random hex string
 */
async function fetchRandomOrgSeed() {
  const RANDOM_ORG_API_KEY = process.env.RANDOM_ORG_API_KEY;
  if (!RANDOM_ORG_API_KEY) {
    console.warn(`[HybridRNG] ⚠️  RANDOM_ORG_API_KEY not set, cannot call Random.org API`);
    throw new Error('RANDOM_ORG_API_KEY not set');
  }

  try {
    console.log(`[HybridRNG] 🌐 Attempting Random.org API call (key configured: ${RANDOM_ORG_API_KEY.substring(0, 8)}...)...`);
    const startTime = Date.now();
    const response = await axios.post('https://api.random.org/json-rpc/2.0/invoke', {
      jsonrpc: '2.0',
      method: 'generateStrings',
      params: {
        apiKey: RANDOM_ORG_API_KEY,
        n: 1,
        length: 64,
        characters: '0123456789abcdef',
      },
      id: 1,
    }, { timeout: 5000 });

    const elapsedMs = Date.now() - startTime;
    if (response.data.result?.random?.data?.[0]) {
      const seed = response.data.result.random.data[0];
      console.log(`[HybridRNG] ✅ Random.org SUCCESSFUL (${elapsedMs}ms): ${seed.substring(0, 16)}...`);
      return seed;
    }
    throw new Error('Invalid Random.org response structure');
  } catch (error) {
    console.warn(`[HybridRNG] ⚠️  Random.org FAILED (${error.message})`);
    throw error;
  }
}

/**
 * Fetch latest EOS block hash
 * @returns {Promise<string>} EOS block hash (64-char hex)
 */
async function fetchEOSBlockHash() {
  try {
    console.log(`[HybridRNG] 🔗 Attempting EOS Flare API call...`);
    const startTime = Date.now();
    const response = await axios.get('https://eos.eosflare.io/api/v1/chain/get_info', {
      timeout: 3000,
    });

    const elapsedMs = Date.now() - startTime;
    if (response.data?.head_block_id) {
      const blockHash = response.data.head_block_id;
      console.log(`[HybridRNG] ✅ EOS block SUCCESSFUL (${elapsedMs}ms): ${blockHash.substring(0, 16)}...`);
      return blockHash;
    }
    throw new Error('Invalid EOS API response structure');
  } catch (error) {
    console.warn(`[HybridRNG] ⚠️  EOS FAILED (${error.message})`);
    throw error;
  }
}

/**
 * Combine two hex strings using XOR
 * @param {string} hex1 - First hex string
 * @param {string} hex2 - Second hex string
 * @returns {string} XORed hex string
 */
function xorHexStrings(hex1, hex2) {
  // Ensure equal length
  const maxLen = Math.max(hex1.length, hex2.length);
  hex1 = hex1.padStart(maxLen, '0');
  hex2 = hex2.padStart(maxLen, '0');

  let result = '';
  for (let i = 0; i < maxLen; i += 2) {
    const byte1 = parseInt(hex1.substring(i, i + 2), 16) || 0;
    const byte2 = parseInt(hex2.substring(i, i + 2), 16) || 0;
    const xored = (byte1 ^ byte2).toString(16).padStart(2, '0');
    result += xored;
  }
  return result;
}

/**
 * Generate hybrid seed combining Random.org + EOS block hash
 * Falls back to crypto.randomBytes if external APIs are unavailable
 * @returns {Promise<{randomOrgSeed: string, blockHash: string, hybridSeed: string}>}
 */
export async function generateHybridSeed() {
  console.log(`[HybridRNG] ========== SEED GENERATION START ==========`);
  let randomOrgSeed = null;
  let blockHash = null;
  
  try {
    console.log(`[HybridRNG] Attempting to fetch from both APIs in parallel...`);
    const results = await Promise.allSettled([
      fetchRandomOrgSeed(),
      fetchEOSBlockHash(),
    ]);

    const randomOrgResult = results[0];
    const eosResult = results[1];

    randomOrgSeed = randomOrgResult.status === 'fulfilled' ? randomOrgResult.value : null;
    blockHash = eosResult.status === 'fulfilled' ? eosResult.value : null;

    // Check if we have at least one successful API call
    if (!randomOrgSeed && !blockHash) {
      throw new Error('Both Random.org and EOS APIs failed');
    }

    // If we have both, XOR them
    if (randomOrgSeed && blockHash) {
      const hybridSeed = xorHexStrings(randomOrgSeed, blockHash);
      console.log(`[HybridRNG] 🔐 HYBRID SEED CREATED (Random.org XOR EOS): ${hybridSeed.substring(0, 16)}...`);
      console.log(`[HybridRNG] ========== SEED GENERATION SUCCESS ==========`);
      return { randomOrgSeed, blockHash, hybridSeed };
    }

    // If only one API succeeded, use it alone
    const selectedSeed = randomOrgSeed || blockHash;
    console.log(`[HybridRNG] ⚠️  Using single API seed (${randomOrgSeed ? 'Random.org' : 'EOS'} successful, other failed): ${selectedSeed.substring(0, 16)}...`);
    console.log(`[HybridRNG] ========== SEED GENERATION PARTIAL (1/2 APIs) ==========`);
    return { randomOrgSeed, blockHash, hybridSeed: selectedSeed };
  } catch (error) {
    console.error('[HybridRNG] ❌ BOTH EXTERNAL APIS FAILED - Using crypto.randomBytes fallback');
    console.error(`[HybridRNG] Error: ${error.message}`);
    
    // Fallback: use crypto.randomBytes for secure local RNG when APIs are down
    const cryptoSeed = crypto.randomBytes(32).toString('hex');
    console.log(`[HybridRNG] 🔒 FALLBACK SEED (crypto.randomBytes): ${cryptoSeed.substring(0, 16)}...`);
    console.log(`[HybridRNG] ========== SEED GENERATION FALLBACK ==========`);
    
    return {
      randomOrgSeed: null,
      blockHash: null,
      hybridSeed: cryptoSeed,
    };
  }
}

/**
 * Generate deterministic ticket using hybrid seed
 * @param {string} hybridSeed - Hybrid seed from generateHybridSeed()
 * @param {number} nonce - Unique nonce per ticket (player index, round, etc)
 * @returns {number} Ticket (0-99999)
 */
export function generateTicketFromHybridSeed(hybridSeed, nonce = 0) {
  try {
    // Create deterministic RNG from hybrid seed + nonce
    const combined = hybridSeed + nonce.toString().padStart(8, '0');
    const rng = seedrandom(combined);
    const ticket = Math.floor(rng() * 100000);
    
    console.log(`[HybridRNG] Generated ticket ${ticket} from seed (nonce: ${nonce})`);
    return ticket;
  } catch (error) {
    console.error('[HybridRNG] Error generating ticket:', error.message);
    throw error;
  }
}

/**
 * Get item ticket ranges (same as standard RNG)
 * @param {Array} items - Items with 'chance' property
 * @returns {Array} Ticket ranges
 */
export function getItemTicketRanges(items) {
  if (!items || items.length === 0) return [];

  const ranges = [];
  let currentTicket = 0;

  for (const item of items) {
    const chance = item.chance || 0;
    const itemTickets = Math.ceil((chance / 100) * 100000);
    const startTicket = currentTicket;
    const endTicket = startTicket + itemTickets - 1;

    ranges.push({
      item: item.name,
      startTicket,
      endTicket,
      chance: chance,
      value: item.value,
      rarity: item.rarity,
      color: item.color,
      id: item._id || item.id,
      image: item.image,
    });

    currentTicket = endTicket + 1;
  }

  return ranges;
}

/**
 * Get winning item based on ticket
 * @param {number} ticket - Ticket number (0-99999)
 * @param {Array} ticketRanges - Ranges from getItemTicketRanges()
 * @returns {Object} Winning item
 */
export function getWinningItem(ticket, ticketRanges) {
  for (const range of ticketRanges) {
    if (ticket >= range.startTicket && ticket <= range.endTicket) {
      return {
        item: range.item,
        value: range.value,
        chance: range.chance,
        rarity: range.rarity,
        color: range.color,
        id: range.id,
        image: range.image,
      };
    }
  }
  
  // Fallback (should never happen if ranges cover 0-99999)
  return ticketRanges[0] || { item: 'Unknown', value: 0, chance: 0 };
}
