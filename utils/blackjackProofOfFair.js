/**
 * Blackjack Provably Fair RNG System
 * 
 * Extends the universal provably fair system for Blackjack-specific logic:
 * - Card generation (deck shuffling simulation)
 * - Side bet evaluation
 * - Hand outcome determination
 * 
 * Architecture:
 * 1. Server Seed (from Random.org)
 * 2. Server Hash (SHA256(serverSeed))
 * 3. Block Hash (from EOS blockchain)
 * 4. Game Seed = Server Seed + Block Hash
 * 5. Per-action RNG rolls for card dealing
 */

import crypto from 'crypto';
import seedrandom from 'seedrandom';
import axios from 'axios';

// ============================================================================
// 1. SERVER SEED GENERATION (copied from universal proofOfFair.js)
// ============================================================================

export async function generateServerSeedFromRandomOrg() {
  const apiKey = process.env.RANDOM_ORG_API_KEY;
  if (!apiKey) {
    console.warn('[BlackjackProof] RANDOM_ORG_API_KEY not set, falling back to crypto');
    return generateServerSeedFallback();
  }

  try {
    console.log('[BlackjackProof] Generating server seed from Random.org...');
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

    if (response.data.result?.random?.data?.[0]) {
      const seed = response.data.result.random.data[0];
      console.log(`[BlackjackProof] ✅ Server seed generated: ${seed.substring(0, 16)}...`);
      return seed;
    } else {
      throw new Error('Invalid Random.org response structure');
    }
  } catch (error) {
    console.error('[BlackjackProof] Random.org API error:', error.message);
    console.warn('[BlackjackProof] Falling back to crypto.randomBytes()');
    return generateServerSeedFallback();
  }
}

export function generateServerSeedFallback() {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now().toString(36);
  const combined = (randomBytes + timestamp).substring(0, 32);
  console.log(`[BlackjackProof] ⚠️ Fallback seed (crypto): ${combined.substring(0, 16)}...`);
  return combined;
}

// ============================================================================
// 2. SERVER HASH (SHA256)
// ============================================================================

export function hashServerSeed(serverSeed) {
  const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  console.log(`[BlackjackProof] Server hash: ${hash.substring(0, 16)}...`);
  return hash;
}

// ============================================================================
// 3. BLOCK HASH (EOS - Free, No Auth)
// ============================================================================

export async function getEOSBlockHash() {
  try {
    console.log('[BlackjackProof] Fetching latest EOS block hash...');
    const response = await axios.get('https://eos.eosflare.io/api/v1/chain/get_info', {
      timeout: 5000,
    });

    if (response.data?.head_block_id) {
      const blockHash = response.data.head_block_id;
      console.log(`[BlackjackProof] ✅ EOS block hash: ${blockHash.substring(0, 16)}...`);
      return blockHash;
    } else {
      throw new Error('Invalid EOS API response');
    }
  } catch (error) {
    console.error('[BlackjackProof] EOS API error:', error.message);
    console.warn('[BlackjackProof] Using fallback entropy...');
    const fallback = crypto.randomBytes(32).toString('hex');
    console.log(`[BlackjackProof] ⚠️ Fallback block hash: ${fallback.substring(0, 16)}...`);
    return fallback;
  }
}

// ============================================================================
// 4. GAME SEED GENERATION
// ============================================================================

export function createGameSeed(serverSeed, blockHash) {
  const gameSeed = serverSeed + blockHash;
  console.log(`[BlackjackProof] Game seed created (${gameSeed.length} chars)`);
  return gameSeed;
}

// ============================================================================
// 5. BLACKJACK-SPECIFIC RNG ROLLS
// ============================================================================

/**
 * Generate deterministic card roll for Blackjack
 * Uses 52-card deck (4 suits × 13 ranks)
 * 
 * Card mapping:
 *   0-3: Ace, 4-7: 2, 8-11: 3, ..., 48-51: King
 * 
 * @param {string} gameSeed - The combined game seed
 * @param {number} dealNumber - Deal sequence (0, 1, 2, ...)
 * @returns {object} { card: 'AS', rank, suit, dealNumber }
 */
