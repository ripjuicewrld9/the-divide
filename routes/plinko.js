import PlinkoGame from '../models/PlinkoGame.js';
import PlinkoRecording from '../models/PlinkoRecording.js';
import User from '../models/User.js';
import Ledger from '../models/Ledger.js';
import {
  generateServerSeedFromRandomOrg,
  getEOSBlockHash,
  createGameSeed,
  generateBinIndex,
  getMultiplier,
  verifyPlinkoRound,
} from '../utils/plinkoProofOfFair.js';

export default function registerPlinko(app, io, { auth } = {}) {
  console.log(`\n[Plinko Router] 🎰 Initialized - Provably Fair (Random.org + EOS Block Hash)\n`);

  // Helper: Convert cents to dollars
  function toDollars(cents) {
    return cents / 100;
  }

  // Helper: Convert dollars to cents
  function toCents(dollars) {
    return Math.round(dollars * 100);
  }

  // Get recordings for a specific row count
  app.get('/api/plinko/recordings/:rowCount', async (req, res) => {
    try {
      const rowCount = parseInt(req.params.rowCount);
      
      if (![8, 9, 10, 11, 12, 13, 14, 15, 16].includes(rowCount)) {
        return res.status(400).json({ error: 'Invalid row count' });
      }

      const recording = await PlinkoRecording.findOne({ rowCount });
      
      if (!recording) {
        return res.status(404).json({ error: 'Recordings not found for this row count' });
      }

      res.json(recording.recordings);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      res.status(500).json({ error: 'Failed to fetch recordings' });
    }
  });

  // Save recordings (admin only)
  app.post('/api/plinko/recordings', auth, async (req, res) => {
    try {
      const { rowCount, recordings } = req.body;

      if (![8, 9, 10, 11, 12, 13, 14, 15, 16].includes(rowCount)) {
        return res.status(400).json({ error: 'Invalid row count' });
      }

      // Upsert recordings
      await PlinkoRecording.findOneAndUpdate(
        { rowCount },
        { rowCount, recordings, generatedAt: new Date() },
        { upsert: true, new: true }
      );

      console.log(`✅ Saved recordings for ${rowCount} rows`);
      res.json({ success: true, message: `Recordings saved for ${rowCount} rows` });
    } catch (error) {
      console.error('Error saving recordings:', error);
      res.status(500).json({ error: 'Failed to save recordings' });
    }
  });

  app.post('/api/plinko/play', auth, async (req, res) => {
    try {
      const userId = req.userId;
      const { betAmount, riskLevel, rowCount } = req.body;

      console.log(`[Plinko] POST /api/plinko/play: user=${userId}, bet=$${betAmount}, risk=${riskLevel}, rows=${rowCount}`);

      // Validate input
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ error: 'Invalid bet amount' });
      }
      if (!['low', 'medium', 'high'].includes(riskLevel)) {
        return res.status(400).json({ error: 'Invalid risk level' });
      }
      if (![8, 9, 10, 11, 12, 13, 14, 15, 16].includes(rowCount)) {
        return res.status(400).json({ error: 'Invalid row count' });
      }

      // Get user and check balance
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // user.balance is stored in cents in the database
      const balanceInCents = user.balance || 0;
      const betInCents = toCents(betAmount); // betAmount comes from frontend in dollars

      if (balanceInCents < betInCents) {
        return res.status(402).json({ error: 'Insufficient balance' });
      }

      // Get current nonce before generating seeds
      const currentNonce = user.plinkoNonce || 0;

      // Generate provably fair seeds

      // Generate provably fair seeds
      let serverSeed, serverHash, blockHash, gameSeed, binIndex, multiplier, jackpotHit;

      try {
        serverSeed = await generateServerSeedFromRandomOrg();
        serverHash = Buffer.from(serverSeed).toString('hex').slice(0, 64);
        blockHash = await getEOSBlockHash();
        gameSeed = createGameSeed(serverSeed, blockHash);
        binIndex = generateBinIndex(gameSeed, rowCount);
        // Get multiplier from the payouts table
        multiplier = getMultiplier(binIndex, rowCount, riskLevel);
        jackpotHit = false; // No jackpot logic; rarity is via paytable
        console.log(`[Plinko] Generated: binIndex=${binIndex}, multiplier=${multiplier}, rowCount=${rowCount}, riskLevel=${riskLevel}`);
      } catch (error) {
        console.error('[Plinko] RNG error:', error.message);
        return res.status(500).json({ error: 'RNG generation failed', details: error.message });
      }

      // Calculate payout
      const payoutInCents = Math.round(betInCents * multiplier);
      const profitInCents = payoutInCents - betInCents;

      // Update user balance (deduct bet, add payout)
      const newBalanceInCents = balanceInCents - betInCents + payoutInCents;
      const newBalanceInDollars = toDollars(newBalanceInCents);

      // Store balance in cents in database and increment nonce
      user.balance = newBalanceInCents;
      user.plinkoNonce = currentNonce + 1;
      await user.save();

      // Record game in database
      const game = new PlinkoGame({
        userId,
        serverSeed,
        serverHash,
        blockHash,
        gameSeed,
        nonce: currentNonce,
        betAmount: betInCents,
        riskLevel,
        rowCount,
        binIndex,
        multiplier,
        payout: payoutInCents,
        profit: profitInCents,
        balanceBefore: toDollars(balanceInCents),
        balanceAfter: newBalanceInDollars,
        verified: false,
        isJackpot: Boolean(jackpotHit),
      });

      await game.save();

      // Create ledger entry
      const ledger = new Ledger({
        userId,
        type: 'plinko_play',
        amount: toDollars(profitInCents),
        details: {
          gameId: game._id,
          riskLevel,
          rowCount,
          multiplier,
          isJackpot: Boolean(jackpotHit),
        },
      });

      await ledger.save();

      console.log(`[Plinko] Game recorded: user=${userId}, profit=$${toDollars(profitInCents).toFixed(2)}, newBalance=$${newBalanceInDollars.toFixed(2)}`);

      res.json({
        success: true,
        gameId: game._id,
        betAmount,
        multiplier,
        payout: toDollars(payoutInCents),
        profit: toDollars(profitInCents),
        binIndex,
        balanceBefore: toDollars(balanceInCents),
        balanceAfter: toDollars(newBalanceInCents),
        isJackpot: Boolean(jackpotHit),
        serverSeed,
        serverHash,
        blockHash,
        gameSeed,
      });
    } catch (error) {
      console.error('[Plinko] Error in /api/plinko/play:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  app.get('/api/plinko/games', auth, async (req, res) => {
    try {
      const userId = req.userId;
      const limit = parseInt(req.query.limit) || 10;
      const skip = parseInt(req.query.skip) || 0;

      console.log(`[Plinko] GET /api/plinko/games: user=${userId}, limit=${limit}, skip=${skip}`);

      const games = await PlinkoGame.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await PlinkoGame.countDocuments({ userId });

      res.json({
        games,
        total,
        limit,
        skip,
      });
    } catch (error) {
      console.error('[Plinko] Error in /api/plinko/games:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  app.post('/api/plinko/verify', auth, async (req, res) => {
    try {
      const { gameId } = req.body;

      console.log(`[Plinko] POST /api/plinko/verify: gameId=${gameId}`);

      const game = await PlinkoGame.findById(gameId);
      if (!game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      if (game.userId.toString() !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const verified = verifyPlinkoRound(
        game.serverSeed,
        game.blockHash,
        game.binIndex,
        game.rowCount
      );

      game.verified = verified;
      await game.save();

      res.json({
        gameId,
        verified,
        serverSeed: game.serverSeed,
        blockHash: game.blockHash,
        binIndex: game.binIndex,
        multiplier: game.multiplier,
        rowCount: game.rowCount,
      });
    } catch (error) {
      console.error('[Plinko] Error in /api/plinko/verify:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Rotate user's server seed for provably fair
  app.post('/plinko/rotate-seed', auth, async (req, res) => {
    try {
      const serverSeed = await generateServerSeedFromRandomOrg();
      const crypto = await import('crypto');
      const serverHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

      const updated = await User.findOneAndUpdate(
        { _id: req.userId },
        { $set: { plinkoServerSeed: serverSeed, plinkoServerSeedHashed: serverHash, plinkoNonce: 0 } },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        serverSeedHashed: serverHash,
        message: 'Server seed rotated successfully'
      });
    } catch (err) {
      console.error('[Plinko] rotate seed error', err);
      res.status(500).json({ error: 'Failed to rotate seed' });
    }
  });

  // Get recent plinko rounds for the authenticated user
  app.get('/plinko/rounds', auth, async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20')));
      const rounds = await PlinkoGame.find({ userId: req.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      res.json({ rounds });
    } catch (e) {
      console.error('GET /plinko/rounds error', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  console.log('[Plinko Router] ✅ Routes registered: POST /api/plinko/play, GET /api/plinko/games, POST /api/plinko/verify, POST /plinko/rotate-seed, GET /plinko/rounds');
}
