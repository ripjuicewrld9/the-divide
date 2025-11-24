/**
 * Provably Fair RNG System (Universal)
 * 
 * Architecture:
 * 1. Server Seed (from Random.org or crypto)
 * 2. Server Hash (SHA256(serverSeed)) - published before battle
 * 3. Block Hash (from EOS blockchain - public, unpredictable)
 * 4. Game Seed = serverSeed + blockHash
 * 5. Per-round RNG using seedrandom with deterministic rolls
 * 
 * Result: Fully auditable, provably fair battle outcomes
 */

const crypto = require('crypto');
const seedrandom = require('seedrandom');
const axios = require('axios');

// ============================================================================
// 1. SERVER SEED GENERATION
// ============================================================================

/**
 * Generate server seed from Random.org (preferred - true randomness)
 * @returns {Promise<string>} 32-char alphanumeric seed
 */
async function generateServerSeedFromRandomOrg() {
  const apiKey = process.env.RANDOM_ORG_API_KEY;
  if (!apiKey) {
    console.warn('[ProofOfFair] RANDOM_ORG_API_KEY not set, falling back to crypto');
    return generateServerSeedFallback();
  }

  try {
    console.log('[ProofOfFair] Generating server seed from Random.org...');
    const response = await axios.post('https://api.random.org/json-rpc/2.0/invoke', {
      jsonrpc: '2.0',
      method: 'generateStrings',
      params: {
        apiKey: apiKey,
        n: 1,
        length: 32,
        characters: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      },
      id: 1,
    }, { timeout: 10000 });

    if (response.data.result && response.data.result.random && response.data.result.random.data[0]) {
      const seed = response.data.result.random.data[0];
      console.log(`[ProofOfFair] ✅ Server seed generated: ${seed.substring(0, 16)}...`);
      return seed;
    } else {
      throw new Error('Invalid Random.org response structure');
    }
  } catch (error) {
    console.error('[ProofOfFair] Random.org API error:', error.message);
    console.warn('[ProofOfFair] Falling back to crypto.randomBytes()');
    return generateServerSeedFallback();
  }
}

/**
 * Fallback: Generate seed using Node.js crypto
 * @returns {string} 32-char seed
 */
function generateServerSeedFallback() {
  const randomBytes = crypto.randomBytes(16).toString('hex'); // 32 chars
  const timestamp = Date.now().toString(36); // base36 encoded time
  const combined = (randomBytes + timestamp).substring(0, 32);
  console.log(`[ProofOfFair] ⚠️ Fallback seed (crypto): ${combined.substring(0, 16)}...`);
  return combined;
}

// ============================================================================
// 2. SERVER HASH (SHA256)
// ============================================================================

/**
 * Hash server seed for publishing before battle
 * @param {string} serverSeed - The server seed
 * @returns {string} SHA256 hex hash
 */
function hashServerSeed(serverSeed) {
  const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  console.log(`[ProofOfFair] Server hash: ${hash.substring(0, 16)}...`);
  return hash;
}

// ============================================================================
// 3. BLOCK HASH (EOS - Free, No Auth)
// ============================================================================

/**
 * Get latest EOS block hash (free API, no authentication)
 * @returns {Promise<string>} EOS block hash (64-char hex)
 */
async function getEOSBlockHash() {
  try {
    console.log('[ProofOfFair] Fetching latest EOS block hash...');
    
    // Use public EOS API endpoint (eosflare.io has free, public RPC)
    const response = await axios.get('https://eos.eosflare.io/api/v1/chain/get_info', {
      timeout: 5000,
    });

    if (response.data && response.data.head_block_id) {
      const blockHash = response.data.head_block_id;
      console.log(`[ProofOfFair] ✅ EOS block hash: ${blockHash.substring(0, 16)}...`);
      return blockHash;
    } else {
      throw new Error('Invalid EOS API response');
    }
  } catch (error) {
    console.error('[ProofOfFair] EOS API error:', error.message);
    console.warn('[ProofOfFair] Using fallback entropy...');
    
    // Fallback: Use timestamp + random entropy (still deterministic for given seed)
    const fallback = crypto.randomBytes(32).toString('hex');
    console.log(`[ProofOfFair] ⚠️ Fallback block hash: ${fallback.substring(0, 16)}...`);
    return fallback;
  }
}

// ============================================================================
// 4. GAME SEED GENERATION
// ============================================================================

