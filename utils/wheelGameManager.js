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

// Wheel configuration: 54 segments total with base multipliers
// Distribution as specified (spread evenly like Crazy Time):
// -0.75x: 15 segments
// -0.5x: 10 segments
// -0.25x: 5 segments
// 0.25x: 4 segments
// 0.5x: 4 segments
// 0.75x: 2 segments
// 1x: 2 segments
// 1.5x: 3 segments
// 2x: 3 segments
// 3x: 2 segments
// 5x: 2 segments
// 7.5x: 1 segment
// 25x: 1 segment
// Segments are arranged so matching multipliers are spread around the wheel evenly
const WHEEL_SEGMENTS = [
  -0.75, -0.5, -0.25, 0.25, -0.75, -0.5, 0.5, -0.75, -0.25, 1.5,
  -0.75, -0.5, 0.75, 2, -0.75, -0.5, 0.25, 3, -0.75, -0.25,
  0.5, -0.75, -0.5, 1, 2, -0.75, -0.5, 0.25, -0.75, -0.25,
  5, -0.75, -0.5, 0.5, 1.5, -0.75, -0.5, 0.25, -0.75, -0.25,
  0.75, 2, -0.75, 1.5, 3, 0.5, 5, 1, 7.5, 25
];

// 8 Fixed flapper positions (evenly spaced around the wheel)
// Each flapper is positioned at (360 / 8) degrees apart
const FLAPPER_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7];

const ROUND_DURATION_MS = 30000; // 30 seconds
const BETTING_DURATION_MS = 25000; // 25 seconds for betting
const SPIN_DURATION_MS = 5000; // 5 seconds for spin

// Segment boost multiplier distribution
const BOOST_MULTIPLIER_DISTRIBUTION = [
  { multiplier: 10, weight: 40 },    // 40% chance for 10x
  { multiplier: 25, weight: 25 },    // 25% chance for 25x
  { multiplier: 50, weight: 20 },    // 20% chance for 50x
  { multiplier: 100, weight: 15 }    // 15% chance for 100x
];

/**
 * Generate boost multiplier using weighted distribution
 */
function generateBoostMultiplier(seed) {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const randomValue = parseInt(hash.slice(0, 8), 16) / 0xffffffff; // 0-1
  
  const totalWeight = BOOST_MULTIPLIER_DISTRIBUTION.reduce((sum, item) => sum + item.weight, 0);
  let threshold = 0;
  
  for (const item of BOOST_MULTIPLIER_DISTRIBUTION) {
    threshold += item.weight / totalWeight;
    if (randomValue < threshold) {
      return item.multiplier;
    }
  }
  
  return BOOST_MULTIPLIER_DISTRIBUTION[0].multiplier;
}

/**
 * Generate number of segments to boost (3-5)
 */
function generateBoostCount(seed) {
  const hash = crypto.createHash('sha256').update(seed + 'count').digest('hex');
  const randomValue = parseInt(hash.slice(0, 8), 16) % 3; // 0, 1, or 2
  return 3 + randomValue; // 3, 4, or 5
}

/**
 * Select random segments to boost
 */
function selectBoostedSegments(seed, count) {
  const boosted = [];
  const available = Array.from({ length: 54 }, (_, i) => i);
  
  for (let i = 0; i < count; i++) {
    const hash = crypto.createHash('sha256').update(seed + i).digest('hex');
    const randomIndex = parseInt(hash.slice(0, 8), 16) % available.length;
    boosted.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }
  
  return boosted;
}

