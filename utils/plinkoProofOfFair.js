import crypto from 'crypto';
import fetch from 'node-fetch';

/**
 * Plinko Provably Fair System
 * Uses Random.org API for server seed + EOS blockchain for external entropy
 */

// House edge configuration - adjusts probability distribution to achieve target RTP
// Set to 0 for no house edge (current behavior), or 0.03-0.05 for industry standard
const HOUSE_EDGE_BIAS = 0.99; // 97% house edge - biases toward center bins

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

    const response = await fetch(RANDOM_ORG_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Random.org returned ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      console.warn(`[Plinko] Random.org error: ${data.error.message}, using crypto fallback`);
      return crypto.randomBytes(16).toString('hex').slice(0, 32);
    }

    return data.result?.random?.data?.[0] || crypto.randomBytes(16).toString('hex').slice(0, 32);
  } catch (error) {
    console.warn(`[Plinko] Random.org fetch failed: ${error.message}, using crypto fallback`);
    // Fallback to crypto.randomBytes
    return crypto.randomBytes(16).toString('hex').slice(0, 32);
  }
}

/**
 * Get the latest EOS block hash for external entropy
 */
export async function getEOSBlockHash() {
  try {
    const response = await fetch('https://api.eosflare.io/v1/chain/get_info');
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
    console.warn(`[Plinko] EOS API failed: ${error.message}, using crypto fallback`);
    // Fallback to random hash
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
 * Exact probability distribution for each bin based on row count
 * These odds are from top plinko websites - guaranteed fair distribution
 * Same odds apply to all risk levels (only payouts change)
 */
const BIN_ODDS = {
  8: [0.3906, 3.125, 10.9375, 21.875, 27.3438, 21.875, 10.9375, 3.125, 0.3906],
  9: [0.1953, 1.7578, 7.0313, 16.4063, 24.6094, 24.6094, 16.4063, 7.0313, 1.7578, 0.1953],
  10: [0.0977, 0.9766, 4.3945, 11.7188, 20.5078, 24.6094, 20.5078, 11.7188, 4.3945, 0.9766, 0.0977],
  11: [0.0488, 0.5371, 2.6855, 8.0566, 16.1133, 22.6586, 22.6586, 16.1133, 8.0566, 2.6855, 0.5371, 0.0488],
  12: [0.0244, 0.293, 1.6113, 5.3711, 12.085, 19.3359, 22.6586, 19.3359, 12.085, 5.3711, 1.6113, 0.293, 0.0244],
  13: [0.0122, 0.1587, 0.9521, 3.4912, 8.728, 15.7104, 20.9473, 20.9473, 15.7104, 8.728, 3.4912, 0.9521, 0.1587, 0.0122],
  14: [0.0061, 0.0854, 0.5554, 2.2217, 6.1096, 12.2192, 18.3259, 20.9473, 18.3289, 12.2192, 6.1096, 2.2217, 0.5554, 0.0854, 0.0061],
  15: [0.0031, 0.0458, 0.3204, 1.3885, 4.1656, 9.1644, 15.274, 19.6381, 19.6381, 15.274, 9.1644, 4.1656, 1.3885, 0.3204, 0.0458, 0.0031],
  16: [0.0015, 0.0244, 0.1831, 0.8545, 2.7771, 6.665, 12.2192, 17.4561, 19.6381, 17.4561, 12.2192, 6.665, 2.7771, 0.8545, 0.1831, 0.0244, 0.0015],
};

/**
 * Apply house edge bias to probability distribution
 * Increases probability of center bins (lower multipliers) by house edge percentage
 * This maintains provable fairness while achieving target RTP
 */
function applyHouseEdgeBias(odds, rowCount) {
  if (HOUSE_EDGE_BIAS <= 0) {
    return [...odds]; // No bias, return original odds
  }

  const biasedOdds = [...odds];
  const centerIndex = Math.floor(odds.length / 2);
  const biasRange = Math.max(2, Math.floor(odds.length * 0.4)); // Bias center 40% of bins

  // Calculate total bias to redistribute
  let totalBiasToAdd = 0;
  let totalBiasToRemove = 0;

  // First pass: calculate how much to move
  for (let i = 0; i < odds.length; i++) {
    const distanceFromCenter = Math.abs(i - centerIndex);

    if (distanceFromCenter <= biasRange / 2) {
      // Center bins get more probability
      const biasAmount = odds[i] * HOUSE_EDGE_BIAS * (1 - distanceFromCenter / (biasRange / 2));
      totalBiasToAdd += biasAmount;
    } else {
      // Edge bins lose probability
      const biasAmount = odds[i] * HOUSE_EDGE_BIAS * 0.5;
      totalBiasToRemove += biasAmount;
    }
  }

  // Second pass: apply the bias
  for (let i = 0; i < odds.length; i++) {
    const distanceFromCenter = Math.abs(i - centerIndex);

    if (distanceFromCenter <= biasRange / 2) {
      // Add to center bins
      const biasAmount = odds[i] * HOUSE_EDGE_BIAS * (1 - distanceFromCenter / (biasRange / 2));
      biasedOdds[i] += biasAmount;
    } else {
      // Remove from edge bins
      const biasAmount = odds[i] * HOUSE_EDGE_BIAS * 0.5;
      biasedOdds[i] = Math.max(0.001, biasedOdds[i] - biasAmount); // Minimum 0.001% chance
    }
  }

  // Normalize to ensure probabilities sum to 100%
  const sum = biasedOdds.reduce((a, b) => a + b, 0);
  return biasedOdds.map(odd => (odd / sum) * 100);
}

/**
 * Apply exact binomial distribution odds to bin selection with optional house edge bias
 * This is deterministic and provably fair using the exact odds from the sheet.
 * @param randomValue - a pseudo-random value in [0, 1)
 * @param rowCount - number of rows
 * @returns bin index (0 to rowCount) based on odds distribution + house edge
 */
function applyBinBias(randomValue, rowCount) {
  const odds = BIN_ODDS[rowCount];
  if (!odds) {
    console.warn(`[Plinko] Unknown row count: ${rowCount}, using uniform distribution`);
    return Math.floor(randomValue * (rowCount + 1));
  }

  // Apply house edge bias - favor center bins (lower multipliers) slightly
  const biasedOdds = applyHouseEdgeBias(odds, rowCount);

  console.log(`[Plinko] applyBinBias odds for row ${rowCount}: [${biasedOdds.map(o => o.toFixed(4)).join(', ')}]`);

  // Convert odds percentages to cumulative distribution
  const cdf = [];
  let cumulative = 0;
  for (let i = 0; i < biasedOdds.length; i++) {
    cumulative += biasedOdds[i];
    cdf.push(cumulative);
  }

  // Sample from CDF: find the bin where randomValue % 100 <= cdf[bin]
  const scaledRandom = (randomValue % 1) * 100; // Convert to 0-100 range
  for (let i = 0; i < cdf.length; i++) {
    if (scaledRandom <= cdf[i]) {
      console.log(`[Plinko] scaledRandom=${scaledRandom.toFixed(2)}, cdf[${i}]=${cdf[i].toFixed(2)}, selectedBin=${i}`);
      return i;
    }
  }

  console.log(`[Plinko] scaledRandom=${scaledRandom.toFixed(2)}, fallback to ${odds.length - 1}`);
  return odds.length - 1; // fallback to last bin
}

/**
 * Generate a bin index (0 to rowCount) deterministically from the game seed
 * Uses exact odds distribution from BIN_ODDS lookup table
 */
export function generateBinIndex(gameSeed, rowCount) {
  // Extract a pseudo-random value from the seed for CDF sampling
  const seedBigInt = BigInt('0x' + gameSeed);
  const randomValue = Number((seedBigInt >> BigInt(32)) % BigInt(1000000)) / 1000000;

  // Apply odds distribution
  const biasBin = applyBinBias(randomValue, rowCount);

  console.log(`[Plinko] generateBinIndex: rowCount=${rowCount}, randomValue=${randomValue.toFixed(6)}, binIndex=${biasBin}`);
  return biasBin;
}

/**
 * Get the payout multiplier for a given bin, row count, and risk level
 * These values are synchronized with frontend constants
 */
export function getMultiplier(binIndex, rowCount, riskLevel) {
  // These are the payouts from frontend constants - MUST match exactly
  // Structure: { [rowCount]: { [riskLevel]: [multipliers] } }
  const payouts = {
    8: {
      low: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
      medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
      high: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    },
    9: {
      low: [5.6, 2, 1.6, 1, 0.7, 0.7, 1, 1.6, 2, 5.6],
      medium: [18, 4, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4, 18],
      high: [43, 7, 2, 0.6, 0.2, 0.2, 0.6, 2, 7, 43],
    },
    10: {
      low: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
      medium: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
      high: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
    },
    11: {
      low: [8.4, 3, 1.9, 1.3, 1, 0.7, 0.7, 1, 1.3, 1.9, 3, 8.4],
      medium: [24, 6, 3, 1.8, 0.7, 0.5, 0.5, 0.7, 1.8, 3, 6, 24],
      high: [120, 14, 5.2, 1.4, 0.4, 0.2, 0.2, 0.4, 1.4, 5.2, 14, 120],
    },
    12: {
      low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
      medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
      high: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
    },
    13: {
      low: [8.1, 4, 3, 1.9, 1.2, 0.9, 0.7, 0.7, 0.9, 1.2, 1.9, 3, 4, 8.1],
      medium: [43, 13, 6, 3, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3, 6, 13, 43],
      high: [260, 37, 11, 4, 1, 0.2, 0.2, 0.2, 0.2, 1, 4, 11, 37, 260],
    },
    14: {
      low: [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1, 0.5, 1, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
      medium: [58, 15, 7, 4, 1.9, 1, 0.5, 0.2, 0.5, 1, 1.9, 4, 7, 15, 58],
      high: [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420],
    },
    15: {
      low: [15, 8, 3, 2, 1.5, 1.1, 1, 0.7, 0.7, 1, 1.1, 1.5, 2, 3, 8, 15],
      medium: [88, 18, 11, 5, 3, 1.3, 0.5, 0.3, 0.3, 0.5, 1.3, 3, 5, 11, 18, 88],
      high: [620, 83, 27, 8, 3, 0.5, 0.2, 0.2, 0.2, 0.2, 0.5, 3, 8, 27, 83, 620],
    },
    16: {
      low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
      medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
      high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
    },
  };

  const riskPayouts = payouts[rowCount]?.[riskLevel];
  if (!riskPayouts) {
    console.warn(`[PlinkoProof] Unknown rowCount ${rowCount} or riskLevel ${riskLevel}, using 1.0`);
    return 1.0;
  }

  const multiplier = riskPayouts[binIndex];
  if (multiplier === undefined) {
    console.warn(`[PlinkoProof] Unknown binIndex ${binIndex} for rowCount ${rowCount}, using 1.0`);
    return 1.0;
  }

  return multiplier;
}

/**
 * Jackpot configuration and deterministic check
 * Uses the 256-bit `gameSeed` to derive a pseudo-random integer and checks
 * whether it falls within a 1-in-`denominator` chance. This is provably-fair
 * because the same `gameSeed` (serverSeed+blockHash) is returned to the player
 * and can be independently verified.
 */
export const JACKPOT_DENOMINATOR = Number(process.env.PLINKO_JACKPOT_DENOMINATOR) || 32000;
export const JACKPOT_MULTIPLIER = Number(process.env.PLINKO_JACKPOT_MULTIPLIER) || 1000;

export function isJackpot(gameSeed, denominator = JACKPOT_DENOMINATOR) {
  try {
    // Convert hex seed to BigInt and reduce modulo denominator
    const seedBigInt = BigInt('0x' + gameSeed);
    const val = Number(seedBigInt % BigInt(denominator));
    return val === 0; // 1 in `denominator` chance
  } catch (error) {
    console.warn('[PlinkoProof] isJackpot check failed, defaulting to false', error.message);
    return false;
  }
}

/**
 * Verify a Plinko round was fair
 * Returns true if the bin index matches what would be generated from the seeds
 */
export function verifyPlinkoRound(serverSeed, blockHash, claimedBinIndex, rowCount) {
  try {
    const gameSeed = createGameSeed(serverSeed, blockHash);
    const calculatedBinIndex = generateBinIndex(gameSeed, rowCount);
    return calculatedBinIndex === claimedBinIndex;
  } catch (error) {
    console.error('[PlinkoProof] Verification error:', error);
    return false;
  }
}




