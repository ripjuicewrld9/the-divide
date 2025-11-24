/**
 * Universal Battle Mode System
 * 
 * Supports any battle configuration:
 * - 1v1 (2 players, 1 case each)
 * - 2v2 (4 players, 1 case each)
 * - Free-for-all (N players, 1 case each)
 * - Team battles (teams vs teams)
 * - Best-of-N (multiple rounds)
 * - Custom modes
 * 
 * Each mode is pluggable and extensible.
 */

class BattleMode {
  constructor(modeId, config = {}) {
    this.modeId = modeId;
    this.name = config.name || modeId;
    this.description = config.description || '';
    this.playerCount = config.playerCount || 2;
    this.teamSize = config.teamSize || 1;
    this.casesPerPlayer = config.casesPerPlayer || 1;
    this.totalRounds = config.totalRounds || 1;
    this.rules = config.rules || {};
    this.maxPlayers = config.maxPlayers || config.playerCount;
  }

  /**
   * Validate battle setup
   */
  validate(players, cases) {
    if (!Array.isArray(players) || players.length === 0) {
      throw new Error(`[BattleMode] ${this.modeId}: No players provided`);
    }

    if (players.length < this.playerCount) {
      throw new Error(`[BattleMode] ${this.modeId}: Requires ${this.playerCount} players, got ${players.length}`);
    }

    if (players.length > this.maxPlayers) {
      throw new Error(`[BattleMode] ${this.modeId}: Max ${this.maxPlayers} players, got ${players.length}`);
    }

    if (!Array.isArray(cases) || cases.length === 0) {
      throw new Error(`[BattleMode] ${this.modeId}: No cases provided`);
    }

    console.log(`[BattleMode] ✅ ${this.modeId} validated`);
  }

  /**
   * Initialize teams based on mode
   */
  initializeTeams(players) {
    const teams = [];
    
    if (this.teamSize === 1) {
      // 1v1 or FFA - each player is their own team
      for (let i = 0; i < players.length; i++) {
        teams.push({
          teamId: `team-${i}`,
          name: `Team ${players[i].username}`,
          players: [players[i]],
          totalValue: 0,
          score: 0,
        });
      }
    } else {
      // Team mode - divide players into teams
      const numTeams = Math.ceil(players.length / this.teamSize);
      for (let i = 0; i < numTeams; i++) {
        const start = i * this.teamSize;
        const end = Math.min(start + this.teamSize, players.length);
        const teamPlayers = players.slice(start, end);
        
        teams.push({
          teamId: `team-${i}`,
          name: `Team ${i + 1}`,
          players: teamPlayers,
          totalValue: 0,
          score: 0,
        });
      }
    }

    return teams;
  }

  /**
   * Determine winner(s) based on mode rules
   */
  calculateWinner(teams, results) {
    // Default: team with highest total item value wins
    const scoreMap = {};
    
    for (const team of teams) {
      let teamTotal = 0;
      for (const player of team.players) {
        const playerResults = results[player.userId];
        if (playerResults) {
          teamTotal += playerResults.totalValue;
        }
      }
      scoreMap[team.teamId] = teamTotal;
    }

    // Find winners (handle ties)
    const maxScore = Math.max(...Object.values(scoreMap));
    const winners = Object.keys(scoreMap).filter(teamId => scoreMap[teamId] === maxScore);

    return {
      winners: winners.map(teamId => teams.find(t => t.teamId === teamId)),
      scores: scoreMap,
      tied: winners.length > 1,
    };
  }
}

/**
 * 1v1 Mode
 * - 2 players
 * - 1 case each
 * - 1 round
 * - Winner = highest item value
 */
class Mode1v1 extends BattleMode {
  constructor() {
    super('1v1', {
      name: '1v1 Battle',
      description: 'Head-to-head: each player spins their case',
      playerCount: 2,
      maxPlayers: 2,
      teamSize: 1,
      casesPerPlayer: 1,
      totalRounds: 1,
    });
  }
}

