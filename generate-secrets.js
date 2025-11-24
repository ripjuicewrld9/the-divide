/**
 * Secret Generator
 * Generates cryptographically secure secrets for JWT and other uses
 */

import crypto from 'crypto';

console.log('\n🔐 Secure Secret Generator\n');
console.log('='.repeat(70));

// Generate JWT Secret (64 bytes = 512 bits)
const jwtSecret = crypto.randomBytes(64).toString('base64');
console.log('\n📝 JWT_SECRET (paste this in your .env file):');
console.log('-'.repeat(70));
console.log(jwtSecret);
console.log('-'.repeat(70));

// Generate Admin Code (16 bytes = 128 bits, URL-safe)
const adminCode = crypto.randomBytes(16).toString('hex');
console.log('\n🔑 ADMIN_CODE (paste this in your .env file):');
console.log('-'.repeat(70));
console.log(adminCode);
console.log('-'.repeat(70));

// Example .env configuration
console.log('\n📄 Complete .env Configuration:');
console.log('='.repeat(70));
console.log(`
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# JWT Secret for authentication tokens (KEEP THIS SECRET!)
JWT_SECRET=${jwtSecret}

# Admin Access Code (optional, for creating admin users)
ADMIN_CODE=${adminCode}

# Server Configuration
PORT=3000
NODE_ENV=development

# Random.org API Key (if using provably fair with Random.org)
RANDOM_ORG_API_KEY=your_api_key_here
`);
console.log('='.repeat(70));

console.log('\n✅ Secrets generated successfully!');
console.log('⚠️  IMPORTANT: Keep these secrets secure and never commit them to git!\n');
