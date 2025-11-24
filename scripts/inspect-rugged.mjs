import mongoose from 'mongoose';
import Rugged from '../models/Rugged.js';
import RuggedState from '../models/RuggedState.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/the-divide';
(async ()=>{
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const doc = await Rugged.findOne({ id: 'global' }).lean();
  const state = await RuggedState.findOne({ id: 'global' }).lean();
  console.log('Rugged doc:', JSON.stringify(doc, null, 2));
  console.log('RuggedState doc:', JSON.stringify(state, null, 2));
    process.exit(0);
  } catch (e) { console.error(e); process.exit(1); }
})();
