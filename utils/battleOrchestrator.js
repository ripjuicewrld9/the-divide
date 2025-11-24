/**
 * Universal Battle Orchestrator
 * 
 * Orchestrates entire battle lifecycle:
 * 1. Initialize (create server seed, get block hash, setup teams)
 * 2. Execute rolls (generate deterministic outcomes)
 * 3. Settle (determine winners, calculate payouts)
 * 4. Audit trail (full provability)
 */

const crypto = require('crypto');
const {
  generateServerSeedFromRandomOrg,
  hashServerSeed,
  getEOSBlockHash,
  createGameSeed,
  generateRoll,
  selectItemFromTicket,
  verifyBattleResult,
} = require('./proofOfFair');

class UniversalBattleOrchestrator {
  constructor(caseManager, battleModeRegistry) {
    this.caseManager = caseManager;
    this.battleModeRegistry = battleModeRegistry;
  }

  /**
   * CREATE BATTLE
   * Setup a new battle with full provable fair setup
   */
  async createBattle(config) {
    const { battleId, modeId, players, caseIds } = config;

    if (!battleId || !modeId || !players || !caseIds) {
      throw new Error('[Orchestrator] Missing required config: battleId, modeId, players, caseIds');
    }

    console.log(`\n[Orchestrator] ===== CREATING BATTLE ${battleId} =====`);

    // 1. Get battle mode
    const mode = this.battleModeRegistry.getMode(modeId);
    mode.validate(players, caseIds);

    // 2. Generate server seed (true randomness from Random.org)
    const serverSeed = await generateServerSeedFromRandomOrg();
    const serverHash = hashServerSeed(serverSeed);

    // 3. Get block hash (EOS)
    const blockHash = await getEOSBlockHash();

    // 4. Create game seed
    const gameSeed = createGameSeed(serverSeed, blockHash);

    // 5. Setup teams
    const teams = mode.initializeTeams(players);

    // 6. Initialize battle object
    const battle = {
      battleId,
      modeId,
      mode: mode.name,
      status: 'created', // created → active → settled → ended
      createdAt: new Date(),
      
      // Provable fair
      serverSeed,
      serverHash,
      blockHash,
      gameSeed,
      
      // Teams & players
      teams,
      players,
      
      // Cases
      caseIds,
      cases: caseIds.map(caseId => this.caseManager.getCase(caseId)),
      
      // Results storage
      results: {}, // { round: { playerId: { ticket, item, value } } }
      rounds: [],
      
      // Audit trail
      auditLog: [
        {
          timestamp: new Date(),
          action: 'BATTLE_CREATED',
          serverHash: serverHash,
        }
      ],
    };

    console.log(`[Orchestrator] ✅ Battle created: ${battleId}`);
    console.log(`  Mode: ${mode.name}`);
    console.log(`  Players: ${players.length}`);
    console.log(`  Cases: ${caseIds.length}`);
    console.log(`  Server Hash: ${serverHash.substring(0, 16)}...`);
    console.log(`  Game Seed: ${gameSeed.substring(0, 16)}...`);

    return battle;
  }

  /**
   * EXECUTE BATTLE
   * Run all rolls and determine results
   */
  async executeBattle(battle) {
    const { battleId, modeId, teams, gameSeed, cases, serverSeed } = battle;

    console.log(`\n[Orchestrator] ===== EXECUTING BATTLE ${battleId} =====`);

    const mode = this.battleModeRegistry.getMode(modeId);
    battle.results = {};
    battle.rounds = [];

    // For each round
    for (let round = 0; round < mode.totalRounds; round++) {
      console.log(`\n[Orchestrator] --- ROUND ${round + 1} of ${mode.totalRounds} ---`);
      
      const roundResults = {};
      
      // For each player/team
      for (let slot = 0; slot < teams.length; slot++) {
        const team = teams[slot];
        
        // Roll for this slot
        const roll = generateRoll(gameSeed, round, slot);
        const ticket = roll.ticket;
        
        // Get case for this slot
        const caseData = cases[slot % cases.length];
        const items = this.caseManager.getCaseItems(caseData.id);
        
        // Determine winning item
        const result = selectItemFromTicket(ticket, items);
        
        // Store result
        roundResults[team.teamId] = {
          teamId: team.teamId,
          slot,
          ticket,
          itemId: result.item.id,
          itemName: result.itemName,
          itemValue: result.itemValue,
          caseId: caseData.id,
          seed: roll.seedString,
        };
        
        console.log(`  Slot ${slot} (${team.name}): ${result.itemName} ($${(result.itemValue / 100).toFixed(2)})`);
      }
      
      battle.results[`round-${round}`] = roundResults;
      battle.rounds.push({
        round,
        results: roundResults,
        completedAt: new Date(),
      });
      
      battle.auditLog.push({
        timestamp: new Date(),
        action: `ROUND_${round}_COMPLETED`,
        resultCount: Object.keys(roundResults).length,
      });
    }

    battle.status = 'settled';
    console.log(`\n[Orchestrator] ✅ Battle execution complete`);

    return battle;
  }

