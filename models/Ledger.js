import mongoose from 'mongoose';

const ledgerSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g. 'keno_bet', 'keno_payout', 'divides_bet', 'divides_payout', 'house_cut', 'jackpot_in', 'funds_added', 'raffle_buy', 'raffle_payout'
  amount: { type: Number, required: true }, // positive = system IN (handle, fee), negative = system OUT (payouts to players)
  userId: { type: String, default: null },
  roundId: { type: String, default: null }, // keno round _id
  divideId: { type: String, default: null },
  relatedId: { type: String, default: null }, // other reference (raffle id, tx id)
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Ledger || mongoose.model('Ledger', ledgerSchema);
