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
import KenoRound from './models/KenoRound.js';
import ChatMessage from './models/ChatMessage.js';
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
import { paytables, configured } from './paytable-data.js';
import http from 'http';
import registerRugged from './routes/rugged-pure-rng.js';
import registerCaseBattles from './routes/caseBattles.js';
import registerCases from './routes/cases.js';
import { setupItemRoutes } from './routes/items.js';
import blackjackRoutes from './routes/blackjack.js';
import registerPlinko from './routes/plinko.js';
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

// Simple in-memory play rate limiter for Keno to prevent abuse during dev.
// Keeps recent timestamps per user and allows up to `max` plays per windowMs.
const _playRateMap = new Map();
function checkPlayRate(userId, { windowMs = 5000, max = 5 } = {}) {
  if (!userId) return false;
  const now = Date.now();
  const arr = _playRateMap.get(userId) || [];
  const recent = arr.filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    // record the attempt
    recent.push(now);
    _playRateMap.set(userId, recent);
    return false;
  }
  recent.push(now);
  _playRateMap.set(userId, recent);
  return true;
}

// Configure CORS to allow the React dev server and allow credentials (cookies)
const allowedOrigins = [
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

// Image upload endpoint
// Image upload endpoint
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
      const url = `/uploads/${req.file.filename}`;
      // Save to user profile if authenticated
      if (req.userId) {
        await User.findByIdAndUpdate(req.userId, { profileImage: url });
      }
      console.log('File uploaded successfully:', req.file.filename);
      res.json({ url });
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
    await User.findByIdAndUpdate(req.userId, { profileImage: imagePath });
    res.json({ success: true, imagePath });
  } catch (err) {
    console.error('Set profile image error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve static assets from the frontend `public/` folder so backend can
// directly serve resources like `/keno.png` without duplicating files.
// This keeps the single backend authoritative for these static endpoints
// in dev and production when serving the built frontend.
app.use(express.static(path.join(__dirname, 'divide-frontend-fresh', 'public')));

// Serve raw sound files from the repo-level /sounds directory at the
// `/sounds/*` path so audio requests like `/sounds/click.wav` succeed.
app.use('/sounds', express.static(path.join(__dirname, 'sounds')));

// Simple auth endpoints for the frontend dev server.
// POST /register { username, password } -> { token, userId, balance, role }
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // prevent duplicate username
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    // Hash password with bcrypt (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    const u = await User.create({ username, password: hashedPassword, balance: 1000 });
    const token = jwt.sign({ userId: u._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: u._id, balance: toDollars(u.balance), role: u.role });
  } catch (e) {
    console.error('Register error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /login { username, password } -> { token, userId, balance, role }
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

    const u = await User.findOne({ username });
    if (!u) return res.status(400).json({ error: 'Invalid credentials' });

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(password, u.password);
    if (!isValidPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: u._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: u._id, balance: toDollars(u.balance), role: u.role });
  } catch (e) {
    console.error('Login error', e);
    res.status(500).json({ error: 'Server error' });
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

    let voteCount = 1;
    let isFree = true;
    if (boostAmount > 0) {
      // boostAmount is provided in dollars by client; convert to cents for internal accounting
      const boostCents = toCents(boostAmount);
      if (user.balance < boostCents) return res.status(400).json({ error: 'Insufficient balance' });
      user.balance = Math.max(0, user.balance - boostCents);
      voteCount = boostAmount; // votes are counted in whole-dollar units as before
      isFree = false;
    }

    // free vote handling
    const today = new Date().toDateString();
    if (isFree && user.lastFreeVoteDate === today) return res.status(400).json({ error: 'Free vote used today' });
    if (isFree) user.lastFreeVoteDate = today;

    const existing = divide.votes.find(v => v.userId === req.userId);
    if (existing) {
      // If creator, only allow updating vote if side matches locked side
      if (divide.isUserCreated && divide.creatorId === req.userId && divide.creatorSide && side !== divide.creatorSide) {
        return res.status(400).json({ error: 'Creator is locked to their chosen side and cannot vote on the other side.' });
      } else {
        existing.voteCount += voteCount;
        existing.side = side;
        existing.isFree = isFree;
      }
    } else {
      divide.votes.push({ userId: req.userId, side, voteCount, isFree });
    }

    divide.totalVotes += voteCount;
    if (side === 'A') divide.votesA += voteCount;
    else divide.votesB += voteCount;
    // divide.pot stored in dollars in DB (legacy); keep pot arithmetic in dollars
    divide.pot = Number((divide.pot + boostAmount).toFixed(2));

    await divide.save();
    await user.save();

    // Ledger: record paid vote (money into the system) when boostAmount used
    try {
      if (!isFree && boostAmount > 0) {
        await Ledger.create({
          type: 'divides_bet',
          amount: Number(boostAmount),
          userId: req.userId,
          divideId: divide.id || divide._id,
          meta: { side }
        });
      }
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

    let voteCount = 1;
    let isFree = true;
    let betAmount = 0;

    // For user-created divides, voting requires a bet
    if (divide.isUserCreated) {
      if (!bet || bet <= 0) return res.status(400).json({ error: 'Bet amount required for user-created divides' });
      const betCents = toCents(bet);
      if (user.balance < betCents) return res.status(400).json({ error: 'Insufficient balance' });
      user.balance = user.balance - betCents;
      voteCount = bet;
      isFree = false;
      betAmount = bet;
    } else {
      // Admin-created divides: legacy free vote or boost logic
      if (boostAmount > 0) {
        const boostCents = toCents(boostAmount);
        if (user.balance < boostCents) return res.status(400).json({ error: 'Insufficient balance' });
        user.balance = Math.max(0, user.balance - boostCents);
        voteCount = boostAmount;
        isFree = false;
        betAmount = boostAmount;
      }

      const today = new Date().toDateString();
      if (isFree && user.lastFreeVoteDate === today) return res.status(400).json({ error: 'Free vote used today' });
      if (isFree) user.lastFreeVoteDate = today;
    }

    divide.votes.push({ userId: req.userId, side, voteCount, isFree, bet: betAmount });

    divide.totalVotes += voteCount;
    if (side === 'A') divide.votesA += voteCount;
    else divide.votesB += voteCount;
    divide.pot = Number((divide.pot + (betAmount || boostAmount)).toFixed(2));

    await divide.save();
    await user.save();

    // Ledger: record vote bet
    try {
      const betForLedger = betAmount || boostAmount;
      if (!isFree && betForLedger > 0) {
        await Ledger.create({
          type: 'divides_bet',
          amount: Number(betForLedger),
          userId: req.userId,
          divideId: divide.id || divide._id,
          meta: { side }
        });
      }
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
      votesA: side === 'A' ? 1 : 0,
      votesB: side === 'B' ? 1 : 0,
      totalVotes: 1,
      pot: bet,
      status: 'active',
      votes: [{ userId: req.userId, side, voteCount: 1, isFree: false, bet }],
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
  try {
    const { betAmount, playerNumbers, clientSeed = '', nonce, risk = 'classic' } = req.body;

    // validation
    if (typeof betAmount !== 'number' || isNaN(betAmount) || betAmount < 0.01)
      return res.status(400).json({ error: 'Invalid bet amount' });
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
    } catch (e) { /* ignore */ }
    const totalCents = Math.round(betAmount * 100);
    const winCents = Math.round(totalCents * multiplier);
    const win = Number((winCents / 100).toFixed(2));

    // Keno money flow (no house cut):
    // - 2.5% of bet goes to jackpot
    // - 2.5% of bet goes to keno reserve (built-in)
    // - Remaining: net loss/gain goes to/from reserve
    // Reserve change = bet - win - jackpot = jackpot + (bet - win - jackpot) in accounting
    // Simplified: Reserve gets (2.5% + all losses), but we track it as: bet - win (the net from bet perspective)
    // Actually: we need to add jackpot back because jackpot is also paid from the reserve
    // So: reserveCents = bet - win + jackpot (bet minus wins, plus the jackpot that's being funded)

    // Money flow on every bet:
    // - 2.5% to jackpot
    // - 2.5% to keno reserve
    // - If loss: remaining 95% also goes to keno reserve
    // - If win: 95% minus the payout comes from keno reserve

    let jackpotCents = Math.round(totalCents * 0.025);
    const jackpotCut = Number((jackpotCents / 100).toFixed(2));
    const houseCut = 0;

    let reserveKenoCut = Math.round(totalCents * 0.025); // 2.5% to reserve
    let remainingCents = totalCents - jackpotCents - reserveKenoCut; // 95% remaining

    // If player lost (win is 0), all 95% remaining goes to reserve
    // If player won, the payout is pulled from reserve instead
    let reserveCents = reserveKenoCut + remainingCents - winCents;
    const reserveChange = Number((reserveCents / 100).toFixed(2));

    // Step 1: Atomically deduct the bet from the user's balance now so the bet
    // is immediately removed from their account. Increment the server nonce.
    const afterDeduct = await User.findOneAndUpdate(
      { _id: req.userId, balance: { $gte: totalCents } },
      { $inc: { balance: -totalCents, kenoNonce: 1 }, $set: { kenoServerSeed: serverSeed } },
      { new: true }
    );

    if (!afterDeduct) {
      console.log('[KENO] BET DEDUCTION FAILED: insufficient balance or update failed', { userId: req.userId, totalCents, nonce });
      return res.status(400).json({ error: 'Insufficient balance or concurrent modification' });
    }

    // Record bet ledger immediately (system IN)
    try {
      const metaBase = { requestId: `r_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}`, ip: req.ip, ua: req.get('User-Agent'), nonce };
      await Ledger.create({ type: 'keno_bet', amount: Number((totalCents / 100).toFixed(2)), userId: req.userId, meta: { ...metaBase, risk, spots } });
    } catch (e) {
      console.error('Failed to write ledger for keno_bet', e);
    }

    // Update jackpot/reserve (best-effort)
    try {
      await Jackpot.findOneAndUpdate(
        { id: 'global' },
        { $inc: { amount: jackpotCut } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      await KenoReserve.findOneAndUpdate(
        { id: 'global' },
        { $inc: { amount: reserveChange } },
        { upsert: true, setDefaultsOnInsert: true }
      );
    } catch (e) {
      console.error('Failed to update jackpot/house after keno play', e);
    }

    // Step 2: Apply payout if any (credit user)
    let afterPayout = afterDeduct;
    try {
      if (winCents > 0) {
        afterPayout = await User.findOneAndUpdate(
          { _id: req.userId },
          { $inc: { balance: winCents, totalWinnings: winCents }, $set: { kenoServerSeed: serverSeed } },
          { new: true }
        );
      }
    } catch (e) {
      console.error('Failed to apply payout to user', e);
    }

    // Step 3: persist the round and additional ledger rows
    let createdRoundId = null;
    try {
      const round = await KenoRound.create({
        userId: req.userId,
        betAmount: Number((totalCents / 100).toFixed(2)),
        picks: normalizedPicks,
        drawnNumbers,
        matches,
        win: Number((winCents / 100).toFixed(2)),
        balanceAfter: toDollars(afterPayout.balance),
        serverSeed,
        serverSeedHashed,
        clientSeed,
        nonce,
        blockHash,
        gameSeed,
        risk,
        multiplier,
        houseCut,
        jackpotCut,
        reserveChange,
        verified: true  // Mark as verified since we just generated it
      });
      createdRoundId = round._id;

      const metaBase2 = { requestId: `r_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}`, ip: req.ip, ua: req.get('User-Agent'), nonce };
      if (typeof reserveChange !== 'undefined' && reserveChange !== 0) {
        await Ledger.create({ type: 'keno_reserve_in', amount: Number(reserveChange), meta: { ...metaBase2, roundId: round._id } });
      }
      if (jackpotCut && jackpotCut > 0) {
        await Ledger.create({ type: 'keno_jackpot_in', amount: Number(jackpotCut), meta: { ...metaBase2, roundId: round._id } });
      }
      if (winCents > 0) {
        await Ledger.create({ type: 'keno_payout', amount: Number(-(winCents / 100)), userId: req.userId, meta: { ...metaBase2, multiplier } });
      }
    } catch (e) {
      console.error('Failed to persist keno round or ledger rows', e);
    }

    // respond with authoritative data
    // `afterDeduct` is the user state after the bet was deducted.
    // `afterPayout` is the user state after any payout was applied.
    // Use the post-payout state for `balance` and fall back to post-deduct if needed.
    const finalUser = afterPayout || afterDeduct;
    res.json({
      drawnNumbers,
      matches,
      win: Number((winCents / 100).toFixed(2)),
      multiplier,
      houseCut,
      jackpotCut,
      // current balance (after payout if applied)
      balance: toDollars(finalUser.balance),
      // balance after the bet deduction but before payout (useful for client UI hold)
      balanceAfterBet: toDollars(Math.max(0, (afterDeduct.balance || 0))),
      serverSeed,
      serverSeedHashed,
      clientSeed,
      blockHash,
      gameSeed,
      // return authoritative server-side nonce for this user so client can sync
      kenoNonce: (typeof finalUser.kenoNonce !== 'undefined' ? finalUser.kenoNonce : 0),
      nonce,
      roundId: createdRoundId
    });
  } catch (err) {
    console.error('KENO /play error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DuckOrBuck endpoint removed from server (feature retired)
// Rotate user's server seed (for provably-fair)
app.post('/keno/rotate-seed', auth, async (req, res) => {
  try {
    const newServerSeed = generateSeed();
    const newServerSeedHashed = await sha256(newServerSeed);

    const updated = await User.findOneAndUpdate(
      { _id: req.userId },
      { $set: { kenoServerSeed: newServerSeed, kenoServerSeedHashed: newServerSeedHashed, kenoNonce: 0 } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return the hashed seed (not the plaintext, for security)
    return res.json({
      success: true,
      serverSeedHashed: newServerSeedHashed,
      message: 'Server seed rotated successfully'
    });
  } catch (err) {
    console.error('[KENO] rotate seed error', err);
    return res.status(500).json({ error: 'Failed to rotate seed' });
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

// Admin: list suspect keno rounds where stored multiplier/win differ from paytable
app.get('/admin/keno/suspect-rounds', auth, adminOnly, async (req, res) => {
  try {
    const limit = Math.min(2000, Math.max(1, parseInt(req.query.limit || '200')));
    const skip = Math.max(0, parseInt(req.query.skip || '0'));
    const userFilter = req.query.userId;
    const q = {};
    if (userFilter) q.userId = String(userFilter);
    // allow since timestamp filter (ISO) to narrow scope
    if (req.query.since) {
      const since = new Date(req.query.since);
      if (!isNaN(since)) q.timestamp = { $gte: since };
    }
    const rounds = await KenoRound.find(q).sort({ timestamp: -1 }).skip(skip).limit(limit).lean();
    const suspects = [];
    for (const r of rounds) {
      try {
        const picks = Array.isArray(r.picks) ? r.picks.map(Number) : [];
        const drawn = Array.isArray(r.drawnNumbers) ? r.drawnNumbers.map(Number) : [];
        const matches = Array.isArray(r.matches) ? r.matches.map(Number) : [];
        const spots = picks.length;
        const hits = matches.length;
        const risk = r.risk || 'classic';
        let baseExpected = paytables[risk] && paytables[risk][spots] ? paytables[risk][spots][hits] : 0;
        baseExpected = (typeof baseExpected === 'number') ? baseExpected : Number(baseExpected) || 0;
        // normalize bet to cents (handle legacy cent-integer storage)
        let betVal = Number(r.betAmount || r.bet || 0);
        let betCents = 0;
        if (Number.isFinite(betVal) && betVal >= 1000 && Math.abs(betVal - Math.round(betVal)) < 1e-9) {
          betCents = Math.round(betVal);
        } else {
          betCents = Math.round(betVal * 100);
        }
        const expectedWinCents = Math.round(betCents * baseExpected);
        const storedWinCents = Math.round((Number(r.win) || 0) * 100);
        const storedMultiplier = Number(r.multiplier || 0);
        const expectedMultiplier = Number(baseExpected || 0);
        if (storedMultiplier !== expectedMultiplier || storedWinCents !== expectedWinCents) {
          suspects.push({
            roundId: r._id,
            userId: r.userId,
            timestamp: r.timestamp,
            betAmount: r.betAmount,
            spots,
            hits,
            picks,
            drawn,
            storedMultiplier,
            expectedMultiplier,
            storedWin: (storedWinCents / 100),
            expectedWin: (expectedWinCents / 100),
          });
        }
      } catch (e) {
        console.error('Error validating round', r && r._id, e);
      }
    }
    res.json({ checked: rounds.length, suspectCount: suspects.length, suspects });
  } catch (e) {
    console.error('GET /admin/keno/suspect-rounds error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ──────────────────────────────────────────────────────────────
// SIMPLE BALANCE ADJUSTMENTS
// ──────────────────────────────────────────────────────────────
app.post('/add-funds', auth, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const user = await User.findById(req.userId);
  const amountCents = toCents(amount);
  user.balance = (user.balance || 0) + amountCents;
  await user.save();
  // ledger
  try {
    await Ledger.create({ type: 'funds_added', amount: Number(amount), userId: req.userId });
  } catch (e) { console.error('Failed to write ledger for add-funds', e); }
  res.json({ balance: toDollars(user.balance) });
});

app.post('/deduct-balance', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const amountCents = toCents(amount);
    if (user.balance < amountCents) return res.status(400).json({ error: 'Insufficient balance' });

    user.balance = Math.max(0, user.balance - amountCents);
    await user.save();
    try { await Ledger.create({ type: 'manual_deduction', amount: Number(-amount), userId: req.userId }); } catch (e) { console.error('Failed to write ledger for deduct-balance', e); }
    res.json({ balance: toDollars(user.balance) });
  } catch (err) {
    console.error('Deduct balance error', err);
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
        wager: game.betAmount / 100,
        multiplier: game.multiplier.toFixed(2) + 'x',
        payout: game.payout / 100,
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
        wager: game.betAmount / 100,
        multiplier: game.multiplier.toFixed(2) + 'x',
        payout: game.payout / 100,
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

    // Sort all games by time and limit
    games.sort((a, b) => new Date(b.time) - new Date(a.time));
    const myGames = games.slice(0, limit);

    res.json({ games: myGames });
  } catch (err) {
    console.error('Error fetching my games:', err);
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
  }
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
  registerPlinko(app, io, { auth });
  console.log('startup: registerPlinko returned');
} catch (e) { console.error('Failed to register plinko routes', e); }

// Register Blackjack routes
try {
  console.log('startup: about to register blackjack routes');
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
      const { username, message } = data;

      if (!username || !message || message.trim().length === 0) {
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
// END CHAT SYSTEM
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
    // Keno aggregates with P&L lines
    const kenoAgg = await KenoRound.aggregate([
      {
        $group: {
          _id: null,
          rounds: { $sum: 1 },
          totalBets: { $sum: { $ifNull: ['$betAmount', 0] } },
          totalWins: { $sum: { $ifNull: ['$win', 0] } },
          totalHouseCuts: { $sum: { $ifNull: ['$houseCut', 0] } },
          totalJackpotCuts: { $sum: { $ifNull: ['$jackpotCut', 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          rounds: 1,
          totalBets: 1,
          totalWins: 1,
          totalHouseCuts: 1,
          totalJackpotCuts: 1,
          GGR: { $subtract: ['$totalBets', '$totalWins'] },
          prizePoolRemaining: {
            $subtract: [
              { $subtract: ['$totalBets', { $add: ['$totalHouseCuts', '$totalJackpotCuts'] }] },
              '$totalWins'
            ]
          },
          companyRevenue: {
            $add: ['$totalHouseCuts', {
              $subtract: [
                { $subtract: ['$totalBets', { $add: ['$totalHouseCuts', '$totalJackpotCuts'] }] },
                '$totalWins'
              ]
            }]
          }
        }
      }
    ]).allowDiskUse(true);
    const keno = (kenoAgg && kenoAgg[0]) ? kenoAgg[0] : { rounds: 0, totalBets: 0, totalWins: 0, totalHouseCuts: 0, totalJackpotCuts: 0, GGR: 0, prizePoolRemaining: 0, companyRevenue: 0 };

    // Divides aggregates with estimated P&L lines (based on pot distribution rules)
    // endDivideById uses: houseCut = round(pot * 0.05,2), jackpotAmount = round(pot * 0.05,2), winnerPot = round(pot * 0.90,2)
    const dividesAgg = await Divide.aggregate([
      {
        $group: {
          _id: null,
          rounds: { $sum: 1 },
          totalPot: { $sum: { $ifNull: ['$pot', 0] } },
          countActive: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          countEnded: { $sum: { $cond: [{ $eq: ['$status', 'ended'] }, 1, 0] } },
          totalPaidOut: { $sum: { $ifNull: ['$paidOut', { $round: [{ $multiply: ['$pot', 0.90] }, 2] }] } },
          totalHouseCuts: { $sum: { $ifNull: ['$houseCut', { $round: [{ $multiply: ['$pot', 0.05] }, 2] }] } },
          totalJackpotCuts: { $sum: { $ifNull: ['$jackpotCut', { $round: [{ $multiply: ['$pot', 0.05] }, 2] }] } }
        }
      },
      {
        $project: {
          _id: 0,
          rounds: 1,
          totalPot: 1,
          countActive: 1,
          countEnded: 1,
          totalHouseCuts: 1,
          totalJackpotCuts: 1,
          totalPaidOut: 1,
          GGR: { $subtract: ['$totalPot', '$totalPaidOut'] },
          prizePoolRemaining: {
            $subtract: [
              { $subtract: ['$totalPot', { $add: ['$totalHouseCuts', '$totalJackpotCuts'] }] },
              '$totalPaidOut'
            ]
          }
        }
      }
    ]).allowDiskUse(true);
    const dividesSummary = (dividesAgg && dividesAgg[0]) ? dividesAgg[0] : { rounds: 0, totalPot: 0, countActive: 0, countEnded: 0, totalHouseCuts: 0, totalJackpotCuts: 0, totalPaidOut: 0, GGR: 0, prizePoolRemaining: 0 };

    // Ensure money-in / money-out for Divides is computed from Ledger so totals
    // remain accurate even if Divide documents are deleted. Ledger is the
    // authoritative audit trail for money movements.
    try {
      const betAgg = await Ledger.aggregate([
        { $match: { type: 'divides_bet' } },
        { $group: { _id: null, totalBets: { $sum: '$amount' } } }
      ]).allowDiskUse(true);
      const payoutAgg = await Ledger.aggregate([
        { $match: { type: 'divides_payout' } },
        { $group: { _id: null, totalPayouts: { $sum: '$amount' } } }
      ]).allowDiskUse(true);
      const houseCutsAgg = await Ledger.aggregate([
        { $match: { type: 'divides_house_cut' } },
        { $group: { _id: null, totalHouseCuts: { $sum: '$amount' } } }
      ]).allowDiskUse(true);
      const jackpotCutsAgg = await Ledger.aggregate([
        { $match: { type: 'divides_jackpot_in' } },
        { $group: { _id: null, totalJackpotCuts: { $sum: '$amount' } } }
      ]).allowDiskUse(true);

      const ledgerBets = (betAgg && betAgg[0] && betAgg[0].totalBets) ? betAgg[0].totalBets : 0;
      const ledgerPayouts = (payoutAgg && payoutAgg[0] && payoutAgg[0].totalPayouts) ? payoutAgg[0].totalPayouts : 0; // stored as negative values
      const ledgerHouseCuts = (houseCutsAgg && houseCutsAgg[0] && houseCutsAgg[0].totalHouseCuts) ? houseCutsAgg[0].totalHouseCuts : 0;
      const ledgerJackpotCuts = (jackpotCutsAgg && jackpotCutsAgg[0] && jackpotCutsAgg[0].totalJackpotCuts) ? jackpotCutsAgg[0].totalJackpotCuts : 0;

      // Replace the divides monetary totals with ledger-backed values
      dividesSummary.totalPot = Number(ledgerBets || dividesSummary.totalPot);
      // divides_payout ledger entries are stored as negative amounts; take absolute for totalPaidOut
      dividesSummary.totalPaidOut = Number(Math.abs(Number(ledgerPayouts)) || dividesSummary.totalPaidOut);
      dividesSummary.totalHouseCuts = Number(ledgerHouseCuts || dividesSummary.totalHouseCuts);
      dividesSummary.totalJackpotCuts = Number(ledgerJackpotCuts || dividesSummary.totalJackpotCuts);
      // recompute derived fields
      dividesSummary.GGR = Number((dividesSummary.totalPot - dividesSummary.totalPaidOut).toFixed(2));
      dividesSummary.prizePoolRemaining = Number((dividesSummary.totalPot - (dividesSummary.totalHouseCuts + dividesSummary.totalJackpotCuts) - dividesSummary.totalPaidOut).toFixed(2));
    } catch (e) {
      console.error('Failed to compute divides totals from ledger, falling back to document aggregates', e);
    }

    // current global totals from jackpot/house docs
    const jackpot = await Jackpot.findOne({ id: 'global' }).lean();
    const house = await House.findOne({ id: 'global' }).lean();
    const kenoReserveDoc = await KenoReserve.findOne({ id: 'global' }).lean();
    // overall summary
    const overall = {
      totalHouseAccrued: (keno.totalHouseCuts || 0) + (dividesSummary.totalHouseCuts || 0) || 0,
      totalJackpotAccrued: (keno.totalJackpotCuts || 0) + (dividesSummary.totalJackpotCuts || 0) || 0,
      totalPayouts: (keno.totalWins || 0) + (dividesSummary.totalPaidOut || 0) || 0,
      totalHandle: (keno.totalBets || 0) + (dividesSummary.totalPot || 0) || 0,
      totalGGR: (keno.GGR || 0) + (dividesSummary.GGR || 0) || 0
    };

    // TokenWallets removed; rely on Ledger / RuggedState / Jackpot for summaries.

    // Simplified money-in / money-out report. House and jackpot totals are
    // returned under `global` and should be displayed separately by the UI.
    res.json({
      keno: {
        rounds: keno.rounds || 0,
        moneyIn: Number((keno.totalBets || 0)),      // total handle
        moneyOut: Number((keno.totalWins || 0)),     // payouts to players (excludes jackpot fund movements)
        net: Number(((keno.totalBets || 0) - (keno.totalWins || 0)))
      },
      divides: {
        rounds: dividesSummary.rounds || 0,
        moneyIn: Number((dividesSummary.totalPot || 0)),
        moneyOut: Number((dividesSummary.totalPaidOut || 0)),
        net: Number(((dividesSummary.totalPot || 0) - (dividesSummary.totalPaidOut || 0)))
      },
      global: {
        jackpotAmount: jackpot?.amount || 0,
        houseTotal: house?.houseTotal || 0,
        kenoReserve: kenoReserveDoc?.amount || 0
      },
      overall: {
        moneyIn: Number((overall.totalHandle || 0)),
        moneyOut: Number((overall.totalPayouts || 0)),
        net: Number(((overall.totalHandle || 0) - (overall.totalPayouts || 0)))
      }
      ,
      wallets: []
    });
  } catch (err) {
    console.error('/admin/finance error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: force-restart the Rugged market immediately (clears rugged state and cooldown)
app.post('/admin/rugged/restart', auth, adminOnly, async (req, res) => {
  try {
    const doc = await Rugged.findOne({ id: 'global' });
    if (!doc) return res.status(404).json({ error: 'Rugged not initialized' });
    doc.rugged = false;
    doc.ruggedCooldownUntil = null;
    doc.noRugUntil = new Date(Date.now() + ((doc.noRugSeconds || 300) * 1000));
    doc.lastPrice = doc.lastPrice && doc.lastPrice > 0 ? doc.lastPrice : 0.0001;
    // clear price history and circulating supply so clients start fresh
    doc.priceHistory = [];
    doc.circulatingSupply = 0;
    // persist initial changes
    await doc.save();
    // Burn / reset total supply and ensure wallets reflect the post-restart state:
    // - WalletDC should hold 75,000,000 DC
    // - Jackpot (Jackpot model) should hold 25,000,000 DC
    try {
      // Legacy token wallet records are no longer used. Set canonical
      // Jackpot and Rugged document fields. Ledger entries are created for audit.
      const treasury = Math.floor(RUGGED_TOTAL_SUPPLY * 0.75);
      const jackpotAmount = RUGGED_TOTAL_SUPPLY - treasury; // remainder (25%) to jackpot

      // Ensure Jackpot document reflects remainder allocated to JackpotDC
      await Jackpot.findOneAndUpdate({ id: 'global' }, { $set: { amount: jackpotAmount } }, { upsert: true });
      // record admin action
      try { await Ledger.create({ type: 'rugged_admin_restart', amount: 0, meta: { treasury, jackpotAmount } }); } catch (e) { console.error('ledger rugged_admin_restart failed', e); }

      // Update Rugged doc canonical supply fields to reflect the reset
      doc.jackpotSupply = jackpotAmount;
      doc.circulatingSupply = 0;
      doc.totalSupply = RUGGED_TOTAL_SUPPLY;
      doc.priceHistory = [];
      await doc.save();
    } catch (e) {
      console.error('admin rugged restart: failed to reset jackpot/supply', e);
    }
    // cancel any scheduled restart
    try { cancelScheduledRugRestart('global'); } catch (e) { /* ignore */ }
    // notify clients to reset their charts and state
    try {
      io.emit('rugged:restart', { price: doc.lastPrice, rugged: doc.rugged, noRugUntil: doc.noRugUntil });
    } catch (e) { console.error('emit rugged:restart failed', e); }
    setImmediate(() => broadcastRugged());
    res.json({ success: true, msg: 'Rugged market restarted' });
  } catch (e) {
    console.error('/admin/rugged/restart error', e);
    res.status(500).json({ error: 'Server error' });
  }
});

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

    const winnerSide = divide.votesA > divide.votesB ? 'A' : 'B';
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
            // Calculate share: (winner's bet / total winner bets) * pot
            const shareCents = Math.round((winner.voteCount / totalWinnerVotes) * winnerPotCents);
            const share = Number((shareCents / 100).toFixed(2));
            voter.balance = Number((voter.balance + share).toFixed(2));
            await voter.save();
            distributed += share;
          } catch (e) {
            console.error('Failed to credit user-created divide winner', winner.userId, e);
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
            await voter.save();
          } catch (e) {
            console.error('Failed to credit winner share', s.userId, e);
          }
        }
        distributed = Math.round((distributedCents / 100) * 100) / 100;
      }
    }

    // update jackpot and house totals atomically (create global doc if missing)
    try {
      await Jackpot.findOneAndUpdate({ id: 'global' }, { $inc: { amount: jackpotAmount } }, { upsert: true, setDefaultsOnInsert: true });
      await House.findOneAndUpdate({ id: 'global' }, { $inc: { houseTotal: houseCut } }, { upsert: true, setDefaultsOnInsert: true });
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
    const user = await User.findById(req.userId).select("_id username balance role holdingsDC holdingsInvested profileImage");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user._id, username: user.username, balance: toDollars(user.balance), role: user.role, holdingsDC: user.holdingsDC || 0, holdingsInvested: user.holdingsInvested || 0, profileImage: user.profileImage || '' });
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
              payout: gameData.payout / 100
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

// PUT /api/me/balance - Update user balance
app.put("/api/me/balance", auth, async (req, res) => {
  try {
    const { balance } = req.body;
    if (balance === undefined) return res.status(400).json({ error: "balance required" });

    const balanceCents = Math.round(balance * 100);
    const user = await User.findByIdAndUpdate(
      req.userId,
      { balance: balanceCents },
      { new: true }
    ).select("_id username balance role");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user._id, username: user.username, balance: toDollars(user.balance), role: user.role });
  } catch (err) {
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

// 6️⃣ Finally start the server
console.log('startup: about to call server.listen');
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

// End of server file