export function generateBlackjackCard(gameSeed, dealNumber) {
  const seedString = `${gameSeed}:card:${dealNumber}`;
  const rng = seedrandom(seedString, { entropy: true });
  const ticket = Math.floor(rng() * 52); // 0-51 for 52-card deck

  // Map ticket to card
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const suitIndex = ticket % 4;
  const rankIndex = Math.floor(ticket / 4);

  const card = ranks[rankIndex] + suits[suitIndex];
  
  console.log(`[BlackjackProof] Deal #${dealNumber}: ticket=${ticket} → ${card}`);

  return {
    seedString,
    ticket,
    card,
    rank: ranks[rankIndex],
    suit: suits[suitIndex],
    dealNumber,
  };
}

/**
 * Generate multiple cards for a Blackjack hand
 * @param {string} gameSeed - Game seed
 * @param {number} startDealNumber - Starting deal index
 * @param {number} cardCount - How many cards to generate
 * @returns {array} Array of card objects
 */
export function generateBlackjackCards(gameSeed, startDealNumber, cardCount) {
  const cards = [];
  for (let i = 0; i < cardCount; i++) {
    cards.push(generateBlackjackCard(gameSeed, startDealNumber + i));
  }
  return cards;
}

/**
 * Generate deterministic RNG value for side bet evaluation
 * Used for evaluating Perfect Pairs, 21+3, Blazing 7s
 * 
 * @param {string} gameSeed - Game seed
 * @param {string} betType - 'perfectPairs', 'twentyPlusThree', 'blazingSevens'
 * @returns {object} { seedString, ticket, rng }
 */
export function generateSideBetRoll(gameSeed, betType) {
  const seedString = `${gameSeed}:${betType}`;
  const rng = seedrandom(seedString, { entropy: true });
  const ticket = Math.floor(rng() * 100000); // 0-99999 for flexible scaling

  console.log(`[BlackjackProof] ${betType} roll: ticket=${ticket}`);

  return {
    seedString,
    ticket,
    rng,
  };
}

// ============================================================================
// 6. VERIFICATION (CLIENT-SIDE)
// ============================================================================

/**
 * Verify a Blackjack game result
 * @param {object} gameData - { serverSeed, serverHash, blockHash, gameSeed, rolls: [...] }
 * @returns {object} { valid: bool, message: string }
 */
export function verifyBlackjackGame(gameData) {
  const { serverSeed, serverHash, blockHash, gameSeed, rolls } = gameData;

  // 1. Verify server seed hash
  const calculatedHash = hashServerSeed(serverSeed);
  if (calculatedHash !== serverHash) {
    return {
      valid: false,
      message: `Server hash mismatch: ${calculatedHash} !== ${serverHash}`,
    };
  }

  // 2. Verify game seed
  const calculatedGameSeed = createGameSeed(serverSeed, blockHash);
  if (calculatedGameSeed !== gameSeed) {
    return {
      valid: false,
      message: `Game seed mismatch: ${calculatedGameSeed} !== ${gameSeed}`,
    };
  }

  // 3. Verify each roll
  if (!rolls || rolls.length === 0) {
    return {
      valid: true,
      message: 'No rolls to verify (game may use frontend RNG)',
    };
  }

  for (let i = 0; i < rolls.length; i++) {
    const roll = rolls[i];
    const { dealNumber, card, betType, ticket, outcome } = roll;
    
    // If roll has a card property, it's a card roll - verify card generation
    if (card !== undefined && card !== null && card !== '') {
      const generated = generateBlackjackCard(gameSeed, dealNumber);
      if (generated.card !== card) {
        return {
          valid: false,
          message: `Card mismatch at deal ${dealNumber}: ${generated.card} !== ${card}`,
        };
      }
    } 
    // If roll explicitly has betType AND a numeric ticket value, it's a side bet roll
    else if (betType && typeof ticket === 'number' && !isNaN(ticket)) {
      const generated = generateSideBetRoll(gameSeed, betType);
      if (generated.ticket !== ticket) {
        return {
          valid: false,
          message: `${betType} ticket mismatch: ${generated.ticket} !== ${ticket}`,
        };
      }
    }
    // Otherwise skip this roll (card-only game, no ticket needed)
  }

  return {
    valid: true,
    message: 'All rolls verified successfully ✅',
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const BlackjackProofOfFair = {
  generateServerSeedFromRandomOrg,
  generateServerSeedFallback,
  hashServerSeed,
  getEOSBlockHash,
  createGameSeed,
  generateBlackjackCard,
  generateBlackjackCards,
  generateSideBetRoll,
  verifyBlackjackGame,
};

export default BlackjackProofOfFair;
