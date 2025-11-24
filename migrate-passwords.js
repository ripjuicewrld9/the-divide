/**
 * Security Enhancement Script
 * Migrates existing plain-text passwords to bcrypt hashes
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/the-divide';

async function migratePasswords() {
  try {
    console.log('🔒 Starting password migration...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all users with plain-text passwords (passwords without bcrypt hash format)
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to check`);
    
    let migratedCount = 0;
    
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2b$ or $2a$)
      if (!user.password.startsWith('$2')) {
        console.log(`🔄 Migrating user: ${user.username}`);
        
        // Hash the plain-text password
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Update the user with hashed password
        user.password = hashedPassword;
        await user.save();
        
        migratedCount++;
        console.log(`✅ Migrated: ${user.username}`);
      } else {
        console.log(`⏭️  Skipped (already hashed): ${user.username}`);
      }
    }
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`   - Total users checked: ${users.length}`);
    console.log(`   - Passwords migrated: ${migratedCount}`);
    console.log(`   - Already secure: ${users.length - migratedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migratePasswords();
