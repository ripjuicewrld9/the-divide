import mongoose from 'mongoose';

const plinkoRecordingSchema = new mongoose.Schema({
  rowCount: {
    type: Number,
    required: true,
    index: true,
  },
  recordings: {
    type: Object, // Map of "rowCount-binIndex" -> Recording[]
    required: true,
  },
  version: {
    type: Number,
    default: 1,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Only one document per row count
plinkoRecordingSchema.index({ rowCount: 1 }, { unique: true });

export default mongoose.model('PlinkoRecording', plinkoRecordingSchema);
