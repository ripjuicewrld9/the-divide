/**
 * Multi-Run Casino Simulation Script
 * Runs the simulation multiple times and averages the results
 */

import { paytables } from '../paytable-data.js';

// Simulation parameters
const TOTAL_BETS = 100000; // Total number of bets across all games per run
const NUM_RUNS = 5; // Number of simulation runs to average
const GAME_DISTRIBUTION = {
    plinko: 0.4,    // 40% of bets on Plinko (most popular)
    keno: 0.35,     // 35% on Keno
    blackjack: 0.25 // 25% on Blackjack
};

const RISK_DISTRIBUTION = {
    low: 0.2,     // 20% play low risk
    medium: 0.5,  // 50% play medium risk (most common)
    high: 0.3     // 30% play high risk
};

const BET_SIZE_DISTRIBUTION = [
    { min: 1, max: 5, weight: 0.4 },      // 40% small bets ($1-5)
    { min: 5, max: 25, weight: 0.35 },    // 35% medium bets ($5-25)
    { min: 25, max: 100, weight: 0.2 },   // 20% large bets ($25-100)
    { min: 100, max: 500, weight: 0.05 }  // 5% whale bets ($100-500) - CAPPED AT $500
];

// KENO CAPS
const MAX_KENO_BET = 500;
const MAX_KENO_WIN = 500000;

// Game simulation functions
function simulatePlinko(betAmount, riskLevel) {
    const rowCount = 16; // Most common

    // Generate random value (0-1)
    const randomValue = Math.random();

    // Get bin index using the biased distribution (with house edge)
    const binIndex = applyBinBiasSimple(randomValue, rowCount);

    // Get multiplier for this bin with cap
    const rawMultiplier = getPlinkoMultiplier(binIndex, rowCount, riskLevel);
    const MAX_PAYOUT_MULTIPLIER = 100; // Cap at 100x to prevent extreme volatility
    const multiplier = Math.min(rawMultiplier, MAX_PAYOUT_MULTIPLIER);

    const payout = betAmount * multiplier;
    const profit = payout - betAmount;

    return {
        game: 'plinko',
        bet: betAmount,
        payout: payout,
        profit: profit,
        multiplier: multiplier,
        details: { binIndex, riskLevel, rowCount }
    };
}

// Simplified version of applyBinBias for simulation
function applyBinBiasSimple(randomValue, rowCount) {
    const HOUSE_EDGE_BIAS = 0.85; // Match the bias in plinkoProofOfFair.js

    const BIN_ODDS = {
        16: [0.0015, 0.0244, 0.1831, 0.8545, 2.7771, 6.665, 12.2192, 17.4561, 19.6381, 17.4561, 12.2192, 6.665, 2.7771, 0.8545, 0.1831, 0.0244, 0.0015]
    };

    let odds = BIN_ODDS[rowCount];
    if (!odds) return Math.floor(randomValue * (rowCount + 1));

    // Apply house edge bias
    if (HOUSE_EDGE_BIAS > 0) {
        const biasedOdds = [...odds];
        const centerIndex = Math.floor(odds.length / 2);
        const biasRange = Math.max(2, Math.floor(odds.length * 0.4));

        for (let i = 0; i < odds.length; i++) {
            const distanceFromCenter = Math.abs(i - centerIndex);

            if (distanceFromCenter <= biasRange / 2) {
                const biasAmount = odds[i] * HOUSE_EDGE_BIAS * (1 - distanceFromCenter / (biasRange / 2));
                biasedOdds[i] += biasAmount;
            } else {
                const biasAmount = odds[i] * HOUSE_EDGE_BIAS * 0.5;
                biasedOdds[i] = Math.max(0.001, biasedOdds[i] - biasAmount);
            }
        }

        const sum = biasedOdds.reduce((a, b) => a + b, 0);
        odds = biasedOdds.map(odd => (odd / sum) * 100);
    }

    // Convert to CDF and sample
    const cdf = [];
    let cumulative = 0;
    for (let i = 0; i < odds.length; i++) {
        cumulative += odds[i];
        cdf.push(cumulative);
    }

    const scaledRandom = randomValue * 100;
    for (let i = 0; i < cdf.length; i++) {
        if (scaledRandom <= cdf[i]) {
            return i;
        }
    }
    return odds.length - 1;
}

