import { Server } from "socket.io";
import dotenv from 'dotenv';
dotenv.config();

// Models
import Divide from './models/Divide.js';
import DivideComment from './models/DivideComment.js';
import House from './models/House.js';
import Ledger from './models/Ledger.js';
import User from './models/User.js';
import SupportTicket from './models/SupportTicket.js';
import ChatMessage from './models/ChatMessage.js';
import ChatMute from './models/ChatMute.js';
import ModeratorChatMessage from './models/ModeratorChatMessage.js';
import Notification from './models/Notification.js';
import UserEngagement from './models/UserEngagement.js';
import SocialPost from './models/SocialPost.js';
import DivideSentiment from './models/DivideSentiment.js';
import { analyzeDivideSentiment } from './utils/geminiSentiment.js';

// Routes
import paymentRoutes from './routes/payments.js';

// Core dependencies
import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import http from 'http';

// Utils
import { fileURLToPath } from 'url';
import * as nowPayments from './utils/nowPayments.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// MongoDB connection
try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rafflehub', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');
} catch (err) {
  console.error('Failed to connect to MongoDB during startup', err && err.message ? err.message : err);
  process.exit(1);
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Email transporter setup
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Money helpers
const toCents = (n) => Math.round((Number(n) || 0) * 100);
const toDollars = (cents) => Number(((Number(cents) || 0) / 100).toFixed(2));

// SECURITY: Sanitize divide data to hide vote counts for active divides
// This prevents users from seeing which side is winning before the divide ends
function sanitizeDivide(divide, forceHideVotes = false) {
  if (!divide) return divide;
  const d = divide.toObject ? divide.toObject() : { ...divide };

  // Only hide votes if divide is still active
  if (d.status === 'active' || forceHideVotes) {
    // Hide all vote-related data that could reveal which side is winning
    // CRITICAL: These fields would expose who is winning the minority game
    d.votesA = null;
    d.votesB = null;
    d.shortsA = null;  // CRITICAL: Hide short amounts per side
    d.shortsB = null;  // CRITICAL: Hide short amounts per side
    d.totalVotes = null;
    d.totalShorts = null;  // Hide total shorts count
    d.votes = []; // Hide individual vote records
    d.shorts = []; // Hide individual shorts records - CRITICAL
    d.voteHistory = []; // Hide vote history chart data - contains shortsA/shortsB snapshots
    // Do NOT hide pot - total volume is safe and expected for UX
    // Do NOT hide likes/dislikes - those are social engagement, not vote data
  }

  // Never expose sensitive internal fields
  delete d.__v;

  return d;
}

// Sanitize array of divides
function sanitizeDivides(divides) {
  if (!Array.isArray(divides)) return divides;
  return divides.map(d => sanitizeDivide(d));
}

// Auth middleware
function auth(req, res, next) {
  try {
    const a = req.headers && (req.headers.authorization || req.headers.Authorization);
    if (!a) { req.userId = null; return next(); }
    const m = String(a).split(' ');
    if (m.length !== 2) { req.userId = null; return next(); }
    const scheme = m[0];
    const token = m[1];
    if (!/^Bearer$/i.test(scheme)) { req.userId = null; return next(); }
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.userId = payload && (payload.userId || payload.id) ? String(payload.userId || payload.id) : null;
    } catch (e) {
      req.userId = null;
    }
    return next();
  } catch (err) {
    req.userId = null;
    return next();
  }
}

// Admin guard
async function adminOnly(req, res, next) {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
    const u = await User.findById(req.userId).select('role');
    if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    return next();
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}

// Moderator guard
async function moderatorOnly(req, res, next) {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
    const u = await User.findById(req.userId).select('role');
    if (!u || (u.role !== 'moderator' && u.role !== 'admin')) {
      return res.status(403).json({ error: 'Moderator access required' });
    }
    return next();
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}

// XP System
import { XP_RATES, getLevelFromXP, getXPToNextLevel, getProgressPercent } from './utils/xpSystem.js';

// VIP System
import { VIP_TIERS, getVipTier, getVipTierInfo, calculateRakeback, applyVipWithdrawalDiscount, updateRollingWager, addDailyWager, getVipProgress } from './utils/vipSystem.js';

// Award rakeback to Dividends balance based on VIP tier
async function awardRakeback(userId, wagerCents) {
  try {
    const user = await User.findById(userId);
    if (!user) return 0;

    // Update rolling wager and VIP tier
    user.wagerHistory = addDailyWager(user.wagerHistory || [], wagerCents);
    const { wagerLast30Days, cleanedHistory } = updateRollingWager(user.wagerHistory);
    user.wagerHistory = cleanedHistory;
    user.wagerLast30Days = wagerLast30Days;

    // Calculate new VIP tier
    const newTier = getVipTier(wagerLast30Days, user.diamondApproved);
    if (user.vipTier !== newTier) {
      console.log(`[VIP] User ${user.username} tier changed: ${user.vipTier} -> ${newTier}`);
      if (newTier !== 'none' && !user.vipSince) {
        user.vipSince = new Date();
      }
    }
    user.vipTier = newTier;

    // Calculate and award rakeback to Dividends
    const rakeback = calculateRakeback(wagerCents, newTier);
    if (rakeback > 0) {
      user.dividends = (user.dividends || 0) + rakeback;
      user.totalDividendsEarned = (user.totalDividendsEarned || 0) + rakeback;
      console.log(`[VIP] User ${user.username} earned ${(rakeback / 100).toFixed(2)} dividends (${newTier} tier)`);
    }

    await user.save();
    return rakeback;
  } catch (err) {
    console.error('[VIP] awardRakeback error:', err);
    return 0;
  }
}

async function awardXp(userId, type, amount = 0, extra = {}) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error(`[XP] User ${userId} not found`);
      return { leveledUp: false, newLevel: 1, xpAwarded: 0 };
    }

    let xpAwarded = 0;
    switch (type) {
      case 'usdWager':
        xpAwarded = Math.floor((amount / 100) * XP_RATES.usdWager);
        break;
      case 'gcScWager':
        xpAwarded = Math.floor((amount / 100) * XP_RATES.gcScWager);
        break;
      case 'likeGiven':
        xpAwarded = XP_RATES.likeGiven;
        break;
      case 'likeReceived':
        xpAwarded = XP_RATES.likeReceived;
        break;
      case 'dislikeReceived':
        xpAwarded = XP_RATES.dislikeReceived;
        break;
      case 'divideCreated':
        xpAwarded = XP_RATES.divideCreated;
        break;
      case 'dividePot100':
        xpAwarded = XP_RATES.dividePot100;
        break;
      case 'dividePot1000':
        xpAwarded = XP_RATES.dividePot1000;
        break;
      default:
        console.error(`[XP] Unknown type: ${type}`);
        return { leveledUp: false, newLevel: user.level, xpAwarded: 0 };
    }

    if (xpAwarded <= 0) return { leveledUp: false, newLevel: user.level, xpAwarded: 0 };

    const oldLevel = user.level;

    user.xp = (user.xp || 0) + xpAwarded;
    user.xpThisWeek = (user.xpThisWeek || 0) + xpAwarded;
    user.xpThisMonth = (user.xpThisMonth || 0) + xpAwarded;

    const levelData = getLevelFromXP(user.xp);
    user.level = levelData.level;
    user.currentBadge = levelData.badgeName;

    if (type === 'usdWager') {
      user.totalWageredUsd = (user.totalWageredUsd || 0) + amount;
    }

    await user.save();

    await UserEngagement.create({
      userId: user._id,
      type,
      xpAwarded,
      metadata: extra,
      timestamp: new Date()
    });

    const leveledUp = user.level > oldLevel;

    if (leveledUp) {
      console.log(`[XP] User ${userId} leveled up! ${oldLevel} → ${user.level}`);
    }

    return { leveledUp, newLevel: user.level, xpAwarded };
  } catch (err) {
    console.error('[XP] Error awarding XP:', err);
    return { leveledUp: false, newLevel: 1, xpAwarded: 0 };
  }
}

/**
 * Ensure user has a NOWPayments custody customer account (sub-wallet)
 * Non-blocking: failures are logged but don't break the flow
 * @param {Object} user - Mongoose user document
 * @returns {string|null} - Customer ID if successful, null if failed
 */
async function ensureNowPaymentsCustomer(user) {
  try {
    // Skip if already has customer ID
    if (user.nowPaymentsCustomerId) {
      return user.nowPaymentsCustomerId;
    }

    // Skip if Sub-Partner API credentials not configured
    if (!nowPayments.isSubPartnerApiAvailable()) {
      console.log('[Payments] Sub-Partner API not configured, skipping customer creation');
      return null;
    }

    const customer = await nowPayments.createCustomer({
      name: user.username,
      externalId: user._id.toString()
    });

    if (customer && customer.id) {
      user.nowPaymentsCustomerId = customer.id;
      await user.save();
      console.log(`[Payments] Created NOWPayments customer ${customer.id} for user ${user.username}`);
      return customer.id;
    }

    return null;
  } catch (err) {
    console.error(`[Payments] Failed to create NOWPayments customer for ${user.username}:`, err.message);
    return null; // Non-blocking failure
  }
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later'
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100
});

const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many 2FA attempts, please try again later'
});

app.use('/login', authLimiter);
app.use('/register', authLimiter);
app.use('/api/', generalLimiter);

// Mount payment routes
app.use('/api/payments', paymentRoutes);

// File upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ==========================================
// AUTH ROUTES
// ==========================================

