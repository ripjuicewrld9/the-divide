// models/DivideSentiment.js
// Stores aggregated sentiment analysis for each Divide
import mongoose from 'mongoose';

const SentimentSnapshotSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  // Overall sentiment scores (0-100)
  optionA: {
    score: { type: Number, default: 50 }, // 0 = very negative, 50 = neutral, 100 = very positive
    confidence: { type: Number, default: 0 }, // 0-100 confidence in the score
    sampleSize: { type: Number, default: 0 }, // number of comments/posts analyzed
  },
  optionB: {
    score: { type: Number, default: 50 },
    confidence: { type: Number, default: 0 },
    sampleSize: { type: Number, default: 0 },
  },
  // Key themes/topics extracted
  themes: [{
    text: String,
    count: Number,
    sentiment: String, // 'positive', 'negative', 'neutral'
  }],
  // Raw AI response for debugging
  rawAnalysis: { type: String },
});

const DivideSentimentSchema = new mongoose.Schema({
  divide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Divide',
    required: true,
    unique: true,
    index: true,
  },
  // Current/latest sentiment
  current: {
    optionA: {
      score: { type: Number, default: 50 },
      confidence: { type: Number, default: 0 },
      sampleSize: { type: Number, default: 0 },
      label: { type: String, default: 'neutral' }, // 'bullish', 'bearish', 'neutral', 'mixed'
    },
    optionB: {
      score: { type: Number, default: 50 },
      confidence: { type: Number, default: 0 },
      sampleSize: { type: Number, default: 0 },
      label: { type: String, default: 'neutral' },
    },
    themes: [{
      text: String,
      count: Number,
      sentiment: String,
    }],
    analyzedAt: { type: Date, default: Date.now },
  },
  // Historical snapshots for trend analysis
  history: [SentimentSnapshotSchema],
  // Tracking
  lastAnalyzedCommentId: { type: mongoose.Schema.Types.ObjectId },
  totalCommentsAnalyzed: { type: Number, default: 0 },
  totalPostsAnalyzed: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Helper to get sentiment label from score
DivideSentimentSchema.statics.getLabel = function(score) {
  if (score >= 70) return 'bullish';
  if (score <= 30) return 'bearish';
  if (score >= 45 && score <= 55) return 'neutral';
  return 'mixed';
};

export default mongoose.model('DivideSentiment', DivideSentimentSchema);
