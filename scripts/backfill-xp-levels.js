import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { getLevelFromXP, XP_RATES } from '../utils/xpSystem.js';

dotenv.config();

async function backfillXPLevels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const users = await User.find({});
    console.log(`Found ${users.length} users to process`);

    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      let needsUpdate = false;
      const updates = {};

      // Calculate XP from wagered amount if user has no XP yet
      if (!user.xp || user.xp === 0) {
        // Grant XP based on historical wagering: 2 XP per $1 wagered
        const wagerCents = user.wagered || 0;
        const calculatedXP = Math.floor(wagerCents / 100) * XP_RATES.usdWager;
        
        if (calculatedXP > 0) {
          updates.xp = calculatedXP;
          updates.xpThisWeek = 0; // Don't backfill weekly stats
          updates.xpThisMonth = 0; // Don't backfill monthly stats
          needsUpdate = true;
          console.log(`  ${user.username}: Calculated ${calculatedXP} XP from $${(wagerCents / 100).toFixed(2)} wagered`);
        }
      } else {
        updates.xp = user.xp;
      }

      // Recalculate level and badge from XP
      const levelData = getLevelFromXP(updates.xp || user.xp || 0);
      
      if (user.level !== levelData.level || user.currentBadge !== levelData.title) {
        updates.level = levelData.level;
        updates.currentBadge = levelData.title;
        needsUpdate = true;
        console.log(`  ${user.username}: Updated to Level ${levelData.level} (${levelData.title})`);
      }

      if (needsUpdate) {
        await User.updateOne({ _id: user._id }, { $set: updates });
        updated++;
      } else {
        skipped++;
      }
    }

    console.log('\n✅ Backfill complete!');
    console.log(`   Updated: ${updated} users`);
    console.log(`   Skipped: ${skipped} users (already correct)`);

  } catch (err) {
    console.error('❌ Error during backfill:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

backfillXPLevels();
