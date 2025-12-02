// models/Divide.js
import mongoose from "mongoose";

/**
 * DIVIDE GAME MECHANICS:
 * - Players place blind votes on side A or B (cannot see vote totals during active game)
 * - If votes are TIED: 50/50 coin flip determines winner (provably fair crypto random)
 * - If votes are IMBALANCED: The side with FEWER votes wins (minority wins)
 * - All votes on winning side split the entire pot proportionally
 * - All votes on losing side lose everything
 * 
 * PAYOUT EXAMPLES:
 * - 50/50 split (tied votes): Random coin flip, winners get 2x
 * - 90/10 split: If 10% side wins, they get 10x multiplier
 * - 95/5 split: If 5% side wins, they get 20x multiplier
 * 
 * This creates exciting asymmetric risk/reward where extreme imbalances
 * produce huge multipliers instead of terrible returns.
 */

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
  // Social engagement (free, awards XP to creator)
  likesA: { type: Number, default: 0 }, // likes for side A
  likesB: { type: Number, default: 0 }, // likes for side B
  dislikesA: { type: Number, default: 0 }, // dislikes for side A
  dislikesB: { type: Number, default: 0 }, // dislikes for side B
  createdAt: { type: Date, default: Date.now },
});

const Divide = mongoose.models.Divide || mongoose.model("Divide", divideSchema);
export default Divide;
