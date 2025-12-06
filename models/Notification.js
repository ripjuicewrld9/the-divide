import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['support', 'system', 'jackpot', 'case', 'achievement', 'promo', 'deposit', 'withdrawal'], 
    required: true 
  },
  title: { type: String, required: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 500 },
  link: { type: String }, // Optional link to relevant page
  icon: { type: String }, // Emoji or icon identifier
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
