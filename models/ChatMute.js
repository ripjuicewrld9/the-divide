import mongoose from 'mongoose';

const chatMuteSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mutedBy: { type: String, required: true },
  mutedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mutedAt: { type: Date, default: Date.now },
  mutedUntil: { type: Date, required: true, index: true },
  reason: { type: String, maxlength: 500 },
  active: { type: Boolean, default: true, index: true }
});

chatMuteSchema.index({ username: 1, active: 1 });
chatMuteSchema.index({ mutedUntil: 1, active: 1 });

export default mongoose.model('ChatMute', chatMuteSchema);
