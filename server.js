import { Server } from "socket.io";
import dotenv from 'dotenv';
dotenv.config();
import Divide from './models/Divide.js';
import Jackpot from './models/Jackpot.js';
import Rugged from './models/Rugged.js';
import House from './models/House.js';
import KenoReserve from './models/KenoReserve.js';
import Ledger from './models/Ledger.js';
import User from './models/User.js';
import SupportTicket from './models/SupportTicket.js';
import KenoRound from './models/KenoRound.js';
import ChatMessage from './models/ChatMessage.js';
import ChatMute from './models/ChatMute.js';
import ModeratorChatMessage from './models/ModeratorChatMessage.js';
import Notification from './models/Notification.js';
import UserEngagement from './models/UserEngagement.js';
import PlinkoGame from './models/PlinkoGame.js';
import PlinkoRecording from './models/PlinkoRecording.js';
import BlackjackGame from './models/BlackjackGame.js';
import CaseBattle from './models/CaseBattle.js';
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
import { paytables, configured } from './paytable-data.js';
import http from 'http';
import registerRugged from './routes/rugged-pure-rng.js';
import registerCaseBattles from './routes/caseBattles.js';
import registerCases from './routes/cases.js';
import { setupItemRoutes } from './routes/items.js';
import blackjackRoutes from './routes/blackjack.js';
import registerPlinko from './routes/plinko.js';
import registerWheelRoutes from './routes/wheel.js';
import WheelGameManager from './utils/wheelGameManager.js';
import { generateServerSeedFromRandomOrg, getEOSBlockHash, createGameSeed, generateDrawnNumbers, hashServerSeed } from './utils/kenoProofOfFair.js';

// ONLY ONE __dirname — AT THE TOP
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
console.log('startup: express app created');

// Connect to MongoDB early so that mongoose operations don't buffer and time out.
// Use top-level await to fail fast if DB is unreachable.
try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rafflehub', {
    // short server selection timeout helps fail fast in dev when DB unreachable
    serverSelectionTimeoutMS: 5000,
    // keep compatibility options
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');
} catch (err) {
  console.error('Failed to connect to MongoDB during startup', err && err.message ? err.message : err);
  // Exit: the app depends on DB; fail fast and let operator fix DB config.
  process.exit(1);
}
// Auth middleware: verify Bearer JWT and set req.userId. Falls back to no-user when
// Authorization header missing so public routes still work.
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Email transporter setup
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Money helpers (server stores cents as integers, API returns dollars)
const toCents = (n) => Math.round((Number(n) || 0) * 100);
const toDollars = (cents) => Number(((Number(cents) || 0) / 100).toFixed(2));
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

// Simple adminOnly guard that checks the user's role on the DB when present.
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

// moderatorOnly guard that allows moderators and admins
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

// Helper function to update house statistics for a game
// game: 'plinko', 'blackjack', 'keno', 'rugged', 'mines', 'divides'
// betAmount: amount wagered in cents
// payout: amount paid out in cents (0 if player lost)
async function updateHouseStats(game, betAmount, payout) {
  try {
    const jackpotFee = Math.floor(betAmount * 0.01); // 1% to jackpot
    const houseNet = betAmount - payout - jackpotFee; // Remaining 99% minus payout

    await House.findOneAndUpdate(
      { id: 'global' },
      {
        $inc: {
          [`${game}.totalBets`]: betAmount,
          [`${game}.totalPayouts`]: payout,
          [`${game}.jackpotFees`]: jackpotFee,
          [`${game}.houseProfit`]: houseNet,
          houseTotal: houseNet
        }
      },
      { upsert: true }
    );

    // Add jackpot fee to global jackpot
    await Jackpot.findOneAndUpdate(
      { id: 'global' },
      { $inc: { amount: jackpotFee } },
      { upsert: true }
    );

    console.log(`[House Stats] ${game}: bet=${betAmount}, payout=${payout}, jackpotFee=${jackpotFee}, houseNet=${houseNet}`);
  } catch (err) {
    console.error(`Failed to update house stats for ${game}:`, err);
  }
}

// ========================================
// XP & LEVEL SYSTEM
// ========================================
import { XP_RATES, getLevelFromXP, getXPToNextLevel, getProgressPercent } from './utils/xpSystem.js';

/**
 * Award XP to a user and handle level-ups
 * @param {string} userId - User ID to award XP to
 * @param {string} type - Type of engagement (usdWager, likeReceived, etc.)
 * @param {number} amount - Base amount (e.g., wagered cents, not the XP itself)
 * @param {object} extra - Extra metadata to log
 * @returns {object} { leveledUp: boolean, newLevel: number, xpAwarded: number }
 */
async function awardXp(userId, type, amount = 0, extra = {}) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error(`[XP] User ${userId} not found`);
      return { leveledUp: false, newLevel: 1, xpAwarded: 0 };
    }

    // Calculate XP based on type
    let xpAwarded = 0;
    switch (type) {
      case 'usdWager':
        // $1 wagered = 2 XP (amount in cents, so divide by 100 then multiply by rate)
        xpAwarded = Math.floor((amount / 100) * XP_RATES.usdWager);
        break;
      case 'gcScWager':
        // $1 casino wagered = 1 XP
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

    // Get level before update
    const oldLevel = user.level;
    const oldBadge = user.currentBadge;

    // Update XP totals
    user.xp = (user.xp || 0) + xpAwarded;
    user.xpThisWeek = (user.xpThisWeek || 0) + xpAwarded;
    user.xpThisMonth = (user.xpThisMonth || 0) + xpAwarded;

    // Check for level up
    const levelData = getLevelFromXP(user.xp);
    user.level = levelData.level;
    user.currentBadge = levelData.badgeName;

    // Track wager amounts
    if (type === 'usdWager') {
      user.totalWageredUsd = (user.totalWageredUsd || 0) + amount;
    }

    await user.save();

    // Log engagement
    await UserEngagement.create({
      userId: user._id,
      type,
      xpAwarded,
      metadata: extra,
      timestamp: new Date()
    });

    const leveledUp = user.level > oldLevel;

    // Emit level-up event to socket
    if (leveledUp) {
      console.log(`🎉 [XP] User ${user.username} leveled up! ${oldLevel} → ${user.level} (${oldBadge} → ${user.currentBadge})`);
      io.emit('userLevelUp', {
        userId: user._id,
        username: user.username,
        newLevel: user.level,
        newBadge: user.currentBadge,
        oldLevel,
        oldBadge
      });
    }

    console.log(`[XP] ${user.username}: +${xpAwarded} XP (${type}) → Total: ${user.xp} XP, Lv.${user.level}`);

    return {
      leveledUp,
      newLevel: user.level,
      xpAwarded,
      newBadge: user.currentBadge
    };
  } catch (err) {
    console.error(`[XP] Error awarding XP:`, err);
    return { leveledUp: false, newLevel: 1, xpAwarded: 0 };
  }
}

// Simple in-memory play rate limiter for Keno to prevent abuse during dev.
// Keeps recent timestamps per user and allows up to `max` plays per windowMs.
const _playRateMap = new Map();
function checkPlayRate(userId, { windowMs = 5000, max = 50 } = {}) {
  if (!userId) return false;
  const now = Date.now();
  const arr = _playRateMap.get(userId) || [];
  const recent = arr.filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    // record the attempt
    recent.push(now);
    _playRateMap.set(userId, recent);
    console.log('[RATE LIMIT] User', userId, 'exceeded rate limit:', recent.length, 'plays in', windowMs, 'ms');
    return false;
  }
  recent.push(now);
  _playRateMap.set(userId, recent);
  return true;
}

// Configure CORS to allow the React dev server and allow credentials (cookies)
const allowedOrigins = [
  'https://thedivide.us',
  'https://www.thedivide.us',
  'https://betbro.club',
  'https://www.betbro.club',
  'https://the-divide.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for image uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${random}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  },
});

// Serve uploaded files as static assets
app.use('/uploads', express.static(uploadDir));

// Image upload endpoint - saves as base64 in database to persist across deploys
app.post('/upload', auth, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Convert image to base64 and save directly to database
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;

      // Delete the temporary file from disk
      fs.unlinkSync(req.file.path);

      // Save base64 image to user profile
      if (req.userId) {
        await User.findByIdAndUpdate(req.userId, { profileImage: base64Image });
        console.log('Profile image saved to database for user:', req.userId);
      }

      res.json({ url: base64Image, profileImage: base64Image });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  });
});

// Endpoint to set profile image from preloaded SVGs
app.post('/api/profile-image', auth, async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
    const { imagePath } = req.body || {};
    if (!imagePath || typeof imagePath !== 'string') return res.status(400).json({ error: 'Missing imagePath' });

    // If it's a local file path (preset SVG), convert to base64
    if (imagePath.startsWith('/profilesvg/') || imagePath.startsWith('/uploads/')) {
      try {
        const filePath = path.join(__dirname, 'divide-frontend-fresh', 'public', imagePath);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          const mimeType = ext === '.svg' ? 'image/svg+xml' :
            ext === '.png' ? 'image/png' :
              ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                ext === '.webp' ? 'image/webp' : 'image/svg+xml';
          const base64Image = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
          await User.findByIdAndUpdate(req.userId, { profileImage: base64Image });
          console.log('Preset avatar converted to base64 and saved for user:', req.userId);
          return res.json({ success: true, imagePath: base64Image });
        }
      } catch (e) {
        console.error('Error converting preset avatar to base64:', e);
        // Fall through to save the path as-is if conversion fails
      }
    }

    // For external URLs or if file not found, save as-is
    await User.findByIdAndUpdate(req.userId, { profileImage: imagePath });
    res.json({ success: true, imagePath });
  } catch (err) {
    console.error('Set profile image error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========================================
// USER PROFILE & TIPPING
// ========================================

// Get user profile (public stats)
app.get('/api/user/profile', async (req, res) => {
  try {
    const { id, username } = req.query;

    if (!id && !username) {
      return res.status(400).json({ error: 'User ID or username required' });
    }

    const query = id ? { _id: id } : { username: username };
    const user = await User.findOne(query).select(
      'username profileImage totalBets totalWins totalLosses wagered role createdAt'
    ).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send tip to another user
app.post('/api/user/tip', auth, async (req, res) => {
  try {
    const { recipientId, amount } = req.body;

    if (!recipientId || !amount) {
      return res.status(400).json({ error: 'Recipient ID and amount required' });
    }

    const tipAmount = Math.floor(Number(amount) * 100); // Convert to cents

    if (isNaN(tipAmount) || tipAmount <= 0) {
      return res.status(400).json({ error: 'Invalid tip amount' });
    }

    // Get sender
    const sender = await User.findById(req.userId);
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    // Check if trying to tip yourself
    if (sender._id.toString() === recipientId) {
      return res.status(400).json({ error: 'You cannot tip yourself' });
    }

    // Check sender balance
    if (sender.balance < tipAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Get recipient
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Process tip
    sender.balance -= tipAmount;
    recipient.balance += tipAmount;

    await sender.save();
    await recipient.save();

    // Create notification for recipient
    await Notification.create({
      userId: recipient._id,
      type: 'system',
      title: 'Tip Received!',
      message: `${sender.username} sent you a tip of $${amount}!`,
      icon: '💰'
    });

    console.log(`💰 ${sender.username} tipped ${recipient.username} $${amount}`);

    res.json({ 
      success: true, 
      message: `Successfully sent $${amount} to ${recipient.username}`,
      newBalance: sender.balance
    });
  } catch (err) {
    console.error('Tip error:', err);
    res.status(500).json({ error: 'Failed to send tip' });
  }
});

// ========================================
// XP & LEVEL SYSTEM ENDPOINTS
// ========================================

// Get current user's XP progress
app.get('/api/me/xp', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('xp level currentBadge xpThisWeek xpThisMonth username');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const xpToNextLevel = getXPToNextLevel(user.xp);
    const progressPercent = getProgressPercent(user.xp);
    const levelData = getLevelFromXP(user.xp);

    // Get weekly rank
    const usersAbove = await User.countDocuments({ xpThisWeek: { $gt: user.xpThisWeek } });
    const weeklyRank = usersAbove + 1;

    res.json({
      xp: user.xp,
      level: user.level,
      currentBadge: user.currentBadge,
      badgeColor: levelData.badgeColorHex,
      xpToNextLevel,
      progressPercent: Math.round(progressPercent * 10) / 10, // Round to 1 decimal
      weeklyRank,
      xpThisWeek: user.xpThisWeek,
      xpThisMonth: user.xpThisMonth
    });
  } catch (err) {
    console.error('Get XP error:', err);
    res.status(500).json({ error: 'Failed to fetch XP data' });
  }
});

// Get leaderboard (weekly or monthly)
app.get('/api/leaderboard', async (req, res) => {
  try {
    const period = req.query.period || 'weekly'; // 'weekly' or 'monthly'
    const limit = Math.min(parseInt(req.query.limit) || 100, 100);

    const sortField = period === 'weekly' ? 'xpThisWeek' : 'xpThisMonth';

    const leaders = await User.find()
      .sort({ [sortField]: -1 })
      .limit(limit)
      .select(`username profileImage level currentBadge ${sortField}`)
      .lean();

    const leaderboard = leaders.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      username: user.username,
      profileImage: user.profileImage,
      level: user.level,
      badge: user.currentBadge,
      xp: user[sortField]
    }));

    res.json({ period, leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Like a divide side (awards XP to creator)
app.post('/api/divides/:id/like/:side', auth, async (req, res) => {
  try {
    const { id, side } = req.params;

    if (!['A', 'B'].includes(side.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid side. Must be A or B' });
    }

    const divide = await Divide.findOne({ $or: [{ id }, { _id: id }] });
    if (!divide) {
      return res.status(404).json({ error: 'Divide not found' });
    }

    // Increment like counter
    const likesField = side.toUpperCase() === 'A' ? 'likesA' : 'likesB';
    divide[likesField] = (divide[likesField] || 0) + 1;
    await divide.save();

    // Award XP to liker (encourages engagement)
    await awardXp(req.userId, 'likeGiven', 0, { divideId: divide._id, side });

    // Award XP to divide creator (if user-created)
    if (divide.isUserCreated && divide.creatorId) {
      await awardXp(divide.creatorId, 'likeReceived', 0, { 
        divideId: divide._id, 
        side,
        fromUser: req.userId 
      });
    }

    res.json({ 
      success: true,
      likesA: divide.likesA,
      likesB: divide.likesB
    });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ error: 'Failed to like divide' });
  }
});

// Dislike a divide side (awards XP to creator, but less than like)
app.post('/api/divides/:id/dislike/:side', auth, async (req, res) => {
  try {
    const { id, side } = req.params;

    if (!['A', 'B'].includes(side.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid side. Must be A or B' });
    }

    const divide = await Divide.findOne({ $or: [{ id }, { _id: id }] });
    if (!divide) {
      return res.status(404).json({ error: 'Divide not found' });
    }

    // Increment dislike counter
    const dislikesField = side.toUpperCase() === 'A' ? 'dislikesA' : 'dislikesB';
    divide[dislikesField] = (divide[dislikesField] || 0) + 1;
    await divide.save();

    // Award XP to disliker (encourages engagement)
    await awardXp(req.userId, 'likeGiven', 0, { divideId: divide._id, side, type: 'dislike' });

    // Award XP to divide creator (engagement is engagement)
    if (divide.isUserCreated && divide.creatorId) {
      await awardXp(divide.creatorId, 'dislikeReceived', 0, { 
        divideId: divide._id, 
        side,
        fromUser: req.userId 
      });
    }

    res.json({ 
      success: true,
      dislikesA: divide.dislikesA,
      dislikesB: divide.dislikesB
    });
  } catch (err) {
    console.error('Dislike error:', err);
    res.status(500).json({ error: 'Failed to dislike divide' });
  }
});

// Support Ticket System - creates private Discord threads
app.post('/api/support/ticket', async (req, res) => {
  try {
    const { subject, category, description, email } = req.body;

    // Validate required fields
    if (!subject || !category || !description) {
      return res.status(400).json({ error: 'Subject, category, and description are required' });
    }

    // Get user info if authenticated
    let user = null;
    let username = 'Guest';
    let userId = null;
    let discordId = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        user = await User.findById(decoded.userId);
        if (user) {
          username = user.username;
          userId = user._id;
          discordId = user.discordId || null;
        }
      } catch (err) {
        // Token invalid, continue as guest
      }
    }

    // Require authentication
    if (!user) {
      return res.status(401).json({ error: 'You must be logged in to submit a ticket' });
    }

    // Create ticket in database
    const ticket = new SupportTicket({
      userId: user._id,
      category,
      subject,
      description,
      email: email || user.googleEmail || '',
      status: 'open',
      priority: category === 'payment' ? 'high' : 'medium',
      messages: [{
        sender: user._id,
        senderType: 'user',
        message: description
      }]
    });

    await ticket.save();
    console.log(`✅ Support ticket #${ticket._id} created by ${username} (${userId})`);

    // Send notification to Discord (no thread, just a simple notification)
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_SUPPORT_CHANNEL_ID;
    const moderatorRoleId = process.env.DISCORD_MODERATOR_ROLE_ID;

    if (botToken && channelId) {
      try {
        const ticketId = ticket._id.toString().substring(18).toUpperCase();
        const ticketUrl = `${process.env.FRONTEND_URL || 'https://thedivide.us'}/support/${ticket._id}`;

        // Create Discord embed for notification
        const embed = {
          title: `🎫 New Support Ticket #${ticketId}`,
          color: category === 'bug' ? 0xff0000 :
            category === 'complaint' ? 0xff9900 :
              category === 'payment' ? 0x00ff00 : 0x3b82f6,
          fields: [
            {
              name: '📋 Category',
              value: category.charAt(0).toUpperCase() + category.slice(1),
              inline: true
            },
            {
              name: '👤 User',
              value: username,
              inline: true
            },
            {
              name: '📌 Subject',
              value: subject,
              inline: false
            },
            {
              name: '📝 Description',
              value: description.length > 1024 ? description.substring(0, 1021) + '...' : description,
              inline: false
            },
            {
              name: '🔗 View Ticket',
              value: `[Click here to view and respond](${ticketUrl})`,
              inline: false
            }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Support Ticket System - Handle on website'
          }
        };

        // Send notification to channel (not a thread)
        await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: `${moderatorRoleId ? `<@&${moderatorRoleId}>` : '@here'} New support ticket from **${username}**`,
            embeds: [embed]
          })
        });

        console.log(`✅ Discord notification sent for ticket ${ticket._id}`);
      } catch (discordError) {
        console.error('Discord notification failed:', discordError);
        // Continue - ticket still saved in database
      }
    }

    res.json({
      message: 'Ticket submitted successfully! Our team will review it shortly.',
      ticketId: ticket._id
    });

  } catch (err) {
    console.error('Support ticket error:', err);
    res.status(500).json({ error: 'Failed to submit ticket. Please try again.' });
  }
});