  /**
   * DETERMINE WINNERS
   * Calculate winners using battle mode logic
   */
  determineWinners(battle) {
    const { battleId, modeId, teams } = battle;

    console.log(`\n[Orchestrator] ===== DETERMINING WINNERS ${battleId} =====`);

    const mode = this.battleModeRegistry.getMode(modeId);
    
    // Aggregate all results
    const aggregatedResults = {};
    for (const team of teams) {
      aggregatedResults[team.teamId] = 0;
    }

    for (const round in battle.results) {
      const roundResults = battle.results[round];
      for (const teamId in roundResults) {
        aggregatedResults[teamId] += roundResults[teamId].itemValue;
      }
    }

    // Call mode's winner calculation
    const winnerData = mode.calculateWinner(teams, aggregatedResults);

    console.log(`[Orchestrator] Winners:`, winnerData.winners.map(t => t.name).join(', '));
    console.log(`[Orchestrator] Scores:`, winnerData.scores);

    return winnerData;
  }

  /**
   * SETTLE BATTLE
   * Final settlement with winners and payouts
   */
  async settleBattle(battle) {
    console.log(`\n[Orchestrator] ===== SETTLING BATTLE ${battle.battleId} =====`);

    // Determine winners
    const winnerData = this.determineWinners(battle);

    battle.winners = winnerData.winners;
    battle.scores = winnerData.scores;
    battle.tied = winnerData.tied;
    battle.status = 'ended';
    battle.endedAt = new Date();

    battle.auditLog.push({
      timestamp: new Date(),
      action: 'BATTLE_SETTLED',
      winners: winnerData.winners.map(t => t.teamId),
      tied: winnerData.tied,
    });

    console.log(`[Orchestrator] ✅ Battle settled`);
    return battle;
  }

  /**
   * VERIFY BATTLE (Client-side verification)
   * Prove all results are fair
   */
  verifyBattle(battle) {
    const { battleId, serverSeed, serverHash, blockHash, results, cases } = battle;

    console.log(`\n[Orchestrator] ===== VERIFYING BATTLE ${battleId} =====`);

    const verifications = [];

    for (const round in results) {
      const roundResults = results[round];
      
      for (const teamId in roundResults) {
        const result = roundResults[teamId];
        
        const caseData = this.caseManager.getCase(result.caseId);
        
        const verification = verifyBattleResult({
          serverSeed,
          blockHash,
          round: parseInt(round.split('-')[1]),
          slot: result.slot,
          itemName: result.itemName,
          items: this.caseManager.getCaseItems(result.caseId),
          serverHash,
        });

        verifications.push({
          teamId,
          result: verification,
        });

        const status = verification.valid ? '✅' : '❌';
        console.log(`  ${status} ${teamId}: ${verification.message}`);
      }
    }

    const allValid = verifications.every(v => v.result.valid);
    console.log(`\n[Orchestrator] ${allValid ? '✅ BATTLE VERIFIED' : '❌ VERIFICATION FAILED'}`);

    return {
      battleId,
      valid: allValid,
      verifications,
    };
  }

  /**
   * GET BATTLE AUDIT TRAIL
   * Return full provability record
   */
  getBattleAuditTrail(battle) {
    return {
      battleId: battle.battleId,
      mode: battle.mode,
      createdAt: battle.createdAt,
      endedAt: battle.endedAt,
      
      // Provable fair seeds
      serverHash: battle.serverHash,
      blockHash: battle.blockHash,
      gameSeedLength: battle.gameSeed.length,
      
      // Results
      rounds: battle.rounds.length,
      winners: battle.winners?.map(t => t.name) || [],
      tied: battle.tied,
      
      // Audit log
      auditLog: battle.auditLog,
      
      // Verification
      verification: this.verifyBattle(battle),
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  UniversalBattleOrchestrator,
};
