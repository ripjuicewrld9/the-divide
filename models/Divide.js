// models/Divide.js
import mongoose from "mongoose";

/**
 * DIVIDE GAME MECHANICS - SHORT POSITIONS:
 * - Players "short" one side (bet against it), cannot see positions during active game
 * - You SHORT the side you think will LOSE (minority-wins mechanic)
 * - If shorts are TIED: 50/50 coin flip determines loser (provably fair crypto random)
 * - If shorts are IMBALANCED: The side with FEWER shorts wins (their opponents lose)
 * - All shorts on winning side split the entire pot proportionally
 * - All shorts on losing side get liquidated (lose everything)
 * 
 * PAYOUT EXAMPLES:
 * - 50/50 split (tied shorts): Random coin flip, winners get 2x
 * - 90 short A / 10 short B: If B wins (fewer shorts), 10x multiplier
 * - 95 short A / 5 short B: If B wins (fewer shorts), 20x multiplier
 * 
 * Think of it like shorting stocks: you want FEWER people betting against your target.
 * The more crowded the short, the worse your payout. Contrarian shorts = huge gains.
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
  category: {
    type: String,
    enum: ['Politics', 'Sports', 'Crypto', 'Entertainment', 'Science', 'Business', 'Other'],
    default: 'Other',
    index: true
  },
  shortsA: { type: Number, default: 0 }, // total $ shorting side A (betting A will lose)
  shortsB: { type: Number, default: 0 }, // total $ shorting side B (betting B will lose)
  totalShorts: { type: Number, default: 0 },
  pot: { type: Number, default: 0 },
  status: { type: String, default: "active" },
  // persisted financial fields for auditing
  paidOut: { type: Number, default: 0 },     // amount actually paid to winners when divide ended
  houseCut: { type: Number, default: 0 },    // house cut recorded at end
  jackpotCut: { type: Number, default: 0 },  // jackpot contribution recorded at end
  shorts: [ // renamed from 'votes'
    {
      userId: String,
      side: String, // side being shorted (A or B)
      shortAmount: { type: Number, default: 0 }, // $ amount shorting this side
      isFree: { type: Boolean, default: true },
      bet: { type: Number, default: 0 }, // actual bet amount in dollars for user-created divides
    },
  ],
  creatorId: { type: String },
  creatorBet: { type: Number, default: 0 }, // initial bet placed by creator (dollars)
  creatorSide: { type: String }, // 'A' or 'B' - which side creator is shorting
  isUserCreated: { type: Boolean, default: false }, // true if created by user, false if admin-created
  loserSide: { type: String }, // the side that got shorted and lost (renamed from winnerSide for clarity)
  // Social engagement (free, awards XP to reactor and creator)
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  likedBy: [{ type: String }], // userIds who liked
  dislikedBy: [{ type: String }], // userIds who disliked
  createdAt: { type: Date, default: Date.now },
});

const Divide = mongoose.models.Divide || mongoose.model("Divide", divideSchema);
export default Divide;
