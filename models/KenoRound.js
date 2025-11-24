import mongoose from 'mongoose';

const { Schema } = mongoose;

const KenoRoundSchema = new Schema({
  userId: { type: String },
  betAmount: { type: Number },
  picks: [{ type: Number }],
  drawnNumbers: [{ type: Number }],
  matches: [{ type: Number }],
  win: { type: Number },
  balanceAfter: { type: Number },
  
  // Provably Fair Seeds (random.org + EOS block)
  serverSeed: { type: String },
  serverSeedHashed: { type: String },
  clientSeed: { type: String },
  nonce: { type: Number },
  blockHash: { type: String },        // EOS block hash for verification
  gameSeed: { type: String },         // Combined seed for drawing numbers
  
  risk: { type: String },
  multiplier: { type: Number },
  houseCut: { type: Number },
  jackpotCut: { type: Number },
  reserveChange: { type: Number },
  timestamp: { type: Date, default: Date.now },
  
  // Verification
  verified: { type: Boolean, default: false }
}, { collection: 'kenorounds' });

export default mongoose.models.KenoRound || mongoose.model('KenoRound', KenoRoundSchema);
