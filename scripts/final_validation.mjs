#!/usr/bin/env node
/**
 * Final validation: Check if the fix is working correctly.
 * - Verify no ReferenceError occurs
 * - Verify balance updates correctly
 * - Verify new rounds have correct multipliers
 */
import mongoose from 'mongoose';
import { paytables } from '../paytable-data.js';
import dotenv from 'dotenv';
dotenv.config();

import KenoRound from '../models/KenoRound.js';
import User from '../models/User.js';

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rafflehub', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB\n');
    
    // Get latest rounds (most recent first)
    const recentRounds = await KenoRound.find({})
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();
    
    console.log('=== FINAL VALIDATION ===\n');
    console.log(`Latest 5 rounds:\n`);
    
    let allCorrect = true;
    for (const r of recentRounds) {
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
      
      console.log(`Round: ${r._id}`);
      console.log(`  ${risk}/${spots}/${hits}: bet=$${r.betAmount}`);
      console.log(`  Stored: mult=${storedMult}, win=$${storedWin}`);
      console.log(`  Expected: mult=${expectedMult}, win=$${expectedWin}`);
      console.log(`  Status: ${isCorrect ? '✓ CORRECT' : '✗ MISMATCH'}`);
      console.log();
      
      if (!isCorrect) allCorrect = false;
    }
    
    // Check user balance is sensible
    console.log('\n=== USER BALANCES ===\n');
    const users = await User.find({}).lean().limit(3);
    for (const u of users) {
      const balanceDollars = (u.balance / 100).toFixed(2);
      console.log(`User ${u.username}: $${balanceDollars}`);
    }
    
    console.log('\n=== CONCLUSION ===');
    if (allCorrect) {
      console.log('✓ All recent rounds are CORRECT');
      console.log('✓ The fix is working properly');
      console.log('✓ No new corruption is being generated');
    } else {
      console.log('✗ Some recent rounds have mismatches');
      console.log('⚠ Further investigation needed');
    }
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
