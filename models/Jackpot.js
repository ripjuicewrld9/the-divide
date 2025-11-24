import mongoose from "mongoose";

const jackpotSchema = new mongoose.Schema({
  id: { type: String, default: 'global', index: true },
  amount: { type: Number, default: 0 },      // total jackpot accumulated
  houseTotal: { type: Number, default: 0 },  // cumulative house cut
  rollover: { type: Number, default: 0 },
  lastWinner: String,
});

export default mongoose.models.Jackpot || mongoose.model("Jackpot", jackpotSchema);
