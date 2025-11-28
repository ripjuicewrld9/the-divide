/**
 * Super Multi-Run Casino Simulation
 * Runs the multi-simulation 5 times and aggregates all results
 */

import { paytables } from '../paytable-data.js';

// Simulation parameters
const TOTAL_BETS = 100000;
const NUM_RUNS_PER_BATCH = 5;
const NUM_BATCHES = 5;
const TOTAL_RUNS = NUM_RUNS_PER_BATCH * NUM_BATCHES;

const GAME_DISTRIBUTION = {
    plinko: 0.4,
    keno: 0.35,
    blackjack: 0.25
};

const RISK_DISTRIBUTION = {
    low: 0.2,
    medium: 0.5,
    high: 0.3
};

const BET_SIZE_DISTRIBUTION = [
    { min: 1, max: 5, weight: 0.4 },
    { min: 5, max: 25, weight: 0.35 },
    { min: 25, max: 100, weight: 0.2 },
    { min: 100, max: 500, weight: 0.05 }
];

const MAX_KENO_BET = 500;
const MAX_KENO_WIN = 500000;

function simulatePlinko(betAmount, riskLevel) {
    const rowCount = 16;
    const randomValue = Math.random();
    const binIndex = applyBinBiasSimple(randomValue, rowCount);
    const rawMultiplier = getPlinkoMultiplier(binIndex, rowCount, riskLevel);
    const MAX_PAYOUT_MULTIPLIER = 100;
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

function applyBinBiasSimple(randomValue, rowCount) {
    const HOUSE_EDGE_BIAS = 0.85;
    const BIN_ODDS = {
        16: [0.0015, 0.0244, 0.1831, 0.8545, 2.7771, 6.665, 12.2192, 17.4561, 19.6381, 17.4561, 12.2192, 6.665, 2.7771, 0.8545, 0.1831, 0.0244, 0.0015]
    };

    let odds = BIN_ODDS[rowCount];
    if (!odds) return Math.floor(randomValue * (rowCount + 1));

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
    const payouts = {
        16: {
            low: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
            medium: [420, 100, 50, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.2, 1.4, 1.4, 2, 9, 50, 100, 420],
            high: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
        }
    };

    const table = payouts[rowCount];
    if (!table || !table[riskLevel]) return 0;
    return table[riskLevel][binIndex] || 0;
}

function simulateKeno(betAmount, riskLevel) {
    betAmount = Math.min(betAmount, MAX_KENO_BET);

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

    const hits = simulateKenoHits(spots);
    const table = paytables[riskLevel];
    const multiplier = (table[spots] && table[spots][hits]) ? table[spots][hits] : 0;

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
    let hits = 0;
    const drawn = new Set();
    const marked = new Set();

    while (marked.size < spots) {
        marked.add(Math.floor(Math.random() * 40) + 1);
    }

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
    const outcomes = [
        { type: 'lose', probability: 0.535, multiplier: 0 },
        { type: 'win', probability: 0.40, multiplier: 2 },
        { type: 'blackjack', probability: 0.04, multiplier: 2.2 },
        { type: 'push', probability: 0.025, multiplier: 1 }
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

    return 10;
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

function runSingleSimulation(runNumber) {
    let totalWagered = 0;
    let totalPaidOut = 0;
    let totalProfit = 0;

    const gameStats = {
        plinko: { bets: 0, wagered: 0, paidOut: 0, profit: 0 },
        keno: { bets: 0, wagered: 0, paidOut: 0, profit: 0 },
        blackjack: { bets: 0, wagered: 0, paidOut: 0, profit: 0 }
    };

    const bigWins = [];

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

        totalWagered += result.bet;
        totalPaidOut += result.payout;
        totalProfit -= result.profit;

        gameStats[game].bets++;
        gameStats[game].wagered += result.bet;
        gameStats[game].paidOut += result.payout;
        gameStats[game].profit -= result.profit;

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

// Main super multi-run simulation
function runSuperMultipleSimulations() {
    console.log('🎰 Running SUPER Multi-Run Casino Simulation...\n');
    console.log(`Total Batches: ${NUM_BATCHES}`);
    console.log(`Runs per batch: ${NUM_RUNS_PER_BATCH}`);
    console.log(`Total runs: ${TOTAL_RUNS}`);
    console.log(`Bets per run: ${TOTAL_BETS.toLocaleString()}`);
    console.log(`TOTAL BETS SIMULATED: ${(TOTAL_BETS * TOTAL_RUNS).toLocaleString()}`);
    console.log(`Game Distribution: Plinko ${GAME_DISTRIBUTION.plinko * 100}%, Keno ${GAME_DISTRIBUTION.keno * 100}%, Blackjack ${GAME_DISTRIBUTION.blackjack * 100}%`);
    console.log(`Keno Max Bet: $${MAX_KENO_BET}, Max Win: $${MAX_KENO_WIN.toLocaleString()}\n`);

    const allResults = [];

    for (let batch = 1; batch <= NUM_BATCHES; batch++) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`BATCH ${batch}/${NUM_BATCHES}`);
        console.log('='.repeat(60));

        for (let run = 1; run <= NUM_RUNS_PER_BATCH; run++) {
            const globalRun = (batch - 1) * NUM_RUNS_PER_BATCH + run;
            process.stdout.write(`Run ${globalRun}/${TOTAL_RUNS}... `);
            const result = runSingleSimulation(globalRun);
            allResults.push(result);
            console.log(`HE: ${result.houseEdge.toFixed(2)}%, RTP: ${result.rtp.toFixed(2)}%`);
        }
    }

    // Calculate overall averages
    const avgWagered = allResults.reduce((sum, r) => sum + r.totalWagered, 0) / TOTAL_RUNS;
    const avgPaidOut = allResults.reduce((sum, r) => sum + r.totalPaidOut, 0) / TOTAL_RUNS;
    const avgProfit = allResults.reduce((sum, r) => sum + r.totalProfit, 0) / TOTAL_RUNS;
    const avgHouseEdge = allResults.reduce((sum, r) => sum + r.houseEdge, 0) / TOTAL_RUNS;
    const avgRTP = allResults.reduce((sum, r) => sum + r.rtp, 0) / TOTAL_RUNS;

    // Calculate standard deviation for house edge
    const houseEdgeVariance = allResults.reduce((sum, r) => sum + Math.pow(r.houseEdge - avgHouseEdge, 2), 0) / TOTAL_RUNS;
    const houseEdgeStdDev = Math.sqrt(houseEdgeVariance);

    // Game-specific averages
    const gameAverages = {
        plinko: { bets: 0, wagered: 0, paidOut: 0, profit: 0 },
        keno: { bets: 0, wagered: 0, paidOut: 0, profit: 0 },
        blackjack: { bets: 0, wagered: 0, paidOut: 0, profit: 0 }
    };

    for (const game of ['plinko', 'keno', 'blackjack']) {
        gameAverages[game].bets = allResults.reduce((sum, r) => sum + r.gameStats[game].bets, 0) / TOTAL_RUNS;
        gameAverages[game].wagered = allResults.reduce((sum, r) => sum + r.gameStats[game].wagered, 0) / TOTAL_RUNS;
        gameAverages[game].paidOut = allResults.reduce((sum, r) => sum + r.gameStats[game].paidOut, 0) / TOTAL_RUNS;
        gameAverages[game].profit = allResults.reduce((sum, r) => sum + r.gameStats[game].profit, 0) / TOTAL_RUNS;
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('🎰 FINAL AGGREGATED RESULTS');
    console.log(`   (${TOTAL_RUNS} runs × ${TOTAL_BETS.toLocaleString()} bets = ${(TOTAL_RUNS * TOTAL_BETS).toLocaleString()} total bets)`);
    console.log('='.repeat(60));

    console.log(`\n💰 OVERALL PERFORMANCE:`);
    console.log(`Average Wagered:    $${avgWagered.toLocaleString()} per run`);
    console.log(`Average Paid Out:   $${avgPaidOut.toLocaleString()} per run`);
    console.log(`Average Profit:     $${avgProfit.toLocaleString()} per run`);
    console.log(`\n📊 HOUSE EDGE:      ${avgHouseEdge.toFixed(3)}% ± ${houseEdgeStdDev.toFixed(3)}%`);
    console.log(`   RTP:             ${avgRTP.toFixed(3)}%`);
    console.log(`   Min HE:          ${Math.min(...allResults.map(r => r.houseEdge)).toFixed(3)}%`);
    console.log(`   Max HE:          ${Math.max(...allResults.map(r => r.houseEdge)).toFixed(3)}%`);

    console.log(`\n🎯 GAME BREAKDOWN:`);

    for (const [gameName, stats] of Object.entries(gameAverages)) {
        const gameRTP = (stats.paidOut / stats.wagered) * 100;
        const gameHouseEdge = (stats.profit / stats.wagered) * 100;

        console.log(`\n${gameName.toUpperCase()}:`);
        console.log(`  Avg Bets:     ${Math.round(stats.bets).toLocaleString()}`);
        console.log(`  Avg Wagered:  $${Math.round(stats.wagered).toLocaleString()}`);
        console.log(`  Avg Paid Out: $${Math.round(stats.paidOut).toLocaleString()}`);
        console.log(`  Avg Profit:   $${Math.round(stats.profit).toLocaleString()}`);
        console.log(`  RTP:          ${gameRTP.toFixed(2)}%`);
        console.log(`  House Edge:   ${gameHouseEdge.toFixed(2)}%`);
    }

    const totalBigWins = allResults.reduce((sum, r) => sum + r.bigWins.length, 0);
    console.log(`\n🚀 BIG WINS (100x+): ${totalBigWins} total (${(totalBigWins / TOTAL_RUNS).toFixed(1)} per run)`);

    console.log(`\n📈 PROFITABILITY PROJECTIONS:`);
    if (avgHouseEdge > 0) {
        console.log(`✅ PROFITABLE with ${avgHouseEdge.toFixed(2)}% house edge`);
        const dailyVolume = 10000;
        const projectedDailyProfit = dailyVolume * (avgHouseEdge / 100);
        console.log(`   Daily profit on $10k volume:  $${projectedDailyProfit.toFixed(2)}`);
        console.log(`   Monthly profit:               $${(projectedDailyProfit * 30).toFixed(2)}`);
        console.log(`   Yearly profit:                $${(projectedDailyProfit * 365).toFixed(2)}`);
    } else {
        console.log(`❌ UNPROFITABLE: ${avgHouseEdge.toFixed(2)}% house edge`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Simulation Complete!');
    console.log('='.repeat(60));
}

runSuperMultipleSimulations();
