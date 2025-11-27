import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import models
import User from '../models/User.js';
import KenoRound from '../models/KenoRound.js';
import PlinkoGame from '../models/PlinkoGame.js';
import BlackjackGame from '../models/BlackjackGame.js';
import CaseBattle from '../models/CaseBattle.js';
import Ledger from '../models/Ledger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rafflehub';

async function backfill() {
    console.log('Connecting to DB...');
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');
    } catch (e) {
        console.error('DB Connection Failed:', e);
        process.exit(1);
    }

    const users = await User.find({});
    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        console.log(`Processing user ${user.username} (${user._id})...`);
        const userId = user._id;
        const userIdStr = user._id.toString();

        // 1. Keno (Stored in Dollars)
        const kenoStats = await KenoRound.aggregate([
            { $match: { userId: userIdStr } },
            {
                $group: {
                    _id: null,
                    totalBets: { $sum: 1 },
                    totalWagered: { $sum: '$betAmount' },
                    totalWon: { $sum: '$win' },
                    winsCount: {
                        $sum: { $cond: [{ $gt: ['$win', 0] }, 1, 0] }
                    },
                    lossesCount: {
                        $sum: { $cond: [{ $lte: ['$win', 0] }, 1, 0] }
                    }
                }
            }
        ]);

        // 2. Plinko (Stored in Cents)
        const plinkoStats = await PlinkoGame.aggregate([
            { $match: { userId: userId } },
            {
                $group: {
                    _id: null,
                    totalBets: { $sum: 1 },
                    totalWagered: { $sum: '$betAmount' },
                    totalWon: { $sum: '$payout' },
                    winsCount: {
                        $sum: { $cond: [{ $gt: ['$payout', 0] }, 1, 0] }
                    },
                    lossesCount: {
                        $sum: { $cond: [{ $lte: ['$payout', 0] }, 1, 0] }
                    }
                }
            }
        ]);

        // 3. Blackjack (Stored in Dollars)
        const blackjackStats = await BlackjackGame.aggregate([
            { $match: { userId: userId, gamePhase: 'gameOver' } },
            {
                $project: {
                    totalBet: { $add: ['$mainBet', '$perfectPairsBet', '$twentyPlusThreeBet', '$blazingSevensBet'] },
                    totalPayout: { $add: ['$mainPayout', '$perfectPairsPayout', '$twentyPlusThreePayout', '$blazingSevensPayout'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalBets: { $sum: 1 },
                    totalWagered: { $sum: '$totalBet' },
                    totalWon: { $sum: '$totalPayout' },
                    winsCount: {
                        $sum: { $cond: [{ $gt: ['$totalPayout', 0] }, 1, 0] }
                    },
                    lossesCount: {
                        $sum: { $cond: [{ $lte: ['$totalPayout', 0] }, 1, 0] }
                    }
                }
            }
        ]);

        // 4. Ledger (Deposits/Withdrawals/CaseBattles - Dollars)
        const ledgerStats = await Ledger.aggregate([
            { $match: { userId: userIdStr } },
            {
                $group: {
                    _id: '$type',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        let depositTotal = 0;
        let withdrawTotal = 0;
        let cbWageredLedger = 0;
        let cbWonLedger = 0;
        let cbBets = 0;
        let cbWins = 0;

        ledgerStats.forEach(stat => {
            if (stat._id === 'funds_added') {
                depositTotal += stat.totalAmount;
            } else if (stat._id === 'manual_deduction') {
                withdrawTotal += Math.abs(stat.totalAmount);
            } else if (stat._id === 'case-battle-join' || stat._id === 'case-battle-create') {
                cbWageredLedger += Math.abs(stat.totalAmount);
                cbBets += stat.count;
            } else if (stat._id === 'case-battle-win') {
                cbWonLedger += stat.totalAmount;
                cbWins += stat.count;
            }
        });

        const cbLosses = Math.max(0, cbBets - cbWins);

        // Consolidate
        const k = kenoStats[0] || {};
        const p = plinkoStats[0] || {};
        const b = blackjackStats[0] || {};

        // Convert all to CENTS
        const kWagered = Math.round((k.totalWagered || 0) * 100);
        const kWon = Math.round((k.totalWon || 0) * 100);

        const pWagered = p.totalWagered || 0; // Already Cents
        const pWon = p.totalWon || 0; // Already Cents

        const bWagered = Math.round((b.totalWagered || 0) * 100);
        const bWon = Math.round((b.totalWon || 0) * 100);

        const cWagered = Math.round(cbWageredLedger * 100);
        const cWon = Math.round(cbWonLedger * 100);

        const totalWagered = kWagered + pWagered + bWagered + cWagered;
        const totalWon = kWon + pWon + bWon + cWon;
        const totalBets = (k.totalBets || 0) + (p.totalBets || 0) + (b.totalBets || 0) + cbBets;
        const totalWinsCount = (k.winsCount || 0) + (p.winsCount || 0) + (b.winsCount || 0) + cbWins;
        const totalLossesCount = (k.lossesCount || 0) + (p.lossesCount || 0) + (b.lossesCount || 0) + cbLosses;

        const totalDeposited = Math.round(depositTotal * 100);
        const totalWithdrawn = Math.round(withdrawTotal * 100);

        // Update User
        await User.updateOne({ _id: userId }, {
            $set: {
                totalWagered,
                totalBets,
                totalWon,
                totalWinsCount,
                totalLossesCount,
                totalDeposited,
                totalWithdrawn,
                totalWinnings: totalWon // Sync legacy field
            }
        });

        console.log(`Updated ${user.username}: Wagered $${(totalWagered / 100).toFixed(2)}, Won $${(totalWon / 100).toFixed(2)}, Bets ${totalBets}`);
    }

    console.log('Backfill complete.');
    await mongoose.disconnect();
}

backfill();
