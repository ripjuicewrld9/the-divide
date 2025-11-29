import WheelGame from '../models/WheelGame.js';
import User from '../models/User.js';
import Ledger from '../models/Ledger.js';
import crypto from 'crypto';
import {
  generateServerSeedFromRandomOrg,
  getEOSBlockHash,
  hashServerSeed,
  createGameSeed,
  generateSegmentIndex,
} from './wheelProofOfFair.js';

// Wheel configuration: 54 segments total
// Seat assignments (each seat covers specific segments)
const SEAT_SEGMENTS = [
  [0, 9, 18, 27, 36, 45], // Seat 0 - every 9th segment starting from 0
  [1, 10, 19, 28, 37, 46], // Seat 1
  [2, 11, 20, 29, 38, 47], // Seat 2
  [3, 12, 21, 30, 39, 48], // Seat 3
  [4, 13, 22, 31, 40, 49], // Seat 4
  [5, 14, 23, 32, 41, 50], // Seat 5
  [6, 15, 24, 33, 42, 51], // Seat 6
  [7, 16, 25, 34, 43, 52], // Seat 7
  [8, 17, 26, 35, 44, 53], // Seat 8
  [0, 6, 12, 18, 24, 30, 36, 42, 48], // Seat 9 - every 6th segment (higher probability)
  [3, 9, 15, 21, 27, 33, 39, 45, 51], // Seat 10 - every 6th segment offset
  [1, 7, 13, 19, 25, 31, 37, 43, 49, 2, 8, 14], // Seat 11 - mixed pattern (highest probability)
];

const ROUND_DURATION_MS = 30000; // 30 seconds
const BETTING_DURATION_MS = 25000; // 25 seconds for betting
const SPIN_DURATION_MS = 5000; // 5 seconds for spin

// Base payout multipliers per seat (Evolution-style lower bases for global boost)
const SEAT_MULTIPLIERS = [
  2.0, // Seat 0 - 6/54 segments = 11.1% chance (safe)
  2.0, // Seat 1
  2.0, // Seat 2
  3.0, // Seat 3 (balanced)
  3.0, // Seat 4
  3.0, // Seat 5
  5.0, // Seat 6 (aggressive)
  5.0, // Seat 7
  5.0, // Seat 8
  10.0, // Seat 9 - 9/54 segments = 16.7% chance (jackpot)
  10.0, // Seat 10
  10.0, // Seat 11 - 12/54 segments = 22.2% chance (jackpot)
];

// Global multiplier distribution (Crazy Time style "Top Slot")
const GLOBAL_MULTIPLIER_DISTRIBUTION = [
  { multiplier: 2, weight: 40 },    // 40% chance for 2x
  { multiplier: 5, weight: 25 },    // 25% chance for 5x
  { multiplier: 10, weight: 15 },   // 15% chance for 10x
  { multiplier: 25, weight: 10 },   // 10% chance for 25x
  { multiplier: 50, weight: 7 },    // 7% chance for 50x
  { multiplier: 100, weight: 3 }    // 3% chance for 100x
];

/**
 * Generate global multiplier using weighted distribution
 */
function generateGlobalMultiplier(seed) {
  // Use seed to generate deterministic random value
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const randomValue = parseInt(hash.slice(0, 8), 16) / 0xffffffff; // 0-1
  
  const totalWeight = GLOBAL_MULTIPLIER_DISTRIBUTION.reduce((sum, item) => sum + item.weight, 0);
  let threshold = 0;
  
  for (const item of GLOBAL_MULTIPLIER_DISTRIBUTION) {
    threshold += item.weight / totalWeight;
    if (randomValue < threshold) {
      return item.multiplier;
    }
  }
  
  // Fallback (shouldn't happen)
  return GLOBAL_MULTIPLIER_DISTRIBUTION[0].multiplier;
}

