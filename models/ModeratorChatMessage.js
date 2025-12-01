import mongoose from 'mongoose';

const moderatorChatMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  role: { type: String, enum: ['moderator', 'admin'], required: true },
  message: { type: String, required: true, maxlength: 3000 }, // Increased for encrypted messages
  encrypted: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

moderatorChatMessageSchema.index({ timestamp: -1 });

export default mongoose.model('ModeratorChatMessage', moderatorChatMessageSchema);