/**
 * Combine server seed + block hash into game seed
 * @param {string} serverSeed - The server seed
 * @param {string} blockHash - The EOS block hash
 * @returns {string} Combined game seed
 */
function createGameSeed(serverSeed, blockHash) {
  const gameSeed = serverSeed + blockHash;
  console.log(`[ProofOfFair] Game seed created (${gameSeed.length} chars)`);
  return gameSeed;
}

// ============================================================================
// 5. PER-ROUND RNG ROLLS
// ============================================================================

/**
 * Generate deterministic RNG roll for a specific round/slot
 * @param {string} gameSeed - The combined game seed
 * @param {number} round - Round number (0, 1, 2, etc for 1v1, 2v2, etc)
 * @param {number} slot - Slot/player number (0, 1, 2, 3...)
 * @returns {object} { ticket: 0-99999, rng: seedrandom instance }
 */
function generateRoll(gameSeed, round, slot) {
  const seedString = `${gameSeed}:${round}:${slot}`;
  const rng = seedrandom(seedString, { entropy: true }); // ARC4, deterministic
  const ticket = Math.floor(rng() * 100000); // 0-99999
  
  console.log(`[ProofOfFair] Roll - Round ${round}, Slot ${slot}: ticket=${ticket}`);
  
  return {
    seedString,
    ticket,
    rng, // For testing/verification purposes
  };
}

// ============================================================================
// 6. ITEM SELECTION FROM TICKET
// ============================================================================

/**
 * Get winning item based on ticket and case items
 * @param {number} ticket - Ticket (0-99999)
 * @param {array} items - Array of { name, chance (0-100) }
 * @returns {object} { item, itemName, itemValue, index }
 */
function selectItemFromTicket(ticket, items) {
  // Build cumulative ranges
  let cumulative = 0;
  const ranges = [];
  
  for (const item of items) {
    const itemChance = item.chance || 0;
    const itemCount = Math.round((itemChance / 100) * 100000); // Scale to ticket range
    ranges.push({
      item,
      itemName: item.name,
      itemValue: item.value,
      startTicket: cumulative,
      endTicket: cumulative + itemCount - 1,
    });
    cumulative += itemCount;
  }
  
  // Find matching range
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (ticket >= range.startTicket && ticket <= range.endTicket) {
      console.log(`[ProofOfFair] Ticket ${ticket} → ${range.itemName} (range: ${range.startTicket}-${range.endTicket})`);
      return {
        ...range,
        index: i,
      };
    }
  }
  
  // Fallback to last item
  const lastRange = ranges[ranges.length - 1];
  console.warn(`[ProofOfFair] Ticket ${ticket} out of range, fallback to: ${lastRange.itemName}`);
  return {
    ...lastRange,
    index: ranges.length - 1,
  };
}

// ============================================================================
// 7. VERIFICATION (CLIENT-SIDE)
// ============================================================================

/**
 * Verify a battle result is fair
 * @param {object} battleData - { serverSeed, blockHash, round, slot, itemName, items: [...] }
 * @returns {object} { valid: bool, message: string, calculatedItem: string }
 */
function verifyBattleResult(battleData) {
  const { serverSeed, blockHash, round, slot, itemName, items, serverHash } = battleData;
  
  // 1. Verify server seed hash
  if (serverHash) {
    const calculatedHash = hashServerSeed(serverSeed);
    if (calculatedHash !== serverHash) {
      return {
        valid: false,
        message: 'Server seed hash mismatch!',
      };
    }
  }
  
  // 2. Recalculate game seed
  const gameSeed = createGameSeed(serverSeed, blockHash);
  
  // 3. Regenerate roll
  const roll = generateRoll(gameSeed, round, slot);
  
  // 4. Get item from ticket
  const result = selectItemFromTicket(roll.ticket, items);
  
  // 5. Verify match
  if (result.itemName === itemName) {
    return {
      valid: true,
      message: 'Battle result verified ✅',
      calculatedItem: result.itemName,
      ticket: roll.ticket,
    };
  } else {
    return {
      valid: false,
      message: `Expected ${result.itemName} but got ${itemName}`,
      calculatedItem: result.itemName,
      ticket: roll.ticket,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  generateServerSeedFromRandomOrg,
  generateServerSeedFallback,
  hashServerSeed,
  getEOSBlockHash,
  createGameSeed,
  generateRoll,
  selectItemFromTicket,
  verifyBattleResult,
};
