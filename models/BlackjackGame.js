import mongoose from 'mongoose';

const BlackjackGameSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Provably Fair Seeds
    serverSeed: {
      type: String,
      required: false,
      default: '',
    },
    serverHash: {
      type: String,
      required: false,
      default: '',
    },
    blockHash: {
      type: String,
      required: false,
      default: '',
    },
    gameSeed: {
      type: String,
      required: false,
      default: '',
    },
    nonce: {
      type: Number,
      default: 0,
    },
    // Game State
    gamePhase: {
      type: String,
      enum: ['betting', 'dealing', 'playing', 'gameOver'],
      default: 'betting',
    },
    // Bets
    mainBet: {
      type: Number,
      default: 0,
    },
    perfectPairsBet: {
      type: Number,
      default: 0,
    },
    twentyPlusThreeBet: {
      type: Number,
      default: 0,
    },
    blazingSevensBet: {
      type: Number,
      default: 0,
    },
    // Cards & Hands
    playerCards: [String],
    dealerCards: [String],
    playerTotal: Number,
    dealerTotal: Number,
    // Results
    mainResult: String, // 'win', 'loss', 'push', 'blackjack', 'bust'
    mainPayout: {
      type: Number,
      default: 0,
    },
    perfectPairsResult: String,
    perfectPairsPayout: {
      type: Number,
      default: 0,
    },
    twentyPlusThreeResult: String,
    twentyPlusThreePayout: {
      type: Number,
      default: 0,
    },
    blazingSevenResult: String,
    blazingSevensPayout: {
      type: Number,
      default: 0,
    },
    // RNG Rolls (for verification)
    rolls: [
      {
        round: Number,
        slot: Number,
        seedString: String,
        ticket: Number,
        outcome: String, // Card dealt or result type
      },
    ],
    // Audit Trail
    balance: Number,
    totalProfit: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model('BlackjackGame', BlackjackGameSchema);
