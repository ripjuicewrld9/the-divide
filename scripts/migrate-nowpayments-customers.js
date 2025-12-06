/**
 * Migration script to create NOWPayments customers for existing users
 * Run with: node scripts/migrate-nowpayments-customers.js
 * 
 * Requires environment variables:
 * - MONGODB_URI
 * - NOWPAYMENTS_API_KEY
 * - NOWPAYMENTS_EMAIL
 * - NOWPAYMENTS_PASSWORD
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User.js';
import * as nowPayments from '../utils/nowPayments.js';

const BATCH_SIZE = 10;
const DELAY_MS = 1000; // Delay between batches to avoid rate limiting

async function migrate() {
    console.log('NOWPayments Customer Migration Script');
    console.log('=====================================\n');

    // Check if Sub-Partner API is available
    if (!nowPayments.isSubPartnerApiAvailable()) {
        console.error('❌ NOWPAYMENTS_EMAIL and NOWPAYMENTS_PASSWORD must be set');
        process.exit(1);
    }

    // Connect to MongoDB
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB\n');
    } catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err.message);
        process.exit(1);
    }

    // Find users without NOWPayments customer ID
    const usersWithoutCustomerId = await User.find({
        nowPaymentsCustomerId: { $in: ['', null] }
    }).select('_id username');

    console.log(`Found ${usersWithoutCustomerId.length} users without NOWPayments customer ID\n`);

    if (usersWithoutCustomerId.length === 0) {
        console.log('✓ All users already have customer IDs!');
        process.exit(0);
    }

    let created = 0;
    let failed = 0;
    const failures = [];

    for (let i = 0; i < usersWithoutCustomerId.length; i += BATCH_SIZE) {
        const batch = usersWithoutCustomerId.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(usersWithoutCustomerId.length / BATCH_SIZE)}...`);

        for (const user of batch) {
            try {
                const customer = await nowPayments.createCustomer({
                    name: user.username,
                    externalId: user._id.toString()
                });

                await User.findByIdAndUpdate(user._id, {
                    nowPaymentsCustomerId: customer.id
                });

                console.log(`  ✓ ${user.username}: ${customer.id}`);
                created++;
            } catch (err) {
                console.error(`  ✗ ${user.username}: ${err.message}`);
                failed++;
                failures.push({ username: user.username, error: err.message });
            }
        }

        // Delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < usersWithoutCustomerId.length) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    console.log('\n=====================================');
    console.log('Migration Complete');
    console.log(`  Created: ${created}`);
    console.log(`  Failed: ${failed}`);

    if (failures.length > 0) {
        console.log('\nFailed users:');
        failures.forEach(f => console.log(`  - ${f.username}: ${f.error}`));
    }

    process.exit(failed > 0 ? 1 : 0);
}

migrate().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
});
