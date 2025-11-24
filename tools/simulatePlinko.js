import crypto from 'crypto';
import {
  createGameSeed,
  generateBinIndex,
  getMultiplier,
  isJackpot,
  JACKPOT_DENOMINATOR,
  JACKPOT_MULTIPLIER,
} from '../utils/plinkoProofOfFair.js';

// Simple CLI: node tools/simulatePlinko.js [trials] [rowCount] [riskLevel]
const trials = Number(process.argv[2]) || 200000;
const rowCount = Number(process.argv[3]) || 16;
const riskLevel = process.argv[4] || 'high';
const bet = 1.0; // $1 per trial

console.log(`Simulating ${trials} rounds — rows=${rowCount}, risk=${riskLevel}`);

let totalPayout = 0;
let jackpotHits = 0;
const binCounts = Array(rowCount + 1).fill(0);

for (let i = 0; i < trials; i++) {
  // Generate random serverSeed and blockHash (same shapes as production fallbacks)
  const serverSeed = crypto.randomBytes(16).toString('hex').slice(0, 32);
  const blockHash = crypto.randomBytes(32).toString('hex');

  const gameSeed = createGameSeed(serverSeed, blockHash);
  const binIndex = generateBinIndex(gameSeed, rowCount);
  let multiplier = getMultiplier(binIndex, rowCount, riskLevel);

  if (isJackpot(gameSeed, JACKPOT_DENOMINATOR)) {
    multiplier = JACKPOT_MULTIPLIER;
    jackpotHits += 1;
  }

  binCounts[binIndex] += 1;
  totalPayout += bet * multiplier;
}

const avgPayout = totalPayout / trials;
const rtp = (avgPayout / bet) * 100;
const jackpotFreq = jackpotHits > 0 ? `${trials / jackpotHits} (observed ${jackpotHits} hits)` : `0 (observed 0 hits)`;

console.log('--- Results ---');
console.log(`Trials: ${trials}`);
console.log(`Jackpot config: 1 in ${JACKPOT_DENOMINATOR}, multiplier ${JACKPOT_MULTIPLIER}`);
console.log(`Jackpot observed frequency: ${jackpotFreq}`);
console.log(`Average payout per bet: $${avgPayout.toFixed(6)}`);
console.log(`Estimated RTP: ${rtp.toFixed(4)}%`);

// Show all bins and their distribution
console.log('\nBin distribution (idx: count [%]):');
const sortedBins = binCounts
  .map((count, idx) => ({ idx, count, pct: ((count / trials) * 100).toFixed(3) }))
  .sort((a, b) => b.count - a.count);

sortedBins.forEach(b => {
  console.log(`  Bin ${b.idx}: ${b.count.toString().padStart(6)} [${b.pct}%]`);
});

const edgeBins = [0, rowCount];
const edgeHits = edgeBins.reduce((sum, bin) => sum + binCounts[bin], 0);
const edgePct = ((edgeHits / trials) * 100).toFixed(3);
console.log(`\nEdge bins (0 & ${rowCount}) combined: ${edgeHits} hits [${edgePct}%]`);

process.exit(0);