class WheelGameManager {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map();
    this.roundTimers = new Map();
  }

  /**
   * Initialize a new game instance
   */
  async createGameInstance(gameId = null) {
    try {
      // Generate game ID if not provided
      if (!gameId) {
        gameId = crypto.randomBytes(8).toString('hex');
      }

      const now = new Date();
      const roundEndTime = new Date(now.getTime() + ROUND_DURATION_MS);
      const bettingEndTime = new Date(now.getTime() + BETTING_DURATION_MS);

      // Initialize seats
      const seats = SEAT_SEGMENTS.map((segments, index) => ({
        seatNumber: index,
        userId: null,
        betAmount: 0,
        segments,
        reservedAt: null,
      }));

      const game = new WheelGame({
        gameId,
        roundNumber: 0,
        status: 'betting',
        seats,
        roundStartTime: now,
        roundEndTime,
        bettingEndTime,
      });

      await game.save();
      this.activeGames.set(gameId, game);

      // Start round timer
      this.scheduleRoundEnd(gameId, roundEndTime);
      this.scheduleBettingEnd(gameId, bettingEndTime);

      console.log(`[WheelGame] Created game instance: ${gameId}`);
      return game;
    } catch (error) {
      console.error(`[WheelGame] Error creating game instance:`, error);
      throw error;
    }
  }

  /**
   * Reserve a seat for a player
   */
  async reserveSeat(gameId, userId, seatNumber, betAmount) {
    try {
      const game = await WheelGame.findOne({ gameId, status: 'betting' });
      
      if (!game) {
        throw new Error('Game not found or betting closed');
      }

      // Check if betting period is still open
      if (new Date() > game.bettingEndTime) {
        throw new Error('Betting period has ended');
      }

      const seat = game.seats.find(s => s.seatNumber === seatNumber);
      
      if (!seat) {
        throw new Error('Invalid seat number');
      }

      if (seat.userId) {
        throw new Error('Seat already occupied');
      }

      // Check user balance
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const betInCents = Math.round(betAmount * 100);
      if (user.balance < betInCents) {
        throw new Error('Insufficient balance');
      }

      // Deduct bet from user balance
      user.balance -= betInCents;
      await user.save();

      // Reserve seat
      seat.userId = userId;
      seat.betAmount = betInCents;
      seat.reservedAt = new Date();

      await game.save();

      // Broadcast seat reservation
      this.io.to(`wheel-${gameId}`).emit('seatReserved', {
        gameId,
        seatNumber,
        userId: userId.toString(),
        betAmount: betAmount,
      });

      console.log(`[WheelGame] Seat ${seatNumber} reserved by user ${userId} in game ${gameId}`);
      
      // Emit seat reservation event
      this.io.to(`wheel-${gameId}`).emit('wheel:seatReserved', {
        seatNumber,
        userId: userId.toString(),
        betAmount,
      });
      
      return { success: true, game };
    } catch (error) {
      console.error(`[WheelGame] Error reserving seat:`, error);
      throw error;
    }
  }

  /**
   * Schedule betting period end
   */
  scheduleBettingEnd(gameId, bettingEndTime) {
    const delay = bettingEndTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(() => {
        this.closeBetting(gameId);
      }, delay);
    }
  }

  /**
   * Close betting and prepare for spin
   */
  async closeBetting(gameId) {
    try {
      const game = await WheelGame.findOne({ gameId });
      
      if (!game || game.status !== 'betting') {
        return;
      }

      game.status = 'spinning';
      await game.save();

      this.io.to(`wheel-${gameId}`).emit('wheel:bettingClosed');
      
      console.log(`[WheelGame] Betting closed for game ${gameId}`);
    } catch (error) {
      console.error(`[WheelGame] Error closing betting:`, error);
    }
  }

  /**
   * Schedule round end and spin
   */
  scheduleRoundEnd(gameId, roundEndTime) {
    const delay = roundEndTime.getTime() - Date.now();
    const bettingEndDelay = delay - SPIN_DURATION_MS; // Betting ends 5s before spin completes
    
    // Schedule betting close and global multiplier reveal
    if (bettingEndDelay > 0) {
      setTimeout(async () => {
        try {
          const game = await WheelGame.findOne({ gameId });
          if (game && game.status === 'betting') {
            // Generate and reveal global multiplier BEFORE spin
            const globalMultiplierSeed = crypto.randomBytes(16).toString('hex');
            const globalMultiplier = generateGlobalMultiplier(game.gameSeed + globalMultiplierSeed);
            
            game.globalMultiplier = globalMultiplier;
            game.globalMultiplierSeed = globalMultiplierSeed;
            game.status = 'spinning';
            await game.save();
            
            // Broadcast "Top Slot" reveal
            this.io.to(`wheel-${gameId}`).emit('wheel:bettingClosed', {
              globalMultiplier,
              message: `GLOBAL MULTIPLIER: ${globalMultiplier}x!`
            });
            
            console.log(`[WheelGame] Betting closed for game ${gameId}, global multiplier: ${globalMultiplier}x`);
          }
        } catch (error) {
          console.error(`[WheelGame] Error closing betting:`, error);
        }
      }, bettingEndDelay);
    }
    
    if (delay > 0) {
      const timer = setTimeout(() => {
        this.executeRound(gameId);
      }, delay);
      
      this.roundTimers.set(gameId, timer);
    }
  }

  /**
   * Execute the wheel spin and determine winners
   */
  async executeRound(gameId) {
    try {
      const game = await WheelGame.findOne({ gameId });
      
      if (!game) {
        console.error(`[WheelGame] Game ${gameId} not found for round execution`);
        return;
      }

      // Check if there are any players in the game
      const hasPlayers = game.seats.some(seat => seat.userId !== null);
      
      if (!hasPlayers) {
        // No players, skip spin and start next round immediately
        console.log(`[WheelGame] No players in game ${gameId}, skipping spin`);
        setTimeout(() => {
          this.startNextRound(gameId);
        }, 2000);
        return;
      }

      // Generate provably fair result
      const serverSeed = await generateServerSeedFromRandomOrg();
      const serverHash = hashServerSeed(serverSeed);
      const blockHash = await getEOSBlockHash();
      const gameSeed = createGameSeed(serverSeed, blockHash);
      const winningSegment = generateSegmentIndex(gameSeed);

      // Use pre-generated global multiplier (already set in bettingClosed event)
      const globalMultiplier = game.globalMultiplier || 1;

      game.serverSeed = serverSeed;
      game.serverHash = serverHash;
      game.blockHash = blockHash;
      game.gameSeed = gameSeed;
      game.winningSegment = winningSegment;
      game.nonce = game.roundNumber;
      game.status = 'completed';

      // Determine winning seats
      const winningSeats = [];
      
      for (const seat of game.seats) {
        if (seat.userId && seat.segments.includes(winningSegment)) {
          const baseMultiplier = SEAT_MULTIPLIERS[seat.seatNumber];
          const basePayout = Math.round(seat.betAmount * baseMultiplier);
          const finalPayout = Math.round(basePayout * globalMultiplier);
          
          winningSeats.push({
            seatNumber: seat.seatNumber,
            userId: seat.userId,
            betAmount: seat.betAmount,
            baseMultiplier,
            globalMultiplier,
            basePayout,
            finalPayout,
          });

          // Credit winner with final payout
          const user = await User.findById(seat.userId);
          if (user) {
            user.balance += finalPayout;
            user.totalWins = (user.totalWins || 0) + 1;
            user.totalWon = (user.totalWon || 0) + finalPayout;
            await user.save();

            // Create ledger entry
            await Ledger.create({
              userId: seat.userId,
              type: 'wheel_win',
              amount: finalPayout / 100,
              details: {
                gameId,
                roundNumber: game.roundNumber,
                seatNumber: seat.seatNumber,
                winningSegment,
                baseMultiplier,
                globalMultiplier,
                basePayout: basePayout / 100,
                finalPayout: finalPayout / 100,
              },
            });
          }
        }
      }

      game.winningSeats = winningSeats;
      await game.save();

      // Broadcast results
      this.io.to(`wheel-${gameId}`).emit('wheel:roundComplete', {
        winningSegment,
        globalMultiplier,
        winningSeats: winningSeats.map(s => ({
          seatNumber: s.seatNumber,
          userId: s.userId.toString(),
          baseMultiplier: s.baseMultiplier,
          globalMultiplier: s.globalMultiplier,
          basePayout: s.basePayout / 100,
          finalPayout: s.finalPayout / 100,
        })),
      });

      console.log(`[WheelGame] Round ${game.roundNumber} completed for game ${gameId}, segment: ${winningSegment}, global: ${globalMultiplier}x`);

      // Start next round
      setTimeout(() => {
        this.startNextRound(gameId);
      }, 2000);
      
    } catch (error) {
      console.error(`[WheelGame] Error executing round:`, error);
    }
  }

  /**
   * Start the next round
   */
  async startNextRound(gameId) {
    try {
      const now = new Date();
      const roundEndTime = new Date(now.getTime() + ROUND_DURATION_MS);
      const bettingEndTime = new Date(now.getTime() + BETTING_DURATION_MS);

      // Reset seats
      const seats = SEAT_SEGMENTS.map((segments, index) => ({
        seatNumber: index,
        userId: null,
        betAmount: 0,
        segments,
        reservedAt: null,
      }));

      const game = await WheelGame.findOne({ gameId });
      
      if (!game) {
        return;
      }

      game.roundNumber += 1;
      game.status = 'betting';
      game.seats = seats;
      game.roundStartTime = now;
      game.roundEndTime = roundEndTime;
      game.bettingEndTime = bettingEndTime;
      game.winningSegment = null;
      game.winningSeats = [];
      game.serverSeed = undefined;
      game.serverHash = undefined;
      game.blockHash = undefined;
      game.gameSeed = undefined;

      await game.save();

      // Broadcast new round
      this.io.to(`wheel-${gameId}`).emit('wheel:newRound', {
        roundNumber: game.roundNumber,
      });

      // Schedule timers
      this.scheduleRoundEnd(gameId, roundEndTime);
      this.scheduleBettingEnd(gameId, bettingEndTime);

      console.log(`[WheelGame] Started round ${game.roundNumber} for game ${gameId}`);
    } catch (error) {
      console.error(`[WheelGame] Error starting next round:`, error);
    }
  }

  /**
   * Get game state
   */
  async getGameState(gameId) {
    try {
      const game = await WheelGame.findOne({ gameId }).lean();
      
      if (!game) {
        return null;
      }

      // Calculate time remaining
      const now = new Date();
      const timeRemaining = Math.max(0, game.roundEndTime.getTime() - now.getTime());
      const bettingTimeRemaining = Math.max(0, game.bettingEndTime.getTime() - now.getTime());

      return {
        gameId: game.gameId,
        roundNumber: game.roundNumber,
        status: game.status,
        seats: game.seats.map(s => ({
          seatNumber: s.seatNumber,
          occupied: !!s.userId,
          userId: s.userId?.toString(),
          betAmount: s.betAmount / 100,
          segments: s.segments,
          multiplier: SEAT_MULTIPLIERS[s.seatNumber],
        })),
        timeRemaining,
        bettingTimeRemaining,
        winningSegment: game.winningSegment,
        winningSeats: game.winningSeats,
      };
    } catch (error) {
      console.error(`[WheelGame] Error getting game state:`, error);
      return null;
    }
  }

  /**
   * Stop a game instance
   */
  stopGame(gameId) {
    const timer = this.roundTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.roundTimers.delete(gameId);
    }
    this.activeGames.delete(gameId);
    console.log(`[WheelGame] Stopped game instance: ${gameId}`);
  }
}

export default WheelGameManager;
