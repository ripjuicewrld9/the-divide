#!/usr/bin/env node
/**
 * Find and report corrupted Keno rounds (stored multiplier/win mismatch paytable)
 * This is a READ-ONLY diagnostic — no DB changes.
 */
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
    
    // Find all rounds
    const allRounds = await KenoRound.find({}).sort({ timestamp: -1 }).lean();
    console.log(`Total rounds in DB: ${allRounds.length}\n`);
    
    const corrupted = [];
    
    for (const r of allRounds) {
      try {
        const picks = Array.isArray(r.picks) ? r.picks.map(Number).filter(Number.isFinite) : [];
        const matches = Array.isArray(r.matches) ? r.matches.map(Number) : [];
        const spots = picks.length;
        const hits = matches.length;
        const risk = r.risk || 'classic';
        
        // Compute expected multiplier from paytable
        const baseExpected = paytables[risk]?.[spots]?.[hits] ?? 0;
        const expectedMult = typeof baseExpected === 'number' ? baseExpected : Number(baseExpected) || 0;
        const storedMult = Number(r.multiplier || 0);
        
        // Compute expected win
        const betCents = Math.round((Number(r.betAmount || 0)) * 100);
        const expectedWinCents = Math.round(betCents * expectedMult);
        const expectedWin = Number((expectedWinCents / 100).toFixed(2));
        const storedWin = Number(r.win || 0);
        
        // If mismatch, add to corrupted list
        if (storedMult !== expectedMult || storedWin !== expectedWin) {
          corrupted.push({
            _id: r._id.toString(),
            userId: r.userId,
            timestamp: r.timestamp,
            nonce: r.nonce,
            risk,
            spots,
            hits,
            betAmount: r.betAmount,
            storedMult,
            expectedMult,
            storedWin,
            expectedWin,
            winDiff: expectedWin - storedWin
          });
        }
      } catch (e) {
        console.error('Error checking round', r._id, e.message);
      }
    }
    
    console.log(`\n=== CORRUPTION REPORT ===`);
    console.log(`Total corrupted rounds: ${corrupted.length}`);
    console.log(`Corruption rate: ${((corrupted.length / allRounds.length) * 100).toFixed(2)}%\n`);
    
    if (corrupted.length > 0) {
      console.log('First 20 corrupted rounds:');
      const sample = corrupted.slice(0, 20);
      for (const c of sample) {
        console.log(`\n  Round ID: ${c._id}`);
        console.log(`  User: ${c.userId}, Nonce: ${c.nonce}, Risk: ${c.risk}`);
        console.log(`  Spots: ${c.spots}, Hits: ${c.hits}, Bet: $${c.betAmount}`);
        console.log(`  Stored: mult=${c.storedMult}, win=$${c.storedWin}`);
        console.log(`  Expected: mult=${c.expectedMult}, win=$${c.expectedWin}`);
        console.log(`  Win difference: $${c.winDiff.toFixed(2)} (player lost/gained)`);
      }
      
      // Summary of financial impact
      const totalWinDiff = corrupted.reduce((sum, c) => sum + c.winDiff, 0);
      console.log(`\n  FINANCIAL IMPACT:`);
      console.log(`  Total win difference across all corrupted rounds: $${totalWinDiff.toFixed(2)}`);
      if (totalWinDiff > 0) {
        console.log(`  (Players were overpaid by $${totalWinDiff.toFixed(2)})`);
      } else {
        console.log(`  (Players were underpaid by $${Math.abs(totalWinDiff).toFixed(2)})`);
      }
      
      // Pattern analysis
      const patterns = {};
      for (const c of corrupted) {
        const key = `${c.spots}:${c.hits}:${c.risk}`;
        if (!patterns[key]) patterns[key] = { count: 0, totalDiff: 0 };
        patterns[key].count++;
        patterns[key].totalDiff += c.winDiff;
      }
      
      console.log(`\n  CORRUPTION PATTERNS (spots:hits:risk -> count):`);
      for (const [key, data] of Object.entries(patterns).sort()) {
        console.log(`    ${key}: ${data.count} rounds, total diff $${data.totalDiff.toFixed(2)}`);
      }
    }
    
    console.log(`\nNo changes made (read-only report).\n`);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
