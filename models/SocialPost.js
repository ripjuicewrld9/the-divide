// models/SocialPost.js
// Social post schema for the in-app social feed ("custom X inside the site")
import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxLength: 500 },
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const SocialPostSchema = new mongoose.Schema({
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  content: { 
    type: String, 
    required: true, 
    maxLength: 1000 
  },
  // Optional media (image URL)
  imageUrl: { 
    type: String, 
    default: null 
  },
  // Optional linked divide
  linkedDivide: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Divide', 
    default: null 
  },
  // Engagement metrics
  likes: { 
    type: Number, 
    default: 0 
  },
  dislikes: { 
    type: Number, 
    default: 0 
  },
  likedBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  dislikedBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  views: { 
    type: Number, 
    default: 0 
  },
  viewedBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  // Comments
  comments: [CommentSchema],
  commentCount: { 
    type: Number, 
    default: 0 
  },
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  // Soft delete
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
});

// Index for efficient feed queries (newest first)
SocialPostSchema.index({ createdAt: -1, isDeleted: 1 });
SocialPostSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model('SocialPost', SocialPostSchema);
