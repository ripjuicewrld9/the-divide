/**
 * Blackjack Provably Fair API Routes
 * 
 * POST /blackjack/session/start     - Initialize game session with seeds
 * POST /blackjack/game/save         - Save game result with seeds
 * GET  /blackjack/game/:id/verify   - Verify a game result
 * GET  /blackjack/game/:id          - Get game details
 */

import express from 'express';
import BlackjackGame from '../models/BlackjackGame.js';
import BlackjackProofOfFair from '../utils/blackjackProofOfFair.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * Middleware: Verify user is authenticated
 */
function authMiddleware(req, res, next) {
  // req.userId should be set by auth middleware in server.js
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ============================================================================
// 1. START SESSION - Initialize game with provably fair seeds
// ============================================================================

router.post('/session/start', authMiddleware, async (req, res) => {
  try {
    const { userId } = req;

    // Get user for nonce
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get current nonce
    const currentNonce = user.blackjackNonce || 0;

    // Generate provably fair seeds
    const serverSeed = await BlackjackProofOfFair.generateServerSeedFromRandomOrg();
    const serverHash = BlackjackProofOfFair.hashServerSeed(serverSeed);
    const blockHash = await BlackjackProofOfFair.getEOSBlockHash();
    const gameSeed = BlackjackProofOfFair.createGameSeed(serverSeed, blockHash);

    // Create game session record
    const game = new BlackjackGame({
      userId,
      serverSeed,
      serverHash,
      blockHash,
      gameSeed,
      nonce: currentNonce,
      gamePhase: 'betting',
      rolls: [],
    });

    await game.save();

    // Increment user's nonce
    user.blackjackNonce = currentNonce + 1;
    await user.save();

    console.log(`[BlackjackAPI] Session created: ${game._id} for user ${userId}`);

    res.json({
      gameId: game._id,
      serverHash, // Publish hash before game starts
      blockHash,
      // Don't send serverSeed or gameSeed yet - reveal after game completes for verification
    });
  } catch (error) {
    console.error('[BlackjackAPI] Error starting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 2. PLACE BET - Deduct bet from balance before dealing
// ============================================================================

router.post('/game/place-bet', authMiddleware, async (req, res) => {
  try {
    const { gameId, mainBet, perfectPairsBet, twentyPlusThreeBet, blazingSevensBet } = req.body;
    const { userId } = req;

    if (!gameId) {
      return res.status(400).json({ error: 'gameId required' });
    }

    // Verify game belongs to user
    const game = await BlackjackGame.findById(gameId);
    if (!game || game.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify game is in betting phase
    if (game.gamePhase !== 'betting') {
      return res.status(400).json({ error: 'Game already in progress' });
    }

    // Calculate total bet
    const totalBet = (mainBet || 0) + (perfectPairsBet || 0) + (twentyPlusThreeBet || 0) + (blazingSevensBet || 0);
    
    if (totalBet <= 0) {
      return res.status(400).json({ error: 'Total bet must be greater than 0' });
    }

    const totalBetCents = Math.round(totalBet * 100);

    // Get user and validate balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.balance < totalBetCents) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        required: totalBet,
        available: user.balance / 100
      });
    }

    // DON'T deduct bet here - just validate and track it
    // Bet will be deducted when deal endpoint is called

    // Update game with bet amounts (track but don't deduct)
    game.mainBet = mainBet || 0;
    game.perfectPairsBet = perfectPairsBet || 0;
    game.twentyPlusThreeBet = twentyPlusThreeBet || 0;
    game.blazingSevensBet = blazingSevensBet || 0;
    game.gamePhase = 'betting'; // Keep in betting until deal is called
    await game.save();

    const updatedBalance = user.balance / 100;

    console.log(`[BlackjackAPI] Bet validated and tracked: user=${userId}, totalBet=$${totalBet}, balance=$${updatedBalance.toFixed(2)}`);

    res.json({
      success: true,
      balance: updatedBalance,
      totalBet
    });
  } catch (error) {
    console.error('[BlackjackAPI] Error placing bet:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 2B. DEAL - Deduct bet from balance when cards are dealt
// ============================================================================

router.post('/game/deal', authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.body;
    const { userId } = req;

    if (!gameId) {
      return res.status(400).json({ error: 'gameId required' });
    }

    // Verify game belongs to user
    const game = await BlackjackGame.findById(gameId);
    if (!game || game.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify game is in betting phase
    if (game.gamePhase !== 'betting') {
      return res.status(400).json({ error: 'Game already dealt or in progress' });
    }

    // Calculate total bet from game record
    const totalBet = (game.mainBet || 0) + (game.perfectPairsBet || 0) + 
                     (game.twentyPlusThreeBet || 0) + (game.blazingSevensBet || 0);
    
    if (totalBet <= 0) {
      return res.status(400).json({ error: 'No bet placed' });
    }

    const totalBetCents = Math.round(totalBet * 100);

    // Get user and deduct bet
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.balance < totalBetCents) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        required: totalBet,
        available: user.balance / 100
      });
    }

    // Deduct bet from balance NOW (when deal is clicked)
    user.balance = user.balance - totalBetCents;

    // Reduce wager requirement (1x playthrough)
    if (user.wagerRequirement > 0) {
      user.wagerRequirement = Math.max(0, user.wagerRequirement - totalBetCents);
    }

    await user.save();

    // Update game phase to playing
    game.gamePhase = 'playing';
    await game.save();

    const updatedBalance = user.balance / 100;

    console.log(`[BlackjackAPI] Bet deducted on deal: user=${userId}, totalBet=$${totalBet}, newBalance=$${updatedBalance.toFixed(2)}`);

    res.json({
      success: true,
      balance: updatedBalance,
      totalBet
    });
  } catch (error) {
    console.error('[BlackjackAPI] Error dealing:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 2C. DOUBLE DOWN - Deduct additional bet for double down
// ============================================================================

router.post('/game/double', authMiddleware, async (req, res) => {
  try {
    const { gameId, additionalBet } = req.body;
    const { userId } = req;

    if (!gameId || !additionalBet) {
      return res.status(400).json({ error: 'gameId and additionalBet required' });
    }

    // Verify game belongs to user
    const game = await BlackjackGame.findById(gameId);
    if (!game || game.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const additionalBetCents = Math.round(additionalBet * 100);

    // Get user and deduct additional bet
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.balance < additionalBetCents) {
      return res.status(400).json({ 
        error: 'Insufficient balance for double down',
        required: additionalBet,
        available: user.balance / 100
      });
    }

    // Deduct additional bet
    user.balance = user.balance - additionalBetCents;

    // Update wager
    if (user.wagerRequirement > 0) {
      user.wagerRequirement = Math.max(0, user.wagerRequirement - additionalBetCents);
    }

    await user.save();

    const updatedBalance = user.balance / 100;

    console.log(`[BlackjackAPI] Double down: user=${userId}, additionalBet=$${additionalBet}, newBalance=$${updatedBalance.toFixed(2)}`);

    res.json({
      success: true,
      balance: updatedBalance
    });
  } catch (error) {
    console.error('[BlackjackAPI] Error on double down:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 2D. SPLIT - Deduct additional bet for split
// ============================================================================

router.post('/game/split', authMiddleware, async (req, res) => {
  try {
    const { gameId, additionalBet } = req.body;
    const { userId } = req;

    if (!gameId || !additionalBet) {
      return res.status(400).json({ error: 'gameId and additionalBet required' });
    }

    // Verify game belongs to user
    const game = await BlackjackGame.findById(gameId);
    if (!game || game.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const additionalBetCents = Math.round(additionalBet * 100);

    // Get user and deduct additional bet
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.balance < additionalBetCents) {
      return res.status(400).json({ 
        error: 'Insufficient balance for split',
        required: additionalBet,
        available: user.balance / 100
      });
    }

    // Deduct additional bet
    user.balance = user.balance - additionalBetCents;

    // Update wager
    if (user.wagerRequirement > 0) {
      user.wagerRequirement = Math.max(0, user.wagerRequirement - additionalBetCents);
    }

    await user.save();

    const updatedBalance = user.balance / 100;

    console.log(`[BlackjackAPI] Split: user=${userId}, additionalBet=$${additionalBet}, newBalance=$${updatedBalance.toFixed(2)}`);

    res.json({
      success: true,
      balance: updatedBalance
    });
  } catch (error) {
    console.error('[BlackjackAPI] Error on split:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 3. SAVE GAME - Store game result with RNG data and pay winnings
// ============================================================================

router.post('/game/save', authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.body;
    const { userId } = req;

    if (!gameId) {
      return res.status(400).json({ error: 'gameId required' });
    }

    // Verify game belongs to user
    const game = await BlackjackGame.findById(gameId);
    if (!game || game.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update game with result data
    const {
      mainBet,
      perfectPairsBet,
      twentyPlusThreeBet,
      blazingSevensBet,
      playerCards,
      dealerCards,
      playerTotal,
      dealerTotal,
      mainResult,
      mainPayout,
      perfectPairsResult,
      perfectPairsPayout,
      twentyPlusThreeResult,
      twentyPlusThreePayout,
      blazingSevenResult,
      blazingSevensPayout,
      balance,
    } = req.body;

    // Store rolls (card generation used during game)
    const rolls = [];
    playerCards?.forEach((card, idx) => {
      rolls.push({
        round: 0,
        slot: 0, // Player
        dealNumber: idx,
        seedString: `${game.gameSeed}:card:${idx}`,
        outcome: 'player_card',
        card,
      });
    });
    dealerCards?.forEach((card, idx) => {
      rolls.push({
        round: 0,
        slot: 1, // Dealer
        dealNumber: playerCards.length + idx,
        seedString: `${game.gameSeed}:card:${playerCards.length + idx}`,
        outcome: 'dealer_card',
        card,
      });
    });

    // Calculate total profit
    const totalBet = mainBet + perfectPairsBet + twentyPlusThreeBet + blazingSevensBet;
    const totalPayout =
      mainPayout + perfectPairsPayout + twentyPlusThreePayout + blazingSevensPayout;
    const profit = totalPayout - totalBet;

    Object.assign(game, {
      mainBet,
      perfectPairsBet,
      twentyPlusThreeBet,
      blazingSevensBet,
      playerCards,
      dealerCards,
      playerTotal,
      dealerTotal,
      mainResult,
      mainPayout,
      perfectPairsResult,
      perfectPairsPayout,
      twentyPlusThreeResult,
      twentyPlusThreePayout,
      blazingSevenResult,
      blazingSevensPayout,
      rolls,
      balance,
      totalProfit: profit,
      gamePhase: 'gameOver',
    });

    await game.save();

    // Update house stats for finance tracking
    const updateHouseStats = req.app?.locals?.updateHouseStats;
    if (updateHouseStats && typeof updateHouseStats === 'function') {
      const totalBetCents = Math.round(totalBet * 100);
      const totalPayoutCents = Math.round(totalPayout * 100);
      await updateHouseStats('blackjack', totalBetCents, totalPayoutCents);
    }

    // Pay out winnings (bet was already deducted in place-bet endpoint)
    let updatedBalance = balance; // Fallback to client-provided balance if update fails
    try {
      const user = await User.findById(userId);
      if (user) {
        const totalPayoutCents = Math.round(totalPayout * 100);

        // Add payout (bet was already deducted when placed)
        user.balance = user.balance + totalPayoutCents;

        // Update user statistics
        user.totalBets = (user.totalBets || 0) + 1;
        user.wagered = (user.wagered || 0) + Math.round(totalBet * 100);
        user.totalWon = (user.totalWon || 0) + totalPayoutCents;
        if (profit > 0) {
          user.totalWins = (user.totalWins || 0) + 1;
        } else {
          user.totalLosses = (user.totalLosses || 0) + 1;
        }

        await user.save();
        updatedBalance = user.balance / 100; // Convert cents to dollars

        console.log(`[BlackjackAPI] Payout credited: user=${userId}, payout=$${totalPayout}, newBalance=$${updatedBalance.toFixed(2)}`);
      }
    } catch (e) {
      console.error('[BlackjackAPI] Failed to credit payout', e);
      // Don't fail the request if balance update fails - game is already saved
    }

    console.log(`[BlackjackAPI] Game saved: ${game._id} - Profit: $${profit.toFixed(2)}`);

    // Balance is now managed server-side (deducted above)
    // Return updated balance to client for display

    res.json({
      gameId: game._id,
      profit,
      balance: updatedBalance, // Return new balance in dollars
      // Still don't reveal seeds - only after explicit verification request
    });
  } catch (error) {
    console.error('[BlackjackAPI] Error saving game:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 3. VERIFY GAME - Client-side verification of fairness
// ============================================================================

router.get('/game/:id/verify', authMiddleware, async (req, res) => {
  try {
    const { id: gameId } = req.params;
    const { userId } = req;

    // Fetch game
    const game = await BlackjackGame.findById(gameId);
    if (!game || game.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if game has provably fair data
    if (!game.serverSeed || !game.serverHash || !game.blockHash || !game.gameSeed) {
      return res.json({
        valid: false,
        message: 'This game does not have provably fair data (saved before feature was implemented)',
        serverSeed: null,
        serverHash: null,
        blockHash: null,
        gameSeed: null,
      });
    }

    // Verify using proof of fair
    // Filter rolls to only include card data (remove any undefined ticket fields from schema)
    const rollsToVerify = (game.rolls || []).map(roll => {
      const cleaned = {
        round: roll.round,
        slot: roll.slot,
        dealNumber: roll.dealNumber,
        seedString: roll.seedString,
        outcome: roll.outcome,
      };

      // Only add card if it exists
      if (roll.card !== undefined && roll.card !== null) {
        cleaned.card = roll.card;
      }

      // Only add ticket and betType if both exist and ticket is a number
      if (roll.betType && typeof roll.ticket === 'number') {
        cleaned.betType = roll.betType;
        cleaned.ticket = roll.ticket;
      }

      return cleaned;
    });

    const verification = BlackjackProofOfFair.verifyBlackjackGame({
      serverSeed: game.serverSeed,
      serverHash: game.serverHash,
      blockHash: game.blockHash,
      gameSeed: game.gameSeed,
      rolls: rollsToVerify,
    });

    // Mark as verified if passes
    if (verification.valid) {
      game.verified = true;
      await game.save();
    }

    res.json({
      gameId,
      ...verification,
      // Now safe to reveal seeds since player is verifying
      serverSeed: game.serverSeed,
      serverHash: game.serverHash,
      blockHash: game.blockHash,
      gameSeed: game.gameSeed,
    });
  } catch (error) {
    console.error('[BlackjackAPI] Error verifying game:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 4. GET GAME - Retrieve game details
// ============================================================================

router.get('/game/:id', authMiddleware, async (req, res) => {
  try {
    const { id: gameId } = req.params;
    const { userId } = req;

    const game = await BlackjackGame.findById(gameId);
    if (!game || game.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Don't expose seeds unless explicitly requesting verification
    const response = {
      gameId: game._id,
      gamePhase: game.gamePhase,
      mainBet: game.mainBet,
      perfectPairsBet: game.perfectPairsBet,
      twentyPlusThreeBet: game.twentyPlusThreeBet,
      blazingSevensBet: game.blazingSevensBet,
      playerCards: game.playerCards,
      dealerCards: game.dealerCards,
      playerTotal: game.playerTotal,
      dealerTotal: game.dealerTotal,
      mainResult: game.mainResult,
      mainPayout: game.mainPayout,
      perfectPairsResult: game.perfectPairsResult,
      perfectPairsPayout: game.perfectPairsPayout,
      twentyPlusThreeResult: game.twentyPlusThreeResult,
      twentyPlusThreePayout: game.twentyPlusThreePayout,
      blazingSevenResult: game.blazingSevenResult,
      blazingSevensPayout: game.blazingSevensPayout,
      totalProfit: game.totalProfit,
      balance: game.balance,
      verified: game.verified,
      createdAt: game.createdAt,
    };

    res.json(response);
  } catch (error) {
    console.error('[BlackjackAPI] Error fetching game:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 5. GET USER GAMES - Retrieve game history with stats
// ============================================================================

router.get('/games', authMiddleware, async (req, res) => {
  try {
    const { userId } = req;
    const { limit = 50, skip = 0 } = req.query;

    const games = await BlackjackGame.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await BlackjackGame.countDocuments({ userId });

    // Calculate stats
    const stats = {
      totalGames: games.length,
      totalWins: games.filter((g) => g.mainResult === 'win').length,
      totalBusts: games.filter((g) => g.mainResult === 'bust').length,
      totalPushs: games.filter((g) => g.mainResult === 'push').length,
      totalVerified: games.filter((g) => g.verified).length,
      totalProfit: games.reduce((sum, g) => sum + (g.totalProfit || 0), 0),
    };

    res.json({
      games: games.map((g) => ({
        _id: g._id,
        mainBet: g.mainBet,
        mainPayout: g.mainPayout,
        mainResult: g.mainResult,
        totalProfit: g.totalProfit,
        verified: g.verified,
        createdAt: g.createdAt,
      })),
      stats,
      total,
    });
  } catch (error) {
    console.error('[BlackjackAPI] Error fetching games:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 6. SAVE GAME FOR FEED - Quick save for recent games feed (no provably fair)
// ============================================================================

router.post('/save-for-feed', authMiddleware, async (req, res) => {
  try {
    const { userId } = req;
    const {
      mainBet,
      mainResult,
      mainPayout,
      perfectPairsBet,
      perfectPairsResult,
      perfectPairsPayout,
      twentyPlusThreeBet,
      twentyPlusThreeResult,
      twentyPlusThreePayout,
      blazingSevensBet,
      blazingSevenResult,
      blazingSevensPayout,
      playerTotal,
      dealerTotal,
      balance,
    } = req.body;

    // Create simple game record for live feed
    const game = new BlackjackGame({
      userId,
      mainBet,
      mainResult,
      mainPayout,
      perfectPairsBet,
      perfectPairsResult,
      perfectPairsPayout,
      twentyPlusThreeBet,
      twentyPlusThreeResult,
      twentyPlusThreePayout,
      blazingSevensBet,
      blazingSevenResult,
      blazingSevensPayout,
      playerTotal,
      dealerTotal,
      balance,
      gamePhase: 'gameOver',
      // No provably fair data for now - just for live feed
      serverSeed: '',
      serverHash: '',
      blockHash: '',
      gameSeed: '',
    });

    await game.save();

    console.log(`[BlackjackAPI] Game saved for feed: ${game._id} - User: ${userId}`);

    res.json({ success: true, gameId: game._id });
  } catch (error) {
    console.error('[BlackjackAPI] Error saving game for feed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 7. ROTATE SEED - Rotate server seed for provably fair (user preference)
// ============================================================================

router.post('/rotate-seed', authMiddleware, async (req, res) => {
  try {
    const { userId } = req;

    // Generate new seeds
    const serverSeed = await BlackjackProofOfFair.generateServerSeedFromRandomOrg();
    const serverHash = BlackjackProofOfFair.hashServerSeed(serverSeed);

    // Update user with new seeds and reset nonce
    const updated = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { blackjackServerSeed: serverSeed, blackjackServerSeedHashed: serverHash, blackjackNonce: 0 } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      serverSeedHashed: serverHash,
      message: 'Server seed rotated successfully, nonce reset to 0'
    });
  } catch (err) {
    console.error('[BlackjackAPI] rotate seed error', err);
    res.status(500).json({ error: 'Failed to rotate seed' });
  }
});

export default router;
