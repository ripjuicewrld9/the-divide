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
      max: 7,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    username: {
      type: String,
      default: null,
    },
    profileImage: {
      type: String,
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
  
  // Boosted segments for this round
  boostedSegments: [{
    segmentIndex: Number,
    baseMultiplier: Number,
    boostMultiplier: Number,
    finalMultiplier: Number,
  }],
  boostSeed: String,
  
  // Outcomes for all 8 seats
  seatOutcomes: [{
    seatNumber: Number,
    segmentUnderFlapper: Number,
    baseMultiplier: Number,
    boostMultiplier: Number,
    finalMultiplier: Number,
    isOccupied: Boolean,
    userId: mongoose.Schema.Types.ObjectId,
    betAmount: Number,
    payout: Number,
    isBoosted: Boolean,
  }],
  
  // Timing (nullable when game is idle/waiting for players)
  roundStartTime: {
    type: Date,
    default: null,
  },
  roundEndTime: {
    type: Date,
    default: null,
  },
  bettingEndTime: {
    type: Date,
    default: null,
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