// Get user's tickets
app.get('/api/support/tickets', auth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tickets = await SupportTicket.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .populate('messages.sender', 'username profileImage')
      .lean();

    res.json({ tickets });
  } catch (err) {
    console.error('Get tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get all tickets (moderator+ only)
app.get('/api/support/tickets/all', auth, moderatorOnly, async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'username profileImage discordId email googleEmail')
      .populate('messages.sender', 'username profileImage')
      .populate('assignedTo', 'username')
      .populate('escalatedBy', 'username')
      .lean();

    console.log(`📋 Moderator ${req.userId} fetched ${tickets.length} tickets`);
    res.json({ tickets });
  } catch (err) {
    console.error('Get all tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Export email list for marketing campaigns (admin only)
app.get('/api/admin/marketing-emails', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find({
      marketingConsent: true,
      email: { $exists: true, $ne: '' }
    })
      .select('username email marketingConsentDate createdAt')
      .sort({ marketingConsentDate: -1 })
      .lean();

    // Format as CSV
    const csv = [
      'Username,Email,Consent Date,Registered Date',
      ...users.map(u =>
        `${u.username},${u.email},${u.marketingConsentDate ? new Date(u.marketingConsentDate).toISOString() : ''},${new Date(u.createdAt).toISOString()}`
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=marketing-emails.csv');
    res.send(csv);
  } catch (err) {
    console.error('Export emails error:', err);
    res.status(500).json({ error: 'Failed to export emails' });
  }
});

// Get single ticket
app.get('/api/support/tickets/:id', auth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.userId).select('role').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ticket = await SupportTicket.findById(req.params.id)
      .populate('userId', 'username profileImage discordId')
      .populate('messages.sender', 'username profileImage role')
      .populate('assignedTo', 'username')
      .populate('escalatedBy', 'username')
      .lean();

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Only allow ticket owner, moderators, or admins to view
    const isModerator = user.role === 'moderator' || user.role === 'admin';
    if (ticket.userId._id.toString() !== req.userId.toString() && !isModerator) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ ticket });
  } catch (err) {
    console.error('Get ticket error:', err);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Add message to ticket
app.post('/api/support/tickets/:id/messages', auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.userId).select('username role').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ticket = await SupportTicket.findById(req.params.id).populate('userId', 'discordId');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Only allow ticket owner, moderators, or admins to add messages
    const isOwner = ticket.userId._id.toString() === req.userId.toString();
    const isModerator = user.role === 'moderator' || user.role === 'admin';

    if (!isOwner && !isModerator) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add message to ticket
    ticket.messages.push({
      sender: req.userId,
      senderType: isModerator ? 'admin' : 'user',
      message: message.trim()
    });

    // Update status if needed
    if (ticket.status === 'open' && isModerator) {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    // Send to Discord thread if it exists
    if (ticket.discordThreadId) {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (botToken) {
        try {
          await fetch(`https://discord.com/api/v10/channels/${ticket.discordThreadId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content: `**${user.username}** ${isModerator ? '(Staff)' : ''}: ${message}`
            })
          });
        } catch (discordErr) {
          console.error('Failed to send message to Discord:', discordErr);
        }
      }
    }

    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('messages.sender', 'username profileImage role')
      .lean();

    res.json({ ticket: populatedTicket });
  } catch (err) {
    console.error('Add message error:', err);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Update ticket status (moderator+ only)
app.patch('/api/support/tickets/:id/status', auth, moderatorOnly, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const ticket = await SupportTicket.findById(req.params.id)
      .populate('userId', 'username')
      .populate('messages.sender', 'username role')
      .populate('assignedTo', 'username')
      .populate('escalatedBy', 'username');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const previousStatus = ticket.status;
    ticket.status = status;
    if (status === 'resolved' || status === 'closed') {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    // Auto-save transcript when ticket is closed (if not already saved)
    if (status === 'closed' && !ticket.transcriptSaved && previousStatus !== 'closed') {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      const transcriptChannelId = process.env.DISCORD_TRANSCRIPT_CHANNEL_ID;

      if (botToken && transcriptChannelId) {
        try {
          const ticketId = ticket._id.toString().substring(18).toUpperCase();
          const ticketUrl = `${process.env.FRONTEND_URL || 'https://thedivide.us'}/support/tickets/${ticket._id}`;
          
          // Create summary embed
          const messageCount = ticket.messages?.length || 0;
          const duration = ticket.resolvedAt && ticket.createdAt 
            ? Math.round((new Date(ticket.resolvedAt) - new Date(ticket.createdAt)) / 1000 / 60)
            : 0;

          const summaryMessage = [
            `📋 **Support Ticket Closed**`,
            ``,
            `**Ticket ID:** #${ticketId}`,
            `**User:** ${ticket.userId?.username || 'Unknown'}`,
            `**Subject:** ${ticket.subject}`,
            `**Category:** ${ticket.category}`,
            `**Priority:** ${ticket.priority.toUpperCase()}`,
            `**Messages:** ${messageCount}`,
            `**Duration:** ${duration} minutes`,
            ticket.assignedTo ? `**Handled by:** ${ticket.assignedTo.username}` : '',
            ticket.escalated ? `**⚠️ Was Escalated**` : '',
            ``,
            `🔗 [View Full Transcript](${ticketUrl})`
          ].filter(Boolean).join('\n');

          await fetch(`https://discord.com/api/v10/channels/${transcriptChannelId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content: summaryMessage
            })
          });

          ticket.transcriptSaved = true;
          await ticket.save();
          console.log(`✅ Auto-saved transcript summary for closed ticket ${ticket._id}`);
        } catch (transcriptErr) {
          console.error('Failed to auto-save transcript:', transcriptErr);
        }
      }
    }

    // Populate and return the updated ticket
    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('userId', 'username profileImage')
      .populate('messages.sender', 'username profileImage role')
      .populate('assignedTo', 'username')
      .populate('escalatedBy', 'username')
      .lean();

    res.json({ ticket: populatedTicket });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Escalate ticket to admins (moderator only)
app.post('/api/support/tickets/:id/escalate', auth, moderatorOnly, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.userId).select('username role').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ticket = await SupportTicket.findById(req.params.id)
      .populate('userId', 'username profileImage')
      .lean();

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.escalated) {
      return res.status(400).json({ error: 'Ticket is already escalated' });
    }

    // Update ticket to escalated status
    await SupportTicket.findByIdAndUpdate(req.params.id, {
      escalated: true,
      escalatedBy: req.userId,
      escalatedAt: new Date(),
      priority: 'urgent'
    });

    // Send Discord notification to admin role
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_SUPPORT_CHANNEL_ID;
    const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;

    if (botToken && channelId && adminRoleId) {
      try {
        const ticketId = ticket._id.toString().substring(18).toUpperCase();
        const ticketUrl = `${process.env.FRONTEND_URL || 'https://thedivide.us'}/support/${ticket._id}`;

        const embed = {
          title: `🚨 ESCALATED TICKET #${ticketId}`,
          color: 0xff0000,
          fields: [
            {
              name: '⚠️ Escalated By',
              value: user.username,
              inline: true
            },
            {
              name: '👤 Original User',
              value: ticket.userId.username,
              inline: true
            },
            {
              name: '📋 Category',
              value: ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1),
              inline: true
            },
            {
              name: '📌 Subject',
              value: ticket.subject,
              inline: false
            },
            {
              name: '🔗 View Ticket',
              value: `[Click here to view and respond](${ticketUrl})`,
              inline: false
            }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Support Ticket Escalated - Immediate Admin Attention Required'
          }
        };

        await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: `<@&${adminRoleId}> 🚨 **ESCALATED SUPPORT TICKET** - Immediate attention required!`,
            embeds: [embed]
          })
        });

        console.log(`✅ Escalation notification sent for ticket ${ticket._id}`);
      } catch (discordError) {
        console.error('Discord escalation notification failed:', discordError);
      }
    }

    res.json({ message: 'Ticket escalated to admins successfully' });
  } catch (err) {
    console.error('Escalate ticket error:', err);
    res.status(500).json({ error: 'Failed to escalate ticket' });
  }
});

