import mongoose from 'mongoose';

const PlinkoGameSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Provably Fair Seeds
    serverSeed: {
      type: String,
      required: true,
    },
    serverHash: {
      type: String,
      required: true,
    },
    blockHash: {
      type: String,
      required: true,
    },
    gameSeed: {
      type: String,
      required: true,
    },
    nonce: {
      type: Number,
      required: true,
    },
    // Game Configuration
    betAmount: {
      type: Number,
      required: true, // in cents
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    rowCount: {
      type: Number,
      default: 12,
      min: 8,
      max: 16,
    },
    // Game Result
    binIndex: {
      type: Number,
      required: true, // which bin the ball landed in (0 to rowCount)
    },
    multiplier: {
      type: Number,
      required: true, // payout multiplier (0.1 to 1000x based on risk/rows)
    },
    payout: {
      type: Number,
      required: true, // betAmount * multiplier in cents
    },
    profit: {
      type: Number,
      required: true, // payout - betAmount (can be negative)
    },
    // User Balance State
    balanceBefore: {
      type: Number,
      required: true, // balance before the bet in cents
    },
    balanceAfter: {
      type: Number,
      required: true, // balance after the round in cents
    },
    // Verification
    verified: {
      type: Boolean,
      default: false,
    },
    // Jackpot flag for extremely-rare wins triggered deterministically
    isJackpot: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.PlinkoGame || mongoose.model('PlinkoGame', PlinkoGameSchema);
