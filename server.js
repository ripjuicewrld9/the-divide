import { Server } from "socket.io";
import dotenv from 'dotenv';
dotenv.config();

// Models
import Divide from './models/Divide.js';
import Jackpot from './models/Jackpot.js';
import House from './models/House.js';
import Ledger from './models/Ledger.js';
import User from './models/User.js';
import SupportTicket from './models/SupportTicket.js';
import ChatMessage from './models/ChatMessage.js';
import ChatMute from './models/ChatMute.js';
import ModeratorChatMessage from './models/ModeratorChatMessage.js';
import Notification from './models/Notification.js';
import UserEngagement from './models/UserEngagement.js';
import CaseBattle from './models/CaseBattle.js';

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
import { paytables, configured } from './paytable-data.js';
import http from 'http';

// Routes
import registerCaseBattles from './routes/caseBattles.js';
import registerCases from './routes/cases.js';
import { setupItemRoutes } from './routes/items.js';

// Utils
import { fileURLToPath } from 'url';
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

// House stats helper
async function updateHouseStats(game, betAmount, payout) {
  try {
    const jackpotFee = Math.floor(betAmount * 0.01);
    const houseNet = betAmount - payout - jackpotFee;

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

// XP System
import { XP_RATES, getLevelFromXP, getXPToNextLevel, getProgressPercent } from './utils/xpSystem.js';

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

app.use('/login', authLimiter);
app.use('/register', authLimiter);
app.use('/api/', generalLimiter);

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
      balance: 1000, // Starting balance in cents
      role,
      createdAt: new Date()
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
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      return res.json({ requiresTwoFactor: true, userId: user._id.toString() });
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

app.get('/api/me', auth, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.userId).select('-password -twoFactorSecret');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      ...user.toObject(),
      balance: toDollars(user.balance)
    });
  } catch (err) {
    console.error('GET /api/me', err);
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
    try {
      const fallback = await Divide.find({}).sort({ endTime: 1 }).lean();
      return res.json(fallback || []);
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

    await Ledger.create({
      type: 'divides_bet',
      amount: Number(bet),
      userId: req.userId,
      divideId: doc.id || doc._id,
      meta: { side }
    });

    await awardXp(req.userId, 'divideCreated', 0, { divideId: doc.id || doc._id, title, pot: bet });
    await awardXp(req.userId, 'usdWager', betCents, { divideId: doc.id || doc._id, side, amount: bet });

    io.emit('newDivide', doc);
    res.json(doc);
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
    const { divideId: rawDivideId, side, boostAmount = 0, id: altId, _id: alt_id } = req.body;
    const divideId = rawDivideId || altId || alt_id;
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

    if (!boostAmount || boostAmount <= 0) {
      return res.status(400).json({ error: 'Bet amount required (minimum $0.01)' });
    }

    let shortAmount = boostAmount;
    let boostCents = toCents(boostAmount);
    
    if (user.balance < boostCents) return res.status(400).json({ error: 'Insufficient balance' });
    user.balance = Math.max(0, user.balance - boostCents);
    
    if (user.wagerRequirement > 0) {
      user.wagerRequirement = Math.max(0, user.wagerRequirement - boostCents);
    }

    const existing = divide.votes.find(v => v.userId === req.userId);
    if (existing) {
      if (divide.isUserCreated && divide.creatorId === req.userId && divide.creatorSide && side !== divide.creatorSide) {
        return res.status(400).json({ error: 'Creator is locked to their chosen side' });
      } else {
        existing.voteCount += shortAmount;
        existing.side = side;
      }
    } else {
      divide.votes.push({ userId: req.userId, side, voteCount: shortAmount });
    }

    divide.totalVotes += shortAmount;
    if (side === 'A') divide.votesA += shortAmount;
    else divide.votesB += shortAmount;
    divide.pot = Number((divide.pot + boostAmount).toFixed(2));

    user.totalBets = (user.totalBets || 0) + 1;
    user.wagered = (user.wagered || 0) + boostCents;
    
    await awardXp(req.userId, 'usdWager', boostCents, { divideId: divide.id || divide._id, side, amount: boostAmount });

    await divide.save();
    await user.save();

    await Ledger.create({
      type: 'divides_bet',
      amount: Number(boostAmount),
      userId: req.userId,
      divideId: divide.id || divide._id,
      meta: { side }
    });

    io.emit('voteUpdate', divide);
    res.json({ balance: toDollars(user.balance), votesA: divide.votesA, votesB: divide.votesB, pot: divide.pot });
  } catch (err) {
    console.error('POST /divides/vote', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/Divides/vote', auth, async (req, res) => {
  req.url = '/divides/vote';
  return app._router.handle(req, res);
});

// END divide helper function
async function endDivideById(divideId, userId) {
  try {
    let divide = await Divide.findOne({ id: divideId });
    if (!divide) divide = await Divide.findById(divideId);
    if (!divide || divide.status !== 'active') return null;

    divide.status = 'ended';
    const minority = divide.votesA < divide.votesB ? 'A' : 'B';
    const winnerSide = minority;
    divide.winnerSide = winnerSide;

    const winners = divide.votes.filter(v => v.side === winnerSide);
    const totalWinnerVotes = winners.reduce((sum, w) => sum + w.voteCount, 0);

    const pot = Number(divide.pot);
    const houseCut = pot * 0.05;
    const jackpotAmount = pot * 0.01;
    const distributed = pot - houseCut - jackpotAmount;

    await House.findOneAndUpdate(
      { id: 'global' },
      { $inc: { houseTotal: toCents(houseCut) } },
      { upsert: true }
    );

    await Jackpot.findOneAndUpdate(
      { id: 'global' },
      { $inc: { amount: toCents(jackpotAmount) } },
      { upsert: true }
    );

    if (totalWinnerVotes > 0) {
      for (const w of winners) {
        const share = (w.voteCount / totalWinnerVotes) * distributed;
        const shareCents = toCents(share);

        await User.findByIdAndUpdate(w.userId, { $inc: { balance: shareCents } });

        await Ledger.create({
          type: 'divides_win',
          amount: Number(share),
          userId: w.userId,
          divideId: divide.id || divide._id,
          meta: { side: winnerSide, pot, houseCut, jackpotAmount }
        });
      }
    }

    await divide.save();

    io.emit('divideEnded', { 
      id: divide.id, 
      _id: divide._id, 
      winner: winnerSide, 
      pot: divide.pot, 
      houseCut, 
      jackpotAmount, 
      distributed 
    });

    return { id: divide.id, winnerSide, pot: divide.pot };
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
    io.emit('newDivide', divide);
    res.json(divide);
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

    const existing = await UserEngagement.findOne({
      userId: req.userId,
      type: 'likeGiven',
      'metadata.divideId': divide.id || divide._id
    });

    if (existing) {
      return res.status(400).json({ error: 'Already liked this divide' });
    }

    divide.likes = (divide.likes || 0) + 1;
    await divide.save();

    await awardXp(req.userId, 'likeGiven', 0, { divideId: divide.id || divide._id });

    if (divide.creatorId) {
      await awardXp(divide.creatorId, 'likeReceived', 0, { divideId: divide.id || divide._id });
    }

    res.json({ success: true, likes: divide.likes });
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

    const existing = await UserEngagement.findOne({
      userId: req.userId,
      type: 'dislikeGiven',
      'metadata.divideId': divide.id || divide._id
    });

    if (existing) {
      return res.status(400).json({ error: 'Already disliked this divide' });
    }

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

    res.json({ success: true, dislikes: divide.dislikes });
  } catch (err) {
    console.error('POST /divides/:id/dislike', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

app.get('/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastActive: { $gt: new Date(Date.now() - 24*60*60*1000) } });
    const totalWagered = await User.aggregate([{ $group: { _id: null, total: { $sum: '$wagered' } } }]);
    const activeDivides = await Divide.countDocuments({ status: 'active' });

    const house = await House.findOne({ id: 'global' });
    const jackpot = await Jackpot.findOne({ id: 'global' });

    res.json({
      userCount,
      activeUsers,
      totalWagered: totalWagered[0]?.total || 0,
      activeDivides,
      houseTotal: house?.houseTotal || 0,
      jackpotAmount: jackpot?.amount || 0
    });
  } catch (err) {
    console.error('GET /admin/stats', err);
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
    if (typeof balance !== 'undefined') updates.balance = toCents(balance);
    if (role) updates.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password -twoFactorSecret');
    res.json(user);
  } catch (err) {
    console.error('PATCH /admin/users/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/admin/ledger', auth, adminOnly, async (req, res) => {
  try {
    const { limit = 100, type, userId } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (userId) filter.userId = userId;

    const entries = await Ledger.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json(entries);
  } catch (err) {
    console.error('GET /admin/ledger', err);
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

    const ticket = await SupportTicket.create({
      userId: req.userId,
      subject,
      message,
      category: category || 'general',
      status: 'open',
      createdAt: new Date()
    });

    res.json(ticket);
  } catch (err) {
    console.error('POST /api/support/tickets', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/support/tickets', auth, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    console.error('GET /api/support/tickets', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/support/tickets/all', auth, moderatorOnly, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({}).sort({ createdAt: -1 }).limit(200);
    res.json({ tickets });
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

    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(ticket);
  } catch (err) {
    console.error('PATCH /api/support/tickets/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// CHAT ROUTES
// ==========================================

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
      badge: user.currentBadge || 'Rookie',
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
      currentBadge: user.currentBadge || 'Rookie'
    };

    res.json({ user, stats });
  } catch (err) {
    console.error('GET /api/users/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/users/:id/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (req.params.id !== req.userId) {
      return res.status(403).json({ error: 'Can only update own avatar' });
    }

    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;
    if (!avatarUrl) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password -twoFactorSecret');

    res.json(user);
  } catch (err) {
    console.error('PATCH /api/users/:id/avatar', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// CASE BATTLES ROUTES (if needed)
// ==========================================

try {
  console.log('Registering case battles routes');
  registerCaseBattles(app, io, { auth, adminOnly });
  console.log('Case battles routes registered');
} catch (e) {
  console.error('Failed to register case battles routes', e);
}

try {
  console.log('Registering cases routes');
  registerCases(app, io, { auth, adminOnly });
  console.log('Cases routes registered');
} catch (e) {
  console.error('Failed to register cases routes', e);
}

try {
  console.log('Registering items routes');
  setupItemRoutes(app, auth, adminOnly);
  console.log('Items routes registered');
} catch (e) {
  console.error('Failed to register items routes', e);
}

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

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

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
