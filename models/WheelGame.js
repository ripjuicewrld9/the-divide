import mongoose from 'mongoose';

const wheelGameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  roundNumber: {
    type: Number,
    required: true,
    default: 0,
  },
  status: {
    type: String,
    enum: ['betting', 'spinning', 'completed'],
    default: 'betting',
    index: true,
  },
  seats: [{
    seatNumber: {
      type: Number,
      required: true,
      min: 0,
      max: 11,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    betAmount: {
      type: Number,
      default: 0,
    },
    segments: {
      type: [Number],
      required: true,
    },
    reservedAt: {
      type: Date,
      default: null,
    },
  }],
  
  // Provably Fair
  serverSeed: String,
  serverHash: String,
  blockHash: String,
  gameSeed: String,
  nonce: Number,
  
  // Round Results
  winningSegment: {
    type: Number,
    min: 0,
    max: 53,
    default: null,
  },
  globalMultiplier: {
    type: Number,
    default: 1,
    min: 1,
  },
  globalMultiplierSeed: String,
  winningSeats: [{
    seatNumber: Number,
    userId: mongoose.Schema.Types.ObjectId,
    betAmount: Number,
    baseMultiplier: Number,
    globalMultiplier: Number,
    basePayout: Number,
    finalPayout: Number,
  }],
  
  // Timing
  roundStartTime: {
    type: Date,
    required: true,
  },
  roundEndTime: {
    type: Date,
    required: true,
  },
  bettingEndTime: {
    type: Date,
    required: true,
  },
  
  verified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
wheelGameSchema.index({ gameId: 1, roundNumber: 1 });
wheelGameSchema.index({ status: 1, roundEndTime: 1 });
wheelGameSchema.index({ 'seats.userId': 1 });

const WheelGame = mongoose.model('WheelGame', wheelGameSchema);

export default WheelGame;
