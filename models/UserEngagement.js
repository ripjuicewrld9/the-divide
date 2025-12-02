// models/UserEngagement.js
// Audit trail for all XP awards
import mongoose from "mongoose";

const userEngagementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    required: true,
    enum: ['usdWager', 'gcScWager', 'likeGiven', 'likeReceived', 'dislikeReceived', 'divideCreated', 'dividePot100', 'dividePot1000']
  },
  xpAwarded: { type: Number, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed }, // Extra context (divideId, amount, etc.)
  timestamp: { type: Date, default: Date.now, index: true }
});

const UserEngagement = mongoose.models.UserEngagement || mongoose.model("UserEngagement", userEngagementSchema);
export default UserEngagement;
