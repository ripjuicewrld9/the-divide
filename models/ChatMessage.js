import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  level: {
    type: Number,
    default: 1,
  },
  profileImage: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Index for efficient querying of recent messages
chatMessageSchema.index({ timestamp: -1 });

// Auto-delete messages older than 7 days to keep DB clean
chatMessageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

export default mongoose.model('ChatMessage', chatMessageSchema);