// Save ticket transcript to Discord (moderator only)
app.post('/api/support/tickets/:id/transcript', auth, moderatorOnly, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('userId', 'username profileImage')
      .populate('messages.sender', 'username role')
      .populate('assignedTo', 'username')
      .populate('escalatedBy', 'username')
      .lean();

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Generate transcript text
    const ticketId = ticket._id.toString().substring(18).toUpperCase();
    const transcriptLines = [
      `═══════════════════════════════════════════════════`,
      `SUPPORT TICKET TRANSCRIPT #${ticketId}`,
      `═══════════════════════════════════════════════════`,
      ``,
      `User: ${ticket.userId.username}`,
      `Category: ${ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}`,
      `Subject: ${ticket.subject}`,
      `Status: ${ticket.status.toUpperCase()}`,
      `Priority: ${ticket.priority.toUpperCase()}`,
      `Created: ${new Date(ticket.createdAt).toLocaleString()}`,
      ticket.resolvedAt ? `Resolved: ${new Date(ticket.resolvedAt).toLocaleString()}` : '',
      ticket.assignedTo ? `Assigned To: ${ticket.assignedTo.username}` : '',
      ticket.escalated ? `⚠️ ESCALATED by ${ticket.escalatedBy?.username} at ${new Date(ticket.escalatedAt).toLocaleString()}` : '',
      ``,
      `───────────────────────────────────────────────────`,
      `CONVERSATION`,
      `───────────────────────────────────────────────────`,
      ``
    ].filter(Boolean).join('\n');

    const messagesText = ticket.messages.map((msg, index) => {
      const sender = msg.sender?.username || 'Unknown';
      const role = msg.senderType === 'admin' ? ' [ADMIN]' : '';
      const timestamp = new Date(msg.createdAt).toLocaleString();
      return `[${timestamp}] ${sender}${role}:\n${msg.message}\n`;
    }).join('\n');

    const fullTranscript = transcriptLines + messagesText + `\n═══════════════════════════════════════════════════`;

    // Send to Discord transcript channel
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const transcriptChannelId = process.env.DISCORD_TRANSCRIPT_CHANNEL_ID;

    if (!botToken || !transcriptChannelId) {
      return res.status(500).json({ error: 'Discord transcript channel not configured' });
    }

    try {
      // Split transcript into chunks if too long (Discord has 2000 char limit)
      const chunks = [];
      let currentChunk = '';
      
      for (const line of fullTranscript.split('\n')) {
        if ((currentChunk + line + '\n').length > 1900) {
          chunks.push('```\n' + currentChunk + '```');
          currentChunk = line + '\n';
        } else {
          currentChunk += line + '\n';
        }
      }
      if (currentChunk) {
        chunks.push('```\n' + currentChunk + '```');
      }

      // Send header message
      const ticketUrl = `${process.env.FRONTEND_URL || 'https://thedivide.us'}/support/${ticket._id}`;
      await fetch(`https://discord.com/api/v10/channels/${transcriptChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: `📋 **Ticket #${ticketId}** transcript saved - [View Online](${ticketUrl})`
        })
      });

      // Send transcript chunks
      for (const chunk of chunks) {
        await fetch(`https://discord.com/api/v10/channels/${transcriptChannelId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: chunk
          })
        });
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Mark ticket as transcript saved
      await SupportTicket.findByIdAndUpdate(req.params.id, {
        transcriptSaved: true
      });

      console.log(`✅ Transcript saved for ticket ${ticket._id}`);
      res.json({ message: 'Transcript saved to Discord successfully' });
    } catch (discordError) {
      console.error('Discord transcript save failed:', discordError);
      res.status(500).json({ error: 'Failed to save transcript to Discord' });
    }
  } catch (err) {
    console.error('Save transcript error:', err);
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

// Assign ticket to moderator
app.post('/api/support/tickets/:id/assign', auth, moderatorOnly, async (req, res) => {
  try {
    const { moderatorId } = req.body;
    console.log(`[Assign] Request to assign ticket ${req.params.id} to ${moderatorId}, requester: ${req.userId}`);
    
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Verify the moderatorId is the current user (moderators can only assign to themselves)
    if (String(moderatorId) !== String(req.userId)) {
      console.log(`[Assign] ❌ ID mismatch: moderatorId=${moderatorId}, req.userId=${req.userId}`);
      return res.status(403).json({ error: 'You can only assign tickets to yourself' });
    }

    // Update ticket assignment
    ticket.assignedTo = moderatorId;
    
    // If ticket is still open, move it to in_progress
    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    // Return populated ticket
    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('assignedTo', 'username profileImage')
      .lean();

    console.log(`✅ Ticket ${ticket._id} assigned to moderator ${moderatorId}`);
    res.json({ message: 'Ticket assigned successfully', ticket: populatedTicket });
  } catch (err) {
    console.error('Assign ticket error:', err);
    res.status(500).json({ error: 'Failed to assign ticket' });
  }
});

// Update ticket priority
app.patch('/api/support/tickets/:id/priority', auth, moderatorOnly, async (req, res) => {
  try {
    const { priority } = req.body;
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority level' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    ticket.priority = priority;
    await ticket.save();

    console.log(`🔄 Ticket ${ticket._id} priority changed to ${priority}`);
    res.json({ message: 'Priority updated successfully', ticket });
  } catch (err) {
    console.error('Update priority error:', err);
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

// ========================================
// SUPPORT TEAM MANAGEMENT
// ========================================

// Get team members (admins and moderators)
app.get('/api/support/team', auth, moderatorOnly, async (req, res) => {
  try {
    const team = await User.find({ 
      role: { $in: ['moderator', 'admin'] } 
    })
    .select('username profileImage email role createdAt')
    .sort({ role: -1, createdAt: 1 }) // admins first, then by join date
    .lean();
    
    console.log(`📋 Team members fetched: ${team.length} members`);
    res.json({ team });
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Add team member by username (admin only)
app.post('/api/support/team/add', auth, adminOnly, async (req, res) => {
  try {
    const { username, role } = req.body;
    
    if (!username || !role) {
      return res.status(400).json({ error: 'Username and role are required' });
    }
    
    if (role !== 'moderator' && role !== 'admin') {
      return res.status(400).json({ error: 'Invalid role. Must be moderator or admin.' });
    }
    
    // Find user by username (case-insensitive)
    const targetUser = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    
    if (!targetUser) {
      return res.status(404).json({ error: `User "${username}" not found` });
    }
    
    if (targetUser.role === role) {
      return res.status(400).json({ error: `${username} is already a ${role}` });
    }
    
    // Update user role
    targetUser.role = role;
    await targetUser.save();
    
    console.log(`✅ User ${username} promoted to ${role} by ${req.userId}`);
    
    res.json({ 
      success: true, 
      message: `${username} has been promoted to ${role}`,
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role,
        profileImage: targetUser.profileImage,
        email: targetUser.email,
        createdAt: targetUser.createdAt
      }
    });
  } catch (err) {
    console.error('Error adding team member:', err);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// Remove team member (demote to user) - admin only
app.post('/api/support/team/remove', auth, adminOnly, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (targetUser.role === 'user') {
      return res.status(400).json({ error: 'User is not a team member' });
    }
    
    // Prevent removing yourself
    if (targetUser._id.toString() === req.userId) {
      return res.status(400).json({ error: 'You cannot remove yourself' });
    }
    
    const oldRole = targetUser.role;
    targetUser.role = 'user';
    await targetUser.save();
    
    console.log(`⚠️ User ${targetUser.username} demoted from ${oldRole} to user by ${req.userId}`);
    
    res.json({ 
      success: true, 
      message: `${targetUser.username} has been removed from the team`
    });
  } catch (err) {
    console.error('Error removing team member:', err);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// ========================================
// MODERATOR PANEL - CHAT MODERATION
// ========================================

// Get recent chat messages for moderation
app.get('/api/moderator/chat-messages', auth, moderatorOnly, async (req, res) => {
  try {
    const messages = await ChatMessage.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get currently muted users
app.get('/api/moderator/muted-users', auth, moderatorOnly, async (req, res) => {
  try {
    const now = new Date();
    const mutedUsers = await ChatMute.find({
      active: true,
      mutedUntil: { $gt: now }
    })
    .sort({ mutedAt: -1 })
    .lean();
    res.json({ mutedUsers });
  } catch (err) {
    console.error('Error fetching muted users:', err);
    res.status(500).json({ error: 'Failed to fetch muted users' });
  }
});

// Mute a user from chat
app.post('/api/moderator/mute-user', auth, moderatorOnly, async (req, res) => {
  try {
    const { username, duration, reason } = req.body; // duration in minutes

    if (!username || !duration) {
      return res.status(400).json({ error: 'Username and duration required' });
    }

    const moderator = await User.findById(req.userId);
    if (!moderator) {
      return res.status(404).json({ error: 'Moderator not found' });
    }

    const targetUser = await User.findOne({ username });
    const mutedUntil = new Date(Date.now() + duration * 60 * 1000);

    // Deactivate any existing active mutes for this user
    await ChatMute.updateMany(
      { username, active: true },
      { active: false }
    );

    // Create new mute
    const mute = await ChatMute.create({
      username,
      userId: targetUser?._id,
      mutedBy: moderator.username,
      mutedById: moderator._id,
      mutedUntil,
      reason: reason || 'No reason provided',
      active: true
    });

    // Notify user they've been muted
    if (targetUser) {
      await Notification.create({
        userId: targetUser._id,
        type: 'system',
        title: 'Chat Timeout',
        message: `You have been muted from chat until ${mutedUntil.toLocaleString()}. Reason: ${reason || 'No reason provided'}`,
        icon: '🔇'
      });
    }

    console.log(`🔇 ${username} muted by ${moderator.username} for ${duration} minutes`);
    res.json({ message: 'User muted successfully', mute });
  } catch (err) {
    console.error('Error muting user:', err);
    res.status(500).json({ error: 'Failed to mute user' });
  }
});

// Unmute a user
app.post('/api/moderator/unmute-user', auth, moderatorOnly, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    // Deactivate all active mutes for this user
    const result = await ChatMute.updateMany(
      { username, active: true },
      { active: false }
    );

    const targetUser = await User.findOne({ username });
    if (targetUser) {
      await Notification.create({
        userId: targetUser._id,
        type: 'system',
        title: 'Chat Unmuted',
        message: 'You have been unmuted and can chat again.',
        icon: '🔊'
      });
    }

    console.log(`🔊 ${username} unmuted (${result.modifiedCount} mutes deactivated)`);
    res.json({ message: 'User unmuted successfully' });
  } catch (err) {
    console.error('Error unmuting user:', err);
    res.status(500).json({ error: 'Failed to unmute user' });
  }
});

// Get active divides for moderation
app.get('/api/moderator/active-divides', auth, moderatorOnly, async (req, res) => {
  try {
    const divides = await Divide.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ divides });
  } catch (err) {
    console.error('Error fetching active divides:', err);
    res.status(500).json({ error: 'Failed to fetch active divides' });
  }
});

// Cancel a divide and refund all participants
app.post('/api/moderator/cancel-divide', auth, moderatorOnly, async (req, res) => {
  try {
    const { divideId, reason } = req.body;

    if (!divideId || !reason) {
      return res.status(400).json({ error: 'Divide ID and reason required' });
    }

    const divide = await Divide.findById(divideId);
    if (!divide) {
      return res.status(404).json({ error: 'Divide not found' });
    }

    if (divide.status !== 'active') {
      return res.status(400).json({ error: 'Divide is not active' });
    }

    const moderator = await User.findById(req.userId);

    // Refund all participants
    let refundedCount = 0;
    for (const short of divide.shorts) {
      if (short.shortAmount > 0 && short.userId) {
        const user = await User.findById(short.userId);
        if (user) {
          user.balance += short.shortAmount;
          await user.save();
          refundedCount++;

          // Notify user of refund
          await Notification.create({
            userId: user._id,
            type: 'system',
            title: 'Divide Cancelled',
            message: `The divide "${divide.title}" was cancelled by a moderator. Your $${toDollars(short.shortAmount)} has been refunded. Reason: ${reason}`,
            icon: '⚠️'
          });
        }
      }
    }

    // Mark divide as cancelled
    divide.status = 'cancelled';
    divide.loserSide = null; // no winner/loser since cancelled
    await divide.save();

    console.log(`⚠️ Divide "${divide.title}" cancelled by ${moderator.username}. Reason: ${reason}. Refunded ${refundedCount} players.`);

    res.json({ 
      message: 'Divide cancelled and players refunded',
      refundedCount,
      reason
    });
  } catch (err) {
    console.error('Error cancelling divide:', err);
    res.status(500).json({ error: 'Failed to cancel divide' });
  }
});

// Delete a chat message
app.delete('/api/moderator/delete-message', auth, moderatorOnly, async (req, res) => {
  try {
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ error: 'Message ID required' });
    }

    const message = await ChatMessage.findByIdAndDelete(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Broadcast message deletion to all connected clients
    io.of('/chat').emit('chat:messageDeleted', { messageId });

    console.log(`🗑️ Message ${messageId} deleted by moderator ${req.userId}`);
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ========================================
// NOTIFICATION SYSTEM
// ========================================

// Get user notifications
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notifications as read
app.post('/api/notifications/mark-read', auth, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ error: 'Notification IDs array required' });
    }

    await Notification.updateMany(
      { _id: { $in: notificationIds }, userId: req.userId },
      { read: true }
    );

    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Delete a notification
app.delete('/api/notifications/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Serve static assets from the frontend `public/` folder so backend can
// directly serve resources like `/keno.png` without duplicating files.
// This keeps the single backend authoritative for these static endpoints
// in dev and production when serving the built frontend.
app.use(express.static(path.join(__dirname, 'divide-frontend-fresh', 'public')));

// Serve the built frontend files (production)
app.use(express.static(path.join(__dirname, 'divide-frontend-fresh', 'dist')));

// Serve raw sound files from the repo-level /sounds directory at the
// `/sounds/*` path so audio requests like `/sounds/click.wav` succeed.
app.use('/sounds', express.static(path.join(__dirname, 'sounds')));

// Simple auth endpoints for the frontend dev server.
// POST /register { username, password } -> { token, userId, balance, role }
app.post('/register', async (req, res) => {
  try {
    const { username, password, email, dateOfBirth, marketingConsent } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate age (must be 18+)
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        return res.status(400).json({ error: 'You must be at least 18 years old to register' });
      }
    }

    // prevent duplicate username
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    // prevent duplicate email if provided
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password with bcrypt (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    const u = await User.create({
      username,
      password: hashedPassword,
      email: email || '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      marketingConsent: marketingConsent || false,
      marketingConsentDate: marketingConsent ? new Date() : null,
      balance: 1000
    });
    const token = jwt.sign({ userId: u._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: u._id, balance: toDollars(u.balance), role: u.role });
  } catch (e) {
    console.error('Register error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ──────────────────────────────────────────────
//  RATE LIMITING CONFIGURATION
// ──────────────────────────────────────────────

// Login rate limiter - 50 attempts per 15 minutes (increased for testing)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// 2FA rate limiter - 10 attempts per 15 minutes (more lenient for typos)
const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many 2FA attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiter - 3 requests per hour
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────────
//  AUTHENTICATION ENDPOINTS
// ──────────────────────────────────────────────

// POST /login { username, password } -> { token, userId, balance, role }
app.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password, twoFactorToken } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

    const u = await User.findOne({ username });
    if (!u) return res.status(400).json({ error: 'Invalid credentials' });

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(password, u.password);
    if (!isValidPassword) return res.status(400).json({ error: 'Invalid credentials' });

    // Check if 2FA is enabled
    if (u.twoFactorEnabled) {
      if (!twoFactorToken) {
        return res.status(200).json({ requires2FA: true, userId: u._id });
      }

      // Verify 2FA token
      const isValid = speakeasy.totp.verify({
        secret: u.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorToken,
        window: 2
      });

      if (!isValid) {
        // Check backup codes
        const backupCodeIndex = u.twoFactorBackupCodes?.findIndex(code =>
          bcrypt.compareSync(twoFactorToken, code)
        );

        if (backupCodeIndex === -1 || backupCodeIndex === undefined) {
          return res.status(400).json({ error: 'Invalid 2FA code' });
        }

        // Remove used backup code
        u.twoFactorBackupCodes.splice(backupCodeIndex, 1);
        await u.save();
      }
    }

    const token = jwt.sign({ userId: u._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: u._id, balance: toDollars(u.balance), role: u.role });
  } catch (e) {
    console.error('Login error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

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
      name: `BetBro (${user.username})`,
      issuer: 'BetBro.club'
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

// POST /api/verify-2fa - Verify 2FA token (for deposits/withdrawals)
app.post('/api/verify-2fa', auth, twoFactorLimiter, async (req, res) => {
  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    // Verify TOTP token
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (isValid) {
      return res.json({ verified: true });
    }

    // Try backup codes
    if (user.twoFactorBackupCodes?.length > 0) {
      const backupCodeIndex = user.twoFactorBackupCodes.findIndex(code =>
        bcrypt.compareSync(token, code)
      );

      if (backupCodeIndex !== -1) {
        // Remove used backup code
        user.twoFactorBackupCodes.splice(backupCodeIndex, 1);
        await user.save();
        return res.json({ verified: true, usedBackupCode: true });
      }
    }

    res.status(400).json({ error: 'Invalid verification code' });
  } catch (err) {
    console.error('2FA verification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password - Request password reset email
app.post('/api/auth/forgot-password', passwordResetLimiter, async (req, res) => {
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
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    try {
      await emailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: 'Password Reset Request - BetBro',
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
            <p style="color: #666; font-size: 12px;">BetBro.club - Online Gaming Platform</p>
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
app.post('/api/auth/reset-password', passwordResetLimiter, async (req, res) => {
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

// ──────────────────────────────────────────────
//  DISCORD OAUTH FOR ACCOUNT LINKING
// ──────────────────────────────────────────────

// Step 1: Redirect to Discord OAuth
app.get('/auth/discord', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback');
  const scope = encodeURIComponent('identify');

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.redirect(discordAuthUrl);
});

// Step 2: Handle Discord OAuth callback
app.get('/auth/discord/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=discord_auth_failed`);
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
        redirect_uri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Discord OAuth error:', tokenData);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=discord_token_failed`);
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
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=discord_user_failed`);
    }

    // Create a temporary token to link this Discord account to website account
    // This token will be used by the frontend to complete the linking
    const linkToken = jwt.sign(
      {
        discordId: discordUser.id,
        discordUsername: `${discordUser.username}#${discordUser.discriminator}`,
        type: 'discord_link'
      },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    // Redirect back to frontend with the link token
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?discord_link=${linkToken}`;
    console.log('🔗 Discord OAuth - Redirecting to:', redirectUrl);
    console.log('🌐 FRONTEND_URL env var:', process.env.FRONTEND_URL);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Discord OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=discord_oauth_error`);
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
    await user.save();

    res.json({
      success: true,
      discordId: linkData.discordId,
      discordUsername: linkData.discordUsername
    });
  } catch (error) {
    console.error('Link Discord error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ──────────────────────────────────────────────
//  DISCORD OAUTH FOR LOGIN/SIGNUP
// ──────────────────────────────────────────────

// Step 1: Redirect to Discord OAuth for login
app.get('/auth/discord/login', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI_LOGIN || 'https://the-divide.onrender.com/auth/discord/login/callback');
  const scope = encodeURIComponent('identify email');

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.redirect(discordAuthUrl);
});

// Step 2: Handle Discord login callback
app.get('/auth/discord/login/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=discord_login_failed`);
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
        redirect_uri: process.env.DISCORD_REDIRECT_URI_LOGIN || 'https://the-divide.onrender.com/auth/discord/login/callback',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Discord login error:', tokenData);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=discord_token_failed`);
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
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=discord_user_failed`);
    }

    // Check if user exists with this Discord ID
    let user = await User.findOne({ discordId: discordUser.id });

    if (!user) {
      // Create new user
      const username = discordUser.username + '_' + discordUser.discriminator;
      user = new User({
        username,
        password: crypto.randomBytes(32).toString('hex'), // Random password (they'll use Discord login)
        balance: 0,
        email: discordUser.email || null, // Collect email from Discord
        discordId: discordUser.id,
        discordUsername: `${discordUser.username}#${discordUser.discriminator}`
      });
      await user.save();
      console.log(`✅ New user created via Discord: ${username} (${discordUser.email || 'no email'})`);
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?discord_login=${token}`);
  } catch (error) {
    console.error('Discord login error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=discord_login_error`);
  }
});

// ──────────────────────────────────────────────
//  GOOGLE OAUTH FOR LOGIN/SIGNUP
// ──────────────────────────────────────────────

// Step 1: Redirect to Google OAuth for login
app.get('/auth/google/login', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.GOOGLE_REDIRECT_URI || 'https://the-divide.onrender.com/auth/google/login/callback');
  const scope = encodeURIComponent('openid email profile');

  console.log('🔵 Google OAuth Login initiated');
  console.log('Client ID:', clientId ? `${clientId.substring(0, 10)}...` : 'MISSING');
  console.log('Redirect URI:', process.env.GOOGLE_REDIRECT_URI);

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.redirect(googleAuthUrl);
});

// Step 2: Handle Google login callback
app.get('/auth/google/login/callback', async (req, res) => {
  const { code, error } = req.query;

  console.log('🔵 Google OAuth Callback received');
  console.log('Code present:', !!code);
  console.log('Error:', error);

  if (!code) {
    console.error('❌ No authorization code received from Google');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=google_login_failed`);
  }

  try {
    console.log('🔵 Exchanging code for access token...');
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
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'https://the-divide.onrender.com/auth/google/login/callback',
      }),
    });

    const tokenData = await tokenResponse.json();

    console.log('Token response status:', tokenResponse.status);
    console.log('Token data:', tokenData.error ? tokenData : 'Access token received');

    if (!tokenData.access_token) {
      console.error('❌ Google login error:', tokenData);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=google_token_failed`);
    }

    console.log('🔵 Fetching user info from Google...');
    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = await userResponse.json();

    console.log('Google user:', googleUser.email || 'No email');

    if (!googleUser.id) {
      console.error('❌ Failed to get Google user:', googleUser);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=google_user_failed`);
    }

    // Check if user exists with this Google ID
    let user = await User.findOne({ googleId: googleUser.id });

    if (!user) {
      // Create new user
      const username = googleUser.email.split('@')[0] + '_google';
      console.log('🔵 Creating new user:', username);
      user = new User({
        username,
        password: crypto.randomBytes(32).toString('hex'), // Random password (they'll use Google login)
        balance: 0,
        googleId: googleUser.id,
        googleEmail: googleUser.email
      });
      await user.save();
      console.log(`✅ New user created via Google: ${username} (${googleUser.email})`);
    } else {
      console.log('✅ Existing user found:', user.username);
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    console.log('✅ Redirecting to frontend with token');
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?google_login=${token}`);
  } catch (error) {
    console.error('❌ Google login error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=google_login_error`);
  }
});

// TEMPORARY: Disable Rugged backend logic so the project can be restarted
// from scratch. These stubs keep the backend file and routes present but
// return a clear 501 response. Re-enable or replace with new Rugged
// implementation when ready.
const RUGGED_DISABLED_MESSAGE = 'Rugged backend cleared for restart; endpoints disabled.';
// Register the new server-authoritative PURE RNG routes later (after auth/admin created)

// Canonical Rugged total supply (can be overridden with env RUGGED_TOTAL_SUPPLY)
const RUGGED_TOTAL_SUPPLY = Number(process.env.RUGGED_TOTAL_SUPPLY || 100000000);

// ──────────────────────────────────────────────
//  PROVABLY FAIR HELPERS FOR KENO
// ──────────────────────────────────────────────
async function sha256(message) {
  const buffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.webcrypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hashToNumbers(hash, max, count) {
  // Convert hex hash into a deterministic PRNG seed and generate `count`
  // unique numbers in range [1..max]. Using a small PRNG seeded from the
  // first 8 hex chars keeps the result deterministic while allowing many
  // numbers to be drawn without reusing overlapping parts of the SHA output.
  const numbers = [];
  // derive a 32-bit seed from the first 8 hex chars (or fallback to 0)
  const seedHex = (hash && hash.length >= 8) ? hash.slice(0, 8) : '00000000';
  let seed = parseInt(seedHex, 16) >>> 0;

  // mulberry32 PRNG — very fast, deterministic, and sufficient here
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(seed || 1);
  const maxAttempts = Math.max(1000, count * 20);
  let attempts = 0;
  while (numbers.length < count && attempts < maxAttempts) {
    const r = Math.floor(rand() * max) + 1;
    if (!numbers.includes(r)) numbers.push(r);
    attempts += 1;
  }
  // If for some reason we failed to generate enough unique numbers (shouldn't happen),
  // fill remaining slots with a deterministic fallback (wrap 1..max)
  if (numbers.length < count) {
    for (let i = 1; numbers.length < count && i <= max; i++) {
      if (!numbers.includes(i)) numbers.push(i);
    }
  }
  return numbers;
}

// server-side seed generator for provably-fair flows
function generateSeed(length = 32) {
  try {
    // returns a hex string of length*2 characters
    return crypto.randomBytes(length).toString('hex');
  } catch (e) {
    // fallback to a less secure seed when randomBytes not available
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  }
}

// alias lowercase
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
    io.emit('newDivide', divide);
    res.json(divide);
  } catch (err) {
    console.error('PATCH /divides/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// VOTE on divide
app.post('/divides/vote', auth, async (req, res) => {
  try {
    // Accept multiple possible id fields from clients
    const { divideId: rawDivideId, side, boostAmount = 0, id: altId, _id: alt_id } = req.body;
    const divideId = rawDivideId || altId || alt_id;
    if (!['A', 'B'].includes(side)) return res.status(400).json({ error: 'Invalid side' });

    // Support finding by short `id` or Mongo `_id` (clients may send either)
    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide) {
      console.log('Vote attempt: divide not found', { divideId, body: req.body });
      return res.status(400).json({ error: 'Divide not found' });
    }
    if (divide.status !== 'active') {
      console.log('Vote attempt on inactive divide', { divideId, status: divide.status, divideRecordId: divide.id || divide._id });
      return res.status(400).json({ error: 'Divide not active' });
    }

    // Enforce creator lock: creator can only vote on their chosen side
    if (divide.isUserCreated && divide.creatorId === req.userId && divide.creatorSide && side !== divide.creatorSide) {
      return res.status(400).json({ error: 'Creator is locked to their chosen side and cannot vote on the other side.' });
    }
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Require bet amount (no free shorts)
    if (!boostAmount || boostAmount <= 0) {
      return res.status(400).json({ error: 'Bet amount required (minimum $0.01)' });
    }

    let shortAmount = boostAmount; // dollar amount being shorted
    let boostCents = toCents(boostAmount); // amount in cents
    
    if (user.balance < boostCents) return res.status(400).json({ error: 'Insufficient balance' });
    user.balance = Math.max(0, user.balance - boostCents);
    
    // Reduce wager requirement (1x playthrough)
    if (user.wagerRequirement > 0) {
      user.wagerRequirement = Math.max(0, user.wagerRequirement - boostCents);
    }

    const existing = divide.votes.find(v => v.userId === req.userId);
    if (existing) {
      // If creator, only allow updating short if side matches locked side
      if (divide.isUserCreated && divide.creatorId === req.userId && divide.creatorSide && side !== divide.creatorSide) {
        return res.status(400).json({ error: 'Creator is locked to their chosen side and cannot short the other side.' });
      } else {
        existing.voteCount += shortAmount; // voteCount field stores dollar amount
        existing.side = side;
      }
    } else {
      divide.votes.push({ userId: req.userId, side, voteCount: shortAmount });
    }

    divide.totalVotes += shortAmount;
    if (side === 'A') divide.votesA += shortAmount;
    else divide.votesB += shortAmount;
    // divide.pot stored in dollars in DB (legacy); keep pot arithmetic in dollars
    divide.pot = Number((divide.pot + boostAmount).toFixed(2));

    // Update user statistics (track engagement)
    user.totalBets = (user.totalBets || 0) + 1;
    user.wagered = (user.wagered || 0) + boostCents;
    // Divides shorting is a bet - outcome (win/loss) determined when divide ends
    // For now, count all shorts as "bets" without immediate win/loss classification
    
    // Award XP for wagering (2 XP per $1)
    await awardXp(req.userId, 'usdWager', boostCents, { 
      divideId: divide.id || divide._id, 
      side,
      amount: boostAmount 
    });

    await divide.save();
    await user.save();

    // Ledger: record short bet (money into the system)
    try {
      await Ledger.create({
        type: 'divides_bet',
        amount: Number(boostAmount),
        userId: req.userId,
        divideId: divide.id || divide._id,
        meta: { side }
      });
    } catch (e) {
      console.error('Failed to create ledger entry for divide vote', e);
    }

    io.emit('voteUpdate', divide);
    res.json({ balance: toDollars(user.balance), votesA: divide.votesA, votesB: divide.votesB, pot: divide.pot });
  } catch (err) {
    console.error('POST /divides/vote', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Alias endpoint: support capitalized `/Divides/vote` for clients that expect `/Divides`
app.post('/Divides/vote', auth, async (req, res) => {
  try {
    const { divideId, side, boostAmount = 0, bet = 0 } = req.body;
    if (!['A', 'B'].includes(side)) return res.status(400).json({ error: 'Invalid side' });

    // Support finding by short `id` or Mongo `_id`
    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide) {
      console.log('Alias vote attempt: divide not found', { divideId, body: req.body });
      return res.status(400).json({ error: 'Divide not found' });
    }
    if (divide.status !== 'active') {
      console.log('Alias vote attempt on inactive divide', { divideId, status: divide.status, divideRecordId: divide.id || divide._id });
      return res.status(400).json({ error: 'Divide not active' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if user is the creator and trying to vote on opposite side
    if (divide.isUserCreated && divide.creatorId === req.userId && divide.creatorSide !== side) {
      return res.status(400).json({ error: 'Creator cannot vote on the opposite side' });
    }

    // Check if user already voted (can only vote once per divide)
    const existing = divide.votes.find(v => v.userId === req.userId);
    if (existing && existing.userId === req.userId) {
      return res.status(400).json({ error: 'You have already voted on this divide' });
    }

    // Require bet amount (no free shorts)
    const betAmount = bet || boostAmount;
    if (!betAmount || betAmount <= 0) {
      return res.status(400).json({ error: 'Bet amount required (minimum $0.01)' });
    }

    const betCents = toCents(betAmount);
    if (user.balance < betCents) return res.status(400).json({ error: 'Insufficient balance' });
    user.balance = user.balance - betCents;
    
    // Reduce wager requirement
    if (user.wagerRequirement > 0) {
      user.wagerRequirement = Math.max(0, user.wagerRequirement - betCents);
    }
    
    let voteCount = betAmount; // dollar amount being shorted

    divide.votes.push({ userId: req.userId, side, voteCount, bet: betAmount });

    divide.totalVotes += voteCount;
    if (side === 'A') divide.votesA += voteCount;
    else divide.votesB += voteCount;
    divide.pot = Number((divide.pot + betAmount).toFixed(2));

    // Update user statistics
    user.totalBets = (user.totalBets || 0) + 1;
    user.wagered = (user.wagered || 0) + betCents;
    
    // Award XP for wagering (2 XP per $1)
    await awardXp(req.userId, 'usdWager', betCents, { 
      divideId: divide.id || divide._id, 
      side,
      amount: betAmount 
    });

    await divide.save();
    await user.save();

    // Ledger: record short bet
    try {
      await Ledger.create({
        type: 'divides_bet',
        amount: Number(betAmount),
        userId: req.userId,
        divideId: divide.id || divide._id,
        meta: { side }
      });
    } catch (e) {
      console.error('Failed to create ledger entry for divide vote (alias)', e);
    }

    io.emit('voteUpdate', divide);
    res.json({ balance: toDollars(user.balance), votesA: divide.votesA, votesB: divide.votesB, pot: divide.pot });
  } catch (err) {
    console.error('POST /Divides/vote', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET list of divides (alias with capital D for legacy clients)
app.get('/Divides', async (req, res) => {
  try {
    // Return all divides, but include the creator's username when available
    // Use aggregation with a lookup to users collection to avoid extra roundtrips
    const list = await Divide.aggregate([
      { $sort: { endTime: 1 } },
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
    ]).allowDiskUse(true);
    res.json(list || []);
  } catch (e) {
    console.error('GET /Divides error', e);
    // Fallback: return simple find() result if aggregation fails for any reason
    try {
      const fallback = await Divide.find({}).sort({ endTime: 1 }).lean();
      return res.json(fallback || []);
    } catch (err) {
      console.error('GET /Divides fallback error', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Create a new divide (admin only). Client sends title/optionA/optionB and optional image/sound fields
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
      durationValue = 10,
      durationUnit = 'minutes'
    } = req.body || {};

    if (!title || !optionA || !optionB) return res.status(400).json({ error: 'Missing required fields' });

    // compute endTime from durationValue/unit
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

    // generate a short human-friendly id
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
      endTime,
      votesA: 0,
      votesB: 0,
      totalVotes: 0,
      pot: 0,
      status: 'active',
      votes: [],
      creatorId: req.userId,
      createdAt: now
    });

    await doc.save();
    io.emit('newDivide', doc);
    res.json(doc);
  } catch (err) {
    console.error('POST /Divides', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Alias lowercase create route
app.post('/divides', auth, adminOnly, async (req, res) => {
  try {
    // forward to the capitalized handler logic to avoid duplication
    req.url = '/Divides';
    // Re-run the matching route by calling the handler directly is complex; instead duplicate minimal logic
    const {
      title,
      optionA,
      optionB,
      imageA,
      imageB,
      soundA,
      soundB,
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
      endTime,
      votesA: 0,
      votesB: 0,
      totalVotes: 0,
      pot: 0,
      status: 'active',
      votes: [],
      creatorId: req.userId,
      createdAt: now
    });
    await doc.save();
    io.emit('newDivide', doc);
    res.json(doc);
  } catch (err) {
    console.error('POST /divides', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE a user-initiated divide (user places initial bet and picks a side they're locked into)
app.post('/Divides/create-user', auth, async (req, res) => {
  try {
    const {
      title,
      optionA,
      optionB,
      bet = 1, // initial bet in dollars
      side,     // 'A' or 'B' - which side creator is choosing
      durationValue = 10,
      durationUnit = 'minutes'
    } = req.body || {};

    if (!title || !optionA || !optionB) return res.status(400).json({ error: 'Missing required fields (title, optionA, optionB)' });
    if (!['A', 'B'].includes(side)) return res.status(400).json({ error: 'Invalid side (must be A or B)' });
    if (typeof bet !== 'number' || bet <= 0) return res.status(400).json({ error: 'Invalid bet amount' });

    // Check user balance
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const betCents = toCents(bet);
    if (user.balance < betCents) return res.status(400).json({ error: 'Insufficient balance' });

    // Deduct bet from user balance
    user.balance = user.balance - betCents;
    // Reduce wager requirement (1x playthrough)
    if (user.wagerRequirement > 0) {
      user.wagerRequirement = Math.max(0, user.wagerRequirement - betCents);
    }
    await user.save();

    // compute endTime from durationValue/unit
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

    // generate a short human-friendly id
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
      endTime,
      votesA: side === 'A' ? bet : 0,
      votesB: side === 'B' ? bet : 0,
      totalVotes: bet,
      pot: bet,
      status: 'active',
      votes: [{ userId: req.userId, side, voteCount: bet, isFree: false, bet }],
      creatorId: req.userId,
      creatorBet: bet,
      creatorSide: side,
      isUserCreated: true,
      createdAt: now
    });

    await doc.save();

    // Record initial bet in ledger
    try {
      await Ledger.create({
        type: 'divides_bet',
        amount: Number(bet),
        userId: req.userId,
        divideId: doc.id || doc._id,
        meta: { side }
      });
    } catch (e) {
      console.error('Failed to create ledger entry for initial divide bet', e);
    }

    // Award XP for creating a divide
    await awardXp(req.userId, 'divideCreated', 0, { 
      divideId: doc.id || doc._id,
      title,
      pot: bet 
    });

    // Award XP for the initial wager
    await awardXp(req.userId, 'usdWager', betCents, { 
      divideId: doc.id || doc._id,
      side,
      amount: bet 
    });

    io.emit('newDivide', doc);
    res.json(doc);
  } catch (err) {
    console.error('POST /Divides/create-user', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Lowercase alias
app.post('/divides/create-user', auth, async (req, res) => {
  // Just forward to the capital-D version
  req.url = '/Divides/create-user';
  return app._router.handle(req, res);
});

// END divide & split pot — only creator
app.post('/divides/end', auth, async (req, res) => {
  try {
    const { divideId } = req.body;
    // Support finding by short `id` or Mongo `_id`
    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide || divide.status !== 'active') return res.status(400).json({ error: 'Divide not active' });
    if (divide.creatorId !== req.userId) return res.status(403).json({ error: 'Not creator' });

    // Delegate to shared helper which handles payouts and emits events
    const result = await endDivideById(divideId, req.userId);
    if (!result) return res.status(500).json({ error: 'Failed to end divide' });

    // reply with summary information if available
    res.json({ success: true, id: result.id, winnerSide: result.winnerSide, pot: result.pot });
  } catch (err) {
    console.error('POST /divides/end', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Alias endpoint: support capitalized `/Divides/end`
app.post('/Divides/end', auth, async (req, res) => {
  try {
    const { divideId } = req.body;
    const divide = await Divide.findOne({ id: divideId });
    if (!divide || divide.status !== 'active') return res.status(400).json({ error: 'Divide not active' });
    if (divide.creatorId !== req.userId) return res.status(403).json({ error: 'Not creator' });

    const result = await endDivideById(divideId, req.userId);
    if (!result) return res.status(500).json({ error: 'Failed to end divide' });

    res.json({ success: true, id: result.id, winnerSide: result.winnerSide, pot: result.pot });
  } catch (err) {
    console.error('POST /Divides/end', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Recreate an ended divide (admin-only): duplicate it with a new id and fresh endTime
app.post('/divides/:id/recreate', auth, adminOnly, async (req, res) => {
  try {
    const id = (req.params.id || '').toString();
    // find by short id or mongo _id
    let orig = await Divide.findOne({ id });
    if (!orig) orig = await Divide.findById(id).catch(() => null);
    if (!orig) return res.status(404).json({ error: 'Divide not found' });

    // create a short id for the new divide
    const newShortId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);

    const now = new Date();
    // default new endTime to 10 minutes from now unless original had a longer remaining duration
    const defaultMs = 10 * 60 * 1000;
    const newEnd = new Date(now.getTime() + defaultMs);

    const fresh = new Divide({
      id: newShortId,
      title: orig.title,
      optionA: orig.optionA,
      optionB: orig.optionB,
      imageA: orig.imageA,
      imageB: orig.imageB,
      soundA: orig.soundA,
      soundB: orig.soundB,
      endTime: newEnd,
      votesA: 0,
      votesB: 0,
      totalVotes: 0,
      pot: 0,
      status: 'active',
      votes: [],
      creatorId: req.userId,
      createdAt: now
    });

    await fresh.save();
    // notify clients about the new divide
    io.emit('newDivide', fresh);
    res.json(fresh);
  } catch (err) {
    console.error('POST /divides/:id/recreate', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Alias for capitalized path
app.post('/Divides/:id/recreate', auth, adminOnly, async (req, res) => {
  try {
    const id = (req.params.id || '').toString();
    let orig = await Divide.findOne({ id });
    if (!orig) orig = await Divide.findById(id).catch(() => null);
    if (!orig) return res.status(404).json({ error: 'Divide not found' });

    const newShortId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);
    const now = new Date();
    const newEnd = new Date(now.getTime() + 10 * 60 * 1000);

    const fresh = new Divide({
      id: newShortId,
      title: orig.title,
      optionA: orig.optionA,
      optionB: orig.optionB,
      imageA: orig.imageA,
      imageB: orig.imageB,
      soundA: orig.soundA,
      soundB: orig.soundB,
      endTime: newEnd,
      votesA: 0,
      votesB: 0,
      totalVotes: 0,
      pot: 0,
      status: 'active',
      votes: [],
      creatorId: req.userId,
      createdAt: now
    });

    await fresh.save();
    io.emit('newDivide', fresh);
    res.json(fresh);
  } catch (err) {
    console.error('POST /Divides/:id/recreate', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// (jackpot API defined later in file)

// ──────────────────────────────────────────────────────────────
// KENO PLAY ROUTE – add multiplier to the response
// ──────────────────────────────────────────────────────────────
app.post('/keno/play', auth, async (req, res) => {
  console.log('[KENO] /keno/play HIT - request received', { userId: req.userId, body: req.body });
  try {
    const { betAmount, playerNumbers, clientSeed = '', nonce, risk = 'classic' } = req.body;

    // validation
    if (typeof betAmount !== 'number' || isNaN(betAmount) || betAmount < 0.01)
      return res.status(400).json({ error: 'Invalid bet amount' });
    if (betAmount > 200)
      return res.status(400).json({ error: 'Maximum bet is \$200' });
    if (!Array.isArray(playerNumbers) || playerNumbers.length < 1 || playerNumbers.length > 10)
      return res.status(400).json({ error: 'Select 1–10 numbers' });
    if (!paytables[risk]) return res.status(400).json({ error: 'Invalid risk type' });
    for (const n of playerNumbers) {
      if (!Number.isInteger(n) || n < 1 || n > 40)
        return res.status(400).json({ error: 'Invalid number pick' });
    }

    // simple per-user rate limiting
    if (!checkPlayRate(req.userId)) return res.status(429).json({ error: 'Too many plays, slow down' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // idempotency: if the client retried with same nonce+clientSeed, return stored round
    if (typeof nonce !== 'undefined') {
      const existing = await KenoRound.findOne({ userId: req.userId, nonce, clientSeed });
      if (existing) {
        const freshUser = await User.findById(req.userId);
        // Validate stored round against current paytable to catch historical bad rounds
        try {
          const storedPicks = Array.isArray(existing.picks) ? existing.picks.map(Number) : [];
          const dedup = [];
          const seenLocal = new Set();
          for (const p of storedPicks) {
            if (!seenLocal.has(p)) { seenLocal.add(p); dedup.push(Number(p)); }
          }
          const storedDrawn = Array.isArray(existing.drawnNumbers) ? existing.drawnNumbers.map(Number) : [];
          const spotsStored = dedup.length;
          const hitsStored = (Array.isArray(existing.matches) ? existing.matches.map(Number) : []).length;
          const baseExpected = paytables[risk]?.[spotsStored]?.[hitsStored] ?? 0;
          const expectedMultiplier = (typeof baseExpected === 'number') ? Number(baseExpected) : Number(baseExpected) || 0;
          const totalCentsStored = Math.round((Number(existing.betAmount) || 0) * 100);
          const expectedWinCents = Math.round(totalCentsStored * expectedMultiplier);
          const expectedWin = Number((expectedWinCents / 100).toFixed(2));
          // If the stored multiplier/win differs from expected, return a corrected view
          if (Number(existing.multiplier) !== expectedMultiplier || Number(existing.win) !== expectedWin) {
            // On idempotent request, increment nonce server-side so next play uses a new nonce
            let authorNonce = nonce;
            try {
              const updated = await User.findOneAndUpdate(
                { _id: req.userId },
                { $inc: { kenoNonce: 1 } },
                { new: true }
              );
              if (updated) authorNonce = updated.kenoNonce;
            } catch (e) { /* use original nonce if update fails */ }
            console.warn('[KENO] idempotent stored round mismatch — returning corrected view (DB not modified)', { userId: req.userId, nonce, storedMultiplier: existing.multiplier, expectedMultiplier, storedWin: existing.win, expectedWin });
            return res.json({
              drawnNumbers: storedDrawn,
              matches: existing.matches,
              win: expectedWin,
              multiplier: expectedMultiplier,
              houseCut: existing.houseCut,
              jackpotCut: existing.jackpotCut,
              balance: freshUser ? toDollars(freshUser.balance) : undefined,
              serverSeed: existing.serverSeed,
              serverSeedHashed: existing.serverSeedHashed,
              clientSeed: existing.clientSeed,
              nonce: existing.nonce,
              kenoNonce: authorNonce,
              corrected: true,
              stored: { multiplier: existing.multiplier, win: existing.win }
            });
          }
        } catch (e) {
          console.error('[KENO] error validating stored round', e);
        }
        // Normal idempotent response (no mismatch)
        let authorNonce = nonce;
        try {
          const updated = await User.findOneAndUpdate(
            { _id: req.userId },
            { $inc: { kenoNonce: 1 } },
            { new: true }
          );
          if (updated) authorNonce = updated.kenoNonce;
        } catch (e) { /* use original nonce if update fails */ }
        return res.json({
          drawnNumbers: existing.drawnNumbers,
          matches: existing.matches,
          win: existing.win,
          multiplier: existing.multiplier,
          houseCut: existing.houseCut,
          jackpotCut: existing.jackpotCut,
          balance: freshUser ? toDollars(freshUser.balance) : undefined,
          serverSeed: existing.serverSeed,
          serverSeedHashed: existing.serverSeedHashed,
          clientSeed: existing.clientSeed,
          nonce: existing.nonce,
          kenoNonce: authorNonce
        });
      }
    }

    // provably-fair seeds using Random.org + EOS blockchain
    let serverSeed = user.kenoServerSeed;
    if (!serverSeed) {
      serverSeed = await generateServerSeedFromRandomOrg();
    }
    const nextServerSeed = await generateServerSeedFromRandomOrg();
    const serverSeedHashed = hashServerSeed(serverSeed);

    // Get EOS block hash for external entropy
    const blockHash = await getEOSBlockHash();

    // Create deterministic game seed
    const gameSeed = createGameSeed(serverSeed, blockHash);

    // Generate 10 drawn numbers from 1-40 deterministically
    let drawnNumbers = generateDrawnNumbers(gameSeed);
    // Ensure they are valid numbers between 1-40
    drawnNumbers = drawnNumbers.filter(n => n >= 1 && n <= 40).slice(0, 10);

    // normalize and dedupe player picks (preserve first-occurrence order from client)
    const seenP = new Set();
    const normalizedPicks = [];
    for (const pn of playerNumbers) {
      const n = Number(pn);
      if (!Number.isFinite(n)) continue;
      if (!seenP.has(n)) { seenP.add(n); normalizedPicks.push(n); }
    }

    // payout calculation (use integer cents for internal math)
    const matches = normalizedPicks.filter(n => drawnNumbers.includes(n));
    const spots = normalizedPicks.length;
    const hits = matches.length;

    // Base multiplier from authoritative paytables (paytables are already scaled by paytable-data.js)
    let baseMultiplier = paytables[risk]?.[spots]?.[hits] ?? 0;
    if (typeof baseMultiplier !== 'number') baseMultiplier = Number(baseMultiplier) || 0;
    let multiplier = Number((baseMultiplier).toFixed(6));
    // Sanity: ensure multiplier strictly matches the configured paytable entry to avoid unexpected payouts
    try {
      const tableRow = paytables[risk] && paytables[risk][spots] ? paytables[risk][spots] : null;
      const expected = tableRow && typeof tableRow[hits] !== 'undefined' ? Number(tableRow[hits]) : 0;
      if (multiplier !== expected) {
        console.warn('[KENO] multiplier mismatch computed vs table — enforcing table value', { risk, spots, hits, computed: multiplier, expected });
        multiplier = expected;
      }
    } catch (e) {
      console.error('[KENO] multiplier validation error', e);
    }

    // Calculate payout in cents
    const betCents = toCents(betAmount);
    let winCents = Math.round(betCents * multiplier);

    // Cap maximum win at $500,000
    const MAX_WIN_CENTS = 500000 * 100; // $500k in cents
    if (winCents > MAX_WIN_CENTS) {
      console.log(`[KENO] Win capped from $${winCents / 100} to \$200,000`);
      winCents = MAX_WIN_CENTS;
    }

    const win = Number((winCents / 100).toFixed(2));

    // Update user balance
    const newBalanceCents = user.balance - betCents + winCents;
    user.balance = newBalanceCents;

    // Reduce wager requirement (1x playthrough)
    if (user.wagerRequirement > 0) {
      user.wagerRequirement = Math.max(0, user.wagerRequirement - betCents);
    }

    // Update user statistics
    user.totalBets = (user.totalBets || 0) + 1;
    user.wagered = (user.wagered || 0) + betCents;
    user.totalWon = (user.totalWon || 0) + winCents;
    if (win > 0) {
      user.totalWins = (user.totalWins || 0) + 1;
    } else {
      user.totalLosses = (user.totalLosses || 0) + 1;
    }

    // Rotate to next server seed and increment nonce
    user.kenoServerSeed = nextServerSeed;
    user.kenoServerSeedHashed = hashServerSeed(nextServerSeed);
    user.kenoNonce = (typeof nonce === 'number' ? nonce : user.kenoNonce || 0) + 1;

    await user.save();

    // Save round to database
    const round = new KenoRound({
      userId: req.userId,
      betAmount,
      picks: normalizedPicks,
      drawnNumbers,
      matches,
      win,
      balanceAfter: toDollars(newBalanceCents),
      serverSeed,
      serverSeedHashed,
      clientSeed,
      nonce: typeof nonce === 'number' ? nonce : user.kenoNonce - 1,
      blockHash,
      gameSeed,
      risk,
      multiplier,
      reserveChange: 0,
      timestamp: new Date(),
      verified: false
    });

    await round.save();

    // Update house stats for finance tracking
    await updateHouseStats('keno', betCents, winCents);

    // Create ledger entry
    try {
      await Ledger.create({
        type: 'keno_play',
        amount: win - betAmount,
        userId: req.userId,
        meta: { roundId: round._id, risk, spots, hits, multiplier }
      });
    } catch (e) {
      console.error('[KENO] Failed to create ledger entry', e);
    }

    console.log(`[KENO] Round complete: user=${req.userId}, bet=${betAmount}, win=${win}, mult=${multiplier}, balance=${toDollars(newBalanceCents)}`);

    // Return response
    console.log(`[KENO] Response: drawnNumbers=${JSON.stringify(drawnNumbers)}, matches=${JSON.stringify(matches)}, win=${win}, mult=${multiplier}`);
    res.json({
      drawnNumbers,
      matches,
      win,
      multiplier,
      balance: toDollars(newBalanceCents),
      balanceAfterBet: toDollars(user.balance - betCents),
      serverSeed,
      serverSeedHashed,
      clientSeed,
      nonce: typeof nonce === 'number' ? nonce : user.kenoNonce - 1,
      kenoNonce: user.kenoNonce,
      blockHash,
      gameSeed
    });
  } catch (err) {
    console.error('[KENO] /keno/play error', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get recent keno rounds for the authenticated user (for provably-fair history)
app.get('/keno/rounds', auth, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20')));
    const rounds = await KenoRound.find({ userId: req.userId }).sort({ timestamp: -1 }).limit(limit).lean();
    res.json({ rounds });
  } catch (e) {
    console.error('GET /keno/rounds error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────
// RECENT GAMES FEED - All games played across platform (OPTIMIZED)
// ──────────────────────────────────────────────────────────────
app.get('/api/recent-games', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Cap at 100
    const games = [];
    const userCache = new Map(); // Cache user lookups

    // Helper to get user with caching
    const getUserCached = async (userId) => {
      if (!userId) return null;
      if (userCache.has(userId.toString())) {
        return userCache.get(userId.toString());
      }
      const user = await User.findById(userId).select('username profileImage').lean();
      userCache.set(userId.toString(), user);
      return user;
    };

    // Fetch Keno games with indexed query
    const kenoGames = await KenoRound.find({ win: { $exists: true } })
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('_id userId betAmount win timestamp')
      .lean();

    for (const game of kenoGames) {
      const user = await getUserCached(game.userId);
      games.push({
        _id: game._id,
        game: 'Keno',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: game.betAmount,
        multiplier: game.win > 0 ? (game.win / game.betAmount).toFixed(2) + 'x' : '0.00x',
        payout: game.win,
        time: game.timestamp,
        icon: '🎰'
      });
    }

    // Fetch Plinko games with indexed query
    const plinkoGames = await PlinkoGame.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('_id userId betAmount multiplier payout createdAt')
      .lean();

    for (const game of plinkoGames) {
      const user = await getUserCached(game.userId);
      games.push({
        _id: game._id,
        game: 'Plinko',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: toDollars(game.betAmount),
        multiplier: game.multiplier.toFixed(2) + 'x',
        payout: toDollars(game.payout),
        time: game.createdAt,
        icon: '⚪'
      });
    }

    // Fetch Blackjack games with indexed query
    const blackjackGames = await BlackjackGame.find({ gamePhase: 'gameOver' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('_id userId mainBet perfectPairsBet twentyPlusThreeBet blazingSevensBet mainPayout perfectPairsPayout twentyPlusThreePayout blazingSevensPayout mainResult createdAt')
      .lean();

    for (const game of blackjackGames) {
      const user = await getUserCached(game.userId);
      const totalBet = game.mainBet + game.perfectPairsBet + game.twentyPlusThreeBet + game.blazingSevensBet;
      const totalPayout = game.mainPayout + game.perfectPairsPayout + game.twentyPlusThreePayout + game.blazingSevensPayout;
      const mult = totalPayout > 0 ? (totalPayout / totalBet).toFixed(2) + 'x' : '0.00x';

      games.push({
        _id: game._id,
        game: 'Blackjack',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: totalBet,
        multiplier: mult,
        payout: totalPayout,
        time: game.createdAt,
        icon: '🃏'
      });
    }

    // Fetch Case Battles with indexed query
    const caseBattles = await CaseBattle.find({ status: 'ended' })
      .sort({ createdAt: -1 })
      .limit(Math.floor(limit / 2))
      .select('_id winnerId players pot createdAt')
      .lean();

    for (const battle of caseBattles) {
      const winnerPlayer = battle.players?.find(p => p.userId === battle.winnerId);
      const user = await getUserCached(battle.winnerId);
      // Calculate wager from winner's cases or fallback to entry cost
      let wagerAmount = 0;
      if (winnerPlayer?.cases && winnerPlayer.cases.length > 0) {
        wagerAmount = winnerPlayer.cases.reduce((sum, c) => sum + (c.price || 0), 0);
      } else if (winnerPlayer?.totalCaseValue) {
        wagerAmount = winnerPlayer.totalCaseValue;
      } else {
        // Fallback: divide pot by number of players
        wagerAmount = battle.pot / (battle.players?.length || 2);
      }
      games.push({
        _id: battle._id,
        game: 'Case Battle',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: wagerAmount,
        multiplier: battle.players?.length ? `${battle.players.length}.00x` : '2.00x',
        payout: battle.pot,
        time: battle.createdAt,
        icon: '⚔️'
      });
    }

    // Fetch Rugged buys and sells from Ledger
    const ruggedBuys = await Ledger.find({ type: 'rugged_buy' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('_id userId amount createdAt')
      .lean();

    for (const buy of ruggedBuys) {
      const user = await getUserCached(buy.userId);
      games.push({
        _id: buy._id,
        game: 'Rugged Buy',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: toDollars(buy.amount),
        multiplier: '0.00x',
        payout: 0,
        time: buy.createdAt,
        icon: '📈'
      });
    }

    const ruggedSells = await Ledger.find({ type: 'rugged_sell' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('_id userId amount meta createdAt')
      .lean();

    for (const sell of ruggedSells) {
      const user = await getUserCached(sell.userId);
      const wager = (sell.meta?.wager || 0) / 100;
      const mult = sell.meta?.multiplier || 1;
      games.push({
        _id: sell._id,
        game: 'Rugged Sell',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: wager,
        multiplier: mult.toFixed(2) + 'x',
        payout: toDollars(sell.amount || 0),
        time: sell.createdAt,
        icon: '📉'
      });
    }

    // Sort all games by time and limit
    games.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentGames = games.slice(0, limit);

    console.log(`[Recent Games] Returning ${recentGames.length} games, sorted by time (newest first)`);
    if (recentGames.length > 0) {
      console.log(`[Recent Games] Newest: ${recentGames[0].game} at ${recentGames[0].time}`);
      console.log(`[Recent Games] Oldest: ${recentGames[recentGames.length - 1].game} at ${recentGames[recentGames.length - 1].time}`);
    }

    res.json({ games: recentGames });
  } catch (err) {
    console.error('Error fetching recent games:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// MY GAMES FEED - User-specific games only
// ──────────────────────────────────────────────────────────────
app.get('/api/my-games', auth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;
    const games = [];

    // Fetch user's Keno games
    const kenoGames = await KenoRound.find({ userId, win: { $exists: true } })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    for (const game of kenoGames) {
      const user = await User.findById(game.userId).select('username profileImage').lean();
      games.push({
        _id: game._id,
        game: 'Keno',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: game.betAmount,
        multiplier: game.win > 0 ? (game.win / game.betAmount).toFixed(2) + 'x' : '0.00x',
        payout: game.win,
        time: game.timestamp,
        icon: '🎰'
      });
    }

    // Fetch user's Plinko games
    const plinkoGames = await PlinkoGame.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    for (const game of plinkoGames) {
      const user = await User.findById(game.userId).select('username profileImage').lean();
      games.push({
        _id: game._id,
        game: 'Plinko',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: toDollars(game.betAmount),
        multiplier: game.multiplier.toFixed(2) + 'x',
        payout: toDollars(game.payout),
        time: game.createdAt,
        icon: '⚪'
      });
    }

    // Fetch user's Blackjack games
    const blackjackGames = await BlackjackGame.find({ userId, gamePhase: 'gameOver' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    for (const game of blackjackGames) {
      const user = await User.findById(game.userId).select('username profileImage').lean();
      const totalBet = game.mainBet + game.perfectPairsBet + game.twentyPlusThreeBet + game.blazingSevensBet;
      const totalPayout = game.mainPayout + game.perfectPairsPayout + game.twentyPlusThreePayout + game.blazingSevensPayout;
      const mult = totalPayout > 0 ? (totalPayout / totalBet).toFixed(2) + 'x' : '0.00x';

      games.push({
        _id: game._id,
        game: 'Blackjack',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: totalBet,
        multiplier: mult,
        payout: totalPayout,
        time: game.createdAt,
        icon: '🃏'
      });
    }

    // Fetch user's Case Battles (where they were the winner)
    const caseBattles = await CaseBattle.find({ winnerId: userId, status: 'ended' })
      .sort({ createdAt: -1 })
      .limit(limit / 2)
      .lean();

    for (const battle of caseBattles) {
      const winnerPlayer = battle.players?.find(p => p.userId.toString() === userId.toString());
      const user = await User.findById(userId).select('username profileImage').lean();
      let wagerAmount = 0;
      if (winnerPlayer?.cases && winnerPlayer.cases.length > 0) {
        wagerAmount = winnerPlayer.cases.reduce((sum, c) => sum + (c.price || 0), 0);
      } else if (winnerPlayer?.totalCaseValue) {
        wagerAmount = winnerPlayer.totalCaseValue;
      } else {
        wagerAmount = battle.pot / (battle.players?.length || 2);
      }
      games.push({
        _id: battle._id,
        game: 'Case Battle',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: wagerAmount,
        multiplier: battle.players?.length ? `${battle.players.length}.00x` : '2.00x',
        payout: battle.pot,
        time: battle.createdAt,
        icon: '⚔️'
      });
    }

    // Fetch user's Rugged buys
    const ruggedBuys = await Ledger.find({ userId, type: 'rugged_buy' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    for (const buy of ruggedBuys) {
      const user = await User.findById(userId).select('username profileImage').lean();
      games.push({
        _id: buy._id,
        game: 'Rugged Buy',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: toDollars(buy.amount),
        multiplier: '0.00x',
        payout: 0,
        time: buy.createdAt,
        icon: '📈'
      });
    }

    // Fetch user's Rugged sells
    const ruggedSells = await Ledger.find({ userId, type: 'rugged_sell' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    for (const sell of ruggedSells) {
      const user = await User.findById(userId).select('username profileImage').lean();
      const wager = (sell.meta?.wager || 0) / 100;
      const mult = sell.meta?.multiplier || 1;
      games.push({
        _id: sell._id,
        game: 'Rugged Sell',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: wager,
        multiplier: mult.toFixed(2) + 'x',
        payout: toDollars(sell.amount || 0),
        time: sell.createdAt,
        icon: '📉'
      });
    }

    // Sort all games by time and limit
    games.sort((a, b) => new Date(b.time) - new Date(a.time));
    const myGames = games.slice(0, limit);

    res.json({ games: myGames });
  } catch (err) {
    console.error('Error fetching my games:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// TOP WINS - Global leaderboard showing top 5 wins by multiplier from all games
// ──────────────────────────────────────────────────────────────
app.get('/api/top-wins', async (req, res) => {
  try {
    const games = [];
    const userCache = new Map(); // Cache user lookups

    // Helper to get user with caching
    const getUserCached = async (userId) => {
      if (!userId) return null;
      if (userCache.has(userId.toString())) {
        return userCache.get(userId.toString());
      }
      const user = await User.findById(userId).select('username profileImage').lean();
      userCache.set(userId.toString(), user);
      return user;
    };

    // Fetch top Keno games by multiplier
    const kenoGames = await KenoRound.find({ win: { $gt: 0 } })
      .sort({ win: -1 })
      .limit(20)
      .select('_id userId betAmount win timestamp')
      .lean();

    for (const game of kenoGames) {
      const user = await getUserCached(game.userId);
      const multiplier = game.win / game.betAmount;
      games.push({
        _id: game._id,
        game: 'Keno',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: game.betAmount,
        multiplier: multiplier,
        multiplierDisplay: multiplier.toFixed(2) + 'x',
        payout: game.win,
        time: game.timestamp,
        icon: '🎰'
      });
    }

    // Fetch top Plinko games by multiplier
    const plinkoGames = await PlinkoGame.find({ multiplier: { $gt: 0 } })
      .sort({ multiplier: -1 })
      .limit(20)
      .select('_id userId betAmount multiplier payout createdAt')
      .lean();

    for (const game of plinkoGames) {
      const user = await getUserCached(game.userId);
      games.push({
        _id: game._id,
        game: 'Plinko',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: toDollars(game.betAmount),
        multiplier: game.multiplier,
        multiplierDisplay: game.multiplier.toFixed(2) + 'x',
        payout: toDollars(game.payout),
        time: game.createdAt,
        icon: '⚪'
      });
    }

    // Fetch top Blackjack games by payout
    const blackjackGames = await BlackjackGame.find({
      gamePhase: 'gameOver',
      mainPayout: { $gt: 0 }
    })
      .sort({ mainPayout: -1 })
      .limit(20)
      .select('_id userId mainBet perfectPairsBet twentyPlusThreeBet blazingSevensBet mainPayout perfectPairsPayout twentyPlusThreePayout blazingSevensPayout createdAt')
      .lean();

    for (const game of blackjackGames) {
      const user = await getUserCached(game.userId);
      const totalBet = game.mainBet + game.perfectPairsBet + game.twentyPlusThreeBet + game.blazingSevensBet;
      const totalPayout = game.mainPayout + game.perfectPairsPayout + game.twentyPlusThreePayout + game.blazingSevensPayout;
      const multiplier = totalPayout / totalBet;

      games.push({
        _id: game._id,
        game: 'Blackjack',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: totalBet,
        multiplier: multiplier,
        multiplierDisplay: multiplier.toFixed(2) + 'x',
        payout: totalPayout,
        time: game.createdAt,
        icon: '🃏'
      });
    }

    // Fetch Case Battles with highest pots
    const caseBattles = await CaseBattle.find({ status: 'ended', winnerId: { $exists: true } })
      .sort({ pot: -1 })
      .limit(10)
      .select('_id winnerId players pot createdAt')
      .lean();

    for (const battle of caseBattles) {
      const winnerPlayer = battle.players?.find(p => p.userId === battle.winnerId);
      const user = await getUserCached(battle.winnerId);
      let wagerAmount = 0;
      if (winnerPlayer?.cases && winnerPlayer.cases.length > 0) {
        wagerAmount = winnerPlayer.cases.reduce((sum, c) => sum + (c.price || 0), 0);
      } else if (winnerPlayer?.totalCaseValue) {
        wagerAmount = winnerPlayer.totalCaseValue;
      } else {
        wagerAmount = battle.pot / (battle.players?.length || 2);
      }
      const multiplier = battle.pot / wagerAmount;

      games.push({
        _id: battle._id,
        game: 'Case Battle',
        username: user?.username || 'Hidden',
        profileImage: user?.profileImage || '',
        wager: wagerAmount,
        multiplier: multiplier,
        multiplierDisplay: multiplier.toFixed(2) + 'x',
        payout: battle.pot,
        time: battle.createdAt,
        icon: '⚔️'
      });
    }

    // Sort by multiplier (highest first) and take top 5
    games.sort((a, b) => b.multiplier - a.multiplier);
    const topWins = games.slice(0, 5);

    console.log(`[Top Wins] Returning ${topWins.length} top wins by multiplier`);

    res.json({ topWins });
  } catch (err) {
    console.error('Error fetching top wins:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────
// LEADERBOARD – top 3 multipliers (fixed)
app.get('/keno/leaderboard', async (req, res) => {
  try {
    const top = await KenoRound.aggregate([
      { $match: { win: { $gt: 0 } } },
      {
        $addFields: {
          multiplier: { $divide: ['$win', '$betAmount'] }
        }
      },
      { $sort: { multiplier: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'users',
          let: { uid: { $toObjectId: '$userId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
            { $project: { username: 1 } }
          ],
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          username: { $ifNull: ['$user.username', '???'] },
          multiplier: 1,
          win: 1
        }
      }
    ]);
    res.json(top);
  } catch (err) {
    console.error('Leaderboard error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PLINKO LEADERBOARD – top 3 multipliers
app.get('/plinko/leaderboard', async (req, res) => {
  try {
    const top = await PlinkoGame.aggregate([
      {
        $addFields: {
          multiplier: { $cond: [{ $eq: ['$betAmount', 0] }, 0, { $divide: ['$payout', '$betAmount'] }] }
        }
      },
      { $sort: { multiplier: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'users',
          let: { uid: { $toObjectId: '$userId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
            { $project: { username: 1 } }
          ],
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          username: { $ifNull: ['$user.username', '???'] },
          multiplier: 1,
          win: '$payout'
        }
      }
    ]);
    res.json(top);
  } catch (err) {
    console.error('Plinko leaderboard error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// BLACKJACK LEADERBOARD – top 3 multipliers
app.get('/blackjack/leaderboard', async (req, res) => {
  try {
    const top = await BlackjackGame.aggregate([
      { $match: { mainPayout: { $gt: 0 } } },
      {
        $addFields: {
          multiplier: { $cond: [{ $eq: ['$mainBet', 0] }, 0, { $divide: ['$mainPayout', '$mainBet'] }] }
        }
      },
      { $sort: { multiplier: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'users',
          let: { uid: { $toObjectId: '$userId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
            { $project: { username: 1 } }
          ],
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          username: { $ifNull: ['$user.username', '???'] },
          multiplier: 1,
          win: '$mainPayout'
        }
      }
    ]);
    res.json(top);
  } catch (err) {
    console.error('Blackjack leaderboard error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────
// Public route – Get username by ID (used for display)
// ──────────────────────────────────────────────────────────────
app.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('username');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ username: user.username });
  } catch (err) {
    console.error('User lookup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────
// KENO ODDS (server-side) — return expected multiplier for a given risk & spots
// This keeps paytable/payout math on the server so the client cannot tamper.
// Query params: ?risk=medium&spots=5
// ──────────────────────────────────────────────────────────────
app.get('/keno/odds', async (req, res) => {
  try {
    const { risk = 'medium', spots = '1' } = req.query;
    const s = Number(spots);
    if (!paytables[risk]) return res.status(400).json({ error: 'Invalid risk' });
    // allow 0 (no selection) to be queried by clients; treat as expected multiplier 0
    if (!Number.isInteger(s) || s < 0 || s > 10) return res.status(400).json({ error: 'Invalid spots' });

    if (s === 0) {
      return res.json({ risk, spots: 0, expectedMultiplier: 0 });
    }

    // combinatorics helper (n choose k) using BigInt for safety
    function C(n, k) {
      if (k < 0 || k > n) return 0;
      if (k === 0 || k === n) return 1;
      k = Math.min(k, n - k);
      let num = 1n, den = 1n;
      for (let i = 1; i <= k; i++) {
        num *= BigInt(n - (k - i));
        den *= BigInt(i);
      }
      return Number(num / den);
    }

    const total = C(40, 10);
    let expected = 0;
    for (let k = 0; k <= s; k++) {
      const mult = paytables[risk]?.[s]?.[k] || 0;
      const ways = C(s, k) * C(40 - s, 10 - k);
      const p = ways / total;
      expected += p * mult;
    }
    res.json({ risk, spots: s, expectedMultiplier: Number(expected.toFixed(6)) });
  } catch (err) {
    console.error('GET /keno/odds error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: return the full paytables (server authoritative). Clients may request this
// to render a paytable modal. We intentionally serve it from the server to keep
// the canonical tables here rather than duplicating in the frontend source.
app.get('/keno/paytables', async (req, res) => {
  try {
    // clone to avoid accidental mutation
    const clone = JSON.parse(JSON.stringify(paytables || {}));
    // clone already contains the scaled paytables from paytable-data.js
    res.json({ paytables: clone });
  } catch (err) {
    console.error('GET /keno/paytables error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: return configured RTP per risk (server-authoritative). Useful for UI
// components or external audits that want a single numeric RTP value per risk.
app.get('/keno/rtp', async (req, res) => {
  try {
    const clone = JSON.parse(JSON.stringify(configured || {}));
    res.json({ configured: clone });
  } catch (err) {
    console.error('GET /keno/rtp error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────
// START SERVER (CORRECT ORDER)
// ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// 1️⃣ Create HTTP server
const server = http.createServer(app);
console.log('startup: http server object created');

// 2️⃣ Attach Socket.IO
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Register authoritative Rugged routes (uses auth/adminOnly defined below)
try {
  console.log('startup: about to register rugged routes');
  // register the routes, passing the auth and adminOnly middleware declared earlier
  registerRugged(app, io, { auth, adminOnly });
  console.log('startup: registerRugged returned');
} catch (e) { console.error('Failed to register rugged routes', e); }

// Register Plinko routes
try {
  console.log('startup: about to register plinko routes');
  registerPlinko(app, io, { auth, updateHouseStats });
  console.log('startup: registerPlinko returned');
} catch (e) { console.error('Failed to register plinko routes', e); }

// Register Blackjack routes
try {
  console.log('startup: about to register blackjack routes');
  // Make updateHouseStats available to router via app.locals
  app.locals.updateHouseStats = updateHouseStats;
  app.use('/api/blackjack', auth, blackjackRoutes);
  // Also mount without /api prefix for consistency with Plinko/Keno
  app.use('/blackjack', auth, blackjackRoutes);
  console.log('startup: Blackjack routes registered');
} catch (e) { console.error('Failed to register blackjack routes', e); }

// Register Case Battles routes
try {
  console.log('startup: about to register case battles routes');
  registerCaseBattles(app, io, { auth, adminOnly });
  console.log('startup: registerCaseBattles returned');
} catch (e) { console.error('Failed to register case battles routes', e); }

// Register Cases (case management) routes
try {
  console.log('startup: about to register cases routes');
  registerCases(app, io, { auth, adminOnly });
  console.log('startup: registerCases returned');
} catch (e) { console.error('Failed to register cases routes', e); }

// Register Items (item management) routes
try {
  console.log('startup: about to register items routes');
  setupItemRoutes(app, auth, adminOnly);
  console.log('startup: setupItemRoutes returned');
} catch (e) { console.error('Failed to register items routes', e); }

// Register Wheel routes
try {
  console.log('startup: about to register wheel routes');
  registerWheelRoutes(app, io, { auth });
  console.log('startup: wheel routes registered');
} catch (e) { console.error('Failed to register wheel routes', e); }

// Register Plinko routes
async function ensureRuggedInit() {
  try {
    const existing = await Rugged.findOne({ id: 'global' });
    if (existing) {
      // if no commit present, generate one
      if (!existing.serverSeedHashed) {
        const seed = generateSeed(64);
        const h = await sha256(seed);
        existing.serverSeedHashed = h;
        existing.revealedSeeds = existing.revealedSeeds || [];
        await existing.save();
        console.log('Initialized Rugged serverSeedHashed');
      }
      // Historically there were legacy token wallet records for DC/USDDC,
      // but the Rugged game now uses the Rugged document (`doc`) and its
      // persisted `priceHistory`/`lastPrice` as the authoritative source.
      // We do not create or rely on legacy token wallet records for Rugged.
      return existing;
    }
    // default initialization per user's request
    const now = new Date();
    const defaultNoRugSeconds = 300; // 5 minutes staged timer
    const doc = await Rugged.create({
      id: 'global',
      symbol: 'DC',
      totalSupply: 100000000,
      jackpotSupply: 25000000,
      circulatingSupply: 75000000,
      lastPrice: 0.0001, // initial USD per DC (1 USD per 10,000 DC)
      noRugSeconds: defaultNoRugSeconds,
      noRugUntil: new Date(now.getTime() + defaultNoRugSeconds * 1000),
      priceHistory: [],
      rugged: false
    });
    // commit a seed for future rug reveals
    const seed = generateSeed(64);
    const h = await sha256(seed);
    doc.serverSeedHashed = h;
    doc.revealedSeeds = [];
    await doc.save();
    console.log('Created initial Rugged doc with serverSeedHashed');

    // Historically the Rugged init populated legacy token wallet records,
    // but the Rugged game no longer depends on those collections. DC is
    // a UI-only mapping and accounting is done using the Rugged document
    // and user balances. Legacy token wallet scripts are not instantiated here.
    return doc;
  } catch (e) {
    console.error('ensureRuggedInit error', e);
    return null;
  }
}


// start initialization
ensureRuggedInit().catch(e => console.error(e));

// ========================================
// 💬 LIVE CHAT SYSTEM
// ========================================
const chatNamespace = io.of('/chat');

chatNamespace.on('connection', (socket) => {
  console.log('[Chat] User connected:', socket.id);

  // Send chat history to new user
  socket.on('chat:requestHistory', async () => {
    try {
      const messages = await ChatMessage.find()
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
      socket.emit('chat:history', messages.reverse());
    } catch (err) {
      console.error('[Chat] Error fetching history:', err);
      socket.emit('chat:history', []);
    }
  });

  // Handle new messages
  socket.on('chat:sendMessage', async (data) => {
    try {
      const { username, message, userId } = data;

      if (!username || !message || message.trim().length === 0) {
        return;
      }

      // Check if user is muted
      const now = new Date();
      const activeMute = await ChatMute.findOne({
        username,
        active: true,
        mutedUntil: { $gt: now }
      });

      if (activeMute) {
        // User is muted - send error back to them
        socket.emit('chat:muted', {
          message: 'You are currently muted from chat',
          mutedUntil: activeMute.mutedUntil,
          reason: activeMute.reason
        });
        console.log(`[Chat] Blocked muted user ${username} from sending message`);
        return;
      }

      // Limit message length
      const trimmedMessage = message.trim().slice(0, 500);

      // Save to database
      const chatMessage = await ChatMessage.create({
        username,
        message: trimmedMessage,
        timestamp: new Date()
      });

      // Broadcast to all connected clients
      chatNamespace.emit('chat:message', {
        _id: chatMessage._id,
        username: chatMessage.username,
        message: chatMessage.message,
        timestamp: chatMessage.timestamp
      });

      console.log(`[Chat] ${username}: ${trimmedMessage}`);
    } catch (err) {
      console.error('[Chat] Error sending message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('[Chat] User disconnected:', socket.id);
  });
});

// Cleanup old chat messages (keep last 100)
setInterval(async () => {
  try {
    const count = await ChatMessage.countDocuments();
    if (count > 100) {
      const toDelete = count - 100;
      const oldMessages = await ChatMessage.find()
        .sort({ timestamp: 1 })
        .limit(toDelete)
        .select('_id');
      const ids = oldMessages.map(m => m._id);
      await ChatMessage.deleteMany({ _id: { $in: ids } });
      console.log(`[Chat] Cleaned up ${toDelete} old messages`);
    }
  } catch (err) {
    console.error('[Chat] Error cleaning up messages:', err);
  }
}, 60000); // Run every minute

// ========================================
// MODERATOR CHAT SYSTEM
// ========================================

const moderatorChatNamespace = io.of('/moderator-chat');

moderatorChatNamespace.on('connection', (socket) => {
  console.log('[ModChat] Moderator connected:', socket.id);

  // Send chat history to new moderator
  socket.on('moderator-chat:requestHistory', async () => {
    try {
      const messages = await ModeratorChatMessage.find()
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();
      
      // Enrich messages with profile images
      const enrichedMessages = await Promise.all(
        messages.map(async (msg) => {
          const user = await User.findById(msg.userId).select('profileImage').lean();
          return {
            ...msg,
            profileImage: user?.profileImage || null
          };
        })
      );
      
      socket.emit('moderator-chat:history', enrichedMessages.reverse());
      console.log(`[ModChat] Sent ${enrichedMessages.length} messages to ${socket.id}`);
    } catch (err) {
      console.error('[ModChat] Error fetching history:', err);
      socket.emit('moderator-chat:history', []);
    }
  });

  // Handle new messages
  socket.on('moderator-chat:sendMessage', async (data) => {
    try {
      const { userId, username, message, role, encrypted } = data;

      if (!userId || !username || !message || !role || message.trim().length === 0) {
        console.log('[ModChat] Invalid message data:', data);
        return;
      }

      // Verify role is moderator or admin
      if (role !== 'moderator' && role !== 'admin') {
        console.log('[ModChat] Unauthorized role:', role);
        return;
      }

      // Get user's profile image
      const user = await User.findById(userId).select('profileImage').lean();

      // Limit message length (3000 for encrypted, 2000 for plaintext)
      const maxLength = encrypted ? 3000 : 2000;
      const trimmedMessage = message.trim().slice(0, maxLength);

      // Save to database
      const chatMessage = await ModeratorChatMessage.create({
        userId,
        username,
        role,
        message: trimmedMessage,
        encrypted: encrypted || false,
        timestamp: new Date()
      });

      // Broadcast to all connected moderators
      moderatorChatNamespace.emit('moderator-chat:message', {
        userId: chatMessage.userId,
        username: chatMessage.username,
        role: chatMessage.role,
        message: chatMessage.message,
        encrypted: chatMessage.encrypted,
        timestamp: chatMessage.timestamp,
        profileImage: user?.profileImage || null
      });

      const msgPreview = encrypted ? '[Encrypted]' : trimmedMessage.substring(0, 50);
      console.log(`[ModChat] ${username} (${role}): ${msgPreview}`);
    } catch (err) {
      console.error('[ModChat] Error sending message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('[ModChat] Moderator disconnected:', socket.id);
  });
});

// Cleanup old moderator chat messages (keep last 200)
setInterval(async () => {
  try {
    const count = await ModeratorChatMessage.countDocuments();
    if (count > 200) {
      const toDelete = count - 200;
      const oldMessages = await ModeratorChatMessage.find()
        .sort({ timestamp: 1 })
        .limit(toDelete)
        .select('_id');
      const ids = oldMessages.map(m => m._id);
      await ModeratorChatMessage.deleteMany({ _id: { $in: ids } });
      console.log(`[ModChat] Cleaned up ${toDelete} old messages`);
    }
  } catch (err) {
    console.error('[ModChat] Error cleaning up messages:', err);
  }
}, 300000); // Run every 5 minutes

// ========================================
// END CHAT SYSTEM
// ========================================

// ========================================
// 🎡 WHEEL GAME SOCKET.IO EVENTS
// ========================================
const wheelNamespace = io.of('/wheel');

wheelNamespace.on('connection', (socket) => {
  console.log('[Wheel] User connected:', socket.id);

  // Join a specific game room
  socket.on('wheel:joinGame', (gameId) => {
    socket.join(`wheel-${gameId}`);
    console.log(`[Wheel] User ${socket.id} joined game ${gameId}`);
  });

  // Leave a specific game room
  socket.on('wheel:leaveGame', (gameId) => {
    socket.leave(`wheel-${gameId}`);
    console.log(`[Wheel] User ${socket.id} left game ${gameId}`);
  });

  socket.on('disconnect', () => {
    console.log('[Wheel] User disconnected:', socket.id);
  });
});

// Initialize Wheel Game Manager (needs to be after namespace creation)
try {
  console.log('startup: initializing wheel game manager');
  const wheelGameManager = new WheelGameManager(wheelNamespace);
  app.locals.wheelGameManager = wheelGameManager;

  // Initialize 4 permanent lobbies
  (async () => {
    try {
      await wheelGameManager.initializeLobbies();
      console.log('startup: wheel game manager initialized with 4 permanent lobbies');
    } catch (e) {
      console.error('Failed to initialize wheel lobbies', e);
    }
  })();
} catch (e) { console.error('Failed to initialize wheel game manager', e); }

// API endpoint to get lobby information
app.get('/api/wheel/lobbies', (req, res) => {
  try {
    const wheelGameManager = req.app.locals.wheelGameManager;
    if (!wheelGameManager) {
      return res.status(503).json({ error: 'Wheel game manager not initialized' });
    }

    const lobbyIds = ['lobby-1', 'lobby-2', 'lobby-3', 'lobby-4'];
    const lobbies = lobbyIds.map(lobbyId => {
      const gameState = wheelGameManager.getGameState(lobbyId);
      if (!gameState || !gameState.seats) {
        return {
          lobbyId,
          roundNumber: 0,
          status: 'initializing',
          occupiedSeats: 0,
          totalSeats: 8,
          timeRemaining: 0
        };
      }

      return {
        lobbyId,
        roundNumber: gameState.roundNumber || 0,
        status: gameState.status || 'betting',
        occupiedSeats: gameState.seats.filter(s => s.occupied).length,
        totalSeats: 8,
        timeRemaining: gameState.timeRemaining || 0
      };
    });

    res.json({ lobbies });
  } catch (error) {
    console.error('[Wheel API] Error fetching lobbies:', error);
    res.status(500).json({ error: 'Failed to fetch lobbies' });
  }
});

// ========================================
// END WHEEL GAME SYSTEM
// ========================================

// 4️⃣ Divide vote live update
app.post("/api/divides/:id/vote", async (req, res) => {
  try {
    // Placeholder for divide vote logic
    // await divide.save();
    io.emit("voteUpdate", { id: req.params.id, updated: true });
    res.json({ success: true });
  } catch (err) {
    console.error("Error in vote route:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Alias for capitalized path
app.post("/api/Divides/:id/vote", async (req, res) => {
  try {
    io.emit("voteUpdate", { id: req.params.id, updated: true });
    res.json({ success: true });
  } catch (err) {
    console.error("Error in vote route (capitalized):", err);
    res.status(500).json({ error: "Server error" });
  }
});

// API helper: deduct a single free/vote credit from current user (used by client helper)
app.post('/api/divides/:id/deduct', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.balance < 1) return res.status(400).json({ error: 'Insufficient balance' });
    const oneC = toCents(1);
    if (user.balance < oneC) return res.status(400).json({ error: 'Insufficient balance' });
    user.balance = Math.max(0, user.balance - oneC);
    await user.save();
    try { await Ledger.create({ type: 'divides_deduct', amount: Number(1), userId: req.userId, divideId: req.params.id }); } catch (e) { console.error('Failed to write ledger for divides deduct', e); }
    res.json({ balance: toDollars(user.balance) });
  } catch (err) {
    console.error('Deduct error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 5️⃣ Get current jackpot amount
app.get('/jackpot', async (req, res) => {
  try {
    const jackpot = await Jackpot.findOne({ id: 'global' }).lean();
    const house = await House.findOne({ id: 'global' }).lean();
    const kenoReserveDoc = await KenoReserve.findOne({ id: 'global' }).lean();
    res.json({ amount: jackpot?.amount || 0, houseTotal: house?.houseTotal || 0, kenoReserve: kenoReserveDoc?.amount || 0 });
  } catch (err) {
    console.error('Error fetching jackpot:', err);
    res.status(500).json({ error: 'Failed to fetch jackpot' });
  }
});

// ──────────────────────────────────────────────────────────────
// RUGGED: Meme-coin live game (basic endpoints + socket updates)
// ──────────────────────────────────────────────────────────────

// Helper to broadcast rugged updates
async function broadcastRugged() {
  try {
    const doc = await Rugged.findOne({ id: 'global' });
    if (!doc) return;
    // Use the persisted Rugged document as the authoritative source for
    // display price and history. `doc.lastPrice` and `doc.priceHistory`
    // are already expressed in display units (USD-per-DC UI mapping).
    try {
      doc.priceHistory = doc.priceHistory || [];
      const fakePrice = Number(doc.lastPrice || 0) || 0;
      const last = doc.priceHistory && doc.priceHistory.length ? doc.priceHistory[doc.priceHistory.length - 1].price : doc.lastPrice || 0;
      if (Number(last) !== Number(fakePrice)) {
        doc.priceHistory.push({ ts: new Date(), price: fakePrice });
        if (doc.priceHistory.length > 500) doc.priceHistory = doc.priceHistory.slice(-500);
        doc.lastPrice = fakePrice;
        await doc.save().catch(e => console.error('failed to save Rugged priceHistory', e));
      }
    } catch (e) {
      console.error('failed to persist priceHistory', e);
    }

    const fakePriceEmit = Number(doc.lastPrice || 0);
    io.emit('rugged:update', {
      price: fakePriceEmit,
      ts: new Date(),
      totalSupply: doc.totalSupply,
      jackpotSupply: doc.jackpotSupply,
      circulatingSupply: doc.circulatingSupply,
      rugged: !!doc.rugged,
      ruggedCooldownUntil: doc.ruggedCooldownUntil || null,
      noRugUntil: doc.noRugUntil || null
    });
  } catch (e) { console.error('broadcastRugged error', e); }
}

// Recalculate and persist canonical price on Rugged doc from WalletUSDDC / totalSupply
async function recalcAndPersistPrice(doc) {
  try {
    if (!doc) return 0;
    // Derive fake price from doc.lastPrice (persisted display unit). If
    // doc.lastPrice is missing fall back to computing from the last
    // entry in priceHistory. We intentionally avoid reading legacy token wallet records.
    let fakePrice = Number(doc.lastPrice || 0);
    if (!fakePrice && Array.isArray(doc.priceHistory) && doc.priceHistory.length) {
      fakePrice = Number(doc.priceHistory[doc.priceHistory.length - 1].price || 0);
    }
    doc.lastPrice = fakePrice;
    try { await doc.save(); } catch (e) { console.error('recalcAndPersistPrice: failed to save Rugged doc', e); }
    return fakePrice;
  } catch (e) {
    console.error('recalcAndPersistPrice error', e);
    return 0;
  }
}

// Schedule helpers: when a rug occurs we persist a cooldown timestamp and
// schedule an automatic restart after the cooldown (2 minutes by default).
const scheduledRugRestarts = new Map(); // docId -> timeoutId

function scheduleRugRestart(docId, ms = 120000) {
  try {
    if (scheduledRugRestarts.has(docId)) {
      clearTimeout(scheduledRugRestarts.get(docId));
      scheduledRugRestarts.delete(docId);
    }
    const to = setTimeout(async () => {
      try {
        const doc = await Rugged.findOne({ id: docId });
        if (!doc) return;
        // clear rugged flag, reset price to a sane default, set a staged noRug window
        doc.rugged = false;
        doc.lastPrice = doc.lastPrice && doc.lastPrice > 0 ? doc.lastPrice : 0.0001;
        doc.noRugUntil = new Date(Date.now() + ((doc.noRugSeconds || 300) * 1000));
        // persist and broadcast
        await doc.save();
        setImmediate(() => broadcastRugged());
        console.log(`Rugged market restarted for ${docId}`);
      } catch (e) {
        console.error('Error restarting rugged market', e);
      } finally {
        scheduledRugRestarts.delete(docId);
      }
    }, ms);
    scheduledRugRestarts.set(docId, to);
    return to;
  } catch (e) {
    console.error('scheduleRugRestart failed', e);
  }
}

function cancelScheduledRugRestart(docId) {
  try {
    if (!scheduledRugRestarts.has(docId)) return false;
    clearTimeout(scheduledRugRestarts.get(docId));
    scheduledRugRestarts.delete(docId);
    return true;
  } catch (e) {
    console.error('cancelScheduledRugRestart failed', e);
    return false;
  }
}

// On server startup ensure any pending rugged cooldowns are scheduled
async function recoverScheduledRestarts() {
  try {
    const doc = await Rugged.findOne({ id: 'global' }).lean();
    if (!doc) return;
    if (doc.rugged && doc.ruggedCooldownUntil) {
      const until = new Date(doc.ruggedCooldownUntil).getTime();
      const now = Date.now();
      const remaining = Math.max(0, until - now);
      if (remaining === 0) {
        // cooldown passed while offline — clear immediately
        await Rugged.findOneAndUpdate({ id: 'global' }, { $set: { rugged: false, lastPrice: (doc.lastPrice && doc.lastPrice > 0) ? doc.lastPrice : 0.0001, noRugUntil: new Date(Date.now() + ((doc.noRugSeconds || 300) * 1000)) } });
        setImmediate(() => broadcastRugged());
        console.log('Recovered rugged: cooldown expired, market restarted immediately');
      } else {
        // schedule remaining time
        scheduleRugRestart('global', remaining);
        console.log('Recovered rugged: scheduled restart in', remaining, 'ms');
      }
    }
  } catch (e) {
    console.error('recoverScheduledRestarts failed', e);
  }
}

// run recovery after initialization (ensureRuggedInit is called earlier)
setTimeout(() => { recoverScheduledRestarts().catch(e => console.error(e)); }, 1500);

// Safety net: periodic check to ensure cooldowns always end even if setTimeouts fail
setInterval(async () => {
  try {
    const doc = await Rugged.findOne({ id: 'global' });
    if (!doc) return;
    if (doc.rugged && doc.ruggedCooldownUntil) {
      const until = new Date(doc.ruggedCooldownUntil).getTime();
      const now = Date.now();
      if (now >= until) {
        // cooldown expired but rugged flag still true: restart market now
        doc.rugged = false;
        doc.lastPrice = doc.lastPrice && doc.lastPrice > 0 ? doc.lastPrice : 0.0001;
        doc.noRugUntil = new Date(Date.now() + ((doc.noRugSeconds || 300) * 1000));
        doc.ruggedCooldownUntil = null;
        await doc.save();
        setImmediate(() => broadcastRugged());
        console.log('Safety-net: cleared ruggedCooldown and restarted market (interval check)');
      }
    }
  } catch (e) {
    console.error('cooldown safety interval error', e);
  }
}, 5000);

// Rugged endpoints (buy/sell/status/positions/etc) were moved into
// routes/rugged-pure-rng.js and are registered via registerRugged(app, io,...)
// to centralize Rugged logic and avoid duplicate/legacy TokenWallet usage.
// Keep server.js lightweight here and let the routed implementation be authoritative.

// Admin-only: reset global jackpot and house totals to zero
app.post('/jackpot/reset', auth, adminOnly, async (req, res) => {
  try {
    await Jackpot.findOneAndUpdate({ id: 'global' }, { $set: { amount: 0 } }, { upsert: true });
    await House.findOneAndUpdate({ id: 'global' }, { $set: { houseTotal: 0 } }, { upsert: true });
    await KenoReserve.findOneAndUpdate({ id: 'global' }, { $set: { amount: 0 } }, { upsert: true });
    const jackpot = await Jackpot.findOne({ id: 'global' }).lean();
    const house = await House.findOne({ id: 'global' }).lean();
    const kenoReserveDoc = await KenoReserve.findOne({ id: 'global' }).lean();
    res.json({ amount: jackpot?.amount || 0, houseTotal: house?.houseTotal || 0, kenoReserve: kenoReserveDoc?.amount || 0 });
  } catch (err) {
    console.error('Error resetting jackpot totals:', err);
    res.status(500).json({ error: 'Failed to reset jackpot totals' });
  }
});

// Admin finance summary: aggregates Keno and Divide financials (admins only)
app.get('/admin/finance', auth, adminOnly, async (req, res) => {
  try {
    // Get current house and jackpot data
    const house = await House.findOne({ id: 'global' }).lean();
    const jackpot = await Jackpot.findOne({ id: 'global' }).lean();

    if (!house) {
      return res.status(500).json({ error: 'House document not found' });
    }

    // Calculate total deposits across all users
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalDeposited: { $sum: '$totalDeposited' },
          totalWithdrawn: { $sum: '$totalWithdrawn' }
        }
      }
    ]);

    const totalDeposited = userStats.length > 0 ? (userStats[0].totalDeposited || 0) : 0;
    const totalWithdrawn = userStats.length > 0 ? (userStats[0].totalWithdrawn || 0) : 0;

    // Build per-game stats from house document (amounts in cents, convert to dollars)
    const games = {
      plinko: {
        handle: (house.plinko?.totalBets || 0) / 100,
        payouts: (house.plinko?.totalPayouts || 0) / 100,
        jackpotFee: (house.plinko?.jackpotFees || 0) / 100,
        houseProfit: (house.plinko?.houseProfit || 0) / 100
      },
      blackjack: {
        handle: (house.blackjack?.totalBets || 0) / 100,
        payouts: (house.blackjack?.totalPayouts || 0) / 100,
        jackpotFee: (house.blackjack?.jackpotFees || 0) / 100,
        houseProfit: (house.blackjack?.houseProfit || 0) / 100
      },
      keno: {
        handle: (house.keno?.totalBets || 0) / 100,
        payouts: (house.keno?.totalPayouts || 0) / 100,
        jackpotFee: (house.keno?.jackpotFees || 0) / 100,
        houseProfit: (house.keno?.houseProfit || 0) / 100
      },
      rugged: {
        handle: (house.rugged?.totalBets || 0) / 100,
        payouts: (house.rugged?.totalPayouts || 0) / 100,
        jackpotFee: (house.rugged?.jackpotFees || 0) / 100,
        houseProfit: (house.rugged?.houseProfit || 0) / 100
      },
      mines: {
        handle: (house.mines?.totalBets || 0) / 100,
        payouts: (house.mines?.totalPayouts || 0) / 100,
        jackpotFee: (house.mines?.jackpotFees || 0) / 100,
        houseProfit: (house.mines?.houseProfit || 0) / 100
      },
      divides: {
        handle: (house.divides?.totalBets || 0) / 100,
        payouts: (house.divides?.totalPayouts || 0) / 100,
        jackpotFee: (house.divides?.jackpotFees || 0) / 100,
        houseProfit: (house.divides?.houseProfit || 0) / 100
      }
    };

    res.json({
      global: {
        jackpotAmount: toDollars(jackpot?.amount || 0),
        houseTotal: (house.houseTotal || 0) / 100,
        totalRedemptions: house.totalRedemptions || 0,
        totalRedemptionAmount: toDollars(house.totalRedemptionAmount || 0),
        totalDeposited: toDollars(totalDeposited),
        totalWithdrawn: toDollars(totalWithdrawn)
      },
      games
    });
  } catch (err) {
    console.error('/admin/finance error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin force restart endpoint removed - incompatible with provably fair system

// Admin: consolidate DC balances from non-canonical token wallets into WalletDC
// Usage: POST /admin/rugged/consolidate?commit=true  (commit=true to apply, otherwise dry-run)
app.post('/admin/rugged/consolidate', auth, adminOnly, async (req, res) => {
  // Legacy token wallet records have been removed from the system and consolidation
  // is no longer applicable. Use Ledger / RuggedState / Jackpot for auditing.
  return res.status(400).json({ error: 'Legacy token wallets removed; /admin/rugged/consolidate is deprecated. Use Ledger/RuggedState/Jackpot for reconciliation.' });
});

// Admin endpoint: compute expected multiplier (and RTP%) per spot using server paytables
app.get('/admin/keno-rtp', auth, adminOnly, async (req, res) => {
  try {
    // combinatorics helpers for hypergeometric probabilities
    function C(n, k) {
      if (k < 0 || k > n) return 0;
      if (k === 0 || k === n) return 1;
      k = Math.min(k, n - k);
      let num = 1n, den = 1n;
      for (let i = 1; i <= k; i++) {
        num *= BigInt(n - (k - i));
        den *= BigInt(i);
      }
      return Number(num / den);
    }
    function hyperProb(s, k) {
      const totalCombs = C(40, 10);
      const ways = C(s, k) * C(40 - s, 10 - k);
      return ways / totalCombs;
    }

    const result = {};
    for (const risk of Object.keys(paytables || {})) {
      result[risk] = {};
      for (let s = 1; s <= 10; s++) {
        let exp = 0;
        for (let k = 0; k <= s; k++) {
          const mult = (paytables[risk] && paytables[risk][s] && paytables[risk][s][k]) ? paytables[risk][s][k] : 0;
          const p = hyperProb(s, k);
          exp += p * mult;
        }
        result[risk][s] = { expectedMultiplier: Number(exp.toFixed(6)), rtp: Number((exp * 100).toFixed(4)) };
      }
    }
    res.json({ rtp: result });
  } catch (err) {
    console.error('/admin/keno-rtp error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin ledger viewer endpoint (paged, filterable)
app.get('/admin/ledger', auth, adminOnly, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 50));
    const type = req.query.type;
    const userId = req.query.userId;
    const divideId = req.query.divideId;
    const roundId = req.query.roundId;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const match = {};
    if (type) match.type = type;
    if (userId) match.userId = userId;
    if (divideId) match.divideId = divideId;
    if (roundId) match.roundId = roundId;
    if (from || to) match.createdAt = {};
    if (from) match.createdAt.$gte = from;
    if (to) match.createdAt.$lte = to;

    const total = await Ledger.countDocuments(match);
    const items = await Ledger.find(match).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();

    res.json({ page, limit, total, items });
  } catch (err) {
    console.error('/admin/ledger error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -----------------------------
// Shared endDivide helper
// -----------------------------
async function endDivideById(divideId, invokedByUserId = null) {
  try {
    // find by short id or _id
    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide) {
      console.log('endDivideById: divide not found', { divideId });
      return null;
    }
    if (divide.status !== 'active') {
      console.log('endDivideById: already ended or settling', { divideId, status: divide.status });
      return divide;
    }

    // mark as settling to avoid concurrent payouts
    divide.status = 'settling';
    await divide.save();

    // NEW LOGIC: 50/50 coin flip determines winner (provably fair)
    // If tied votes, flip coin. Otherwise minority wins with better multipliers
    let winnerSide;
    if (divide.votesA === divide.votesB) {
      // Perfect tie - 50/50 coin flip using crypto randomness
      const randomByte = require('crypto').randomBytes(1)[0];
      winnerSide = randomByte < 128 ? 'A' : 'B';
      console.log(`🪙 Coin flip (tie): ${divide.votesA} vs ${divide.votesB} → Winner: ${winnerSide}`);
    } else {
      // Minority wins - creates better multipliers with imbalance
      winnerSide = divide.votesA < divide.votesB ? 'A' : 'B';
    }
    const winnerVotes = winnerSide === 'A' ? divide.votesA : divide.votesB;

    const houseCut = 0; // No per-divide house cuts
    const jackpotAmount = 0; // No per-divide jackpot cuts
    const winnerPot = divide.pot; // 100% to winners


    let distributed = 0;

    if (divide.isUserCreated) {
      // For user-created divides: payout based on bet percentage
      // Winners split the pot proportional to their bet amounts
      const winners = divide.votes.filter(v => v.side === winnerSide && v.voteCount > 0);
      const totalWinnerVotes = winners.reduce((sum, v) => sum + v.voteCount, 0);

      if (totalWinnerVotes > 0 && winners.length > 0) {
        const winnerPotCents = Math.round(winnerPot * 100);

        for (const winner of winners) {
          try {
            const voter = await User.findById(winner.userId);
            if (!voter) continue;
            const shareCents = Math.round((winner.voteCount / totalWinnerVotes) * winnerPotCents);
            const share = Number((shareCents / 100).toFixed(2));
            voter.balance = Number((voter.balance + share).toFixed(2));
            voter.totalWon = (voter.totalWon || 0) + shareCents;
            // Only increment win count if they made a profit (share > their bet)
            const betCents = Math.round((winner.voteCount || 0) * 100);
            if (shareCents > betCents) {
              voter.totalWins = (voter.totalWins || 0) + 1;
            }
            await voter.save();
            distributed += share;
          } catch (e) {
            console.error('Failed to credit user-created divide winner', winner.userId, e);
          }
        }

        // Track losses for voters on losing side
        const losers = divide.votes.filter(v => v.side !== winnerSide && !v.isFree && v.voteCount > 0);
        for (const loser of losers) {
          try {
            const voter = await User.findById(loser.userId);
            if (!voter) continue;
            voter.totalLosses = (voter.totalLosses || 0) + 1;
            await voter.save();
          } catch (e) {
            console.error('Failed to update loser stats', loser.userId, e);
          }
        }

        distributed = Number(distributed.toFixed(2));
      }
    } else {
      // For admin-created divides: legacy equal split among winners
      // distribute in cents to avoid floating rounding overflow
      const winnerPotCents = Math.round(winnerPot * 100);
      let distributedCents = 0;

      if (winnerVotes > 0 && Array.isArray(divide.votes) && divide.votes.length > 0) {
        // first compute integer shares per winner (floor) in cents
        const winners = divide.votes.filter(v => v.side === winnerSide && v.voteCount > 0);
        const shares = [];
        // Distribute equally between distinct winning entries (one share per user)
        const perWinner = Math.floor(winnerPotCents / winners.length);
        for (const v of winners) {
          shares.push({ userId: v.userId, shareCents: perWinner, voteCount: v.voteCount });
          distributedCents += perWinner;
        }
        // put any leftover cents to the first winner
        let remainder = winnerPotCents - distributedCents;
        if (remainder > 0 && shares.length > 0) {
          shares[0].shareCents += remainder;
          distributedCents += remainder;
          remainder = 0;
        }

        // apply shares to users
        for (const s of shares) {
          try {
            const voter = await User.findById(s.userId);
            if (!voter) continue;
            const share = Number((s.shareCents / 100).toFixed(2));
            voter.balance = Number((voter.balance + share).toFixed(2));
            voter.totalWon = (voter.totalWon || 0) + s.shareCents;
            // Check if this was a winning vote (only for paid votes)
            const voterRecord = divide.votes.find(v => String(v.userId) === String(s.userId));
            if (voterRecord && !voterRecord.isFree) {
              const betCents = Math.round((voterRecord.voteCount || 0) * 100);
              if (s.shareCents > betCents) {
                voter.totalWins = (voter.totalWins || 0) + 1;
              }
            }
            await voter.save();
          } catch (e) {
            console.error('Failed to credit winner share', s.userId, e);
          }
        }

        // Track losses for voters on losing side
        const losers = divide.votes.filter(v => v.side !== winnerSide && !v.isFree && v.voteCount > 0);
        for (const loser of losers) {
          try {
            const voter = await User.findById(loser.userId);
            if (!voter) continue;
            voter.totalLosses = (voter.totalLosses || 0) + 1;
            await voter.save();
          } catch (e) {
            console.error('Failed to update loser stats', loser.userId, e);
          }
        }

        distributed = Math.round((distributedCents / 100) * 100) / 100;
      }
    }

    // update jackpot and house totals atomically (create global doc if missing)
    try {
      await Jackpot.findOneAndUpdate({ id: 'global' }, { $inc: { amount: jackpotAmount } }, { upsert: true, setDefaultsOnInsert: true });
      await House.findOneAndUpdate({ id: 'global' }, { $inc: { houseTotal: houseCut } }, { upsert: true, setDefaultsOnInsert: true });

      // Track in finance system: pot is total bet, distributed is payout
      const potCents = Math.round(divide.pot * 100);
      const distributedCents = Math.round(distributed * 100);
      await updateHouseStats('divides', potCents, distributedCents);
    } catch (e) {
      console.error('Failed to update Jackpot totals', e);
    }

    // persist payout and cut details for auditability
    divide.paidOut = distributed; // actual amount credited to winners
    divide.houseCut = houseCut;
    divide.jackpotCut = jackpotAmount;

    // ledger entries for divide payouts and inflows
    try {
      // record house + jackpot inflows (system in)
      if (houseCut && houseCut > 0) await Ledger.create({ type: 'divides_house_cut', amount: Number(houseCut), divideId: divide.id || divide._id });
      if (jackpotAmount && jackpotAmount > 0) await Ledger.create({ type: 'divides_jackpot_in', amount: Number(jackpotAmount), divideId: divide.id || divide._id });
      // record payout to winners (system out)
      if (distributed && distributed > 0) await Ledger.create({ type: 'divides_payout', amount: Number(-distributed), divideId: divide.id || divide._id });
    } catch (e) {
      console.error('Failed to write ledger entries for divide end', e);
    }

    divide.status = 'ended';
    divide.winnerSide = winnerSide;
    await divide.save();

    // Award pot milestone XP to creator (if user-created)
    if (divide.isUserCreated && divide.creatorId) {
      const potAmount = divide.pot;
      if (potAmount >= 1000) {
        await awardXp(divide.creatorId, 'dividePot1000', 0, { 
          divideId: divide.id || divide._id,
          pot: potAmount 
        });
      } else if (potAmount >= 100) {
        await awardXp(divide.creatorId, 'dividePot100', 0, { 
          divideId: divide.id || divide._id,
          pot: potAmount 
        });
      }
    }

    // emit structured ended event
    io.emit('divideEnded', { id: divide.id, _id: divide._id, winner: winnerSide, pot: divide.pot, houseCut, jackpotAmount, distributed });

    // Automatic restart of a new divide after ending has been disabled.
    // Previously the server would create a new random 'battle' here; the
    // application now expects admins to create new Divides manually so we
    // don't seed default rounds programmatically.

    return divide;
  } catch (err) {
    console.error('endDivideById error', err);
    throw err;
  }
}

// Scheduler: check active divides and end them when endTime reached
setInterval(async () => {
  try {
    const now = new Date();
    const toEnd = await Divide.find({ status: 'active', endTime: { $lte: now } }).lean();
    if (!toEnd || toEnd.length === 0) return;
    console.log('Scheduler ending divides:', toEnd.map(d => d.id || d._id));
    for (const d of toEnd) {
      try {
        await endDivideById(d.id || d._id);
      } catch (e) {
        console.error('Scheduler failed to end divide', d.id || d._id, e);
      }
    }
  } catch (err) {
    console.error('Divide scheduler error', err);
  }
}, 5000);

// GET CURRENT USER (for frontend refresh)
app.get("/api/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("_id username balance role holdingsDC holdingsInvested profileImage wagered totalWon totalDeposited totalWithdrawn totalRedemptions totalBets totalWins totalLosses createdAt discordId discordUsername xp level currentBadge xpThisWeek xpThisMonth");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      id: user._id,
      username: user.username,
      balance: toDollars(user.balance),
      role: user.role,
      holdingsDC: user.holdingsDC || 0,
      holdingsInvested: user.holdingsInvested || 0,
      profileImage: user.profileImage || '',
      wagered: toDollars(user.wagered || 0),
      totalWon: toDollars(user.totalWon || 0),
      totalDeposited: toDollars(user.totalDeposited || 0),
      totalWithdrawn: toDollars(user.totalWithdrawn || 0),
      totalRedemptions: user.totalRedemptions || 0,
      totalBets: user.totalBets || 0,
      totalWins: user.totalWins || 0,
      totalLosses: user.totalLosses || 0,
      createdAt: user.createdAt,
      discordId: user.discordId || null,
      discordUsername: user.discordUsername || null,
      xp: user.xp || 0,
      level: user.level || 1,
      currentBadge: user.currentBadge || 'newbie',
      xpThisWeek: user.xpThisWeek || 0,
      xpThisMonth: user.xpThisMonth || 0
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/me - Update user profile (e.g. profileImage)
app.patch("/api/me", auth, async (req, res) => {
  try {
    const { profileImage } = req.body;
    const updates = {};

    if (profileImage !== undefined) {
      if (typeof profileImage !== 'string') return res.status(400).json({ error: "profileImage must be a string" });
      updates.profileImage = profileImage;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true }
    ).select("_id username balance role holdingsDC holdingsInvested profileImage");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user._id,
      username: user.username,
      balance: toDollars(user.balance),
      role: user.role,
      holdingsDC: user.holdingsDC || 0,
      holdingsInvested: user.holdingsInvested || 0,
      profileImage: user.profileImage || ''
    });
  } catch (err) {
    console.error('PATCH /api/me error', err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/user/update-profile - Update user profile
app.post("/api/user/update-profile", auth, async (req, res) => {
  try {
    const { profileImage } = req.body;

    if (profileImage !== undefined && typeof profileImage !== 'string') {
      return res.status(400).json({ error: "profileImage must be a string" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: profileImage || '' },
      { new: true }
    ).select("_id username balance role profileImage");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      success: true,
      id: user._id,
      username: user.username,
      balance: toDollars(user.balance),
      role: user.role,
      profileImage: user.profileImage || ''
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/user/upload-profile-image - Upload profile image
app.post("/api/user/upload-profile-image", auth, (req, res, next) => {
  upload.single('profileImage')(req, res, async (err) => {
    if (err) {
      console.error('Profile image upload error:', err.message);
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      console.log('Profile image uploaded:', req.file.filename);

      // Update user's profile image in database
      const user = await User.findByIdAndUpdate(
        req.userId,
        { profileImage: imageUrl },
        { new: true }
      ).select("_id username balance role profileImage");

      if (!user) return res.status(404).json({ error: "User not found" });

      res.json({
        success: true,
        id: user._id,
        username: user.username,
        balance: toDollars(user.balance),
        role: user.role,
        profileImage: user.profileImage
      });
    } catch (err) {
      console.error('Profile update error:', err);
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  });
});

// POST /api/verify-game - Get provably fair data for a game
app.post("/api/verify-game", async (req, res) => {
  try {
    const { gameType, gameId } = req.body;

    if (!gameType || !gameId) {
      return res.status(400).json({ error: "gameType and gameId required" });
    }

    let gameData = null;

    switch (gameType) {
      case 'Keno':
        gameData = await KenoRound.findById(gameId).lean();
        if (gameData) {
          res.json({
            serverSeed: gameData.serverSeed,
            serverSeedHashed: gameData.serverSeedHashed,
            blockHash: gameData.blockHash,
            gameSeed: gameData.gameSeed,
            clientSeed: gameData.clientSeed,
            nonce: gameData.nonce,
            result: {
              drawnNumbers: gameData.drawnNumbers,
              selectedNumbers: gameData.picks,
              matches: gameData.matches,
              win: gameData.win
            }
          });
        }
        break;

      case 'Plinko':
        gameData = await PlinkoGame.findById(gameId).lean();
        if (gameData) {
          res.json({
            serverSeed: gameData.proofOfFair?.serverSeed,
            serverSeedHashed: gameData.proofOfFair?.serverSeedHash,
            clientSeed: gameData.proofOfFair?.clientSeed,
            nonce: gameData.proofOfFair?.nonce,
            result: {
              path: gameData.path,
              finalSlot: gameData.finalSlot,
              multiplier: gameData.multiplier,
              payout: toDollars(gameData.payout)
            }
          });
        }
        break;

      case 'Blackjack':
        gameData = await BlackjackGame.findById(gameId).lean();
        if (gameData) {
          res.json({
            serverSeed: gameData.proofOfFair?.serverSeed,
            serverSeedHashed: gameData.proofOfFair?.serverSeedHash,
            clientSeed: gameData.proofOfFair?.clientSeed,
            nonce: gameData.proofOfFair?.nonce,
            result: {
              playerHands: gameData.playerHands,
              dealerHand: gameData.dealerHand,
              mainResult: gameData.mainResult,
              totalPayout: gameData.mainPayout + gameData.perfectPairsPayout + gameData.twentyPlusThreePayout + gameData.blazingSevensPayout
            }
          });
        }
        break;

      case 'Case Battle':
        gameData = await CaseBattle.findById(gameId).lean();
        if (gameData) {
          const players = gameData.players?.map(p => ({
            username: p.username,
            seed: p.seed || p.hybridSeed,
            randomOrgSeed: p.randomOrgSeed,
            eosBlockHash: p.eosBlockHash,
            ticket: p.ticket,
            totalItemValue: p.totalItemValue
          })) || [];

          res.json({
            serverSeed: players[0]?.seed,
            result: {
              mode: gameData.mode,
              players,
              winnerId: gameData.winnerId,
              pot: gameData.pot
            }
          });
        }
        break;

      default:
        return res.status(400).json({ error: "Unknown game type" });
    }

    if (!gameData) {
      return res.status(404).json({ error: "Game not found" });
    }

  } catch (err) {
    console.error('Verify game error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

// SECURITY: /api/me/balance endpoint REMOVED
// Users should NEVER be able to set their own balance from the client
// Balance is managed server-side in game endpoints (Keno, Plinko, Blackjack)

// PATCH /api/me - Update user profile (balance updates BLOCKED for security)
app.patch("/api/me", auth, async (req, res) => {
  try {
    const patch = req.body || {};

    // SECURITY: Block any attempts to update balance or sensitive fields
    const blockedFields = ['balance', 'role', 'totalWinnings', 'totalBets', 'totalWins', 'totalLosses', 'wagered'];
    const attemptedBlocked = blockedFields.filter(field => field in patch);

    if (attemptedBlocked.length > 0) {
      console.warn(`[SECURITY] User ${req.userId} attempted to update blocked fields: ${attemptedBlocked.join(', ')}`);
      return res.status(403).json({
        error: 'Cannot update protected fields',
        blockedFields: attemptedBlocked
      });
    }

    // Allow updating safe fields only (e.g., profileImage, discordId, discordUsername, username if needed)
    const safeFields = {};
    const allowedFields = ['profileImage', 'discordId', 'discordUsername']; // Add other safe fields as needed

    for (const field of allowedFields) {
      if (field in patch) {
        safeFields[field] = patch[field];
      }
    }

    if (Object.keys(safeFields).length === 0) {
      // No valid fields to update, but don't error - just return current user
      const user = await User.findById(req.userId).select("_id username balance role profileImage xp level currentBadge");
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({
        id: user._id,
        username: user.username,
        balance: toDollars(user.balance),
        role: user.role,
        profileImage: user.profileImage,
        xp: user.xp || 0,
        level: user.level || 1,
        currentBadge: user.currentBadge || 'newbie'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: safeFields },
      { new: true }
    ).select("_id username balance role profileImage xp level currentBadge");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user._id,
      username: user.username,
      balance: toDollars(user.balance),
      role: user.role,
      profileImage: user.profileImage,
      xp: user.xp || 0,
      level: user.level || 1,
      currentBadge: user.currentBadge || 'newbie'
    });
  } catch (err) {
    console.error('[PATCH /api/me] error:', err);
    res.status(500).json({ error: "Server error" });
  }
});


// POST /add-funds - Add funds to user balance (for purchases/deposits)
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

    console.log(`[ADD FUNDS] User ${user.username} added $${amount}, new balance: $${toDollars(user.balance)}, wagerReq: $${toDollars(user.wagerRequirement)}`);

    res.json({ balance: toDollars(user.balance) });
  } catch (err) {
    console.error('[POST /add-funds] error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

// Withdraw funds (requires 1x playthrough of deposited amount)
app.post("/api/withdraw", auth, async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: "Not authenticated" });

    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: "Invalid withdrawal amount" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const amountCents = Math.round(amount * 100);

    // Check if user has sufficient balance
    if (user.balance < amountCents) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Check wager requirement (1x playthrough)
    const wagerReq = user.wagerRequirement || 0;
    if (wagerReq > 0) {
      return res.status(400).json({
        error: `Must wager $${toDollars(wagerReq)} more before withdrawal`,
        wagerRequirement: toDollars(wagerReq)
      });
    }

    // Process withdrawal
    user.balance -= amountCents;
    user.totalWithdrawn = (user.totalWithdrawn || 0) + amountCents;
    user.totalRedemptions = (user.totalRedemptions || 0) + 1;
    await user.save();

    // Track global redemptions in House stats
    try {
      await House.findOneAndUpdate(
        { id: 'global' },
        {
          $inc: {
            totalRedemptions: 1,
            totalRedemptionAmount: amountCents
          }
        },
        { upsert: true }
      );
    } catch (e) {
      console.error('[WITHDRAW] Failed to update House redemption stats', e);
    }

    console.log(`[WITHDRAW] User ${user.username} withdrew $${amount}, new balance: $${toDollars(user.balance)}`);

    res.json({
      success: true,
      balance: toDollars(user.balance),
      withdrawn: amount
    });
  } catch (err) {
    console.error('[POST /api/withdraw] error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

// Promote user to admin (requires ADMIN_CODE in request body)
app.post("/api/promote-to-admin", auth, async (req, res) => {
  try {
    const { adminCode } = req.body || {};
    const expectedCode = process.env.ADMIN_CODE;

    if (!expectedCode) {
      return res.status(500).json({ error: "ADMIN_CODE not configured on server" });
    }

    if (!adminCode || adminCode !== expectedCode) {
      return res.status(403).json({ error: "Invalid admin code" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { role: 'admin' },
      { new: true }
    ).select("_id username role");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, message: "User promoted to admin", role: user.role });
  } catch (err) {
    console.error('Promote to admin error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

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

// 6️⃣ Finally start the server
console.log('startup: about to call server.listen');
console.log('🌐 Environment Variables Check:');
console.log('   FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('   DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('   DISCORD_CLIENT_SECRET:', process.env.DISCORD_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('   DISCORD_REDIRECT_URI:', process.env.DISCORD_REDIRECT_URI);
server.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));

// -----------------------------
// Scheduled leaderboard + jackpot snapshot
// -----------------------------
async function snapshotLeaderboardAndJackpot() {
  try {
    console.log('Snapshot job: computing leaderboard snapshot');

    // Keno leaderboard
    const kenoTop = await KenoRound.aggregate([
      { $match: { win: { $gt: 0 } } },
      { $addFields: { multiplier: { $cond: [{ $eq: ['$betAmount', 0] }, 0, { $divide: ['$win', '$betAmount'] }] } } },
      { $sort: { multiplier: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          let: { uid: { $toObjectId: '$userId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
            { $project: { username: 1 } }
          ],
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { win: 1, multiplier: 1, username: { $ifNull: ['$user.username', '???'] } } }
    ]).allowDiskUse(true);

    // Plinko leaderboard
    const plinkoTop = await PlinkoGame.aggregate([
      {
        $addFields: {
          multiplier: { $cond: [{ $eq: ['$betAmount', 0] }, 0, { $divide: ['$payout', '$betAmount'] }] }
        }
      },
      { $sort: { multiplier: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          let: { uid: { $toObjectId: '$userId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
            { $project: { username: 1 } }
          ],
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { win: '$payout', multiplier: 1, username: { $ifNull: ['$user.username', '???'] } } }
    ]).allowDiskUse(true);

    // Blackjack leaderboard
    const blackjackTop = await BlackjackGame.aggregate([
      { $match: { mainPayout: { $gt: 0 } } },
      {
        $addFields: {
          multiplier: { $cond: [{ $eq: ['$mainBet', 0] }, 0, { $divide: ['$mainPayout', '$mainBet'] }] }
        }
      },
      { $sort: { multiplier: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          let: { uid: { $toObjectId: '$userId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
            { $project: { username: 1 } }
          ],
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { win: '$mainPayout', multiplier: 1, username: { $ifNull: ['$user.username', '???'] } } }
    ]).allowDiskUse(true);

    const jackpot = await Jackpot.findOne({ id: 'global' }).lean();

    const snapshot = {
      createdAt: new Date(),
      keno: {
        count: Array.isArray(kenoTop) ? kenoTop.length : 0,
        entries: kenoTop || []
      },
      plinko: {
        count: Array.isArray(plinkoTop) ? plinkoTop.length : 0,
        entries: plinkoTop || []
      },
      blackjack: {
        count: Array.isArray(blackjackTop) ? blackjackTop.length : 0,
        entries: blackjackTop || []
      },
      jackpotAmount: (jackpot && jackpot.amount) ? jackpot.amount : 0,
      houseTotal: (jackpot && jackpot.houseTotal) ? jackpot.houseTotal : 0
    };

    const res = await mongoose.connection.db.collection('leaderboard_snapshots').insertOne(snapshot);
    console.log('Snapshot job: inserted snapshot id', res.insertedId);
  } catch (err) {
    console.error('Snapshot job error', err);
  }
}

// schedule snapshot to run at next local midnight, then every 24h
function scheduleDailySnapshot() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0); // next midnight
  const msUntilNext = next.getTime() - now.getTime();
  console.log('Scheduling leaderboard snapshot in', msUntilNext, 'ms');
  setTimeout(() => {
    // run once at next midnight, then every 24h
    snapshotLeaderboardAndJackpot();
    setInterval(snapshotLeaderboardAndJackpot, 24 * 60 * 60 * 1000);
  }, msUntilNext);
}

// start scheduling after a short delay to ensure DB is connected
setTimeout(() => {
  try {
    scheduleDailySnapshot();
  } catch (e) {
    console.error('Failed to schedule daily snapshot', e);
  }
}, 5000);

// Catch-all route: serve index.html for client-side routing (must be LAST)
// This will only be reached if no previous middleware/route handled the request
app.use((req, res, next) => {
  // Don't override API routes that return 404s or errors
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  // Serve index.html for all other routes (React Router)
  res.sendFile(path.join(__dirname, 'divide-frontend-fresh', 'dist', 'index.html'));
});
