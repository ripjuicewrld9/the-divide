import mongoose from 'mongoose';
import dotenv from 'dotenv';
import House from '../models/House.js';
import Jackpot from '../models/Jackpot.js';
import PlinkoGame from '../models/PlinkoGame.js';
import BlackjackGame from '../models/BlackjackGame.js';
import KenoRound from '../models/KenoRound.js';
import Divide from '../models/Divide.js';

dotenv.config();

/**
 * This script initializes the House document with accurate statistics
 * calculated from all existing game data.
 * 
 * It calculates:
 * - Total bets (handle) per game
 * - Total payouts (winnings) per game  
 * - Jackpot fees (1% of all bets)
 * - House profit (bets - payouts - jackpot fees)
 */

async function initializeHouseStats() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Initialize house document
    let house = await House.findOne({ id: 'global' });
    if (!house) {
      house = new House({ id: 'global' });
    }

    let totalJackpotFees = 0;

    // ===== PLINKO =====
    console.log('\n📊 Calculating Plinko stats...');
    const plinkoGames = await PlinkoGame.find({}).lean();
    let plinkoStats = {
      totalBets: 0,
      totalPayouts: 0,
      jackpotFees: 0,
      houseProfit: 0
    };

    plinkoGames.forEach(game => {
      const bet = game.betAmount || 0;
      const payout = game.winnings || 0;
      const jackpotFee = Math.floor(bet * 0.01);
      
      plinkoStats.totalBets += bet;
      plinkoStats.totalPayouts += payout;
      plinkoStats.jackpotFees += jackpotFee;
      totalJackpotFees += jackpotFee;
    });
    plinkoStats.houseProfit = plinkoStats.totalBets - plinkoStats.totalPayouts - plinkoStats.jackpotFees;
    house.plinko = plinkoStats;
    console.log(`Plinko: ${plinkoGames.length} games, $${(plinkoStats.totalBets/100).toFixed(2)} bets, $${(plinkoStats.houseProfit/100).toFixed(2)} profit`);

    // ===== BLACKJACK =====
    console.log('\n📊 Calculating Blackjack stats...');
    const blackjackGames = await BlackjackGame.find({}).lean();
    let blackjackStats = {
      totalBets: 0,
      totalPayouts: 0,
      jackpotFees: 0,
      houseProfit: 0
    };

    blackjackGames.forEach(game => {
      const bet = game.totalBet || 0;
      const payout = game.totalWinnings || 0;
      const jackpotFee = Math.floor(bet * 0.01);
      
      blackjackStats.totalBets += bet;
      blackjackStats.totalPayouts += payout;
      blackjackStats.jackpotFees += jackpotFee;
      totalJackpotFees += jackpotFee;
    });
    blackjackStats.houseProfit = blackjackStats.totalBets - blackjackStats.totalPayouts - blackjackStats.jackpotFees;
    house.blackjack = blackjackStats;
    console.log(`Blackjack: ${blackjackGames.length} games, $${(blackjackStats.totalBets/100).toFixed(2)} bets, $${(blackjackStats.houseProfit/100).toFixed(2)} profit`);

    // ===== KENO =====
    console.log('\n📊 Calculating Keno stats...');
    const kenoRounds = await KenoRound.find({}).lean();
    let kenoStats = {
      totalBets: 0,
      totalPayouts: 0,
      jackpotFees: 0,
      houseProfit: 0
    };

    kenoRounds.forEach(round => {
      const bet = round.betAmount || 0;
      const payout = round.win || 0;
      const jackpotFee = Math.floor(bet * 0.01);
      
      kenoStats.totalBets += bet;
      kenoStats.totalPayouts += payout;
      kenoStats.jackpotFees += jackpotFee;
      totalJackpotFees += jackpotFee;
    });
    kenoStats.houseProfit = kenoStats.totalBets - kenoStats.totalPayouts - kenoStats.jackpotFees;
    house.keno = kenoStats;
    console.log(`Keno: ${kenoRounds.length} rounds, $${(kenoStats.totalBets/100).toFixed(2)} bets, $${(kenoStats.houseProfit/100).toFixed(2)} profit`);

    // ===== DIVIDES =====
    console.log('\n📊 Calculating Divides stats...');
    const divides = await Divide.find({ status: 'ended' }).lean();
    let dividesStats = {
      totalBets: 0,
      totalPayouts: 0,
      jackpotFees: 0,
      houseProfit: 0
    };

    divides.forEach(divide => {
      const pot = divide.pot || 0;
      const paidOut = divide.paidOut || Math.floor(pot * 0.90);
      const jackpotFee = Math.floor(pot * 0.01);
      
      dividesStats.totalBets += pot;
      dividesStats.totalPayouts += paidOut;
      dividesStats.jackpotFees += jackpotFee;
      totalJackpotFees += jackpotFee;
    });
    dividesStats.houseProfit = dividesStats.totalBets - dividesStats.totalPayouts - dividesStats.jackpotFees;
    house.divides = dividesStats;
    console.log(`Divides: ${divides.length} rounds, $${(dividesStats.totalBets/100).toFixed(2)} bets, $${(dividesStats.houseProfit/100).toFixed(2)} profit`);

    // ===== MINES (not implemented yet) =====
    house.mines = {
      totalBets: 0,
      totalPayouts: 0,
      jackpotFees: 0,
      houseProfit: 0
    };

    // ===== RUGGED (not implemented yet) =====
    house.rugged = {
      totalBets: 0,
      totalPayouts: 0,
      jackpotFees: 0,
      houseProfit: 0
    };

    // Calculate total house profit
    const totalHouseProfit = 
      plinkoStats.houseProfit +
      blackjackStats.houseProfit +
      kenoStats.houseProfit +
      dividesStats.houseProfit;

    house.houseTotal = totalHouseProfit;

    // Save house document
    await house.save();
    console.log(`\n✅ House document saved`);
    console.log(`Total House Profit: $${(totalHouseProfit/100).toFixed(2)}`);

    // Update jackpot with accumulated fees
    const jackpot = await Jackpot.findOneAndUpdate(
      { id: 'global' },
      { $inc: { amount: totalJackpotFees } },
      { upsert: true, new: true }
    );
    console.log(`✅ Jackpot updated: $${(jackpot.amount/100).toFixed(2)} (added $${(totalJackpotFees/100).toFixed(2)} from fees)`);

    console.log('\n🎉 House statistics initialized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing house stats:', err);
    process.exit(1);
  }
}

initializeHouseStats();