/**
 * 2v2 Mode
 * - 4 players
 * - 2 teams of 2
 * - 1 case per player
 * - Team value = sum of both players' items
 */
class Mode2v2 extends BattleMode {
  constructor() {
    super('2v2', {
      name: '2v2 Team Battle',
      description: 'Team battles: best-of-4 players',
      playerCount: 4,
      maxPlayers: 4,
      teamSize: 2,
      casesPerPlayer: 1,
      totalRounds: 1,
    });
  }
}

/**
 * Free-for-All Mode
 * - 2-8 players
 * - Everyone for themselves
 * - 1 case per player
 * - Winner = highest individual item value
 */
class ModeFFA extends BattleMode {
  constructor(maxPlayers = 8) {
    super('ffa', {
      name: 'Free-for-All',
      description: `Battle royale: up to ${maxPlayers} players`,
      playerCount: 2,
      maxPlayers: maxPlayers,
      teamSize: 1,
      casesPerPlayer: 1,
      totalRounds: 1,
    });
  }
}

/**
 * Best-of-3 Mode
 * - 2 players
 * - 3 rounds
 * - Winner = wins 2 out of 3 rounds
 */
class ModeBestOf3 extends BattleMode {
  constructor() {
    super('best-of-3', {
      name: 'Best of 3',
      description: 'First to win 2 rounds',
      playerCount: 2,
      maxPlayers: 2,
      teamSize: 1,
      casesPerPlayer: 1,
      totalRounds: 3,
    });
  }

  calculateWinner(teams, results) {
    // Each player plays 3 rounds
    // Winner of each round gets a point
    // First to 2 wins
    const roundWins = {};
    
    for (const team of teams) {
      roundWins[team.teamId] = 0;
    }

    // Count wins per team per round (simplified)
    for (const round in results) {
      let maxValue = 0;
      let winner = null;

      for (const team of teams) {
        const teamValue = results[round][team.teamId] || 0;
        if (teamValue > maxValue) {
          maxValue = teamValue;
          winner = team.teamId;
        }
      }

      if (winner) {
        roundWins[winner]++;
      }
    }

    const winners = Object.entries(roundWins)
      .sort((a, b) => b[1] - a[1])
      .filter((_, i) => i === 0)
      .map(([teamId]) => teams.find(t => t.teamId === teamId));

    return {
      winners,
      scores: roundWins,
      tied: false,
    };
  }
}

/**
 * Battle Mode Registry
 */
class BattleModeRegistry {
  constructor() {
    this.modes = {};
    this.registerBuiltInModes();
  }

  registerBuiltInModes() {
    this.register(new Mode1v1());
    this.register(new Mode2v2());
    this.register(new ModeFFA());
    this.register(new ModeBestOf3());
    console.log('[BattleModeRegistry] ✅ Registered 4 built-in modes');
  }

  /**
   * Register a custom battle mode
   */
  register(battleMode) {
    if (!battleMode.modeId) {
      throw new Error('[BattleModeRegistry] Mode must have modeId');
    }
    this.modes[battleMode.modeId] = battleMode;
    console.log(`[BattleModeRegistry] Registered mode: ${battleMode.modeId}`);
  }

  /**
   * Get mode by ID
   */
  getMode(modeId) {
    const mode = this.modes[modeId];
    if (!mode) {
      throw new Error(`[BattleModeRegistry] Mode not found: ${modeId}`);
    }
    return mode;
  }

  /**
   * List all available modes
   */
  listModes() {
    return Object.entries(this.modes).map(([id, mode]) => ({
      id,
      name: mode.name,
      description: mode.description,
      playerCount: mode.playerCount,
      maxPlayers: mode.maxPlayers,
      totalRounds: mode.totalRounds,
    }));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  BattleMode,
  Mode1v1,
  Mode2v2,
  ModeFFA,
  ModeBestOf3,
  BattleModeRegistry,
};
