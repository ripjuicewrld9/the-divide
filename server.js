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
    d.votesA = null;
    d.votesB = null;
    d.totalVotes = null;
    d.votes = []; // Hide individual vote records
    d.voteHistory = []; // Hide vote history chart data
    d.shorts = []; // Hide shorts data if present
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
      console.log(`[VIP] User ${user.username} earned ${(rakeback/100).toFixed(2)} dividends (${newTier} tier)`);
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
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
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
            <p style="color: #666; font-size: 12px;">The Divide - Prediction Market Platform</p>
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
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?discord_link=${linkToken}`);
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

// ==========================================
// DISCORD OAUTH FOR LOGIN/SIGNUP
// ==========================================

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
        email: discordUser.email || '',
        password: crypto.randomBytes(32).toString('hex'), // Random password (they'll use Discord login)
        balance: 1000, // Starting balance in cents
        discordId: discordUser.id,
        discordUsername: `${discordUser.username}#${discordUser.discriminator}`
      });
      await user.save();
      console.log(`✓ New user created via Discord: ${username} (${discordUser.id})`);
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?discord_login=${token}`);
  } catch (error) {
    console.error('Discord login error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=discord_login_error`);
  }
});

// ==========================================
// GOOGLE OAUTH FOR LOGIN/SIGNUP
// ==========================================

// Step 1: Redirect to Google OAuth for login
app.get('/auth/google/login', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.GOOGLE_REDIRECT_URI || 'https://the-divide.onrender.com/auth/google/login/callback');
  const scope = encodeURIComponent('openid email profile');
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.redirect(googleAuthUrl);
});