app.post('/register', async (req, res) => {
  try {
    const { username, email, password, adminCode } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = (adminCode === process.env.ADMIN_CODE) ? 'admin' : 'user';

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      balance: 0, // Starting balance in cents (no free money)
      role,
      createdAt: new Date()
    });

    // Create NOWPayments customer sub-wallet (fire and forget - don't slow down registration)
    ensureNowPaymentsCustomer(user).catch(err => {
      console.error('[Register] Background customer creation failed:', err.message);
    });

    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      userId: user._id.toString(),
      balance: toDollars(user.balance),
      role: user.role
    });
  } catch (err) {
    console.error('POST /register', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = email || username; // Accept either email or username

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Missing email/username or password' });
    }

    // Try to find user by email or username
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      return res.json({ requires2FA: true, requiresTwoFactor: true, userId: user._id.toString() });
    }

    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      userId: user._id.toString(),
      balance: toDollars(user.balance),
      role: user.role
    });
  } catch (err) {
    console.error('POST /login', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, token: tfaToken } = req.body;
    if (!userId || !tfaToken) {
      return res.status(400).json({ error: 'Missing userId or token' });
    }

    const user = await User.findById(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: tfaToken,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      userId: user._id.toString(),
      balance: toDollars(user.balance),
      role: user.role
    });
  } catch (err) {
    console.error('POST /verify-2fa', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public treasury endpoint - shows site money in play to all users
app.get('/api/treasury', async (req, res) => {
  try {
    // Calculate total user balances
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalDeposited: { $sum: '$totalDeposited' },
          totalWithdrawn: { $sum: '$totalWithdrawn' },
          totalBalance: { $sum: '$balance' }
        }
      }
    ]);

    const totalDeposited = userStats.length > 0 ? (userStats[0].totalDeposited || 0) : 0;
    const totalWithdrawn = userStats.length > 0 ? (userStats[0].totalWithdrawn || 0) : 0;
    const totalUserBalances = userStats.length > 0 ? (userStats[0].totalBalance || 0) : 0;

    // Calculate money in active Divide pots (pot is stored in dollars, convert to cents)
    const activeDivides = await Divide.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, totalPot: { $sum: '$pot' } } }
    ]);
    const activePotsInDollars = activeDivides.length > 0 ? (activeDivides[0].totalPot || 0) : 0;
    const activePotsInCents = Math.round(activePotsInDollars * 100);

    // Get simulated treasury from House (for showcase purposes)
    const house = await House.findOne({ id: 'global' });
    const simulatedTreasury = house?.simulatedTreasury || 0;

    // Treasury = User Balances + Money in Active Pots + Simulated (both in cents, excludes house revenue)
    const treasury = totalUserBalances + activePotsInCents + simulatedTreasury;

    res.json({
      treasury: toDollars(treasury),
      totalDeposited: toDollars(totalDeposited),
      totalWithdrawn: toDollars(totalWithdrawn),
      totalUserBalances: toDollars(totalUserBalances),
      activePots: activePotsInDollars  // Already in dollars
    });
  } catch (err) {
    console.error('/api/treasury error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/me', auth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.userId).select('-password -twoFactorSecret');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update rolling wager and VIP tier on each request
    const { wagerLast30Days } = updateRollingWager(user.wagerHistory || []);
    const currentVipTier = getVipTier(wagerLast30Days, user.diamondApproved);
    const vipTierInfo = getVipTierInfo(currentVipTier);
    const vipProgress = getVipProgress(wagerLast30Days, currentVipTier);

    res.json({
      ...user.toObject(),
      balance: toDollars(user.balance),
      dividends: toDollars(user.dividends || 0),
      totalDividendsEarned: toDollars(user.totalDividendsEarned || 0),
      wagered: toDollars(user.wagered || 0),
      totalWinnings: toDollars(user.totalWinnings || 0),
      totalWon: toDollars(user.totalWon || 0),
      totalDeposited: toDollars(user.totalDeposited || 0),
      totalWithdrawn: toDollars(user.totalWithdrawn || 0),
      wagerRequirement: toDollars(user.wagerRequirement || 0),
      totalWageredUsd: toDollars(user.totalWageredUsd || 0),
      wagerLast30Days: toDollars(wagerLast30Days),
      vipTier: currentVipTier,
      vipTierInfo,
      vipProgress: {
        ...vipProgress,
        remaining: toDollars(vipProgress.remaining),
      },
    });
  } catch (err) {
    console.error('GET /api/me', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// SECURITY ENDPOINTS (2FA, Password Change)
// ==========================================

// POST /api/security/change-password - Change password
app.post('/api/security/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing current or new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/security/2fa/setup - Generate 2FA secret and QR code
app.post('/api/security/2fa/setup', auth, twoFactorLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `The Divide (${user.username})`,
      issuer: 'TheDivide.us'
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Save secret temporarily (not enabled yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/security/2fa/enable - Enable 2FA after verifying token
app.post('/api/security/2fa/enable', auth, twoFactorLimiter, async (req, res) => {
  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({ error: 'Missing verification token' });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: 'No 2FA setup in progress' });
    }

    // Verify token
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
    }

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = hashedBackupCodes;
    await user.save();

    res.json({
      success: true,
      backupCodes // Send unhashed codes to user (show once only!)
    });
  } catch (err) {
    console.error('2FA enable error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/security/2fa/disable - Disable 2FA
app.post('/api/security/2fa/disable', auth, twoFactorLimiter, async (req, res) => {
  try {
    const { password, token } = req.body || {};

    if (!password) {
      return res.status(400).json({ error: 'Password required to disable 2FA' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    // Verify 2FA token if enabled
    if (user.twoFactorEnabled && token) {
      const isTokenValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (!isTokenValid) {
        return res.status(400).json({ error: 'Invalid 2FA code' });
      }
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = '';
    user.twoFactorBackupCodes = [];
    await user.save();

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (err) {
    console.error('2FA disable error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/security/2fa/status - Check if 2FA is enabled
app.get('/api/security/2fa/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('twoFactorEnabled');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ enabled: user.twoFactorEnabled || false });
  } catch (err) {
    console.error('2FA status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// PASSWORD RESET
// ==========================================

// POST /api/auth/forgot-password - Request password reset email
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { username } = req.body || {};

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = await User.findOne({ username: username.trim() });

    // Always return success to prevent username enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that username exists, a reset link has been sent to the associated email' });
    }

    // Check if user has an email
    if (!user.email) {
      return res.json({ success: true, message: 'If that username exists, a reset link has been sent to the associated email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save hashed token and expiration (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL || 'https://thedivide.us'}/reset-password?token=${resetToken}`;

    try {
      await emailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: 'Password Reset Request - The Divide',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #00ffff;">Password Reset Request</h2>
            <p>Hi ${user.username},</p>
            <p>You requested to reset your password. Click the link below to create a new password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #00ffff; color: #000; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 16px 0;">
              Reset Password
            </a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">The Divide - Skill-Based Social Strategy Game</p>
          </div>
        `
      });

      console.log(`Password reset email sent to ${user.email} for user ${user.username}`);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Don't expose email errors to client
    }

    res.json({ success: true, message: 'If that username exists, a reset link has been sent to the associated email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password - Reset password with token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// DISCORD OAUTH FOR ACCOUNT LINKING
// ==========================================

// Step 1: Redirect to Discord OAuth (Account Linking)
app.get('/auth/discord', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || 'https://thedivide.us/auth/discord/callback');
  const scope = encodeURIComponent('identify');

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.redirect(discordAuthUrl);
});

// Step 2: Handle Discord OAuth callback
app.get('/auth/discord/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?error=discord_auth_failed`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI || 'https://thedivide.us/auth/discord/callback',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Discord OAuth error:', tokenData);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?error=discord_token_failed`);
    }

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const discordUser = await userResponse.json();

    if (!discordUser.id) {
      console.error('Failed to get Discord user:', discordUser);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?error=discord_user_failed`);
    }

    // Build Discord avatar URL
    let discordAvatarUrl = null;
    if (discordUser.avatar) {
      const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
      discordAvatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${ext}?size=256`;
    }

    // Create a temporary token to link this Discord account to website account
    const linkToken = jwt.sign(
      {
        discordId: discordUser.id,
        discordUsername: `${discordUser.username}#${discordUser.discriminator}`,
        discordAvatar: discordAvatarUrl,
        type: 'discord_link'
      },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    // Redirect back to frontend with the link token
    res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}/link-discord?discord_link=${linkToken}`);
  } catch (error) {
    console.error('Discord OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?error=discord_oauth_error`);
  }
});

// Step 3: Link Discord account to website account
app.post('/api/link-discord', auth, async (req, res) => {
  try {
    const { linkToken } = req.body;

    if (!linkToken) {
      return res.status(400).json({ error: 'Link token required' });
    }

    // Verify the link token
    let linkData;
    try {
      linkData = jwt.verify(linkToken, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired link token' });
    }

    if (linkData.type !== 'discord_link') {
      return res.status(400).json({ error: 'Invalid link token type' });
    }

    // Update user with Discord info
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.discordId = linkData.discordId;
    user.discordUsername = linkData.discordUsername;
    // Set profile image from Discord if user doesn't have one or wants to update
    if (linkData.discordAvatar) {
      user.profileImage = linkData.discordAvatar;
    }
    await user.save();

    res.json({
      success: true,
      discordId: linkData.discordId,
      discordUsername: linkData.discordUsername,
      profileImage: user.profileImage
    });
  } catch (error) {
    console.error('Link Discord error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// DISCORD OAUTH FOR LOGIN/SIGNUP
// ==========================================

// Step 1: Redirect to Discord OAuth for login
app.get('/auth/discord/login', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI_LOGIN || 'https://thedivide.us/auth/discord/login/callback');
  const scope = encodeURIComponent('identify email');

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.redirect(discordAuthUrl);
});

// Step 2: Handle Discord login callback
app.get('/auth/discord/login/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?error=discord_login_failed`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI_LOGIN || 'https://thedivide.us/auth/discord/login/callback',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Discord login error:', tokenData);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?error=discord_token_failed`);
    }

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const discordUser = await userResponse.json();

    if (!discordUser.id) {
      console.error('Failed to get Discord user:', discordUser);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?error=discord_user_failed`);
    }

    // Check if user exists with this Discord ID
    let user = await User.findOne({ discordId: discordUser.id });

    // Build Discord avatar URL
    // Discord CDN: https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png
    let discordAvatarUrl = null;
    if (discordUser.avatar) {
      const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
      discordAvatarUrl = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${ext}?size=256`;
    }

    if (!user) {
      // Create new user
      const username = discordUser.username + '_' + discordUser.discriminator;
      user = new User({
        username,
        email: discordUser.email || '',
        password: crypto.randomBytes(32).toString('hex'), // Random password (they'll use Discord login)
        balance: 0, // Starting balance in cents (no free money)
        discordId: discordUser.id,
        discordUsername: `${discordUser.username}#${discordUser.discriminator}`,
        profileImage: discordAvatarUrl // Use Discord avatar as profile image
      });
      await user.save();
      console.log(`✓ New user created via Discord: ${username} (${discordUser.id})`);

      // Create NOWPayments customer sub-wallet (fire and forget)
      ensureNowPaymentsCustomer(user).catch(err => {
        console.error('[Discord OAuth] Background customer creation failed:', err.message);
      });;
    } else {
      // Update existing user's Discord info and avatar on each login
      user.discordUsername = `${discordUser.username}#${discordUser.discriminator}`;
      if (discordAvatarUrl) {
        user.profileImage = discordAvatarUrl;
      }
      await user.save();
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?discord_login=${token}`);
  } catch (error) {
    console.error('Discord login error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?error=discord_login_error`);
  }
});

// ==========================================
// GOOGLE OAUTH FOR LOGIN/SIGNUP
// ==========================================

// Step 1: Redirect to Google OAuth for login
app.get('/auth/google/login', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.GOOGLE_REDIRECT_URI || 'https://thedivide.us/auth/google/login/callback');
  const scope = encodeURIComponent('openid email profile');

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.redirect(googleAuthUrl);
});

// Step 2: Handle Google login callback
app.get('/auth/google/login/callback', async (req, res) => {
  const { code, error } = req.query;

  if (!code) {
    console.error('❌ No authorization code received from Google');
    return res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?error=google_login_failed`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'https://thedivide.us/auth/google/login/callback',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('❌ Google login error:', tokenData);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?error=google_token_failed`);
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = await userResponse.json();

    if (!googleUser.id) {
      console.error('❌ Failed to get Google user:', googleUser);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?error=google_user_failed`);
    }

    // Check if user exists with this Google ID
    let user = await User.findOne({ googleId: googleUser.id });

    if (!user) {
      // Create new user
      const username = googleUser.email.split('@')[0] + '_google';
      user = new User({
        username,
        email: googleUser.email,
        password: crypto.randomBytes(32).toString('hex'), // Random password (they'll use Google login)
        balance: 0, // Starting balance in cents (no free money)
        googleId: googleUser.id,
        googleEmail: googleUser.email
      });
      await user.save();
      console.log(`✓ New user created via Google: ${username} (${googleUser.email})`);

      // Create NOWPayments customer sub-wallet (fire and forget)
      ensureNowPaymentsCustomer(user).catch(err => {
        console.error('[Google OAuth] Background customer creation failed:', err.message);
      });
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?google_login=${token}`);
  } catch (error) {
    console.error('❌ Google login error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'https://thedivide.us'}?error=google_login_error`);
  }
});

// ==========================================
// DEPOSIT/WITHDRAW & BALANCE
// ==========================================

app.post("/add-funds", auth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (typeof amount !== 'number' || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Add funds (convert dollars to cents)
    const amountCents = Math.round(amount * 100);
    user.balance += amountCents;
    user.totalDeposited = (user.totalDeposited || 0) + amountCents;
    // Add to wager requirement: user must wager this amount 1x before withdrawal
    user.wagerRequirement = (user.wagerRequirement || 0) + amountCents;
    await user.save();

    // Create notification for the user
    await Notification.create({
      userId: user._id,
      type: 'deposit',
      title: 'Deposit Received! 💰',
      message: `$${amount.toFixed(2)} has been added to your balance. Your new balance is $${toDollars(user.balance)}.`,
      icon: '💰',
      link: '/wallet'
    });

    console.log(`[ADD FUNDS] User ${user.username} added $${amount}, new balance: $${toDollars(user.balance)}, wagerReq: $${toDollars(user.wagerRequirement)}`);

    res.json({ balance: toDollars(user.balance) });
  } catch (err) {
    console.error('[POST /add-funds] error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/withdraw", auth, async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const amountCents = Math.round(amount * 100);

    // Check balance
    if (user.balance < amountCents) {
      return res.status(400).json({
        success: false,
        error: "Insufficient balance"
      });
    }

    // Check wager requirement
    if ((user.wagerRequirement || 0) > 0) {
      return res.status(400).json({
        success: false,
        error: `You must wager $${toDollars(user.wagerRequirement)} before withdrawing (1x playthrough requirement)`
      });
    }

    // TIERED WITHDRAWAL FEE STRUCTURE
    // - Under $1,000 → 2%
    // - $1,000 – $9,999 → 1.5%
    // - $10,000 – $49,999 → 1%
    // - $50,000 – $249,999 → 0.5%
    // - $250,000+ → FREE
    let baseFeePercent = 0;
    if (amount < 1000) {
      baseFeePercent = 0.02;        // 2%
    } else if (amount < 10000) {
      baseFeePercent = 0.015;       // 1.5%
    } else if (amount < 50000) {
      baseFeePercent = 0.01;        // 1%
    } else if (amount < 250000) {
      baseFeePercent = 0.005;       // 0.5%
    } else {
      baseFeePercent = 0;           // FREE for $250k+
    }

    // Apply VIP discount to withdrawal fee
    const vipTier = user.vipTier || 'none';
    const feePercent = applyVipWithdrawalDiscount(baseFeePercent, vipTier);
    const vipDiscount = baseFeePercent > 0 ? Math.round((1 - feePercent / baseFeePercent) * 100) : 0;

    const feeAmount = amount * feePercent;
    const feeCents = Math.round(feeAmount * 100);
    const netAmount = amount - feeAmount;
    const netCents = amountCents - feeCents;

    // Process withdrawal (deduct full amount from user)
    user.balance -= amountCents;
    user.totalWithdrawn = (user.totalWithdrawn || 0) + netCents; // Track net withdrawn
    await user.save();

    // Track withdrawal fee as house revenue
    if (feeCents > 0) {
      await House.findOneAndUpdate(
        { id: 'global' },
        { $inc: { houseTotal: feeCents, withdrawalFees: feeCents } },
        { upsert: true }
      );

      await Ledger.create({
        type: 'withdrawal_fee',
        amount: feeAmount,
        userId: req.userId,
        meta: {
          grossAmount: amount,
          feePercent: feePercent * 100,
          feeAmount,
          netAmount
        }
      });
    }

    // Log the withdrawal
    await Ledger.create({
      type: 'withdrawal',
      amount: netAmount,
      userId: req.userId,
      meta: {
        grossAmount: amount,
        feePercent: feePercent * 100,
        feeAmount,
        netAmount
      }
    });

    console.log(`[WITHDRAW] User ${user.username} withdrew $${amount} (fee: $${feeAmount.toFixed(2)}, net: $${netAmount.toFixed(2)}), new balance: $${toDollars(user.balance)}`);

    res.json({
      success: true,
      balance: toDollars(user.balance),
      grossAmount: amount,
      feePercent: feePercent * 100,
      feeAmount: Number(feeAmount.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
      message: feeAmount > 0
        ? `Withdrew $${netAmount.toFixed(2)} (${(feePercent * 100).toFixed(1)}% fee: $${feeAmount.toFixed(2)})`
        : `Successfully withdrew $${amount} (no fee for $250k+ withdrawals)`
    });
  } catch (err) {
    console.error('[POST /api/withdraw] error:', err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET withdrawal fee info (for frontend display)
app.get("/api/withdrawal-fees", (req, res) => {
  res.json({
    tiers: [
      { min: 0, max: 999.99, feePercent: 2, label: 'Under $1,000' },
      { min: 1000, max: 9999.99, feePercent: 1.5, label: '$1k – $10k' },
      { min: 10000, max: 49999.99, feePercent: 1, label: '$10k – $50k' },
      { min: 50000, max: 249999.99, feePercent: 0.5, label: '$50k – $250k' },
      { min: 250000, max: null, feePercent: 0, label: '$250k+' },
    ],
    description: 'Withdrawal fees cover network + processing costs. Higher withdrawals = lower fees.',
    vipNote: 'VIP members may qualify for reduced or zero fees.'
  });
});

// GET VIP tiers info
app.get("/api/vip/tiers", (req, res) => {
  res.json(VIP_TIERS);
});

// GET user's VIP status
app.get("/api/vip/status", auth, async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { wagerLast30Days } = updateRollingWager(user.wagerHistory || []);
    const currentTier = getVipTier(wagerLast30Days, user.diamondApproved);
    const tierInfo = getVipTierInfo(currentTier);
    const progress = getVipProgress(wagerLast30Days, currentTier);

    res.json({
      tier: currentTier,
      tierInfo,
      wagerLast30Days: toDollars(wagerLast30Days),
      dividends: toDollars(user.dividends || 0),
      totalDividendsEarned: toDollars(user.totalDividendsEarned || 0),
      progress: {
        ...progress,
        remaining: toDollars(progress.remaining),
      },
      diamondApproved: user.diamondApproved,
      vipSince: user.vipSince,
    });
  } catch (err) {
    console.error('[GET /api/vip/status]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST claim dividends (transfer to main balance)
app.post("/api/vip/claim-dividends", auth, async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const dividendsCents = user.dividends || 0;
    if (dividendsCents <= 0) {
      return res.status(400).json({ error: 'No dividends to claim' });
    }

    // Transfer dividends to main balance
    user.balance += dividendsCents;
    user.dividends = 0;
    await user.save();

    await Ledger.create({
      type: 'dividends_claimed',
      amount: toDollars(dividendsCents),
      userId: req.userId,
      meta: { vipTier: user.vipTier }
    });

    console.log(`[VIP] User ${user.username} claimed $${toDollars(dividendsCents)} dividends`);

    res.json({
      success: true,
      claimed: toDollars(dividendsCents),
      newBalance: toDollars(user.balance),
      message: `Claimed $${toDollars(dividendsCents)} from Dividends!`
    });
  } catch (err) {
    console.error('[POST /api/vip/claim-dividends]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// DIVIDES ROUTES
// ==========================================

// GET list of divides
app.get('/Divides', async (req, res) => {
  if (req.accepts('html') && !req.accepts('json')) {
    return res.sendFile(path.join(__dirname, 'divide-frontend-fresh', 'dist', 'index.html'));
  }
  const acceptHeader = req.get('Accept') || '';
  if (acceptHeader.includes('text/html') && !acceptHeader.includes('application/json')) {
    return res.sendFile(path.join(__dirname, 'divide-frontend-fresh', 'dist', 'index.html'));
  }

  try {
    // Support category filtering via query parameter
    const { category } = req.query;
    const matchStage = {};
    if (category && category !== 'All') {
      matchStage.category = category;
    }

    const pipeline = [];
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }
    // Add controversy score field (dislikes - likes, higher = more controversial = sorted first)
    pipeline.push(
      { $addFields: { controversyScore: { $subtract: [{ $ifNull: ['$dislikes', 0] }, { $ifNull: ['$likes', 0] }] } } },
      // Sort: active divides by endTime (soonest first), ended by controversy (most controversial first)
      { $sort: { status: -1, controversyScore: -1, endTime: 1 } },
      {
        $lookup: {
          from: 'users',
          let: { creatorId: '$creatorId' },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$creatorId'] } } },
            { $project: { username: 1 } }
          ],
          as: 'creator'
        }
      },
      { $addFields: { creatorUsername: { $ifNull: [{ $arrayElemAt: ['$creator.username', 0] }, null] } } },
      { $project: { creator: 0 } }
    );

    const list = await Divide.aggregate(pipeline).allowDiskUse(true);
    // SECURITY: Sanitize all divides to hide vote data for active ones
    res.json(sanitizeDivides(list) || []);
  } catch (e) {
    console.error('GET /Divides error', e);
    try {
      const { category } = req.query;
      const query = {};
      if (category && category !== 'All') {
        query.category = category;
      }
      const fallback = await Divide.find(query).sort({ endTime: 1 }).lean();
      // SECURITY: Sanitize fallback response too
      return res.json(sanitizeDivides(fallback) || []);
    } catch (err) {
      console.error('GET /Divides fallback error', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

app.get('/divides', (req, res) => {
  res.sendFile(path.join(__dirname, 'divide-frontend-fresh', 'dist', 'index.html'));
});

// CREATE divide (admin-only)
app.post('/Divides', auth, adminOnly, async (req, res) => {
  try {
    const {
      title,
      optionA,
      optionB,
      imageA,
      imageB,
      soundA,
      soundB,
      category = 'Other',
      durationValue = 10,
      durationUnit = 'minutes'
    } = req.body || {};

    if (!title || !optionA || !optionB) return res.status(400).json({ error: 'Missing required fields' });

    const now = new Date();
    let ms = Number(durationValue) || 0;
    if (isNaN(ms) || ms <= 0) ms = 10;
    switch ((durationUnit || '').toLowerCase()) {
      case 'minutes': ms = ms * 60 * 1000; break;
      case 'hours': ms = ms * 60 * 60 * 1000; break;
      case 'days': ms = ms * 24 * 60 * 60 * 1000; break;
      default: ms = ms * 60 * 1000; break;
    }
    const endTime = new Date(now.getTime() + ms);

    const shortId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);

    const doc = new Divide({
      id: shortId,
      title,
      optionA,
      optionB,
      imageA: imageA || '',
      imageB: imageB || '',
      soundA: soundA || '',
      soundB: soundB || '',
      category,
      endTime,
      // Use correct model field names
      shortsA: 0,
      shortsB: 0,
      totalShorts: 0,
      pot: 0,
      status: 'active',
      shorts: [],
      creatorId: req.userId,
      createdAt: now
    });

    await doc.save();
    // SECURITY: Sanitize new divide data before emitting
    io.emit('newDivide', sanitizeDivide(doc));
    res.json(sanitizeDivide(doc));
  } catch (err) {
    console.error('POST /Divides', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/divides', auth, adminOnly, async (req, res) => {
  req.url = '/Divides';
  return app._router.handle(req, res);
});

// CREATE user divide
app.post('/Divides/create-user', auth, async (req, res) => {
  try {
    const {
      title,
      optionA,
      optionB,
      bet = 1,
      side,
      category = 'Other',
      durationValue = 10,
      durationUnit = 'minutes'
    } = req.body || {};

    if (!title || !optionA || !optionB) return res.status(400).json({ error: 'Missing required fields' });
    if (!['A', 'B'].includes(side)) return res.status(400).json({ error: 'Invalid side' });
    if (typeof bet !== 'number' || bet <= 0) return res.status(400).json({ error: 'Invalid bet amount' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const betCents = toCents(bet);
    if (user.balance < betCents) return res.status(400).json({ error: 'Insufficient balance' });

    user.balance = user.balance - betCents;
    if (user.wagerRequirement > 0) {
      user.wagerRequirement = Math.max(0, user.wagerRequirement - betCents);
    }
    await user.save();

    const now = new Date();
    let ms = Number(durationValue) || 0;
    if (isNaN(ms) || ms <= 0) ms = 10;
    switch ((durationUnit || '').toLowerCase()) {
      case 'minutes': ms = ms * 60 * 1000; break;
      case 'hours': ms = ms * 60 * 60 * 1000; break;
      case 'days': ms = ms * 24 * 60 * 60 * 1000; break;
      default: ms = ms * 60 * 1000; break;
    }
    const endTime = new Date(now.getTime() + ms);

    const shortId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);

    const doc = new Divide({
      id: shortId,
      title,
      optionA,
      optionB,
      imageA: '',
      imageB: '',
      soundA: '',
      soundB: '',
      category,
      endTime,
      // Use correct model field names
      shortsA: side === 'A' ? bet : 0,
      shortsB: side === 'B' ? bet : 0,
      totalShorts: bet,
      pot: bet,
      status: 'active',
      shorts: [{ userId: req.userId, side, shortAmount: bet, isFree: false, bet }],
      creatorId: req.userId,
      creatorBet: bet,
      creatorSide: side,
      isUserCreated: true,
      createdAt: now,
      // Initialize vote history with creator's first bet
      voteHistory: [{
        timestamp: now,
        username: user.username,
        userId: req.userId,
        side: side,
        amount: bet,
        shortsA: side === 'A' ? bet : 0,
        shortsB: side === 'B' ? bet : 0,
        pot: bet,
      }]
    });

    await doc.save();

    await Ledger.create({
      type: 'divides_bet',
      amount: Number(bet),
      userId: req.userId,
      divideId: doc.id || doc._id,
      meta: { side }
    });

    await awardXp(req.userId, 'divideCreated', 0, { divideId: doc.id || doc._id, title, pot: bet });
    await awardXp(req.userId, 'usdWager', betCents, { divideId: doc.id || doc._id, side, amount: bet });

    // Award VIP rakeback for the initial bet
    await awardRakeback(req.userId, betCents);

    // SECURITY: Sanitize new divide data before emitting
    io.emit('newDivide', sanitizeDivide(doc));
    res.json(sanitizeDivide(doc));
  } catch (err) {
    console.error('POST /Divides/create-user', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/divides/create-user', auth, async (req, res) => {
  req.url = '/Divides/create-user';
  return app._router.handle(req, res);
});

// VOTE on divide
app.post('/divides/vote', auth, async (req, res) => {
  try {
    const { divideId: rawDivideId, side, boostAmount = 0, bet = 0, id: altId, _id: alt_id } = req.body;
    const divideId = rawDivideId || altId || alt_id;
    // Accept both 'bet' (from VoteWithBetModal) and 'boostAmount' (legacy)
    const actualBetAmount = bet || boostAmount;
    if (!['A', 'B'].includes(side)) return res.status(400).json({ error: 'Invalid side' });

    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide) {
      return res.status(400).json({ error: 'Divide not found' });
    }
    if (divide.status !== 'active') {
      return res.status(400).json({ error: 'Divide not active' });
    }

    if (divide.isUserCreated && divide.creatorId === req.userId && divide.creatorSide && side !== divide.creatorSide) {
      return res.status(400).json({ error: 'Creator is locked to their chosen side' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!actualBetAmount || actualBetAmount <= 0) {
      return res.status(400).json({ error: 'Bet amount required (minimum $0.01)' });
    }

    let shortAmount = actualBetAmount;
    let boostCents = toCents(actualBetAmount);

    if (user.balance < boostCents) return res.status(400).json({ error: 'Insufficient balance' });
    user.balance = Math.max(0, user.balance - boostCents);

    if (user.wagerRequirement > 0) {
      user.wagerRequirement = Math.max(0, user.wagerRequirement - boostCents);
    }

    // Use 'shorts' array (model field name) - find existing short position
    const existing = divide.shorts.find(s => s.userId === req.userId);
    if (existing) {
      if (divide.isUserCreated && divide.creatorId === req.userId && divide.creatorSide && side !== divide.creatorSide) {
        return res.status(400).json({ error: 'Creator is locked to their chosen side' });
      } else {
        existing.shortAmount = (existing.shortAmount || 0) + shortAmount;
        existing.side = side;
      }
    } else {
      divide.shorts.push({ userId: req.userId, side, shortAmount: shortAmount });
    }

    // Use model field names: shortsA, shortsB, totalShorts
    divide.totalShorts = (divide.totalShorts || 0) + shortAmount;
    if (side === 'A') divide.shortsA = (divide.shortsA || 0) + shortAmount;
    else divide.shortsB = (divide.shortsB || 0) + shortAmount;
    divide.pot = Number((divide.pot + actualBetAmount).toFixed(2));

    // Track vote history for chart + transparency (revealed after divide ends)
    if (!divide.voteHistory) divide.voteHistory = [];
    divide.voteHistory.push({
      timestamp: new Date(),
      username: user.username,
      userId: req.userId,
      side: side,
      amount: actualBetAmount,
      shortsA: divide.shortsA,
      shortsB: divide.shortsB,
      pot: divide.pot,
    });

    user.totalBets = (user.totalBets || 0) + 1;
    user.wagered = (user.wagered || 0) + boostCents;

    await awardXp(req.userId, 'usdWager', boostCents, { divideId: divide.id || divide._id, side, amount: actualBetAmount });

    await divide.save();
    await user.save();

    // Award VIP rakeback to Dividends balance (AFTER user.save to avoid race condition)
    await awardRakeback(req.userId, boostCents);

    await Ledger.create({
      type: 'divides_bet',
      amount: Number(actualBetAmount),
      userId: req.userId,
      divideId: divide.id || divide._id,
      meta: { side }
    });

    // SECURITY: Emit sanitized divide data (hides short counts for active divides)
    io.emit('voteUpdate', sanitizeDivide(divide));
    // SECURITY: Only return pot (total volume), not individual short counts
    res.json({ balance: toDollars(user.balance), pot: divide.pot });
  } catch (err) {
    console.error('POST /divides/vote ERROR:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Alias for capital D route
app.post('/Divides/vote', auth, async (req, res) => {
  try {
    const { divideId: rawDivideId, side, boostAmount = 0, bet = 0, id: altId, _id: alt_id } = req.body;
    const divideId = rawDivideId || altId || alt_id;
    // Accept both 'bet' (from VoteWithBetModal) and 'boostAmount' (legacy)
    const actualBetAmount = bet || boostAmount;
    if (!['A', 'B'].includes(side)) return res.status(400).json({ error: 'Invalid side' });

    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide) {
      return res.status(400).json({ error: 'Divide not found' });
    }
    if (divide.status !== 'active') {
      return res.status(400).json({ error: 'Divide not active' });
    }

    if (divide.isUserCreated && divide.creatorId === req.userId && divide.creatorSide && side !== divide.creatorSide) {
      return res.status(400).json({ error: 'Creator is locked to their chosen side' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!actualBetAmount || actualBetAmount <= 0) {
      return res.status(400).json({ error: 'Bet amount required (minimum $0.01)' });
    }

    let shortAmount = actualBetAmount;
    let boostCents = toCents(actualBetAmount);

    if (user.balance < boostCents) return res.status(400).json({ error: 'Insufficient balance' });
    user.balance = Math.max(0, user.balance - boostCents);

    if (user.wagerRequirement > 0) {
      user.wagerRequirement = Math.max(0, user.wagerRequirement - boostCents);
    }

    // Use 'shorts' array (model field name) - find existing short position
    const existing = divide.shorts.find(s => s.userId === req.userId);
    if (existing) {
      if (divide.isUserCreated && divide.creatorId === req.userId && divide.creatorSide && side !== divide.creatorSide) {
        return res.status(400).json({ error: 'Creator is locked to their chosen side' });
      } else {
        existing.shortAmount = (existing.shortAmount || 0) + shortAmount;
        existing.side = side;
      }
    } else {
      divide.shorts.push({ userId: req.userId, side, shortAmount: shortAmount });
    }

    // Use model field names: shortsA, shortsB, totalShorts
    divide.totalShorts = (divide.totalShorts || 0) + shortAmount;
    if (side === 'A') divide.shortsA = (divide.shortsA || 0) + shortAmount;
    else divide.shortsB = (divide.shortsB || 0) + shortAmount;
    divide.pot = Number((divide.pot + actualBetAmount).toFixed(2));

    // Track vote history for chart + transparency (revealed after divide ends)
    if (!divide.voteHistory) divide.voteHistory = [];
    divide.voteHistory.push({
      timestamp: new Date(),
      username: user.username,
      userId: req.userId,
      side: side,
      amount: actualBetAmount,
      shortsA: divide.shortsA,
      shortsB: divide.shortsB,
      pot: divide.pot,
    });

    user.totalBets = (user.totalBets || 0) + 1;
    user.wagered = (user.wagered || 0) + boostCents;

    await awardXp(req.userId, 'usdWager', boostCents, { divideId: divide.id || divide._id, side, amount: actualBetAmount });

    await divide.save();
    await user.save();

    // Award VIP rakeback to Dividends balance (AFTER user.save to avoid race condition)
    await awardRakeback(req.userId, boostCents);

    await Ledger.create({
      type: 'divides_bet',
      amount: Number(actualBetAmount),
      userId: req.userId,
      divideId: divide.id || divide._id,
      meta: { side }
    });

    // SECURITY: Emit sanitized divide data (hides short counts for active divides)
    io.emit('voteUpdate', sanitizeDivide(divide));
    // SECURITY: Only return pot (total volume), not individual short counts
    res.json({ balance: toDollars(user.balance), pot: divide.pot });
  } catch (err) {
    console.error('POST /Divides/vote ERROR:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Creator bonus tier calculator based on their personal contribution
// Returns percentage of the 0.5% creator bonus pool they receive (0-100)
// Simplified nuclear tiers - whale-approved 2025 structure
function getCreatorBonusTier(creatorContribution) {
  if (creatorContribution >= 50000) return 100;  // $50k+ → 100% of the 0.5%
  if (creatorContribution >= 10000) return 60;   // $10k-$49,999 → 60%
  if (creatorContribution >= 1) return 30;       // $1-$9,999 → 30%
  return 0;                                       // $0 → 0% (house keeps all)
}

// END divide helper function
// ═══════════════════════════════════════════════════════════════════════════
// THE 50/50 CURSE - God-tier house rule (NEVER CHANGE THIS)
// Perfect 50/50 = House takes 50% of pot, both sides split remaining 50%
// Everyone loses half. No exceptions. Maximum rage. Maximum profit.
// "50/50 curse will live in degen lore forever"
// ═══════════════════════════════════════════════════════════════════════════
async function endDivideById(divideId, userId) {
  try {
    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide || divide.status !== 'active') return null;

    divide.status = 'ended';

    const shortsA = divide.shortsA || 0;
    const shortsB = divide.shortsB || 0;
    const pot = Number(divide.pot);
    const allParticipants = divide.shorts || [];
    const totalShorts = allParticipants.reduce((sum, s) => sum + (s.shortAmount || 0), 0);

    // THE 50/50 CURSE CHECK - Perfect tie detection
    const isTie = shortsA === shortsB && shortsA > 0;

    // Calculate creator's contribution for bonus calculation
    let creatorContribution = 0;
    if (divide.creatorId) {
      const creatorShort = allParticipants.find(s => s.userId === divide.creatorId);
      if (creatorShort) {
        creatorContribution = creatorShort.shortAmount || 0;
      }
    }

    // Get creator's tier percentage (0-100)
    const creatorTierPercent = getCreatorBonusTier(creatorContribution);

    // ═══════════════════════════════════════════════════════════════════
    // 💀 THE 50/50 CURSE 💀
    // House eats half, everyone loses half. No exceptions.
    // PERFECT 50/50 = HOUSE TAX
    // ═══════════════════════════════════════════════════════════════════
    if (isTie) {
      divide.winnerSide = 'TIE';
      divide.loserSide = 'BOTH';
      divide.isTie = true;

      // THE CURSE: House takes 50% of the ENTIRE pot
      const houseTake = pot * 0.50;           // 50% to house (THE CURSE)
      const playerRefund = pot * 0.50;        // 50% returned to all players pro-rata

      // Creator bonus comes from house's 50% cut (0.5% of original pot)
      const creatorBonusPool = pot * 0.005;   // 0.5% of pot = creator bonus pool
      const creatorCut = (creatorBonusPool * creatorTierPercent) / 100;
      const netHouseTake = houseTake - creatorCut;  // House keeps 50% minus creator bonus

      console.log(`💀 [Divide ${divide.id}] THE 50/50 CURSE! ${shortsA} vs ${shortsB}`);
      console.log(`💀 House takes $${houseTake.toFixed(2)} (50%), players split $${playerRefund.toFixed(2)} (50%)`);
      console.log(`💀 Everyone loses half their money. No exceptions.`);

      // Track house revenue - THE BIG ONE
      await House.findOneAndUpdate(
        { id: 'global' },
        {
          $inc: {
            houseTotal: toCents(netHouseTake),
            fiftyFiftyCurse: toCents(houseTake),     // Track curse revenue separately
            fiftyFiftyCurseCount: 1                   // Count curse occurrences
          }
        },
        { upsert: true }
      );

      // Pay creator their bonus (from house's cut, not player funds)
      if (divide.creatorId && creatorCut > 0) {
        await User.findByIdAndUpdate(
          divide.creatorId,
          { $inc: { balance: toCents(creatorCut) } }
        );

        await Ledger.create({
          type: 'creator_rake',
          amount: Number(creatorCut),
          userId: divide.creatorId,
          divideId: divide.id || divide._id,
          meta: { pot, creatorCut, creatorContribution, creatorTierPercent, isTie: true, curse: true }
        });
      }

      // Distribute 50% back to ALL players pro-rata (they get half their bet back)
      for (const participant of allParticipants) {
        if (!participant.shortAmount || participant.shortAmount <= 0) continue;

        // Everyone gets back exactly half their stake
        const refund = (participant.shortAmount / totalShorts) * playerRefund;
        const refundCents = toCents(refund);

        await User.findByIdAndUpdate(participant.userId, { $inc: { balance: refundCents } });

        await Ledger.create({
          type: 'divides_curse_refund',
          amount: Number(refund),
          userId: participant.userId,
          divideId: divide.id || divide._id,
          meta: {
            side: participant.side,
            pot,
            isTie: true,
            curse: true,
            originalStake: participant.shortAmount,
            refunded: refund,
            lost: participant.shortAmount - refund  // Half their money, gone forever
          }
        });
      }

      console.log(`💀 [Divide ${divide.id}] CURSE COMPLETE: ${allParticipants.length} players lost 50% of their bets`);

    } else {
      // ═══════════════════════════════════════════════════════════════════
      // NORMAL CASE - Minority wins, majority loses (standard rules)
      // 2.5% House + 0.5% Creator Pool + 97% Winner Pool
      // ═══════════════════════════════════════════════════════════════════

      const minority = shortsA < shortsB ? 'A' : 'B';
      const winnerSide = minority;
      divide.winnerSide = winnerSide;
      divide.loserSide = winnerSide === 'A' ? 'B' : 'A';
      divide.isTie = false;

      const winners = allParticipants.filter(s => s.side === winnerSide);
      const totalWinnerShorts = winners.reduce((sum, w) => sum + (w.shortAmount || 0), 0);

      // Standard rake structure:
      // - 2.5% House Fee
      // - 0.5% Creator Bonus Pool
      // - 97% Winner Pool
      const houseFee = pot * 0.025;
      const creatorBonusPool = pot * 0.005;
      const winnerPool = pot * 0.97;

      const creatorCut = (creatorBonusPool * creatorTierPercent) / 100;
      const houseFromCreatorPool = creatorBonusPool - creatorCut;
      const totalHouseCut = houseFee + houseFromCreatorPool;

      // Track house revenue
      await House.findOneAndUpdate(
        { id: 'global' },
        {
          $inc: {
            houseTotal: toCents(totalHouseCut),
            potFees: toCents(houseFee),
            creatorPoolKept: toCents(houseFromCreatorPool)
          }
        },
        { upsert: true }
      );

      // Pay creator their bonus
      if (divide.creatorId && creatorCut > 0) {
        await User.findByIdAndUpdate(
          divide.creatorId,
          { $inc: { balance: toCents(creatorCut) } }
        );

        await Ledger.create({
          type: 'creator_rake',
          amount: Number(creatorCut),
          userId: divide.creatorId,
          divideId: divide.id || divide._id,
          meta: { pot, creatorCut, creatorContribution, creatorTierPercent, creatorBonusPool, houseFromCreatorPool }
        });
      }

      // Distribute 97% winner pool to minority side
      if (totalWinnerShorts === 0) {
        // No minority = house takes winner pool
        await House.findOneAndUpdate(
          { id: 'global' },
          { $inc: { houseTotal: toCents(winnerPool), noMinorityPots: toCents(winnerPool) } },
          { upsert: true }
        );

        console.log(`[Divide ${divide.id}] No minority - house takes winner pool: $${winnerPool.toFixed(2)}`);

        await Ledger.create({
          type: 'house_no_minority',
          amount: Number(winnerPool),
          userId: null,
          divideId: divide.id || divide._id,
          meta: { pot, reason: 'All shorts on one side', winnerSide, shortsA, shortsB }
        });
      } else {
        // Normal distribution to minority winners
        for (const w of winners) {
          const share = ((w.shortAmount || 0) / totalWinnerShorts) * winnerPool;
          const shareCents = toCents(share);

          await User.findByIdAndUpdate(w.userId, { $inc: { balance: shareCents } });

          await Ledger.create({
            type: 'divides_win',
            amount: Number(share),
            userId: w.userId,
            divideId: divide.id || divide._id,
            meta: { side: winnerSide, pot, houseFee, creatorCut, winnerPool }
          });
        }
      }
    }

    await divide.save();

    io.emit('divideEnded', {
      id: divide.id,
      _id: divide._id,
      winner: divide.winnerSide,
      isTie: divide.isTie,
      curse: divide.isTie,  // 50/50 curse flag for frontend
      pot: divide.pot
    });

    return { id: divide.id, winnerSide: divide.winnerSide, isTie: divide.isTie, pot: divide.pot };
  } catch (err) {
    console.error('endDivideById error', err);
    return null;
  }
}

app.post('/divides/end', auth, async (req, res) => {
  try {
    const { divideId } = req.body;
    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide || divide.status !== 'active') return res.status(400).json({ error: 'Divide not active' });
    if (divide.creatorId !== req.userId) return res.status(403).json({ error: 'Not creator' });

    const result = await endDivideById(divideId, req.userId);
    if (!result) return res.status(500).json({ error: 'Failed to end divide' });

    res.json({ success: true, id: result.id, winnerSide: result.winnerSide, pot: result.pot });
  } catch (err) {
    console.error('POST /divides/end', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/Divides/end', auth, async (req, res) => {
  req.url = '/divides/end';
  return app._router.handle(req, res);
});

// PATCH divide (admin-only)
app.patch('/divides/:id', auth, adminOnly, async (req, res) => {
  try {
    const id = (req.params.id || '').toString();
    let divide = await Divide.findOne({ id });
    if (!divide) divide = await Divide.findById(id).catch(() => null);
    if (!divide) return res.status(404).json({ error: 'Divide not found' });

    const allowed = ['title', 'optionA', 'optionB', 'imageA', 'imageB', 'soundA', 'soundB', 'endTime', 'status'];
    for (const k of allowed) {
      if (typeof req.body[k] !== 'undefined') {
        divide[k] = req.body[k];
      }
    }
    await divide.save();
    // SECURITY: Sanitize divide data before emitting
    io.emit('newDivide', sanitizeDivide(divide));
    res.json(sanitizeDivide(divide));
  } catch (err) {
    console.error('PATCH /divides/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Recreate divide (admin-only)
app.post('/divides/:id/recreate', auth, adminOnly, async (req, res) => {
  try {
    const id = (req.params.id || '').toString();
    let orig = await Divide.findOne({ id });
    if (!orig) orig = await Divide.findById(id).catch(() => null);
    if (!orig) return res.status(404).json({ error: 'Divide not found' });

    const newShortId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);

    const now = new Date();
    const defaultMs = 10 * 60 * 1000;
    const newEnd = new Date(now.getTime() + defaultMs);

    const fresh = new Divide({
      id: newShortId,
      title: orig.title,
      optionA: orig.optionA,
      optionB: orig.optionB,
      imageA: orig.imageA || '',
      imageB: orig.imageB || '',
      soundA: orig.soundA || '',
      soundB: orig.soundB || '',
      endTime: newEnd,
      // Use correct model field names
      shortsA: 0,
      shortsB: 0,
      totalShorts: 0,
      pot: 0,
      status: 'active',
      shorts: [],
      creatorId: req.userId,
      createdAt: now
    });

    await fresh.save();
    // SECURITY: Sanitize new divide data before emitting
    io.emit('newDivide', sanitizeDivide(fresh));
    res.json(sanitizeDivide(fresh));
  } catch (err) {
    console.error('POST /divides/:id/recreate', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/Divides/:id/recreate', auth, adminOnly, async (req, res) => {
  req.url = `/divides/${req.params.id}/recreate`;
  return app._router.handle(req, res);
});

// ==========================================
// SOCIAL ENGAGEMENT (LIKES/DISLIKES)
// ==========================================

app.post('/divides/:id/like', auth, async (req, res) => {
  try {
    const divideId = req.params.id;
    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide) return res.status(404).json({ error: 'Divide not found' });

    const userId = req.userId;

    // Check if user already liked OR disliked (once you react, you're locked)
    const alreadyLiked = (divide.likedBy || []).includes(userId);
    const alreadyDisliked = (divide.dislikedBy || []).includes(userId);

    if (alreadyLiked) {
      return res.status(400).json({ error: 'Already liked this divide' });
    }
    if (alreadyDisliked) {
      return res.status(400).json({ error: 'You already disliked this divide - reactions are locked' });
    }

    // Add to likedBy array and increment count
    divide.likedBy = divide.likedBy || [];
    divide.likedBy.push(userId);
    divide.likes = (divide.likes || 0) + 1;
    await divide.save();

    // Award XP
    await awardXp(req.userId, 'likeGiven', 0, { divideId: divide.id || divide._id });

    if (divide.creatorId) {
      await awardXp(divide.creatorId, 'likeReceived', 0, { divideId: divide.id || divide._id });
    }

    res.json({ success: true, likes: divide.likes, likedBy: divide.likedBy, dislikedBy: divide.dislikedBy });
  } catch (err) {
    console.error('POST /divides/:id/like', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/divides/:id/dislike', auth, async (req, res) => {
  try {
    const divideId = req.params.id;
    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide) return res.status(404).json({ error: 'Divide not found' });

    const userId = req.userId;

    // Check if user already liked OR disliked (once you react, you're locked)
    const alreadyLiked = (divide.likedBy || []).includes(userId);
    const alreadyDisliked = (divide.dislikedBy || []).includes(userId);

    if (alreadyDisliked) {
      return res.status(400).json({ error: 'Already disliked this divide' });
    }
    if (alreadyLiked) {
      return res.status(400).json({ error: 'You already liked this divide - reactions are locked' });
    }

    // Add to dislikedBy array and increment count
    divide.dislikedBy = divide.dislikedBy || [];
    divide.dislikedBy.push(userId);
    divide.dislikes = (divide.dislikes || 0) + 1;
    await divide.save();

    // Track engagement
    await UserEngagement.create({
      userId: req.userId,
      type: 'dislikeGiven',
      xpAwarded: 0,
      metadata: { divideId: divide.id || divide._id },
      timestamp: new Date()
    });

    if (divide.creatorId) {
      await awardXp(divide.creatorId, 'dislikeReceived', 0, { divideId: divide.id || divide._id });
    }

    res.json({ success: true, dislikes: divide.dislikes, likedBy: divide.likedBy, dislikedBy: divide.dislikedBy });
  } catch (err) {
    console.error('POST /divides/:id/dislike', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API-prefixed aliases for like/dislike (frontend uses /api/divides/:id/like)
app.post('/api/divides/:id/like', auth, async (req, res) => {
  try {
    const divideId = req.params.id;
    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide) return res.status(404).json({ error: 'Divide not found' });

    const userId = req.userId;

    const alreadyLiked = (divide.likedBy || []).includes(userId);
    const alreadyDisliked = (divide.dislikedBy || []).includes(userId);

    if (alreadyLiked) {
      return res.status(400).json({ error: 'Already liked this divide' });
    }
    if (alreadyDisliked) {
      return res.status(400).json({ error: 'You already disliked this divide - reactions are locked' });
    }

    divide.likedBy = divide.likedBy || [];
    divide.likedBy.push(userId);
    divide.likes = (divide.likes || 0) + 1;
    await divide.save();

    await awardXp(req.userId, 'likeGiven', 0, { divideId: divide.id || divide._id });
    if (divide.creatorId) {
      await awardXp(divide.creatorId, 'likeReceived', 0, { divideId: divide.id || divide._id });
    }

    res.json({ success: true, likes: divide.likes, likedBy: divide.likedBy, dislikedBy: divide.dislikedBy });
  } catch (err) {
    console.error('POST /api/divides/:id/like', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/divides/:id/dislike', auth, async (req, res) => {
  try {
    const divideId = req.params.id;
    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide) return res.status(404).json({ error: 'Divide not found' });

    const userId = req.userId;

    const alreadyLiked = (divide.likedBy || []).includes(userId);
    const alreadyDisliked = (divide.dislikedBy || []).includes(userId);

    if (alreadyDisliked) {
      return res.status(400).json({ error: 'Already disliked this divide' });
    }
    if (alreadyLiked) {
      return res.status(400).json({ error: 'You already liked this divide - reactions are locked' });
    }

    divide.dislikedBy = divide.dislikedBy || [];
    divide.dislikedBy.push(userId);
    divide.dislikes = (divide.dislikes || 0) + 1;
    await divide.save();

    await UserEngagement.create({
      userId: req.userId,
      type: 'dislikeGiven',
      xpAwarded: 0,
      metadata: { divideId: divide.id || divide._id },
      timestamp: new Date()
    });

    if (divide.creatorId) {
      await awardXp(divide.creatorId, 'dislikeReceived', 0, { divideId: divide.id || divide._id });
    }

    res.json({ success: true, dislikes: divide.dislikes, likedBy: divide.likedBy, dislikedBy: divide.dislikedBy });
  } catch (err) {
    console.error('POST /api/divides/:id/dislike', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// DIVIDE DETAIL & COMMENTS
// ==========================================

// GET single divide with full details
app.get('/api/divides/:id', async (req, res) => {
  try {
    let divide = await Divide.findOne({ id: req.params.id });
    if (!divide) divide = await Divide.findById(req.params.id);
    if (!divide) return res.status(404).json({ error: 'Divide not found' });

    // SECURITY: Build response with vote data hidden for active divides
    const isActive = divide.status === 'active';

    const response = {
      _id: divide._id,
      id: divide.id,
      title: divide.title,
      optionA: divide.optionA,
      optionB: divide.optionB,
      imageA: divide.imageA,
      imageB: divide.imageB,
      category: divide.category,
      // SECURITY: Only reveal short counts after divide has ended
      // These fields reveal which side is winning - MUST be hidden for active
      shortsA: isActive ? null : divide.shortsA,
      shortsB: isActive ? null : divide.shortsB,
      totalShorts: isActive ? null : divide.totalShorts,
      // Legacy fields (map from shorts to votes for frontend compatibility)
      votesA: isActive ? null : divide.shortsA,
      votesB: isActive ? null : divide.shortsB,
      pot: divide.pot, // Pot (total volume) is safe to show
      endTime: divide.endTime,
      status: divide.status,
      winnerSide: divide.winnerSide,
      loserSide: divide.loserSide,
      likes: divide.likes,
      dislikes: divide.dislikes,
      likedBy: divide.likedBy,
      dislikedBy: divide.dislikedBy,
      createdAt: divide.createdAt,
      isUserCreated: divide.isUserCreated,
      // SECURITY: Only reveal vote history after ending - contains shortsA/shortsB per entry
      voteHistory: isActive ? [] : (divide.voteHistory || []),
      // SECURITY: Only reveal individual shorts after ending
      shorts: isActive ? [] : (divide.shorts || []),
    };

    res.json(response);
  } catch (err) {
    console.error('GET /api/divides/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET recent completed divides ("Recent Eats" - last 10 finished divides)
app.get('/api/divides/recent-eats', async (req, res) => {
  try {
    const recentDivides = await Divide.find({ status: 'ended' })
      .sort({ endTime: -1 })
      .limit(10)
      .lean();

    // Calculate stats for each divide (with error handling for malformed data)
    const results = recentDivides.map(d => {
      try {
        // Use shortsA/shortsB (the actual model fields)
        const shortsA = d.shortsA || 0;
        const shortsB = d.shortsB || 0;
        const pot = d.pot || (shortsA + shortsB) || 0;

        // loserSide is the side that lost (had more shorts)
        // winnerSide is the minority (fewer shorts) - they win
        const loserSide = d.loserSide || 'A';
        const winnerSide = loserSide === 'A' ? 'B' : 'A';

        // Count winners safely from shorts array
        const winnerVotes = Array.isArray(d.shorts)
          ? d.shorts.filter(v => v && v.side === winnerSide)
          : [];

        // Calculate minority percentage (what % of pot was on minority/winning side)
        const minorityAmount = winnerSide === 'A' ? shortsA : shortsB;
        const minorityPct = pot > 0 ? Math.round((minorityAmount / pot) * 100) : 0;

        return {
          _id: d._id,
          title: d.title || 'Untitled',
          optionA: d.optionA || 'Option A',
          optionB: d.optionB || 'Option B',
          pot: pot,
          winnerSide: winnerSide,
          winnerCount: winnerVotes.length,
          minorityPct: minorityPct,
          endTime: d.endTime,
        };
      } catch (mapErr) {
        console.error('Error processing divide:', d._id, mapErr);
        return null;
      }
    }).filter(Boolean); // Remove any null results from errors

    res.json(results);
  } catch (err) {
    console.error('GET /api/divides/recent-eats', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET comments for a divide (sorted by controversy - most disliked first)
app.get('/api/divides/:id/comments', async (req, res) => {
  try {
    const comments = await DivideComment.aggregate([
      { $match: { divideId: req.params.id } },
      { $addFields: { controversyScore: { $subtract: [{ $ifNull: ['$dislikes', 0] }, { $ifNull: ['$likes', 0] }] } } },
      { $sort: { controversyScore: -1, createdAt: -1 } },
      { $limit: 100 }
    ]);
    res.json(comments || []);
  } catch (err) {
    console.error('GET /api/divides/:id/comments', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new comment
app.post('/api/divides/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text required' });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: 'Comment too long (max 500 chars)' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const comment = new DivideComment({
      divideId: req.params.id,
      userId: req.userId,
      username: user.username,
      text: text.trim(),
    });

    await comment.save();
    res.json(comment);
  } catch (err) {
    console.error('POST /api/divides/:id/comments', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like a comment
app.post('/api/divides/:divideId/comments/:commentId/like', auth, async (req, res) => {
  try {
    const comment = await DivideComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const userId = req.userId;
    const alreadyLiked = (comment.likedBy || []).includes(userId);
    const alreadyDisliked = (comment.dislikedBy || []).includes(userId);

    if (alreadyLiked || alreadyDisliked) {
      return res.status(400).json({ error: 'Already reacted to this comment' });
    }

    comment.likedBy = comment.likedBy || [];
    comment.likedBy.push(userId);
    comment.likes = (comment.likes || 0) + 1;

    await comment.save();

    // Award XP for liking a comment
    await awardXp(userId, 'likeGiven', 0, { commentId: comment._id });
    if (comment.userId && comment.userId !== userId) {
      await awardXp(comment.userId, 'likeReceived', 0, { commentId: comment._id });
    }

    res.json({ success: true, likes: comment.likes, dislikes: comment.dislikes });
  } catch (err) {
    console.error('POST /api/divides/:divideId/comments/:commentId/like', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Dislike a comment
app.post('/api/divides/:divideId/comments/:commentId/dislike', auth, async (req, res) => {
  try {
    const comment = await DivideComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const userId = req.userId;
    const alreadyLiked = (comment.likedBy || []).includes(userId);
    const alreadyDisliked = (comment.dislikedBy || []).includes(userId);

    if (alreadyLiked || alreadyDisliked) {
      return res.status(400).json({ error: 'Already reacted to this comment' });
    }

    comment.dislikedBy = comment.dislikedBy || [];
    comment.dislikedBy.push(userId);
    comment.dislikes = (comment.dislikes || 0) + 1;

    await comment.save();

    // Award XP for disliking a comment (engagement is engagement!)
    await awardXp(userId, 'likeGiven', 0, { commentId: comment._id, type: 'dislike' });
    if (comment.userId && comment.userId !== userId) {
      await awardXp(comment.userId, 'dislikeReceived', 0, { commentId: comment._id });
    }

    res.json({ success: true, likes: comment.likes, dislikes: comment.dislikes });
  } catch (err) {
    console.error('POST /api/divides/:divideId/comments/:commentId/dislike', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// JACKPOT & NOTIFICATIONS
// ==========================================

app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(notifications || []);
  } catch (err) {
    console.error('GET /api/notifications', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/recent-games', async (req, res) => {
  try {
    // Only show recent divides for "recent games" feed
    const recentDivides = await Divide.find({ status: 'ended' })
      .sort({ endTime: -1 })
      .limit(20)
      .lean();

    res.json({
      games: recentDivides.map(d => ({
        type: 'divide',
        id: d._id || d.id,
        title: d.title,
        pot: d.pot,
        winner: d.loserSide,
        endTime: d.endTime
      }))
    });
  } catch (err) {
    console.error('GET /api/recent-games', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// SENTIMENT ANALYSIS ROUTES
// ==========================================

// GET /api/divides/:id/sentiment - Get sentiment data for a divide
app.get('/api/divides/:id/sentiment', async (req, res) => {
  try {
    const sentiment = await DivideSentiment.findOne({ divide: req.params.id })
      .select('-history -rawAnalysis') // Exclude heavy fields
      .lean();

    if (!sentiment) {
      return res.json({
        current: {
          optionA: { score: 50, label: 'neutral' },
          optionB: { score: 50, label: 'neutral' },
          themes: []
        }
      });
    }

    res.json(sentiment);
  } catch (err) {
    console.error('GET /api/divides/:id/sentiment', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/divides/:id/sentiment/analyze - Trigger sentiment analysis (admin or auto)
app.post('/api/divides/:id/sentiment/analyze', auth, async (req, res) => {
  try {
    const divideId = req.params.id;
    const divide = await Divide.findOne({ id: divideId }) || await Divide.findById(divideId);

    if (!divide) return res.status(404).json({ error: 'Divide not found' });

    // Fetch recent comments and posts related to this divide
    const comments = await DivideComment.find({ divideId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('text createdAt')
      .lean();

    // Find social posts linking to this divide
    const posts = await SocialPost.find({ linkedDivide: divide._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('content createdAt')
      .lean();

    // Prepare data for Gemini
    const analysisData = {
      divideTitle: divide.title,
      optionA: divide.optionA,
      optionB: divide.optionB,
      comments: comments.map(c => ({ content: c.text, createdAt: c.createdAt })),
      posts: posts.map(p => ({ content: p.content, createdAt: p.createdAt }))
    };

    // Call Gemini API
    const analysis = await analyzeDivideSentiment(analysisData);

    if (analysis.error) {
      console.error('Gemini analysis failed:', analysis.error);
      return res.status(500).json({ error: analysis.error });
    }

    const now = new Date();
    const sentimentData = {
      optionA: {
        score: analysis.optionA.score,
        confidence: analysis.optionA.confidence,
        sampleSize: analysis.optionA.sampleSize,
        label: analysis.optionA.label,
      },
      optionB: {
        score: analysis.optionB.score,
        confidence: analysis.optionB.confidence,
        sampleSize: analysis.optionB.sampleSize,
        label: analysis.optionB.label,
      },
      themes: analysis.themes,
      analyzedAt: now,
    };

    let sentiment = await DivideSentiment.findOne({ divide: divide._id });

    if (sentiment) {
      // Update existing
      sentiment.history.push({
        timestamp: now,
        optionA: sentimentData.optionA,
        optionB: sentimentData.optionB,
        themes: sentimentData.themes,
        rawAnalysis: analysis.rawAnalysis,
      });

      // Keep only last 50 history entries
      if (sentiment.history.length > 50) {
        sentiment.history = sentiment.history.slice(-50);
      }

      sentiment.current = sentimentData;
      sentiment.totalCommentsAnalyzed += comments.length;
      sentiment.totalPostsAnalyzed += posts.length;
      sentiment.updatedAt = now;
    } else {
      // Create new
      sentiment = new DivideSentiment({
        divide: divide._id,
        current: sentimentData,
        history: [{
          timestamp: now,
          optionA: sentimentData.optionA,
          optionB: sentimentData.optionB,
          themes: sentimentData.themes,
          rawAnalysis: analysis.rawAnalysis,
        }],
        totalCommentsAnalyzed: comments.length,
        totalPostsAnalyzed: posts.length,
      });
    }

    await sentiment.save();

    res.json(sentiment);
  } catch (err) {
    console.error('Error analyzing sentiment:', err);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

app.get('/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastActive: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
    const totalWagered = await User.aggregate([{ $group: { _id: null, total: { $sum: '$wagered' } } }]);
    const activeDivides = await Divide.countDocuments({ status: 'active' });

    const house = await House.findOne({ id: 'global' });

    res.json({
      userCount,
      activeUsers,
      totalWagered: totalWagered[0]?.total || 0,
      activeDivides,
      houseTotal: house?.houseTotal || 0
    });
  } catch (err) {
    console.error('GET /admin/stats', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==============================================
// SEED SHOWCASE DIVIDES (admin-only, one-time)
// ==============================================
app.post('/admin/seed-showcase', auth, adminOnly, async (req, res) => {
  try {
    // Generate realistic vote history
    function generateVoteHistory(optionA, optionB, finalShortsA, finalShortsB, votes = 50) {
      const history = [];
      let runningA = 0;
      let runningB = 0;
      const startTime = Date.now() - (24 * 60 * 60 * 1000);

      for (let i = 0; i < votes; i++) {
        const targetA = finalShortsA * ((i + 1) / votes);
        const targetB = finalShortsB * ((i + 1) / votes);
        const addA = Math.max(0, targetA - runningA + (Math.random() - 0.5) * 20);
        const addB = Math.max(0, targetB - runningB + (Math.random() - 0.5) * 20);

        const side = Math.random() > (finalShortsA / (finalShortsA + finalShortsB)) ? 'B' : 'A';
        const amount = side === 'A' ? addA : addB;

        if (side === 'A') runningA += amount;
        else runningB += amount;

        history.push({
          timestamp: new Date(startTime + (i * (24 * 60 * 60 * 1000 / votes))),
          username: `player${Math.floor(Math.random() * 9000) + 1000}`,
          userId: `user_${Math.random().toString(36).substr(2, 9)}`,
          side,
          amount: Math.round(amount * 100) / 100,
          shortsA: Math.round(runningA * 100) / 100,
          shortsB: Math.round(runningB * 100) / 100,
          pot: Math.round((runningA + runningB) * 100) / 100,
        });
      }
      return history;
    }

    const showcaseDivides = [
      {
        title: "The eternal tech debate",
        optionA: "iPhone",
        optionB: "Android",
        imageA: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
        imageB: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg",
        category: "Entertainment",
        shortsA: 8472.50,
        shortsB: 1893.25,
        pot: 10365.75,
        status: "ended",
        winnerSide: "B",
        loserSide: "A",
        paidOut: 10054.78,
        houseCut: 310.97,
        likes: 847,
        dislikes: 23,
      },
      {
        title: "The gaming wars continue",
        optionA: "PC",
        optionB: "Console",
        imageA: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Nvidia_GeForce_RTX_3090.jpg/1280px-Nvidia_GeForce_RTX_3090.jpg",
        imageB: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/PlayStation_5_and_DualSense_controller.png/800px-PlayStation_5_and_DualSense_controller.png",
        category: "Entertainment",
        shortsA: 12847.00,
        shortsB: 845.50,
        pot: 13692.50,
        status: "ended",
        winnerSide: "B",
        loserSide: "A",
        paidOut: 13281.73,
        houseCut: 410.77,
        likes: 1203,
        dislikes: 156,
      },
      {
        title: "2024 Election: Who wins?",
        optionA: "Trump",
        optionB: "Kamala",
        imageA: "https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg",
        imageB: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Kamala_Harris_Vice_Presidential_Portrait.jpg/800px-Kamala_Harris_Vice_Presidential_Portrait.jpg",
        category: "Politics",
        shortsA: 15234.00,
        shortsB: 31847.50,
        pot: 47081.50,
        status: "ended",
        winnerSide: "A",
        loserSide: "B",
        paidOut: 45669.06,
        houseCut: 1412.44,
        likes: 3421,
        dislikes: 892,
      },
      {
        title: "Was it the Salute?",
        optionA: "Yes",
        optionB: "No",
        imageA: "https://media.cnn.com/api/v1/images/stellar/prod/gettyimages-2194760984.jpg",
        imageB: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/X_Corporate_Logo.svg/1200px-X_Corporate_Logo.svg.png",
        category: "Politics",
        shortsA: 2341.00,
        shortsB: 24567.75,
        pot: 26908.75,
        status: "ended",
        winnerSide: "A",
        loserSide: "B",
        paidOut: 26101.49,
        houseCut: 807.26,
        likes: 5678,
        dislikes: 2341,
      },
      {
        title: "Best fast food",
        optionA: "McDonald's",
        optionB: "Chick-fil-A",
        imageA: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/1200px-McDonald%27s_Golden_Arches.svg.png",
        imageB: "https://upload.wikimedia.org/wikipedia/en/thumb/0/02/Chick-fil-A_Logo.svg/1200px-Chick-fil-A_Logo.svg.png",
        category: "Entertainment",
        shortsA: 3421.25,
        shortsB: 7823.50,
        pot: 11244.75,
        status: "ended",
        winnerSide: "A",
        loserSide: "B",
        paidOut: 10907.41,
        houseCut: 337.34,
        likes: 432,
        dislikes: 67,
      },
      {
        title: "Will BTC hit $100k in 2024?",
        optionA: "Yes",
        optionB: "No",
        imageA: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png",
        imageB: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Red_X.svg/1200px-Red_X.svg.png",
        category: "Crypto",
        shortsA: 18923.00,
        shortsB: 67234.50,
        pot: 86157.50,
        status: "ended",
        winnerSide: "A",
        loserSide: "B",
        paidOut: 83572.78,
        houseCut: 2584.72,
        likes: 8934,
        dislikes: 234,
      },
    ];

    const results = [];

    for (const divideData of showcaseDivides) {
      // Check if already exists
      const existing = await Divide.findOne({ title: divideData.title, status: 'ended' });
      if (existing) {
        results.push({ title: divideData.title, status: 'skipped', reason: 'already exists' });
        continue;
      }

      const voteHistory = generateVoteHistory(
        divideData.optionA,
        divideData.optionB,
        divideData.shortsA,
        divideData.shortsB,
        Math.floor(40 + Math.random() * 60)
      );

      const shortId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);

      const divide = new Divide({
        id: shortId,
        ...divideData,
        totalShorts: divideData.shortsA + divideData.shortsB,
        voteHistory,
        endTime: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
        createdAt: new Date(Date.now() - Math.floor(7 + Math.random() * 7) * 24 * 60 * 60 * 1000),
        likedBy: [],
        dislikedBy: [],
        shorts: [],
        isUserCreated: false,
      });

      await divide.save();
      results.push({ title: divideData.title, status: 'created', pot: divideData.pot, winner: divideData.winnerSide });
    }

    // Calculate total payouts from showcase divides (simulated potential withdrawals)
    // This represents the winnings that "users" would have from these ended divides
    const totalSimulatedPayouts = showcaseDivides.reduce((sum, d) => sum + (d.paidOut || 0), 0);
    const simulatedTreasuryCents = Math.round(totalSimulatedPayouts * 100);

    // Update House with simulated treasury
    await House.findOneAndUpdate(
      { id: 'global' },
      { $set: { simulatedTreasury: simulatedTreasuryCents } },
      { upsert: true }
    );

    console.log('[ADMIN] Showcase divides seeded:', results);
    console.log(`[ADMIN] Simulated treasury set to: $${totalSimulatedPayouts.toFixed(2)}`);
    res.json({ success: true, results, simulatedTreasury: totalSimulatedPayouts });
  } catch (err) {
    console.error('POST /admin/seed-showcase', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==============================================
// ADMIN EDIT DIVIDE (update images, title, etc)
// ==============================================
app.patch('/admin/divides/:id', auth, adminOnly, async (req, res) => {
  try {
    const id = (req.params.id || '').toString();
    let divide = await Divide.findOne({ id });
    if (!divide) divide = await Divide.findById(id).catch(() => null);
    if (!divide) return res.status(404).json({ error: 'Divide not found' });

    // Allowed fields to update
    const allowed = ['title', 'optionA', 'optionB', 'imageA', 'imageB', 'soundA', 'soundB', 'category', 'endTime', 'status'];

    for (const key of allowed) {
      if (typeof req.body[key] !== 'undefined') {
        divide[key] = req.body[key];
      }
    }

    await divide.save();

    console.log(`[ADMIN] Divide ${id} updated:`, Object.keys(req.body).filter(k => allowed.includes(k)));

    // Emit update to all clients
    io.emit('newDivide', sanitizeDivide(divide));

    res.json({ success: true, divide: sanitizeDivide(divide) });
  } catch (err) {
    console.error('PATCH /admin/divides/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all divides for admin (including ended)
app.get('/admin/divides', auth, adminOnly, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const divides = await Divide.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json(divides);
  } catch (err) {
    console.error('GET /admin/divides', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password -twoFactorSecret').sort({ createdAt: -1 }).limit(100);
    res.json(users);
  } catch (err) {
    console.error('GET /admin/users', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const { balance, role } = req.body;
    const updates = {};

    // Get current user to check balance change
    const currentUser = await User.findById(req.params.id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldBalance = currentUser.balance;

    if (typeof balance !== 'undefined') updates.balance = toCents(balance);
    if (role) updates.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password -twoFactorSecret');

    // If balance was increased, send notification
    if (typeof balance !== 'undefined') {
      const newBalanceCents = toCents(balance);
      const balanceDiff = newBalanceCents - oldBalance;

      if (balanceDiff > 0) {
        // Balance was increased - send deposit notification
        await Notification.create({
          userId: user._id,
          type: 'deposit',
          title: 'Balance Credit! 💰',
          message: `$${toDollars(balanceDiff)} has been credited to your account. Your new balance is $${toDollars(user.balance)}.`,
          icon: '💰',
          link: '/wallet'
        });
        console.log(`[ADMIN CREDIT] User ${user.username} credited $${toDollars(balanceDiff)} by admin`);
      }
    }

    res.json(user);
  } catch (err) {
    console.error('PATCH /admin/users/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/admin/ledger', auth, adminOnly, async (req, res) => {
  try {
    const { limit = 100, page = 1, type, userId } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (userId) filter.userId = userId;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 100;
    const skip = (pageNum - 1) * limitNum;

    const total = await Ledger.countDocuments(filter);
    const items = await Ledger.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      items,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('GET /admin/ledger', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/admin/finance', auth, adminOnly, async (req, res) => {
  try {
    const house = await House.findOne({ id: 'global' }).lean();

    if (!house) {
      return res.status(500).json({ error: 'House document not found' });
    }

    // Calculate total deposits/withdrawals across all users
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalDeposited: { $sum: '$totalDeposited' },
          totalWithdrawn: { $sum: '$totalWithdrawn' },
          totalBalance: { $sum: '$balance' }
        }
      }
    ]);

    const totalDeposited = userStats.length > 0 ? (userStats[0].totalDeposited || 0) : 0;
    const totalWithdrawn = userStats.length > 0 ? (userStats[0].totalWithdrawn || 0) : 0;
    const totalUserBalances = userStats.length > 0 ? (userStats[0].totalBalance || 0) : 0;

    // Calculate money in active Divide pots
    const activeDivides = await Divide.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, totalPot: { $sum: '$pot' } } }
    ]);
    const activePots = activeDivides.length > 0 ? (activeDivides[0].totalPot || 0) : 0;

    // Count total redemptions
    const redemptionCount = await Ledger.countDocuments({ type: 'withdrawal' });

    // Treasury = User Balances + Money in Active Pots (excludes house revenue)
    const treasury = totalUserBalances + activePots;

    res.json({
      global: {
        houseTotal: toDollars(house?.houseTotal || 0),
        potFees: toDollars(house?.potFees || 0),
        creatorPoolKept: toDollars(house?.creatorPoolKept || 0),
        withdrawalFees: toDollars(house?.withdrawalFees || 0),
        totalDeposited: toDollars(totalDeposited),
        totalWithdrawn: toDollars(totalWithdrawn),
        treasury: toDollars(treasury),
        totalUserBalances: toDollars(totalUserBalances),
        activePots: toDollars(activePots),
        totalRedemptions: redemptionCount,
        totalRedemptionAmount: toDollars(totalWithdrawn)
      },
      games: {}
    });
  } catch (err) {
    console.error('/admin/finance error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// SUPPORT ROUTES
// ==========================================

app.post('/api/support/tickets', auth, async (req, res) => {
  try {
    const { subject, message, category } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message required' });
    }

    // Get user info for the ticket
    const user = await User.findById(req.userId).select('username email').lean();

    const ticket = await SupportTicket.create({
      userId: req.userId,
      subject,
      description: message,
      category: category || 'general',
      status: 'open',
      email: user?.email || '',
      createdAt: new Date()
    });

    // Send Discord webhook notification
    const discordWebhookUrl = process.env.DISCORD_SUPPORT_WEBHOOK_URL;
    if (discordWebhookUrl) {
      try {
        const webhookPayload = {
          embeds: [{
            title: '🎫 New Support Ticket',
            color: 0xff1744,
            fields: [
              { name: 'Ticket ID', value: ticket._id.toString().slice(-8).toUpperCase(), inline: true },
              { name: 'Category', value: category || 'general', inline: true },
              { name: 'Status', value: 'Open', inline: true },
              { name: 'Created By', value: user?.username || 'Unknown', inline: true },
              { name: 'Subject', value: subject.substring(0, 100), inline: false },
              { name: 'Message', value: message.substring(0, 500), inline: false },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'The Divide Support System' }
          }]
        };

        fetch(discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        }).catch(e => console.error('Discord webhook failed:', e));
      } catch (webhookErr) {
        console.error('Discord webhook error:', webhookErr);
      }
    }

    res.json(ticket);
  } catch (err) {
    console.error('POST /api/support/tickets', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/support/tickets', auth, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(tickets);
  } catch (err) {
    console.error('GET /api/support/tickets', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/support/tickets/all', auth, moderatorOnly, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({})
      .populate('userId', 'username email profileImage')
      .populate('assignedTo', 'username')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // Transform to include user info in a consistent format
    const transformedTickets = tickets.map(ticket => ({
      ...ticket,
      createdBy: ticket.userId?.username || 'Unknown',
      createdByEmail: ticket.userId?.email || '',
      createdByAvatar: ticket.userId?.profileImage || null,
      assignedToName: ticket.assignedTo?.username || null,
    }));

    res.json({ tickets: transformedTickets });
  } catch (err) {
    console.error('GET /api/support/tickets/all', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/support/tickets/:id', auth, moderatorOnly, async (req, res) => {
  try {
    const { status, response } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (response) {
      updates.response = response;
      updates.respondedBy = req.userId;
      updates.respondedAt = new Date();
    }

    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('userId', 'username email')
      .lean();
    res.json(ticket);
  } catch (err) {
    console.error('PATCH /api/support/tickets/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// CHAT ROUTES & MODERATOR PANEL
// ==========================================

app.get('/api/team', auth, moderatorOnly, async (req, res) => {
  try {
    const team = await User.find({ role: { $in: ['moderator', 'admin'] } })
      .select('username role profileImage email createdAt level')
      .sort({ role: 1, username: 1 })
      .lean();
    res.json({ team });
  } catch (err) {
    console.error('GET /api/team', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new team member (admin only)
app.post('/api/team', auth, async (req, res) => {
  try {
    // Only admins can add team members
    const requestingUser = await User.findById(req.userId).lean();
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { username, role } = req.body;
    if (!username || !role) {
      return res.status(400).json({ error: 'Username and role required' });
    }

    if (!['moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be moderator or admin' });
    }

    const userToPromote = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (!userToPromote) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userToPromote.role === role) {
      return res.status(400).json({ error: `User is already a ${role}` });
    }

    userToPromote.role = role;
    await userToPromote.save();

    res.json({
      success: true,
      message: `${username} is now a ${role}`,
      user: {
        _id: userToPromote._id,
        username: userToPromote.username,
        role: userToPromote.role,
        profileImage: userToPromote.profileImage,
      }
    });
  } catch (err) {
    console.error('POST /api/team', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update team member role (admin only)
app.patch('/api/team/:userId', auth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.userId).lean();
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { role } = req.body;
    if (!role || !['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent removing own admin role
    if (req.params.userId === req.userId && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }

    const userToUpdate = await User.findById(req.params.userId);
    if (!userToUpdate) {
      return res.status(404).json({ error: 'User not found' });
    }

    userToUpdate.role = role;
    await userToUpdate.save();

    res.json({
      success: true,
      message: `${userToUpdate.username}'s role updated to ${role}`,
      user: {
        _id: userToUpdate._id,
        username: userToUpdate.username,
        role: userToUpdate.role,
      }
    });
  } catch (err) {
    console.error('PATCH /api/team/:userId', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove team member (demote to user) - admin only
app.delete('/api/team/:userId', auth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.userId).lean();
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Prevent removing self
    if (req.params.userId === req.userId) {
      return res.status(400).json({ error: 'Cannot remove yourself from team' });
    }

    const userToRemove = await User.findById(req.params.userId);
    if (!userToRemove) {
      return res.status(404).json({ error: 'User not found' });
    }

    userToRemove.role = 'user';
    await userToRemove.save();

    res.json({
      success: true,
      message: `${userToRemove.username} removed from team`
    });
  } catch (err) {
    console.error('DELETE /api/team/:userId', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search users (for adding to team) - admin only
app.get('/api/users/search', auth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.userId).lean();
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      role: 'user', // Only show regular users
    })
      .select('username profileImage level')
      .limit(10)
      .lean();

    res.json({ users });
  } catch (err) {
    console.error('GET /api/users/search', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/chat/muted', auth, moderatorOnly, async (req, res) => {
  try {
    const muted = await ChatMute.find({
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null }
      ]
    }).sort({ createdAt: -1 }).lean();
    res.json({ muted });
  } catch (err) {
    console.error('GET /api/chat/muted', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/divides/active', auth, moderatorOnly, async (req, res) => {
  try {
    const activeDivides = await Divide.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ divides: activeDivides });
  } catch (err) {
    console.error('GET /api/divides/active', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/chat/messages', auth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const messages = await ChatMessage.find({}).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json(messages.reverse());
  } catch (err) {
    console.error('GET /api/chat/messages', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/chat/messages', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message required' });
    }

    const mute = await ChatMute.findOne({ userId: req.userId, expiresAt: { $gt: new Date() } });
    if (mute) {
      return res.status(403).json({ error: 'You are muted from chat' });
    }

    const user = await User.findById(req.userId).select('username level currentBadge');

    const msg = await ChatMessage.create({
      userId: req.userId,
      username: user.username,
      message: message.trim().substring(0, 500),
      level: user.level || 1,
      badge: user.currentBadge || 'Sheep',
      createdAt: new Date()
    });

    io.emit('chatMessage', msg);
    res.json(msg);
  } catch (err) {
    console.error('POST /api/chat/messages', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// PROFILE & USER ROUTES
// ==========================================

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -twoFactorSecret -email');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const stats = {
      totalBets: user.totalBets || 0,
      totalWins: user.totalWins || 0,
      wagered: toDollars(user.wagered || 0),
      level: user.level || 1,
      xp: user.xp || 0,
      currentBadge: user.currentBadge || 'Sheep'
    };

    res.json({ user, stats });
  } catch (err) {
    console.error('GET /api/users/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Avatar upload removed - avatars now sync from Discord

// Change username (allowed once every 30 days)
app.post('/api/change-username', auth, async (req, res) => {
  try {
    const { newUsername } = req.body;
    const userId = req.userId;

    if (!newUsername || newUsername.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (newUsername.trim().length > 20) {
      return res.status(400).json({ error: 'Username must be 20 characters or less' });
    }

    // Check if username is already taken
    const existingUser = await User.findOne({ username: newUsername.trim() });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if 30 days have passed since last change
    if (user.lastUsernameChange) {
      const daysSinceLastChange = (Date.now() - new Date(user.lastUsernameChange).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastChange < 30) {
        const daysRemaining = Math.ceil(30 - daysSinceLastChange);
        return res.status(400).json({
          error: `You can change your username again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
        });
      }
    }

    user.username = newUsername.trim();
    user.lastUsernameChange = new Date();
    await user.save();

    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error('Change username error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// SOCIAL FEED ROUTES
// ==========================================

// Auth middleware for social routes that sets req.user
const socialAuth = async (req, res, next) => {
  try {
    const a = req.headers && (req.headers.authorization || req.headers.Authorization);
    if (!a) return res.status(401).json({ error: 'Not authenticated' });
    const m = String(a).split(' ');
    if (m.length !== 2 || !/^Bearer$/i.test(m[0])) {
      return res.status(401).json({ error: 'Invalid auth header' });
    }
    const payload = jwt.verify(m[1], JWT_SECRET);
    const userId = payload && (payload.userId || payload.id) ? String(payload.userId || payload.id) : null;
    if (!userId) return res.status(401).json({ error: 'Invalid token' });
    const user = await User.findById(userId).select('_id username role avatar');
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = { id: user._id.toString(), username: user.username, role: user.role, avatar: user.avatar };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /api/social/posts - Get feed (paginated, sorted by controversy - most disliked first)
app.get('/api/social/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Use aggregation for controversy sorting
    const posts = await SocialPost.aggregate([
      { $match: { isDeleted: false } },
      { $addFields: { controversyScore: { $subtract: [{ $ifNull: ['$dislikes', 0] }, { $ifNull: ['$likes', 0] }] } } },
      { $sort: { controversyScore: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Populate author
      { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'author', pipeline: [{ $project: { username: 1, profileImage: 1, level: 1, currentBadge: 1 } }] } },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      // Populate linkedDivide
      { $lookup: { from: 'divides', localField: 'linkedDivide', foreignField: '_id', as: 'linkedDivide', pipeline: [{ $project: { title: 1, status: 1 } }] } },
      { $unwind: { path: '$linkedDivide', preserveNullAndEmptyArrays: true } },
      // Populate comment authors
      { $lookup: { from: 'users', localField: 'comments.author', foreignField: '_id', as: 'commentAuthors', pipeline: [{ $project: { username: 1, profileImage: 1, level: 1, currentBadge: 1 } }] } },
    ]).allowDiskUse(true);

    // Post-process to attach comment authors
    for (const post of posts) {
      if (post.comments && post.commentAuthors) {
        for (const comment of post.comments) {
          const authorId = comment.author?.toString();
          comment.author = post.commentAuthors.find(a => a._id.toString() === authorId) || comment.author;
        }
        delete post.commentAuthors;
      }
    }

    const total = await SocialPost.countDocuments({ isDeleted: false });

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + posts.length < total,
      }
    });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /api/social/posts/:id - Get single post
app.get('/api/social/posts/:id', async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id)
      .populate('author', 'username profileImage level currentBadge')
      .populate('linkedDivide', 'title status left right')
      .populate('comments.author', 'username profileImage level currentBadge')
      .lean();

    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// POST /api/social/posts - Create new post (auth required)
app.post('/api/social/posts', socialAuth, async (req, res) => {
  try {
    const { content, imageUrl, linkedDivide } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Content exceeds 1000 characters' });
    }

    const post = new SocialPost({
      author: req.user.id,
      content: content.trim(),
      imageUrl: imageUrl || null,
      linkedDivide: linkedDivide || null,
    });

    await post.save();

    // Populate author for response
    const populatedPost = await SocialPost.findById(post._id)
      .populate('author', 'username profileImage level currentBadge')
      .populate('linkedDivide', 'title status')
      .lean();

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// DELETE /api/social/posts/:id - Delete own post (auth required)
app.delete('/api/social/posts/:id', socialAuth, async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Only author or admin can delete
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    post.isDeleted = true;
    post.updatedAt = new Date();
    await post.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// POST /api/social/posts/:id/like - Like a post (auth required)
app.post('/api/social/posts/:id/like', socialAuth, async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already liked
    if (post.likedBy.map(id => id.toString()).includes(req.user.id)) {
      return res.status(400).json({ error: 'Already liked this post' });
    }

    // Remove dislike if exists
    const dislikeIndex = post.dislikedBy.map(id => id.toString()).indexOf(req.user.id);
    if (dislikeIndex > -1) {
      post.dislikedBy.splice(dislikeIndex, 1);
      post.dislikes = Math.max(0, post.dislikes - 1);
    }

    post.likedBy.push(req.user.id);
    post.likes += 1;
    post.updatedAt = new Date();
    await post.save();

    // Award XP for liking
    await awardXp(req.user.id, 'likeGiven', 0, { postId: post._id });

    // Award XP to post author for receiving like
    if (post.author && post.author.toString() !== req.user.id) {
      await awardXp(post.author, 'likeReceived', 0, { postId: post._id });
    }

    res.json({ likes: post.likes, dislikes: post.dislikes });
  } catch (err) {
    console.error('Error liking post:', err);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// DELETE /api/social/posts/:id/like - Unlike a post (auth required)
app.delete('/api/social/posts/:id/like', socialAuth, async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const likeIndex = post.likedBy.map(id => id.toString()).indexOf(req.user.id);
    if (likeIndex === -1) {
      return res.status(400).json({ error: 'Not liked' });
    }

    post.likedBy.splice(likeIndex, 1);
    post.likes = Math.max(0, post.likes - 1);
    post.updatedAt = new Date();
    await post.save();

    res.json({ likes: post.likes, dislikes: post.dislikes });
  } catch (err) {
    console.error('Error unliking post:', err);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
});

// POST /api/social/posts/:id/dislike - Dislike a post (auth required)
app.post('/api/social/posts/:id/dislike', socialAuth, async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already disliked
    if (post.dislikedBy.map(id => id.toString()).includes(req.user.id)) {
      return res.status(400).json({ error: 'Already disliked this post' });
    }

    // Remove like if exists
    const likeIndex = post.likedBy.map(id => id.toString()).indexOf(req.user.id);
    if (likeIndex > -1) {
      post.likedBy.splice(likeIndex, 1);
      post.likes = Math.max(0, post.likes - 1);
    }

    post.dislikedBy.push(req.user.id);
    post.dislikes += 1;
    post.updatedAt = new Date();
    await post.save();

    // Award XP for disliking (same as liking - engagement is engagement)
    await awardXp(req.user.id, 'likeGiven', 0, { postId: post._id, type: 'dislike' });

    // Award XP to post author for receiving dislike (controversy = engagement!)
    if (post.author && post.author.toString() !== req.user.id) {
      await awardXp(post.author, 'dislikeReceived', 0, { postId: post._id });
    }

    res.json({ likes: post.likes, dislikes: post.dislikes });
  } catch (err) {
    console.error('Error disliking post:', err);
    res.status(500).json({ error: 'Failed to dislike post' });
  }
});

// POST /api/social/posts/:id/view - Record view
app.post('/api/social/posts/:id/view', auth, async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Increment view count
    post.views += 1;

    // Track unique views if user is logged in
    if (req.userId && !post.viewedBy.map(id => id.toString()).includes(req.userId)) {
      post.viewedBy.push(req.userId);
    }

    await post.save();
    res.json({ views: post.views });
  } catch (err) {
    console.error('Error recording view:', err);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// POST /api/social/posts/:id/comments - Add comment (auth required)
app.post('/api/social/posts/:id/comments', socialAuth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Comment exceeds 500 characters' });
    }

    const post = await SocialPost.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = {
      author: req.user.id,
      content: content.trim(),
      createdAt: new Date(),
    };

    post.comments.push(comment);
    post.commentCount = post.comments.length;
    post.updatedAt = new Date();
    await post.save();

    // Return populated post
    const populatedPost = await SocialPost.findById(post._id)
      .populate('author', 'username avatar')
      .populate('comments.author', 'username avatar')
      .lean();

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// DELETE /api/social/posts/:postId/comments/:commentId - Delete comment (auth required)
app.delete('/api/social/posts/:postId/comments/:commentId', socialAuth, async (req, res) => {
  try {
    const post = await SocialPost.findById(req.params.postId);

    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only comment author, post author, or admin can delete
    if (
      comment.author.toString() !== req.user.id &&
      post.author.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    post.comments.pull(req.params.commentId);
    post.commentCount = post.comments.length;
    post.updatedAt = new Date();
    await post.save();

    res.json({ success: true, commentCount: post.commentCount });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// GET /api/social/users/:userId/posts - Get user's posts
app.get('/api/social/users/:userId/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await SocialPost.find({
      author: req.params.userId,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username avatar')
      .populate('linkedDivide', 'title status')
      .lean();

    const total = await SocialPost.countDocuments({
      author: req.params.userId,
      isDeleted: false
    });

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + posts.length < total,
      }
    });
  } catch (err) {
    console.error('Error fetching user posts:', err);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// ==========================================
// SENTIMENT ANALYSIS ROUTES
// ==========================================

// GET /api/divides/:id/sentiment - Get sentiment data for a divide
app.get('/api/divides/:id/sentiment', async (req, res) => {
  try {
    const divideId = req.params.id;

    // Get existing sentiment data
    let sentiment = await DivideSentiment.findOne({ divide: divideId }).lean();

    if (!sentiment) {
      // Return default neutral sentiment if none exists
      return res.json({
        current: {
          optionA: { score: 50, confidence: 0, label: 'neutral', sampleSize: 0 },
          optionB: { score: 50, confidence: 0, label: 'neutral', sampleSize: 0 },
          themes: [],
          analyzedAt: null,
        },
        hasData: false,
      });
    }

    res.json({
      current: sentiment.current,
      history: sentiment.history?.slice(-10) || [], // Last 10 snapshots
      totalCommentsAnalyzed: sentiment.totalCommentsAnalyzed,
      totalPostsAnalyzed: sentiment.totalPostsAnalyzed,
      hasData: true,
    });
  } catch (err) {
    console.error('Error fetching sentiment:', err);
    res.status(500).json({ error: 'Failed to fetch sentiment' });
  }
});

// POST /api/divides/:id/sentiment/analyze - Trigger sentiment analysis (admin or auto)
app.post('/api/divides/:id/sentiment/analyze', auth, async (req, res) => {
  try {
    const divideId = req.params.id;

    // Get the divide
    const divide = await Divide.findById(divideId);
    if (!divide) {
      return res.status(404).json({ error: 'Divide not found' });
    }

    // Get comments for this divide
    const comments = await DivideComment.find({ divide: divideId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('content createdAt')
      .lean();

    // Get social posts that mention this divide (by linked divide or keywords)
    const posts = await SocialPost.find({
      $or: [
        { linkedDivide: divideId },
        { content: { $regex: divide.title.split(' ').slice(0, 3).join('|'), $options: 'i' } }
      ],
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('content createdAt')
      .lean();

    // Run Gemini analysis
    const analysis = await analyzeDivideSentiment({
      divideTitle: divide.title,
      optionA: divide.left,
      optionB: divide.right,
      comments,
      posts,
    });

    if (analysis.error) {
      return res.status(500).json({ error: analysis.error });
    }

    // Update or create sentiment record
    const now = new Date();
    const sentimentData = {
      optionA: {
        score: analysis.optionA.score,
        confidence: analysis.optionA.confidence,
        sampleSize: analysis.optionA.sampleSize,
        label: analysis.optionA.label,
      },
      optionB: {
        score: analysis.optionB.score,
        confidence: analysis.optionB.confidence,
        sampleSize: analysis.optionB.sampleSize,
        label: analysis.optionB.label,
      },
      themes: analysis.themes,
      analyzedAt: now,
    };

    let sentiment = await DivideSentiment.findOne({ divide: divideId });

    if (sentiment) {
      // Add current to history before updating
      sentiment.history.push({
        timestamp: sentiment.current.analyzedAt,
        optionA: sentiment.current.optionA,
        optionB: sentiment.current.optionB,
        themes: sentiment.current.themes,
        rawAnalysis: analysis.rawAnalysis,
      });

      // Keep only last 50 history entries
      if (sentiment.history.length > 50) {
        sentiment.history = sentiment.history.slice(-50);
      }

      sentiment.current = sentimentData;
      sentiment.totalCommentsAnalyzed += comments.length;
      sentiment.totalPostsAnalyzed += posts.length;
      sentiment.updatedAt = now;
    } else {
      sentiment = new DivideSentiment({
        divide: divideId,
        current: sentimentData,
        history: [],
        totalCommentsAnalyzed: comments.length,
        totalPostsAnalyzed: posts.length,
      });
    }

    await sentiment.save();

    res.json({
      success: true,
      current: sentiment.current,
      summary: analysis.summary,
      commentsAnalyzed: comments.length,
      postsAnalyzed: posts.length,
    });

  } catch (err) {
    console.error('Error analyzing sentiment:', err);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// GET /api/sentiment/trending - Get divides with most active sentiment
app.get('/api/sentiment/trending', async (req, res) => {
  try {
    const sentiments = await DivideSentiment.find({})
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('divide', 'title left right status')
      .lean();

    res.json(sentiments.filter(s => s.divide)); // Filter out any with deleted divides
  } catch (err) {
    console.error('Error fetching trending sentiment:', err);
    res.status(500).json({ error: 'Failed to fetch trending' });
  }
});

// ==========================================
// PAYMENT ROUTES (NOWPayments)
// ==========================================
// Mount payment routes with auth middleware
app.use('/api/payments', auth, paymentRoutes);

// Admin-only payment routes need additional protection
app.use('/api/payments/admin', auth, adminOnly);

// ==========================================
// ==========================================
// STATIC FILES & SPA
// ==========================================

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'divide-frontend-fresh', 'dist')));

// SPA fallback - must be last route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'divide-frontend-fresh', 'dist', 'index.html'));
});

// ==========================================
// SOCKET.IO
// ==========================================

// Chat history is now stored in database (ChatMessage model)
const MAX_CHAT_HISTORY = 100;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Chat: request history from database
  socket.on('chat:requestHistory', async () => {
    try {
      const history = await ChatMessage.find()
        .sort({ timestamp: -1 })
        .limit(MAX_CHAT_HISTORY)
        .lean();
      // Reverse to show oldest first
      socket.emit('chat:history', history.reverse());
    } catch (err) {
      console.error('Failed to fetch chat history:', err);
      socket.emit('chat:history', []);
    }
  });

  // Chat: send message and save to database
  socket.on('chat:sendMessage', async (data) => {
    try {
      const { username, message, userId } = data;
      if (!message || !message.trim()) return;

      // Get user info for avatar and level
      let userInfo = { username: username || 'Anonymous', level: 1, profileImage: null };
      if (userId) {
        const user = await User.findById(userId).select('username level profileImage').lean();
        if (user) {
          userInfo = {
            username: user.username,
            level: user.level || 1,
            profileImage: user.profileImage || null,
          };
        }
      }

      // Create and save message to database
      const chatMessage = new ChatMessage({
        username: userInfo.username,
        message: message.trim().substring(0, 500),
        userId: userId || undefined,
        level: userInfo.level,
        profileImage: userInfo.profileImage,
      });

      await chatMessage.save();

      // Prepare message for broadcast
      const broadcastMessage = {
        id: chatMessage._id.toString(),
        username: chatMessage.username,
        message: chatMessage.message,
        level: chatMessage.level,
        profileImage: chatMessage.profileImage,
        timestamp: chatMessage.timestamp.toISOString(),
      };

      // Broadcast to all clients
      io.emit('chat:message', broadcastMessage);
    } catch (err) {
      console.error('Chat message error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Scheduled tasks: auto-end divides
setInterval(async () => {
  try {
    const now = new Date();
    const expired = await Divide.find({ status: 'active', endTime: { $lt: now } });

    for (const divide of expired) {
      console.log(`Auto-ending expired divide: ${divide.id}`);
      await endDivideById(divide.id || divide._id, divide.creatorId);
    }
  } catch (err) {
    console.error('Error in divide auto-end task:', err);
  }
}, 30000); // Check every 30 seconds

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API ready at http://localhost:${PORT}/api`);
});
