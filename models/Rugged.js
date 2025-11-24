import mongoose from 'mongoose';

// Rugged market model: store canonical fields used by the server and frontend.
const PricePointSchema = new mongoose.Schema({ ts: { type: Date, default: Date.now }, price: { type: Number, default: 0 } }, { _id: false });

const ruggedSchema = new mongoose.Schema({
  id: { type: String, default: 'global', index: true },
  symbol: { type: String, default: 'DC' },
  totalSupply: { type: Number, default: 100000000 },
  jackpotSupply: { type: Number, default: 0 },
  circulatingSupply: { type: Number, default: 0 },
  // lastPrice stored as a Number (USD per DC)
  lastPrice: { type: Number, default: 0.0001 },
  // priceHistory is an array of { ts, price } points (kept small by server)
  priceHistory: { type: [PricePointSchema], default: [] },
  rugged: { type: Boolean, default: false },
  ruggedCooldownUntil: { type: Date, default: null },
  noRugUntil: { type: Date, default: null },
  noRugSeconds: { type: Number, default: 300 },
  serverSeedHashed: { type: String, default: '' },
  revealedSeeds: { type: Array, default: [] }
}, { timestamps: true });

export default mongoose.models.Rugged || mongoose.model('Rugged', ruggedSchema);
