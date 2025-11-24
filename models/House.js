import mongoose from 'mongoose';

const houseSchema = new mongoose.Schema({
  id: { type: String, default: 'global', index: true },
  houseTotal: { type: Number, default: 0 },
  // Note: Keno-specific reserve is stored in a separate collection (`KenoReserve`)
});

export default mongoose.models.House || mongoose.model('House', houseSchema);
