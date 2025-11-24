#!/usr/bin/env node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import KenoRound from '../models/KenoRound.js';

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rafflehub', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB\n');
    
    // Find round with nonce 34 that showed mismatch
    const rounds = await KenoRound.find({ nonce: 34 }).lean();
    console.log(`Rounds with nonce 34: ${rounds.length}\n`);
    
    for (const r of rounds) {
      console.log('Round details:');
      console.log('  _id:', r._id);
      console.log('  userId:', r.userId);
      console.log('  nonce:', r.nonce);
      console.log('  risk:', r.risk);
      console.log('  picks:', r.picks);
      console.log('  drawnNumbers:', r.drawnNumbers);
      console.log('  matches:', r.matches);
      console.log('  spots:', r.picks?.length);
      console.log('  hits:', r.matches?.length);
      console.log('  betAmount:', r.betAmount);
      console.log('  multiplier:', r.multiplier);
      console.log('  win:', r.win);
      console.log('  timestamp:', r.timestamp);
      console.log();
    }
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
