import mongoose from 'mongoose';

const kenoReserveSchema = new mongoose.Schema({
  id: { type: String, default: 'global', index: true },
  amount: { type: Number, default: 0 },
});

export default mongoose.models.KenoReserve || mongoose.model('KenoReserve', kenoReserveSchema);
