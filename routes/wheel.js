import express from 'express';
import WheelGame from '../models/WheelGame.js';

export default function registerWheelRoutes(app, io, { auth }) {
  const router = express.Router();

  /**
   * GET /api/wheel/games - Get all active game instances (PUBLIC)
   */
  router.get('/games', async (req, res) => {
    try {
      const games = await WheelGame.find({
        status: { $in: ['betting', 'spinning'] }
      })
      .select('gameId roundNumber status seats roundEndTime bettingEndTime')
      .lean();

      const now = new Date();
      
      const gameStates = games.map(game => ({
        gameId: game.gameId,
        roundNumber: game.roundNumber,
        status: game.status,
        occupiedSeats: game.seats.filter(s => s.userId).length,
        totalSeats: 8,
        timeRemaining: game.roundEndTime ? Math.max(0, game.roundEndTime.getTime() - now.getTime()) : 0,
        bettingTimeRemaining: game.bettingEndTime ? Math.max(0, game.bettingEndTime.getTime() - now.getTime()) : 0,
      }));

      res.json({ games: gameStates });
    } catch (error) {
      console.error('[WheelAPI] Error fetching games:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/wheel/game/:gameId - Get specific game state (PUBLIC)
   */
  router.get('/game/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params;
      const wheelGameManager = req.app.locals.wheelGameManager;
      
      if (!wheelGameManager) {
        return res.status(500).json({ error: 'Game manager not initialized' });
      }

      const gameState = await wheelGameManager.getGameState(gameId);
      
      if (!gameState) {
        return res.status(404).json({ error: 'Game not found' });
      }

      res.json(gameState);
    } catch (error) {
      console.error('[WheelAPI] Error fetching game:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/wheel/state/:gameId - Get specific game state (PUBLIC) - Alias for compatibility
   */
  router.get('/state/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params;
      const wheelGameManager = req.app.locals.wheelGameManager;
      
      if (!wheelGameManager) {
        return res.status(500).json({ error: 'Game manager not initialized' });
      }

      const gameState = await wheelGameManager.getGameState(gameId);
      
      if (!gameState) {
        return res.status(404).json({ error: 'Game not found' });
      }

      res.json(gameState);
    } catch (error) {
      console.error('[WheelAPI] Error fetching game state:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/wheel/reserve-seat - Reserve a seat (REQUIRES AUTH)
   */
  router.post('/reserve-seat', auth, async (req, res) => {
  try {
    const { gameId, seatNumber, betAmount } = req.body;
    const userId = req.userId;

    if (!gameId || seatNumber === undefined || !betAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (seatNumber < 0 || seatNumber > 7) {
      return res.status(400).json({ error: 'Invalid seat number' });
    }

    if (betAmount <= 0) {
      return res.status(400).json({ error: 'Invalid bet amount' });
    }

    const wheelGameManager = req.app.locals.wheelGameManager;
    
    if (!wheelGameManager) {
      return res.status(500).json({ error: 'Game manager not initialized' });
    }

    const result = await wheelGameManager.reserveSeat(gameId, userId, seatNumber, betAmount);

    res.json({
      success: true,
      gameId,
      seatNumber,
      betAmount,
    });
  } catch (error) {
    console.error('[WheelAPI] Error reserving seat:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/wheel/history/:gameId - Get game history
 */
router.get('/history/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const history = await WheelGame.find({
      gameId,
      status: 'completed'
    })
    .sort({ roundNumber: -1 })
    .limit(limit)
    .select('roundNumber winningSegment winningSeats serverHash blockHash createdAt')
    .lean();

    res.json({ history });
  } catch (error) {
    console.error('[WheelAPI] Error fetching history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/wheel/verify/:gameId/:roundNumber - Verify a round
 */
router.get('/verify/:gameId/:roundNumber', async (req, res) => {
  try {
    const { gameId, roundNumber } = req.params;

    const game = await WheelGame.findOne({
      gameId,
      roundNumber: parseInt(roundNumber),
      status: 'completed'
    });

    if (!game) {
      return res.status(404).json({ error: 'Round not found' });
    }

    res.json({
      gameId: game.gameId,
      roundNumber: game.roundNumber,
      serverSeed: game.serverSeed,
      serverHash: game.serverHash,
      blockHash: game.blockHash,
      gameSeed: game.gameSeed,
      winningSegment: game.winningSegment,
      verified: game.verified,
    });
  } catch (error) {
    console.error('[WheelAPI] Error verifying round:', error);
    res.status(500).json({ error: error.message });
  }
});

  // Mount the router
  app.use('/api/wheel', router);
  console.log('[WheelAPI] Routes registered');
}