// Step 2: Handle Google login callback
app.get('/auth/google/login/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (!code) {
    console.error('❌ No authorization code received from Google');
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=google_login_failed`);
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
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'https://the-divide.onrender.com/auth/google/login/callback',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('❌ Google login error:', tokenData);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=google_token_failed`);
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
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=google_user_failed`);
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
        balance: 1000, // Starting balance in cents
        googleId: googleUser.id,
        googleEmail: googleUser.email
      });
      await user.save();
      console.log(`✓ New user created via Google: ${username} (${googleUser.email})`);
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?google_login=${token}`);
  } catch (error) {
    console.error('❌ Google login error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=google_login_error`);
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
    pipeline.push(
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

    // Track vote history for chart (revealed after divide ends)
    if (!divide.voteHistory) divide.voteHistory = [];
    divide.voteHistory.push({
      timestamp: new Date(),
      shortsA: divide.votesA,
      shortsB: divide.votesB,
      pot: divide.pot,
    });

    user.totalBets = (user.totalBets || 0) + 1;
    user.wagered = (user.wagered || 0) + boostCents;
    
    await awardXp(req.userId, 'usdWager', boostCents, { divideId: divide.id || divide._id, side, amount: boostAmount });
    
    // Award VIP rakeback to Dividends balance
    await awardRakeback(req.userId, boostCents);

    await divide.save();
    await user.save();

    await Ledger.create({
      type: 'divides_bet',
      amount: Number(boostAmount),
      userId: req.userId,
      divideId: divide.id || divide._id,
      meta: { side }
    });

    // SECURITY: Emit sanitized divide data (hides vote counts for active divides)
    io.emit('voteUpdate', sanitizeDivide(divide));
    // SECURITY: Only return pot (total volume), not individual vote counts
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

    // Track vote history for chart (revealed after divide ends)
    if (!divide.voteHistory) divide.voteHistory = [];
    divide.voteHistory.push({
      timestamp: new Date(),
      shortsA: divide.votesA,
      shortsB: divide.votesB,
      pot: divide.pot,
    });

    user.totalBets = (user.totalBets || 0) + 1;
    user.wagered = (user.wagered || 0) + boostCents;
    
    await awardXp(req.userId, 'usdWager', boostCents, { divideId: divide.id || divide._id, side, amount: boostAmount });
    
    // Award VIP rakeback to Dividends balance
    await awardRakeback(req.userId, boostCents);

    await divide.save();
    await user.save();

    await Ledger.create({
      type: 'divides_bet',
      amount: Number(boostAmount),
      userId: req.userId,
      divideId: divide.id || divide._id,
      meta: { side }
    });

    // SECURITY: Emit sanitized divide data (hides vote counts for active divides)
    io.emit('voteUpdate', sanitizeDivide(divide));
    // SECURITY: Only return pot (total volume), not individual vote counts
    res.json({ balance: toDollars(user.balance), pot: divide.pot });
  } catch (err) {
    console.error('POST /Divides/vote ERROR:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Creator bonus tier calculator based on their personal contribution
// Returns percentage of the 1% creator bonus pool they receive (0-100)
function getCreatorBonusTier(creatorContribution) {
  if (creatorContribution >= 50000) return 100;  // $50k+ → 100% of the 1%
  if (creatorContribution >= 20000) return 80;   // $20k-$49,999 → 80%
  if (creatorContribution >= 5000) return 60;    // $5k-$19,999 → 60%
  if (creatorContribution >= 1000) return 40;    // $1k-$4,999 → 40%
  if (creatorContribution >= 1) return 20;       // $1-$999 → 20%
  return 0;                                       // $0 → 0% (house keeps all)
}

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
    
    // RAKE STRUCTURE:
    // - 2% House Fee (fixed, untouchable)
    // - 1% Creator Bonus Pool (split between creator & house based on creator's skin-in-the-game)
    // - 97% Winner Pool (untouchable, goes to minority side)
    
    const houseFee = pot * 0.02;           // 2% fixed house fee
    const creatorBonusPool = pot * 0.01;   // 1% creator bonus pool
    const winnerPool = pot * 0.97;         // 97% winner pool (sacred, never changes)
    
    // Calculate creator's contribution to the pot
    let creatorContribution = 0;
    if (divide.creatorId) {
      const creatorVote = divide.votes.find(v => v.userId === divide.creatorId);
      if (creatorVote) {
        creatorContribution = creatorVote.voteCount || 0;
      }
    }
    
    // Get creator's tier percentage (0-100)
    const creatorTierPercent = getCreatorBonusTier(creatorContribution);
    
    // Split the 1% creator bonus pool
    const creatorCut = (creatorBonusPool * creatorTierPercent) / 100;
    const houseFromCreatorPool = creatorBonusPool - creatorCut;
    
    // Total house take = 2% fixed + whatever creator didn't qualify for from the 1%
    const totalHouseCut = houseFee + houseFromCreatorPool;

    await House.findOneAndUpdate(
      { id: 'global' },
      { $inc: { houseTotal: toCents(totalHouseCut) } },
      { upsert: true }
    );

    // Pay creator their earned portion of the 1% bonus
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
        meta: { 
          pot, 
          creatorCut, 
          creatorContribution,
          creatorTierPercent,
          creatorBonusPool,
          houseFromCreatorPool 
        }
      });
    }

    // Distribute 97% winner pool to minority side
    if (totalWinnerVotes > 0) {
      for (const w of winners) {
        const share = (w.voteCount / totalWinnerVotes) * winnerPool;
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

    await divide.save();

    io.emit('divideEnded', { 
      id: divide.id, 
      _id: divide._id, 
      winner: winnerSide, 
      pot: divide.pot, 
      houseCut: totalHouseCut,
      creatorCut,
      creatorContribution,
      creatorTierPercent,
      winnerPool 
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
      // SECURITY: Only reveal vote counts after divide has ended
      votesA: isActive ? null : divide.votesA,
      votesB: isActive ? null : divide.votesB,
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
      // SECURITY: Only reveal vote history after ending
      voteHistory: isActive ? [] : (divide.voteHistory || []),
    };

    res.json(response);
  } catch (err) {
    console.error('GET /api/divides/:id', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET comments for a divide
app.get('/api/divides/:id/comments', async (req, res) => {
  try {
    const comments = await DivideComment.find({ divideId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
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
    
    res.json({ games: recentDivides.map(d => ({
      type: 'divide',
      id: d._id || d.id,
      title: d.title,
      pot: d.pot,
      winner: d.loserSide,
      endTime: d.endTime
    })) });
  } catch (err) {
    console.error('GET /api/recent-games', err);
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
          totalWithdrawn: { $sum: '$totalWithdrawn' }
        }
      }
    ]);

    const totalDeposited = userStats.length > 0 ? (userStats[0].totalDeposited || 0) : 0;
    const totalWithdrawn = userStats.length > 0 ? (userStats[0].totalWithdrawn || 0) : 0;

    // Count total redemptions
    const redemptionCount = await Ledger.countDocuments({ type: 'withdrawal' });

    res.json({
      global: {
        houseTotal: toDollars(house?.houseTotal || 0),
        totalDeposited: toDollars(totalDeposited),
        totalWithdrawn: toDollars(totalWithdrawn),
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
// CHAT ROUTES & MODERATOR PANEL
// ==========================================

app.get('/api/team', auth, moderatorOnly, async (req, res) => {
  try {
    const team = await User.find({ role: { $in: ['moderator', 'admin'] } })
      .select('username role profileImage')
      .sort({ role: 1, username: 1 })
      .lean();
    res.json({ team });
  } catch (err) {
    console.error('GET /api/team', err);
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

// Store recent chat messages in memory (last 50)
let chatHistory = [];
const MAX_CHAT_HISTORY = 50;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Chat: request history
  socket.on('chat:requestHistory', () => {
    socket.emit('chat:history', chatHistory);
  });

  // Chat: send message
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

      const chatMessage = {
        id: Date.now().toString(),
        username: userInfo.username,
        message: message.trim().substring(0, 500), // Limit message length
        level: userInfo.level,
        profileImage: userInfo.profileImage,
        timestamp: new Date().toISOString(),
      };

      // Add to history
      chatHistory.push(chatMessage);
      if (chatHistory.length > MAX_CHAT_HISTORY) {
        chatHistory = chatHistory.slice(-MAX_CHAT_HISTORY);
      }

      // Broadcast to all clients
      io.emit('chat:message', chatMessage);
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
