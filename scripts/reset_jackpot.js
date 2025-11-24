require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/thedivide';

const JackpotSchema = new mongoose.Schema({ id: String, amount: Number }, { strict: false });
const HouseSchema = new mongoose.Schema({ id: String, houseTotal: Number }, { strict: false });
const Jackpot = mongoose.model('JackpotResetHelper', JackpotSchema, 'jackpots');
const House = mongoose.model('HouseResetHelper', HouseSchema, 'houses');

async function run() {
  try {
    console.log('Connecting to', uri);
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const res1 = await Jackpot.findOneAndUpdate({ id: 'global' }, { $set: { amount: 0 } }, { upsert: true, new: true });
  const res2 = await House.findOneAndUpdate({ id: 'global' }, { $set: { houseTotal: 0 } }, { upsert: true, new: true });
  console.log('Reset jackpot result:', res1);
  console.log('Reset house result:', res2);
  } catch (err) {
    console.error('Failed to reset jackpot:', err);
    process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
