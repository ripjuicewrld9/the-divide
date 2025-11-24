import mongoose from 'mongoose';

const RuggedPositionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  entryAmount: { type: Number, required: true }, // USD cents-precision as Number
  entryPool: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.RuggedPosition || mongoose.model('RuggedPosition', RuggedPositionSchema);