function getPlinkoMultiplier(binIndex, rowCount, riskLevel) {
    // Plinko multiplier tables for 16 rows (most common)
    const payouts = {
        16: {
            low: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
            medium: [420, 100, 50, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.2, 1.4, 1.4, 2, 9, 50, 100, 420],
            high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
        }
    };

    const table = payouts[rowCount];
    if (!table || !table[riskLevel]) {
        return 0;
    }

    return table[riskLevel][binIndex] || 0;
}

function simulateKeno(betAmount, riskLevel) {
    // Cap bet amount
    betAmount = Math.min(betAmount, MAX_KENO_BET);

    // Random spot count (1-10, weighted toward middle)
    const spotWeights = [0.05, 0.1, 0.15, 0.2, 0.2, 0.15, 0.1, 0.03, 0.015, 0.005];
    let rand = Math.random();
    let spots = 1;
    for (let i = 0; i < spotWeights.length; i++) {
        rand -= spotWeights[i];
        if (rand <= 0) {
            spots = i + 1;
            break;
        }
    }

    // Simulate hypergeometric distribution for hits
    const hits = simulateKenoHits(spots);

    // Get payout multiplier
    const table = paytables[riskLevel];
    const multiplier = (table[spots] && table[spots][hits]) ? table[spots][hits] : 0;

    // Calculate payout with cap
    let payout = betAmount * multiplier;
    if (payout > MAX_KENO_WIN) {
        payout = MAX_KENO_WIN;
    }

    const profit = payout - betAmount;

    return {
        game: 'keno',
        bet: betAmount,
        payout: payout,
        profit: profit,
        multiplier: multiplier,
        details: { spots, hits, riskLevel, capped: payout === MAX_KENO_WIN }
    };
}

function simulateKenoHits(spots) {
    // More accurate: simulate drawing 10 balls from 40, with `spots` marked
    let hits = 0;
    const drawn = new Set();
    const marked = new Set();

    // Mark random spots
    while (marked.size < spots) {
        marked.add(Math.floor(Math.random() * 40) + 1);
    }

    // Draw 10 balls
    while (drawn.size < 10) {
        const ball = Math.floor(Math.random() * 40) + 1;
        if (!drawn.has(ball)) {
            drawn.add(ball);
            if (marked.has(ball)) {
                hits++;
            }
        }
    }

    return hits;
}

function simulateBlackjack(betAmount) {
    // Simplified blackjack simulation

    const outcomes = [
        { type: 'lose', probability: 0.535, multiplier: 0 },       // House wins (increased with restrictive rules)
        { type: 'win', probability: 0.40, multiplier: 2 },         // Player wins (decreased)
        { type: 'blackjack', probability: 0.04, multiplier: 2.2 }, // Player blackjack (6:5 payout, decreased)
        { type: 'push', probability: 0.025, multiplier: 1 }        // Tie (decreased)
    ];

    const rand = Math.random();
    let cumProb = 0;

    for (const outcome of outcomes) {
        cumProb += outcome.probability;
        if (rand <= cumProb) {
            const payout = betAmount * outcome.multiplier;
            const profit = payout - betAmount;

            return {
                game: 'blackjack',
                bet: betAmount,
                payout: payout,
                profit: profit,
                multiplier: outcome.multiplier,
                details: { outcome: outcome.type }
            };
        }
    }

    // Fallback (shouldn't happen)
    return {
        game: 'blackjack',
        bet: betAmount,
        payout: 0,
        profit: -betAmount,
        multiplier: 0,
        details: { outcome: 'lose' }
    };
}

