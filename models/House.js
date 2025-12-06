import mongoose from 'mongoose';

const houseSchema = new mongoose.Schema({
  id: { type: String, default: 'global', index: true },
  houseTotal: { type: Number, default: 0 },

  // Revenue breakdown (all in cents)
  potFees: { type: Number, default: 0 },           // 2.5% from Divide pots
  creatorPoolKept: { type: Number, default: 0 },   // Portion of 0.5% creator pool house keeps
  withdrawalFees: { type: Number, default: 0 },    // Tiered withdrawal fees

  // 💀 THE 50/50 CURSE 💀
  fiftyFiftyCurse: { type: Number, default: 0 },       // Total revenue from 50/50 curse (50% of tied pots)
  fiftyFiftyCurseCount: { type: Number, default: 0 },  // Number of curse occurrences

  totalRedemptions: { type: Number, default: 0 }, // count of all user withdrawals
  totalRedemptionAmount: { type: Number, default: 0 }, // total amount withdrawn in cents

  // Per-game statistics (all amounts in cents)
  plinko: {
    totalBets: { type: Number, default: 0 },
    totalPayouts: { type: Number, default: 0 },
    jackpotFees: { type: Number, default: 0 },
    houseProfit: { type: Number, default: 0 }
  },
  blackjack: {
    totalBets: { type: Number, default: 0 },
    totalPayouts: { type: Number, default: 0 },
    jackpotFees: { type: Number, default: 0 },
    houseProfit: { type: Number, default: 0 }
  },
  keno: {
    totalBets: { type: Number, default: 0 },
    totalPayouts: { type: Number, default: 0 },
    jackpotFees: { type: Number, default: 0 },
    houseProfit: { type: Number, default: 0 }
  },
  rugged: {
    totalBets: { type: Number, default: 0 },
    totalPayouts: { type: Number, default: 0 },
    jackpotFees: { type: Number, default: 0 },
    houseProfit: { type: Number, default: 0 }
  },
  mines: {
    totalBets: { type: Number, default: 0 },
    totalPayouts: { type: Number, default: 0 },
    jackpotFees: { type: Number, default: 0 },
    houseProfit: { type: Number, default: 0 }
  },
  divides: {
    totalBets: { type: Number, default: 0 },
    totalPayouts: { type: Number, default: 0 },
    jackpotFees: { type: Number, default: 0 },
    houseProfit: { type: Number, default: 0 }
  },

  // Note: Keno-specific reserve is stored in a separate collection (`KenoReserve`)
});

export default mongoose.models.House || mongoose.model('House', houseSchema);

