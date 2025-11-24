import crypto from 'crypto';
import {
  createGameSeed,
  generateBinIndex,
  getMultiplier,
  isJackpot,
  JACKPOT_DENOMINATOR,
  JACKPOT_MULTIPLIER,
} from '../utils/plinkoProofOfFair.js';

/**
 * Calibration tool: find a scaling factor that drives RTP to a target (default 98%)
 * Usage: node tools/calibratePlinkoRTP.js [targetRTP] [rowCount] [riskLevel] [trials]
 */

const targetRTP = Number(process.argv[2]) || 98;
const rowCount = Number(process.argv[3]) || 16;
const riskLevel = process.argv[4] || 'high';
const trialsPerRun = Number(process.argv[5]) || 100000;

console.log(`Calibrating to ${targetRTP}% RTP (rows=${rowCount}, risk=${riskLevel}, ${trialsPerRun} trials per run)`);

// Read the hardcoded payouts from plinkoProofOfFair.js (we'll scale them)
const basePayouts = {
  8: {
    low: [5.2, 2, 1.3, 1.1, 0.4, 1.1, 1.3, 2, 5.2],
    medium: [11, 3.2, 1.5, 0.8, 0.5, 0.8, 1.5, 3.2, 11],
    high: [24, 4, 1.8, 0.4, 0.2, 0.4, 1.8, 4, 24],
  },
  9: {
    low: [5.4, 2.1, 1.4, 1, 0.6, 0.6, 1, 1.4, 2.1, 5.4],
    medium: [15, 3.5, 1.8, 0.9, 0.6, 0.6, 0.9, 1.8, 3.5, 15],
    high: [35, 6, 2.2, 0.5, 0.2, 0.2, 0.5, 2.2, 6, 35],
  },
  10: {
    low: [7.8, 3, 1.5, 1.1, 0.8, 0.5, 0.8, 1.1, 1.5, 3, 7.8],
    medium: [18, 5, 2.1, 1.2, 0.7, 0.5, 0.7, 1.2, 2.1, 5, 18],
    high: [60, 9, 3.2, 0.8, 0.3, 0.2, 0.3, 0.8, 3.2, 9, 60],
  },
  11: {
    low: [7.8, 3.2, 1.8, 1.2, 0.9, 0.6, 0.6, 0.9, 1.2, 1.8, 3.2, 7.8],
    medium: [20, 6, 2.8, 1.5, 0.8, 0.6, 0.6, 0.8, 1.5, 2.8, 6, 20],
    high: [90, 12, 4, 1, 0.4, 0.2, 0.2, 0.4, 1, 4, 12, 90],
  },
  12: {
    low: [8.5, 3.2, 1.6, 1.3, 1, 0.8, 0.5, 0.8, 1, 1.3, 1.6, 3.2, 8.5],
    medium: [25, 8, 3, 1.8, 1, 0.7, 0.4, 0.7, 1, 1.8, 3, 8, 25],
    high: [130, 18, 6, 1.5, 0.6, 0.2, 0.2, 0.2, 0.6, 1.5, 6, 18, 130],
  },
  13: {
    low: [7.5, 3.8, 2.5, 1.6, 1, 0.8, 0.6, 0.6, 0.8, 1, 1.6, 2.5, 3.8, 7.5],
    medium: [32, 10, 5, 2.5, 1.2, 0.8, 0.5, 0.5, 0.8, 1.2, 2.5, 5, 10, 32],
    high: [200, 28, 8, 2.8, 0.8, 0.2, 0.2, 0.2, 0.2, 0.8, 2.8, 8, 28, 200],
  },
  14: {
    low: [6.5, 3.8, 1.8, 1.4, 1.2, 1, 0.8, 0.5, 0.8, 1, 1.2, 1.4, 1.8, 3.8, 6.5],
    medium: [42, 12, 6, 3, 1.6, 0.9, 0.6, 0.3, 0.6, 0.9, 1.6, 3, 6, 12, 42],
    high: [320, 42, 14, 4, 1.5, 0.3, 0.2, 0.2, 0.2, 0.3, 1.5, 4, 14, 42, 320],
  },
  15: {
    low: [12, 7, 2.8, 1.8, 1.4, 1, 0.8, 0.6, 0.6, 0.8, 1, 1.4, 1.8, 2.8, 7, 12],
    medium: [65, 16, 9, 4, 2.2, 1.2, 0.6, 0.4, 0.4, 0.6, 1.2, 2.2, 4, 9, 16, 65],
    high: [480, 65, 22, 6, 2.2, 0.4, 0.2, 0.2, 0.2, 0.2, 0.4, 2.2, 6, 22, 65, 480],
  },
  16: {
    low: [14, 8, 2, 1.4, 1.3, 1.1, 1, 0.8, 0.5, 0.8, 1, 1.1, 1.3, 1.4, 2, 8, 14],
    medium: [85, 32, 8, 4, 2.5, 1.4, 0.8, 0.5, 0.35, 0.5, 0.8, 1.4, 2.5, 4, 8, 32, 85],
    high: [480, 100, 20, 7, 3, 1.5, 0.3, 0.2, 0.2, 0.2, 0.3, 1.5, 3, 7, 20, 100, 480],
  },
};