function generateBetAmount() {
    const rand = Math.random();
    let cumWeight = 0;

    for (const tier of BET_SIZE_DISTRIBUTION) {
        cumWeight += tier.weight;
        if (rand <= cumWeight) {
            return Math.floor(Math.random() * (tier.max - tier.min + 1)) + tier.min;
        }
    }

    return 10; // Fallback
}

function selectRiskLevel() {
    const rand = Math.random();
    if (rand < RISK_DISTRIBUTION.low) return 'low';
    if (rand < RISK_DISTRIBUTION.low + RISK_DISTRIBUTION.medium) return 'medium';
    return 'high';
}

function selectGame() {
    const rand = Math.random();
    if (rand < GAME_DISTRIBUTION.plinko) return 'plinko';
    if (rand < GAME_DISTRIBUTION.plinko + GAME_DISTRIBUTION.keno) return 'keno';
    return 'blackjack';
}

// Single simulation run
function runSingleSimulation(runNumber) {
    let totalWagered = 0;
    let totalPaidOut = 0;
    let totalProfit = 0;

    const gameStats = {
        plinko: { bets: 0, wagered: 0, paidOut: 0, profit: 0 },
        keno: { bets: 0, wagered: 0, paidOut: 0, profit: 0 },
        blackjack: { bets: 0, wagered: 0, paidOut: 0, profit: 0 }
    };

    const bigWins = []; // Track big wins (100x+ multiplier)

    for (let i = 0; i < TOTAL_BETS; i++) {
        const game = selectGame();
        const betAmount = generateBetAmount();
        let result;

        if (game === 'plinko') {
            const riskLevel = selectRiskLevel();
            result = simulatePlinko(betAmount, riskLevel);
        } else if (game === 'keno') {
            const riskLevel = selectRiskLevel();
            result = simulateKeno(betAmount, riskLevel);
        } else {
            result = simulateBlackjack(betAmount);
        }

        // Update totals
        totalWagered += result.bet;
        totalPaidOut += result.payout;
        totalProfit -= result.profit; // House profit = negative player profit

        // Update game stats
        gameStats[game].bets++;
        gameStats[game].wagered += result.bet;
        gameStats[game].paidOut += result.payout;
        gameStats[game].profit -= result.profit; // House profit = negative player profit

        // Track big wins
        if (result.multiplier >= 100) {
            bigWins.push(result);
        }
    }

    return {
        runNumber,
        totalWagered,
        totalPaidOut,
        totalProfit,
        houseEdge: (totalProfit / totalWagered) * 100,
        rtp: (totalPaidOut / totalWagered) * 100,
        gameStats,
        bigWins
    };
}

