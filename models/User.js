import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, default: '' },
  password: String,
  dateOfBirth: { type: Date },
  marketingConsent: { type: Boolean, default: false },
  marketingConsentDate: { type: Date },
  // balance is stored in integer cents (e.g. $1.23 => 123)
  balance: { type: Number, default: 1000 }, // default $10.00 => 1000 cents
  kenoServerSeed: String,
  kenoServerSeedHashed: String,
  // server-side nonce for Keno: server will reset this to 0 when rotating the seed
  kenoNonce: { type: Number, default: 0 },
  // Plinko provably fair tracking
  plinkoServerSeed: String,
  plinkoServerSeedHashed: String,
  plinkoNonce: { type: Number, default: 0 },
  // Blackjack provably fair tracking
  blackjackServerSeed: String,
  blackjackServerSeedHashed: String,
  blackjackNonce: { type: Number, default: 0 },
  lastFreeVoteDate: { type: String, default: '' },
  // totalWinnings stored in cents
  totalWinnings: { type: Number, default: 0 },
  // User statistics for profile display
  totalBets: { type: Number, default: 0 },
  totalWins: { type: Number, default: 0 },
  totalLosses: { type: Number, default: 0 },
  wagered: { type: Number, default: 0 }, // total amount wagered in cents
  totalWon: { type: Number, default: 0 }, // total winnings in cents
  totalDeposited: { type: Number, default: 0 }, // total deposits in cents
  totalWithdrawn: { type: Number, default: 0 }, // total withdrawals in cents
  totalRedemptions: { type: Number, default: 0 }, // count of withdrawal transactions
  wagerRequirement: { type: Number, default: 0 }, // amount that must be wagered before withdrawal (1x playthrough)
  role: { type: String, default: 'user' },
  holdingsDC: { type: Number, default: 0 },
  holdingsInvested: { type: Number, default: 0 },
  profileImage: { type: String, default: '' },
  discordId: { type: String, default: '' }, // Discord user ID for support ticket integration
  discordUsername: { type: String, default: '' }, // Discord username for display
  googleId: { type: String, default: '' }, // Google user ID for OAuth login
  googleEmail: { type: String, default: '' }, // Google email for display
  twoFactorSecret: { type: String, default: '' }, // TOTP secret for 2FA
  twoFactorEnabled: { type: Boolean, default: false }, // Whether 2FA is active
  twoFactorBackupCodes: [{ type: String }], // Backup codes for 2FA recovery
  resetPasswordToken: { type: String }, // Password reset token
  resetPasswordExpires: { type: Date }, // Token expiration time
  lastUsernameChange: { type: Date }, // Last time username was changed
  createdAt: { type: Date, default: Date.now }
});

// Pre-save hook: log balance changes (balance stored in cents)
userSchema.pre('save', async function (next) {
  try {
    if (this.isNew) {
      console.log(`User[${this._id}] created with balance=${(this.balance / 100).toFixed(2)}`);
      return next();
    }
    if (this.isModified('balance')) {
      try {
        const prev = mongoose.models.User ? await mongoose.models.User.findById(this._id).lean() : null;
        const prevBal = prev ? (prev.balance / 100).toFixed(2) : undefined;
        console.log(`User[${this._id}] balance change: ${prevBal} -> ${(this.balance / 100).toFixed(2)}\nStack:`, new Error().stack.split('\n').slice(2, 6).join('\n'));
      } catch (e) {
        console.log('User balance changed but failed to load previous value', e);
      }
    }
  } catch (err) {
    console.error('pre-save hook error', err);
  }
  next();
});

export default mongoose.models.User || mongoose.model('User', userSchema);
