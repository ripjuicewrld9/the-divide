#!/usr/bin/env node
import mongoose from 'mongoose';
import { paytables } from '../paytable-data.js';
import dotenv from 'dotenv';
dotenv.config();

import KenoRound from '../models/KenoRound.js';

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rafflehub', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB\n');
    
    // Get all rounds for the user from the logs
    const userId = '690acc96159e5d98ace79447';
    const userRounds = await KenoRound.find({ userId }).sort({ nonce: 1 }).lean();
    
    console.log(`Rounds for user ${userId}: ${userRounds.length}\n`);
    console.log('=== ALL ROUNDS FOR THIS USER ===\n');
    
    let corrupted = 0;
    let correct = 0;
    
    for (const r of userRounds) {
      const picks = Array.isArray(r.picks) ? r.picks.map(Number) : [];
      const matches = Array.isArray(r.matches) ? r.matches.map(Number) : [];
      const spots = picks.length;
      const hits = matches.length;
      const risk = r.risk || 'classic';
      
      // Compute expected
      const expected = paytables[risk]?.[spots]?.[hits] ?? 0;
      const expectedMult = typeof expected === 'number' ? expected : Number(expected) || 0;
      const storedMult = Number(r.multiplier || 0);
      
      const betCents = Math.round((Number(r.betAmount || 0)) * 100);
      const expectedWinCents = Math.round(betCents * expectedMult);
      const expectedWin = Number((expectedWinCents / 100).toFixed(2));
      const storedWin = Number(r.win || 0);
      
      const isCorrect = storedMult === expectedMult && storedWin === expectedWin;
      
      console.log(`Nonce ${r.nonce}: ${risk}/${spots}/${hits} bet=$${r.betAmount}`);
      console.log(`  Stored: mult=${storedMult}, win=$${storedWin}`);
      console.log(`  Expected: mult=${expectedMult}, win=$${expectedWin}`);
      if (isCorrect) {
        console.log(`  ✓ CORRECT`);
        correct++;
      } else {
        console.log(`  ✗ CORRUPTED (diff: ${(storedWin - expectedWin).toFixed(2)})`);
        corrupted++;
      }
      console.log();
    }
    
    console.log(`\nSummary: ${correct} correct, ${corrupted} corrupted`);
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