function runSimulation(scaledPayouts, trialsPerRun) {
  let totalPayout = 0;
  let jackpotHits = 0;

  for (let i = 0; i < trialsPerRun; i++) {
    const serverSeed = crypto.randomBytes(16).toString('hex').slice(0, 32);
    const blockHash = crypto.randomBytes(32).toString('hex');
    const gameSeed = createGameSeed(serverSeed, blockHash);
    const binIndex = generateBinIndex(gameSeed, rowCount);

    // Use scaled payouts
    const riskPayouts = scaledPayouts[rowCount]?.[riskLevel];
    if (!riskPayouts) {
      console.error(`Invalid rowCount or riskLevel`);
      process.exit(1);
    }
    let multiplier = riskPayouts[binIndex];

    if (isJackpot(gameSeed, JACKPOT_DENOMINATOR)) {
      multiplier = JACKPOT_MULTIPLIER;
      jackpotHits += 1;
    }

    totalPayout += 1.0 * multiplier; // bet = $1
  }

  const avgPayout = totalPayout / trialsPerRun;
  const empiricalRTP = avgPayout * 100;
  return { empiricalRTP, jackpotHits };
}

// Binary search for the scaling factor
let lowScale = 0.001;
let highScale = 1.0;
let bestScale = 0.5;
let bestRTP = 0;
const tolerance = 0.5; // within 0.5% of target

console.log(`\nBinary search for scaling factor...\n`);

for (let iteration = 0; iteration < 15; iteration++) {
  const midScale = (lowScale + highScale) / 2;

  // Apply scaling to a copy of basePayouts
  const scaledPayouts = JSON.parse(JSON.stringify(basePayouts));
  for (const rc in scaledPayouts) {
    for (const rl in scaledPayouts[rc]) {
      scaledPayouts[rc][rl] = scaledPayouts[rc][rl].map((p) => p * midScale);
    }
  }

  const { empiricalRTP, jackpotHits } = runSimulation(scaledPayouts, trialsPerRun);
  const error = empiricalRTP - targetRTP;

  console.log(
    `Iteration ${iteration + 1}: scale=${midScale.toFixed(6)}, RTP=${empiricalRTP.toFixed(2)}%, error=${error.toFixed(2)}%, jackpot_hits=${jackpotHits}`
  );

  if (Math.abs(error) < tolerance) {
    console.log(`\n✅ Converged! Found scale factor: ${midScale.toFixed(6)}`);
    bestScale = midScale;
    bestRTP = empiricalRTP;
    break;
  }

  if (empiricalRTP < targetRTP) {
    lowScale = midScale;
  } else {
    highScale = midScale;
  }

  bestScale = midScale;
  bestRTP = empiricalRTP;
}

// Generate the calibrated payout tables
const calibratedPayouts = JSON.parse(JSON.stringify(basePayouts));
for (const rc in calibratedPayouts) {
  for (const rl in calibratedPayouts[rc]) {
    calibratedPayouts[rc][rl] = calibratedPayouts[rc][rl].map((p) => {
      const scaled = p * bestScale;
      // Round to 2 decimals for readability
      return Math.round(scaled * 100) / 100;
    });
  }
}

console.log(`\n--- CALIBRATED PAYOUTS (scale=${bestScale.toFixed(6)}, target RTP=${targetRTP}%, empirical=${bestRTP.toFixed(2)}%) ---\n`);
console.log(JSON.stringify(calibratedPayouts, null, 2));

console.log(`\n--- Copy-paste into plinkoProofOfFair.js getMultiplier() payouts object ---\n`);
console.log(`const payouts = ${JSON.stringify(calibratedPayouts, null, 2)};`);

process.exit(0);
