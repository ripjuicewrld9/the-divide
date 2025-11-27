/**
 * Backfill User Statistics Script
 * 
 * This script calculates historical statistics for all users based on their
 * game history in Keno, Plinko, and Blackjack collections.
 * 
 * Run with: node scripts/backfill-user-stats.js
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import KenoRound from '../models/KenoRound.js';
import PlinkoGame from '../models/PlinkoGame.js';
import BlackjackGame from '../models/BlackjackGame.js';

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/divide';

async function backfillUserStats() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users to process\n`);

        let processedCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                console.log(`Processing user: ${user.username || user._id}...`);

                let totalBets = 0;
                let totalWins = 0;
                let totalLosses = 0;
                let wagered = 0; // in cents

                // ========== KENO ==========
                const kenoRounds = await KenoRound.find({ userId: user._id.toString() });
                console.log(`  - Keno rounds: ${kenoRounds.length}`);

                for (const round of kenoRounds) {
                    totalBets++;
                    wagered += Math.round((round.betAmount || 0) * 100); // Convert to cents

                    if ((round.win || 0) > 0) {
                        totalWins++;
                    } else {
                        totalLosses++;
                    }
                }

                // ========== PLINKO ==========
                const plinkoGames = await PlinkoGame.find({ userId: user._id });
                console.log(`  - Plinko games: ${plinkoGames.length}`);

                for (const game of plinkoGames) {
                    totalBets++;
                    wagered += game.betAmount || 0; // Already in cents

                    if ((game.payout || 0) > (game.betAmount || 0)) {
                        totalWins++;
                    } else {
                        totalLosses++;
                    }
                }

                // ========== BLACKJACK ==========
                const blackjackGames = await BlackjackGame.find({
                    userId: user._id,
                    gamePhase: 'gameOver'
                });
                console.log(`  - Blackjack games: ${blackjackGames.length}`);

                for (const game of blackjackGames) {
                    totalBets++;
                    const totalBet = (game.mainBet || 0) + (game.perfectPairsBet || 0) +
                        (game.twentyPlusThreeBet || 0) + (game.blazingSevensBet || 0);
                    wagered += Math.round(totalBet * 100); // Convert to cents

                    const totalPayout = (game.mainPayout || 0) + (game.perfectPairsPayout || 0) +
                        (game.twentyPlusThreePayout || 0) + (game.blazingSevensPayout || 0);

                    if (totalPayout > totalBet) {
                        totalWins++;
                    } else {
                        totalLosses++;
                    }
                }

                // Update user statistics
                user.totalBets = totalBets;
                user.totalWins = totalWins;
                user.totalLosses = totalLosses;
                user.wagered = wagered;

                await user.save();

                console.log(`  ✅ Updated: ${totalBets} bets, ${totalWins} wins, ${totalLosses} losses, $${(wagered / 100).toFixed(2)} wagered\n`);
                processedCount++;

            } catch (error) {
                console.error(`  ❌ Error processing user ${user.username || user._id}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Backfill complete!`);
        console.log(`   - Processed: ${processedCount} users`);
        console.log(`   - Errors: ${errorCount} users`);
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Run the backfill
backfillUserStats();
