import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true, maxlength: 500 },
  timestamp: { type: Date, default: Date.now }
});

// Keep only last 100 messages in DB (optional - for cleanup)
ChatMessageSchema.index({ timestamp: -1 });

export default mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