// Main multi-run simulation
function runMultipleSimulations() {
    console.log('🎰 Running Multi-Run Casino Simulation...\n');
    console.log(`Runs: ${NUM_RUNS}`);
    console.log(`Bets per run: ${TOTAL_BETS.toLocaleString()}`);
    console.log(`Total bets: ${(TOTAL_BETS * NUM_RUNS).toLocaleString()}`);
    console.log(`Game Distribution: Plinko ${GAME_DISTRIBUTION.plinko * 100}%, Keno ${GAME_DISTRIBUTION.keno * 100}%, Blackjack ${GAME_DISTRIBUTION.blackjack * 100}%`);
    console.log(`Keno Max Bet: $${MAX_KENO_BET}, Max Win: $${MAX_KENO_WIN.toLocaleString()}\n`);

    const results = [];

    for (let run = 1; run <= NUM_RUNS; run++) {
        console.log(`Running simulation ${run}/${NUM_RUNS}...`);
        const result = runSingleSimulation(run);
        results.push(result);
        console.log(`  House Edge: ${result.houseEdge.toFixed(3)}%, RTP: ${result.rtp.toFixed(3)}%`);
    }

    // Calculate averages
    const avgWagered = results.reduce((sum, r) => sum + r.totalWagered, 0) / NUM_RUNS;
    const avgPaidOut = results.reduce((sum, r) => sum + r.totalPaidOut, 0) / NUM_RUNS;
    const avgProfit = results.reduce((sum, r) => sum + r.totalProfit, 0) / NUM_RUNS;
    const avgHouseEdge = results.reduce((sum, r) => sum + r.houseEdge, 0) / NUM_RUNS;
    const avgRTP = results.reduce((sum, r) => sum + r.rtp, 0) / NUM_RUNS;

    // Game-specific averages
    const gameAverages = {
        plinko: { bets: 0, wagered: 0, paidOut: 0, profit: 0 },
        keno: { bets: 0, wagered: 0, paidOut: 0, profit: 0 },
        blackjack: { bets: 0, wagered: 0, paidOut: 0, profit: 0 }
    };

    for (const game of ['plinko', 'keno', 'blackjack']) {
        gameAverages[game].bets = results.reduce((sum, r) => sum + r.gameStats[game].bets, 0) / NUM_RUNS;
        gameAverages[game].wagered = results.reduce((sum, r) => sum + r.gameStats[game].wagered, 0) / NUM_RUNS;
        gameAverages[game].paidOut = results.reduce((sum, r) => sum + r.gameStats[game].paidOut, 0) / NUM_RUNS;
        gameAverages[game].profit = results.reduce((sum, r) => sum + r.gameStats[game].profit, 0) / NUM_RUNS;
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎰 MULTI-RUN SIMULATION RESULTS (AVERAGED)');
    console.log('='.repeat(60));

    console.log(`\n💰 OVERALL PERFORMANCE (Average of ${NUM_RUNS} runs):`);
    console.log(`Total Wagered:    $${avgWagered.toLocaleString()}`);
    console.log(`Total Paid Out:   $${avgPaidOut.toLocaleString()}`);
    console.log(`House Profit:     $${avgProfit.toLocaleString()}`);
    console.log(`House Edge:       ${avgHouseEdge.toFixed(3)}%`);
    console.log(`RTP:              ${avgRTP.toFixed(3)}%`);

    console.log(`\n🎯 GAME BREAKDOWN (Averages):`);

    for (const [gameName, stats] of Object.entries(gameAverages)) {
        const gameRTP = (stats.paidOut / stats.wagered) * 100;
        const gameHouseEdge = (stats.profit / stats.wagered) * 100;

        console.log(`\n${gameName.toUpperCase()}:`);
        console.log(`  Bets: ${Math.round(stats.bets).toLocaleString()}`);
        console.log(`  Wagered: $${Math.round(stats.wagered).toLocaleString()}`);
        console.log(`  Paid Out: $${Math.round(stats.paidOut).toLocaleString()}`);
        console.log(`  Profit: $${Math.round(stats.profit).toLocaleString()}`);
        console.log(`  RTP: ${gameRTP.toFixed(2)}%`);
        console.log(`  House Edge: ${gameHouseEdge.toFixed(2)}%`);
    }

    const totalBigWins = results.reduce((sum, r) => sum + r.bigWins.length, 0);
    console.log(`\n🚀 BIG WINS (100x+ multiplier): ${totalBigWins} across all runs`);
    console.log(`   Average per run: ${(totalBigWins / NUM_RUNS).toFixed(1)}`);

    console.log(`\n📊 PROFITABILITY ANALYSIS:`);
    if (avgHouseEdge > 0) {
        console.log(`✅ PROFITABLE: Average profit of $${avgProfit.toLocaleString()} on $${avgWagered.toLocaleString()} in action`);
        const dailyVolume = 10000; // Assume $10k daily volume
        const projectedDailyProfit = dailyVolume * (avgHouseEdge / 100);
        console.log(`📈 Projected daily profit on $10k volume: $${projectedDailyProfit.toFixed(2)}`);
        console.log(`📈 Projected monthly profit: $${(projectedDailyProfit * 30).toFixed(2)}`);
    } else {
        console.log(`❌ UNPROFITABLE: Average loss of $${Math.abs(avgProfit).toLocaleString()}`);
    }

    console.log('\n' + '='.repeat(60));
}

// Run the multi-simulation
runMultipleSimulations();
