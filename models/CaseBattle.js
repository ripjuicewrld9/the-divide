// models/CaseBattle.js
import mongoose from "mongoose";

const caseBattleSchema = new mongoose.Schema({
  id: { type: String, index: true }, // short human-friendly id (optional)
  // Players - team-based structure
  // For 1v1: teams of 1, player1 vs player2
  // For 2v2: teams of 2, [player1, player3] vs [player2, player4]
  // For 3v3: teams of 3, etc.
  // For group: all players compete individually
  players: [
    {
      userId: { type: String, required: true },
      username: { type: String },
      team: { type: Number, default: 1 }, // 1 or 2 for normal/crazy, 1 for group
      status: { type: String, default: 'waiting', enum: ['waiting', 'ready', 'connected'] },
      caseValue: { type: Number }, // cost to enter
      cases: [
        {
          caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
          caseName: { type: String },
          price: { type: Number },
          drawnItem: { type: String },
          itemValue: { type: Number },
          items: [ // Include all items from the case for reel display
            {
              name: { type: String },
              value: { type: Number },
              chance: { type: Number },
              image: { type: String },
              rarity: { type: String },
              color: { type: String },
            }
          ],
        },
      ],
      totalCaseValue: { type: Number, default: 0 }, // sum of all case costs for this player
      totalItemValue: { type: Number, default: 0 }, // sum of all drawn items for this player
      seed: { type: String }, // RNG seed for this player
      ticket: { type: Number }, // drawn ticket (0-99,999)
      // Hybrid RNG fields (optional) - store components for auditability
      randomOrgSeed: { type: String },
      eosBlockHash: { type: String },
      hybridSeed: { type: String },
      isBot: { type: Boolean, default: false },
    },
  ],
  
  // Legacy fields (kept for backward compatibility with 1v1)
  player1Id: { type: String, index: true },
  player1Username: { type: String },
  player2Id: { type: String, index: true },
  player2Username: { type: String },
  player2IsBot: { type: Boolean, default: false },
  // Multiple Cases - Array of case selections
  player1Cases: [
    {
      caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
      caseName: { type: String },
      caseValue: { type: Number }, // price of this case
      drawnItem: { type: String }, // item name drawn from case
    },
  ],
  player2Cases: [
    {
      caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
      caseName: { type: String },
      caseValue: { type: Number }, // price of this case
      drawnItem: { type: String }, // item name drawn from case
    },
  ],
  // Store the original caseIds array for tracking number of cases
  caseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Case' }],
  // Store full case items data for animation (from the opened case)
  caseItemsData: [
    {
      name: { type: String },
      value: { type: Number },
      chance: { type: Number },
      color: { type: String },
      rarity: { type: String },
      image: { type: String }, // URL to item image
      id: { type: String },
      isGoldTrigger: { type: Boolean, default: false },
    },
  ],
  // Legacy fields (for backward compatibility)
  caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
  caseName: { type: String },
  player1CaseValue: { type: Number }, // cost to enter (case price)
  player1CaseItem: { type: String }, // item name drawn
  player1ItemValue: { type: Number, default: 0 }, // value of the drawn item (what goes into pot)
  player2CaseValue: { type: Number }, // cost to enter (case price)
  player2CaseItem: { type: String }, // item name drawn
  player2ItemValue: { type: Number, default: 0 }, // value of the drawn item (what goes into pot)
  // Pot and payout
  pot: { type: Number, default: 0 }, // total at stake (sum of drawn item values from all players)
  // Status: 'waiting' (p1 created, waiting for others) | 'active' (all players in) | 'opened' (cases revealed) | 'ended' (payout complete)
  status: { type: String, default: "waiting", enum: ["waiting", "active", "opened", "ended"] },
  // Mode: battle type for UI display and future feature logic
  mode: { type: String, default: "normal", enum: ["normal", "crazy", "group"] },
  // Team size: number of players per side (1v1, 2v2, 3v3) or total players (2, 3, 4, 6)
  // For normal/crazy: 1, 2, or 3 (represents 1v1, 2v2, 3v3)
  // For group: 2, 3, 4, or 6 (total players in battle)
  teamSize: { type: Number, default: 1 },
  // Opening
  player1Ready: { type: Boolean, default: false }, // clicked "Open Case"
  player2Ready: { type: Boolean, default: false },
  // Seeds for RNG (for provably fair draws)
  player1Seed: { type: String }, // player 1's seed (legacy)
  player2Seed: { type: String }, // player 2's seed (legacy)
  // Hybrid RNG components stored at battle level for auditing
  randomOrgSeed: { type: String },
  eosBlockHash: { type: String },
  hybridSeed: { type: String },
  // Drawn ticket numbers (0-99,999 range)
  player1Ticket: { type: Number }, // ticket number that was drawn for player 1 (legacy)
  player2Ticket: { type: Number }, // ticket number that was drawn for player 2 (legacy)
  // Result
  winnerId: { type: String }, // winning player userId or team number
  winnerUsername: { type: String }, // username of winner for display
  winnerTeam: { type: Number }, // team number that won (1 or 2) for team battles
  winnerPayout: { type: Number, default: 0 }, // amount paid to winner (in cents)
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const CaseBattle = mongoose.models.CaseBattle || mongoose.model("CaseBattle", caseBattleSchema);
export default CaseBattle;
