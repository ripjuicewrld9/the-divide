// models/Divide.js
import mongoose from "mongoose";

const divideSchema = new mongoose.Schema({
  id: { type: String, index: true }, // short human id (optional)
  title: { type: String, required: true },
  optionA: { type: String, required: true },
  optionB: { type: String, required: true },
  imageA: { type: String },
  imageB: { type: String },
  soundA: { type: String },
  soundB: { type: String },
  endTime: { type: Date },
  votesA: { type: Number, default: 0 },
  votesB: { type: Number, default: 0 },
  totalVotes: { type: Number, default: 0 },
  pot: { type: Number, default: 0 },
  status: { type: String, default: "active" },
  // persisted financial fields for auditing
  paidOut: { type: Number, default: 0 },     // amount actually paid to winners when divide ended
  houseCut: { type: Number, default: 0 },    // house cut recorded at end
  jackpotCut: { type: Number, default: 0 },  // jackpot contribution recorded at end
  votes: [
    {
      userId: String,
      side: String,
      voteCount: { type: Number, default: 0 },
      isFree: { type: Boolean, default: true },
      bet: { type: Number, default: 0 }, // actual bet amount in dollars for user-created divides
    },
  ],
  creatorId: { type: String },
  creatorBet: { type: Number, default: 0 }, // initial bet placed by creator (dollars)
  creatorSide: { type: String }, // 'A' or 'B' - which side creator is locked into
  isUserCreated: { type: Boolean, default: false }, // true if created by user, false if admin-created
  winnerSide: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Divide = mongoose.models.Divide || mongoose.model("Divide", divideSchema);
export default Divide;