class WheelGameManager {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map();
    this.roundTimers = new Map();
    // Fixed lobby IDs
    this.LOBBY_IDS = ['lobby-1', 'lobby-2', 'lobby-3', 'lobby-4'];
  }

  /**
   * Initialize the 4 permanent lobbies on server startup
   */
  async initializeLobbies() {
    console.log('[WheelGame] Initializing 4 permanent lobbies...');
    
    for (const lobbyId of this.LOBBY_IDS) {
      try {
        // Check if lobby already exists
        let game = await WheelGame.findOne({ gameId: lobbyId });
        
        if (!game) {
          // Create new lobby
          console.log(`[WheelGame] Creating new lobby: ${lobbyId}`);
          await this.createGameInstance(lobbyId);
        } else {
          // Resume existing lobby
          console.log(`[WheelGame] Resuming existing lobby: ${lobbyId}`);
          this.activeGames.set(lobbyId, game);
          
          // If the game is in progress, schedule appropriate timers
          if (game.status === 'betting' || game.status === 'spinning') {
            const now = new Date();
            
            // Only schedule if times are in the future
            if (game.bettingEndTime > now) {
              this.scheduleBettingEnd(lobbyId, game.bettingEndTime);
            }
            
            if (game.roundEndTime > now) {
              this.scheduleRoundEnd(lobbyId, game.roundEndTime);
            } else {
              // Round should have ended, start a new one
              console.log(`[WheelGame] ${lobbyId} round expired, starting new round`);
              await this.startNextRound(lobbyId);
            }
          } else if (game.status === 'completed') {
            // Start a new round
            await this.startNextRound(lobbyId);
          }
        }
      } catch (error) {
        console.error(`[WheelGame] Error initializing lobby ${lobbyId}:`, error);
      }
    }
    
    console.log('[WheelGame] All 4 lobbies initialized');
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

      // Initialize seats (8 flappers) - no multipliers, just positions
      const seats = FLAPPER_POSITIONS.map((flapperPosition) => ({
        seatNumber: flapperPosition,
        userId: null,
        username: null,
        profileImage: null,
        betAmount: 0,
        segments: [], // Not used in new system, kept for schema compatibility
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

      // Check if user already has 2 seats (max allowed)
      const userSeats = game.seats.filter(s => s.userId && s.userId.toString() === userId.toString());
      if (userSeats.length >= 2) {
        throw new Error('You can only occupy up to 2 seats per game');
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

      // Fetch user details for broadcast
      const username = user.username;
      const profileImage = user.profileImage;

      // Reserve seat
      seat.userId = userId;
      seat.username = username;
      seat.profileImage = profileImage;
      seat.betAmount = betInCents;
      seat.reservedAt = new Date();

      await game.save();

      // Broadcast seat reservation with user details
      this.io.to(`wheel-${gameId}`).emit('wheel:seatReserved', {
        gameId,
        seatNumber,
        userId: userId.toString(),
        username,
        profileImage,
        betAmount: betAmount,
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
    const bettingEndDelay = delay - SPIN_DURATION_MS;
    
    // Schedule betting close and boost reveal
    if (bettingEndDelay > 0) {
      setTimeout(async () => {
        try {
          const game = await WheelGame.findOne({ gameId });
          if (game && game.status === 'betting') {
            // Generate boosted segments BEFORE spin
            const boostSeed = crypto.randomBytes(16).toString('hex');
            const boostCount = generateBoostCount(boostSeed);
            const boostedSegmentIndices = selectBoostedSegments(boostSeed, boostCount);
            
            // Generate boost multipliers for each selected segment
            const boostedSegments = boostedSegmentIndices.map((segmentIndex, i) => ({
              segmentIndex,
              baseMultiplier: WHEEL_SEGMENTS[segmentIndex],
              boostMultiplier: generateBoostMultiplier(boostSeed + i + 'boost'),
              finalMultiplier: WHEEL_SEGMENTS[segmentIndex] * generateBoostMultiplier(boostSeed + i + 'boost')
            }));
            
            game.boostedSegments = boostedSegments;
            game.boostSeed = boostSeed;
            game.status = 'spinning';
            await game.save();
            
            // Broadcast boosted segments reveal
            this.io.to(`wheel-${gameId}`).emit('wheel:bettingClosed', {
              boostedSegments: boostedSegments.map(b => ({
                segmentIndex: b.segmentIndex,
                baseMultiplier: b.baseMultiplier,
                boostMultiplier: b.boostMultiplier,
                finalMultiplier: b.finalMultiplier
              })),
              message: `${boostCount} segments boosted!`
            });
            
            console.log(`[WheelGame] Betting closed for game ${gameId}, ${boostCount} segments boosted`);
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

      // Generate provably fair result for wheel stopping position
      const serverSeed = await generateServerSeedFromRandomOrg();
      const serverHash = hashServerSeed(serverSeed);
      const blockHash = await getEOSBlockHash();
      const gameSeed = createGameSeed(serverSeed, blockHash);
      
      // Determine wheel stopping position (0-53)
      const wheelStopPosition = generateSegmentIndex(gameSeed);

      game.serverSeed = serverSeed;
      game.serverHash = serverHash;
      game.blockHash = blockHash;
      game.gameSeed = gameSeed;
      game.winningSegment = wheelStopPosition; // Stores the segment at position 0
      game.nonce = game.roundNumber;
      game.status = 'completed';

      // Get boosted segments from game (set during betting close)
      const boostedSegments = game.boostedSegments || [];
      const boostMap = new Map();
      boostedSegments.forEach(b => {
        boostMap.set(b.segmentIndex, {
          boostMultiplier: b.boostMultiplier,
          finalMultiplier: b.finalMultiplier
        });
      });

      // Calculate outcomes for ALL 8 seats based on flapper positions
      const seatOutcomes = [];
      
      for (let seatNumber = 0; seatNumber < 8; seatNumber++) {
        // Calculate which segment is under this flapper
        // Flappers are evenly spaced: 54/8 = 6.75 segments apart
        // For simplicity, use: (wheelStopPosition + seatNumber * 7) % 54
        const segmentUnderFlapper = (wheelStopPosition + (seatNumber * 7)) % 54;
        
        // Get base multiplier for this segment
        const baseMultiplier = WHEEL_SEGMENTS[segmentUnderFlapper];
        
        // Check if this segment has a boost
        const boost = boostMap.get(segmentUnderFlapper);
        const finalMultiplier = boost ? boost.finalMultiplier : baseMultiplier;
        const boostMultiplier = boost ? boost.boostMultiplier : 1;
        
        // Find if this seat is occupied
        const seat = game.seats.find(s => s.seatNumber === seatNumber);
        const isOccupied = seat && seat.userId;
        
        // Calculate payout if seat is occupied
        let payout = 0;
        if (isOccupied && seat.betAmount > 0) {
          payout = Math.round(seat.betAmount * finalMultiplier);
        }
        
        seatOutcomes.push({
          seatNumber,
          segmentUnderFlapper,
          baseMultiplier,
          boostMultiplier,
          finalMultiplier,
          isOccupied,
          userId: isOccupied ? seat.userId : null,
          betAmount: isOccupied ? seat.betAmount : 0,
          payout,
          isBoosted: boost !== undefined
        });
        
        // Process payout/loss for occupied seats
        if (isOccupied && seat.userId) {
          const user = await User.findById(seat.userId);
          if (user) {
            // Apply payout (can be positive or negative)
            user.balance += payout;
            
            // Update stats
            user.totalBets = (user.totalBets || 0) + 1;
            user.wagered = (user.wagered || 0) + seat.betAmount;
            
            if (finalMultiplier > 0) {
              user.totalWins = (user.totalWins || 0) + 1;
              user.totalWon = (user.totalWon || 0) + payout;
            } else {
              user.totalLosses = (user.totalLosses || 0) + 1;
            }
            
            await user.save();

            // Create ledger entry
            await Ledger.create({
              userId: seat.userId,
              type: finalMultiplier > 0 ? 'wheel_win' : 'wheel_loss',
              amount: payout / 100,
              details: {
                gameId,
                roundNumber: game.roundNumber,
                seatNumber,
                wheelStopPosition,
                segmentUnderFlapper,
                baseMultiplier,
                boostMultiplier,
                finalMultiplier,
                betAmount: seat.betAmount / 100,
                payout: payout / 100,
                isBoosted: boost !== undefined
              },
            });
          }
        }
      }

      game.seatOutcomes = seatOutcomes;
      await game.save();

      // Broadcast results with all seat outcomes
      this.io.to(`wheel-${gameId}`).emit('wheel:roundComplete', {
        wheelStopPosition,
        seatOutcomes: seatOutcomes.map(outcome => ({
          seatNumber: outcome.seatNumber,
          segmentUnderFlapper: outcome.segmentUnderFlapper,
          baseMultiplier: outcome.baseMultiplier,
          boostMultiplier: outcome.boostMultiplier,
          finalMultiplier: outcome.finalMultiplier,
          isOccupied: outcome.isOccupied,
          userId: outcome.userId ? outcome.userId.toString() : null,
          betAmount: outcome.betAmount / 100,
          payout: outcome.payout / 100,
          isBoosted: outcome.isBoosted
        })),
      });

      console.log(`[WheelGame] Round ${game.roundNumber} completed for game ${gameId}, wheelStopPosition: ${wheelStopPosition}`);

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

      // Reset seats (8 flappers)
      const seats = FLAPPER_POSITIONS.map((flapperPosition) => ({
        seatNumber: flapperPosition,
        userId: null,
        betAmount: 0,
        segments: [],
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
      game.seatOutcomes = [];
      game.boostedSegments = [];
      game.boostSeed = undefined;
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
        wheelSegments: WHEEL_SEGMENTS, // All 54 segment base multipliers
        seats: game.seats.map(s => ({
          seatNumber: s.seatNumber,
          occupied: !!s.userId,
          userId: s.userId?.toString(),
          betAmount: s.betAmount / 100,
          flapperPosition: s.seatNumber, // Flapper is fixed to seat number
        })),
        boostedSegments: game.boostedSegments || [],
        seatOutcomes: game.seatOutcomes || [],
        timeRemaining,
        bettingTimeRemaining,
        wheelStopPosition: game.winningSegment,
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
