import mongoose from 'mongoose';

const RuggedStateSchema = new mongoose.Schema({
  id: { type: String, default: 'global', unique: true },
  // Monetary fields stored as integer cents (e.g. $1.23 => 123)
  pool: { type: Number, default: 0 }, // pool in cents
  jackpot: { type: Number, default: 0 }, // cents
  house: { type: Number, default: 0 }, // cents
  crashed: { type: Boolean, default: false },
  priceHistory: [{ ts: Date, price: Number }],
  // provably-fair fields
  serverSeed: { type: String, default: null }, // secret server seed (hex)
  serverSeedHashed: { type: String, default: null }, // sha256(serverSeed)
  nonce: { type: Number, default: 0 },
  revealedSeeds: [{ seed: String, nonce: Number, revealedAt: Date }],
  // metadata for future use
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.RuggedState || mongoose.model('RuggedState', RuggedStateSchema);
