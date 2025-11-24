import CaseBattle from '../models/CaseBattle.js';
import User from '../models/User.js';
import Ledger from '../models/Ledger.js';
import Case from '../models/Case.js';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { 
  generateHybridSeed, 
  generateTicketFromHybridSeed,
  getItemTicketRanges as getHybridTicketRanges,
  getWinningItem as getHybridWinningItem
} from '../utils/hybridRng.js';

// Hybrid RNG configuration (Random.org + EOS Block Hash)
const SETTLEMENT_THRESHOLD = 0.01; // Minimum pot value to settle battles
const rngTicketRanges = getHybridTicketRanges;
const rngWinningItem = getHybridWinningItem;

export default function registerCaseBattles(app, io, { auth } = {}) {
  console.log(`\n[CaseBattles Router] 🔐 Initialized - HYBRID RNG (Random.org + EOS Block Hash)\n`);

  // Helper: draw an item from a case using secure crypto RNG (no Math.random)
  // Returns { item: itemName, value: itemValue }
  function drawFromCase(caseObj) {
    const items = caseObj.items || [];
    if (!items || items.length === 0) {
      return { item: 'Unknown', value: 0 };
    }

    // Build ticket ranges (0..99999) based on item chance weights
    try {
      const ranges = rngTicketRanges(items);
      const ticket = crypto.randomInt(0, 100000);
      const win = rngWinningItem(ticket, ranges);
      return { item: win.item || (items[0] && items[0].name) || 'Unknown', value: win.itemValue || win.value || 0 };
    } catch (e) {
      // Fallback: pick first item deterministically if something fails
      const first = items[0];
      return { item: first?.name || 'Unknown', value: first?.value || 0 };
    }
  }

  app.post('/case-battles/create', auth, async (req, res) => {
    try {
      const userId = req.userId;
      const { caseIds, mode, teamSize } = req.body; // caseIds is now an array
      
      console.log(`[CaseBattle API] POST /case-battles/create from user ${userId}, cases: ${caseIds?.length || 0}`);
      
      if (!caseIds || caseIds.length === 0) {
        return res.status(400).json({ error: 'At least one case required' });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Validate and fetch cases
      const selectedMode = mode || 'normal';
      const selectedTeamSize = teamSize || 1;

      // Fetch all case details
      const caseDetails = [];
      let totalCost = 0;

      for (const caseId of caseIds) {
        const customCase = await Case.findById(caseId);
        if (!customCase) return res.status(404).json({ error: `Case ${caseId} not found` });

        const caseCost = customCase.calculatedPrice || 0; // in dollars
        totalCost += caseCost;
        const drawn = drawFromCase(customCase);
        
        caseDetails.push({
          caseId: customCase._id,
          caseName: customCase.name,
          casePrice: caseCost,
          drawnItem: drawn.item,
          drawnItemValue: drawn.value,
          items: customCase.items || [],
        });
      }

      // Convert totalCost from dollars to cents for balance comparison and deduction
      const totalCostInCents = Math.round(totalCost * 100);
      if (user.balance < totalCostInCents) return res.status(402).json({ error: 'Insufficient balance' });

      const totalItemValue = caseDetails.reduce((sum, c) => sum + c.drawnItemValue, 0);

      // Get the first case's full items data for animation
      const firstCaseObj = await Case.findById(caseDetails[0].caseId);
      
      // Build caseItemsData - now fetch images from Item collection if not in case
      const Item = (await import('../models/Item.js')).default;
      const caseItemsData = firstCaseObj ? await Promise.all(firstCaseObj.items.map(async (item, idx) => {
        const stableId = item.id || item._id || `srv_${nanoid(8)}`;
        const isGoldTrigger = item.isGoldTrigger === true || ((item.chance || 0) <= 1);
        
        // If item doesn't have image in case, try to fetch from Item collection by name
        let itemImage = item.image;
        if (!itemImage) {
          try {
            const dbItem = await Item.findOne({ name: item.name });
            if (dbItem && dbItem.image) {
              itemImage = dbItem.image;
            }
          } catch (err) {
            // Silently fail, just won't have image
          }
        }
        
        return {
          name: item.name,
          value: item.value,
          chance: item.chance,
          color: item.color,
          rarity: item.rarity,
          image: itemImage || null,
          id: stableId,
          isGoldTrigger,
        };
      })) : [];

      // Generate hybrid seed (Random.org + EOS Block Hash, with crypto fallback)
      console.log('[CaseBattle Create] Generating hybrid seed (Random.org + EOS Block, or fallback to crypto)...');
      let hybridSeedData;
      try {
        hybridSeedData = await generateHybridSeed();
      } catch (hybridError) {
        console.error('[CaseBattle Create] Hybrid RNG failed:', hybridError.message);
        return res.status(503).json({ error: 'RNG service unavailable - Random.org or EOS block fetch failed' });
      }

      // Generate player1 ticket using hybrid seed and nonce
      const ticketRanges = rngTicketRanges(caseItemsData);
      const player1Ticket = generateTicketFromHybridSeed(hybridSeedData.hybridSeed, 0);
      
      console.log(`[CaseBattle Create] Player 1 ticket: ${player1Ticket} (Random.org seed XOR EOS block)`);

      // Create player object for the creator
      const player1Object = {
        userId: userId,
        username: user.username,
        team: 1,
        status: 'ready',
        caseValue: totalCost,
        cases: caseDetails.map(c => ({
          caseId: c.caseId,
          caseName: c.caseName,
          price: c.casePrice,
          drawnItem: c.drawnItem,
          itemValue: c.drawnItemValue,
        })),
        totalCaseValue: totalCost,
        totalItemValue: totalItemValue,
        randomOrgSeed: hybridSeedData.randomOrgSeed,
        eosBlockHash: hybridSeedData.blockHash,
        hybridSeed: hybridSeedData.hybridSeed,
        ticket: player1Ticket,
        isBot: false,
      };

      console.log(`[CaseBattle Create] Player 1 object cases:`, JSON.stringify(player1Object.cases.map(c => ({ name: c.caseName, priceSet: !!c.price, drawnItemSet: !!c.drawnItem }))));

      const battle = new CaseBattle({
        id: nanoid(8),
        players: [player1Object],
        player1Id: userId,
        player1Username: user.username,
        caseId: caseDetails[0].caseId,
        caseName: caseDetails[0].caseName,
        caseIds: caseDetails.map(c => c.caseId),
        caseItemsData: caseItemsData,
        player1CaseValue: totalCost,
        player1CaseItem: caseDetails.map(c => c.drawnItem).join(', '),
        player1ItemValue: totalItemValue,
        status: 'waiting',
        mode: selectedMode,
        teamSize: selectedTeamSize,
        randomOrgSeed: hybridSeedData.randomOrgSeed,
        eosBlockHash: hybridSeedData.blockHash,
        hybridSeed: hybridSeedData.hybridSeed,
        player1Ticket: player1Ticket,
      });

      await battle.save();
      
      // Emit real-time event for new battle
      io.emit('battle:created', { battle });
      
      user.balance -= totalCostInCents;
      await user.save();
      console.log(`[CaseBattle Create] Balance deducted: User ${user.username} balance after: $${(user.balance / 100).toFixed(2)}`);

      for (const detail of caseDetails) {
        await Case.updateOne({ _id: detail.caseId }, { $inc: { usageCount: 1 } });
      }

      const itemDesc = caseDetails.map(c => c.drawnItem).join(', ');
      await Ledger.create({
        userId,
        description: `Case Battle created (${caseDetails.length} cases, total: $${(totalCost).toFixed(2)}) - Items: ${itemDesc}`,
        amount: -totalCostInCents,
        type: 'case-battle-create',
        reference: battle._id,
      });

      io.emit('newCaseBattle', { battle });
      res.json({ success: true, battle });
    } catch (err) {
      console.error('Error creating case battle:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/case-battles/join/:battleId', auth, async (req, res) => {
    try {
      const userId = req.userId;
      const { battleId } = req.params;
      const battle = await CaseBattle.findOne({ id: battleId });
      if (!battle) return res.status(404).json({ error: 'Battle not found' });
      if (battle.status !== 'waiting') return res.status(400).json({ error: 'Battle not accepting players' });
      if (battle.player1Id === userId) return res.status(400).json({ error: 'Cannot join own battle' });
      
      // Check if player already in battle
      if (battle.players && battle.players.some(p => p.userId === userId)) {
        return res.status(400).json({ error: 'Already in this battle' });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Determine which team this player should join
      let assignedTeam = 2;
      if (battle.mode === 'group') {
        assignedTeam = 1; // Group mode: everyone on same team (or individual tracking)
      }
      
      // Count players per team
      const playersOnTeam1 = (battle.players || []).filter(p => p.team === 1).length;
      const playersOnTeam2 = (battle.players || []).filter(p => p.team === 2).length;
      
      // For normal/crazy: balance teams
      if ((battle.mode === 'normal' || battle.mode === 'crazy') && playersOnTeam2 >= playersOnTeam1) {
        assignedTeam = 1; // Put new player on team 1 if unbalanced
      }

      // Load the same cases for consistency (same case for all players)
      let caseDetails = [];
      let totalCost = 0;
      let totalItemValue = 0;

      if (battle.caseIds && battle.caseIds.length > 0) {
        for (const caseId of battle.caseIds) {
          const customCase = await Case.findById(caseId).catch(() => null);
          if (customCase) {
            const caseCost = customCase.calculatedPrice;
            const drawn = drawFromCase(customCase);
            totalCost += caseCost;
            totalItemValue += drawn.value;
            
            caseDetails.push({
              caseId: customCase._id,
              caseName: customCase.name,
              casePrice: caseCost,
              drawnItem: drawn.item,
              drawnItemValue: drawn.value,
            });
          }
        }
      }

      if (user.balance < totalCost) return res.status(402).json({ error: 'Insufficient balance' });

      // Use the existing battle hybrid seed to generate a deterministic ticket for this joining player
      if (!battle.hybridSeed) {
        console.error('[CaseBattle Join] Missing hybridSeed on battle - cannot generate ticket');
        return res.status(500).json({ error: 'Battle RNG not initialized' });
      }
      const playerNonce = battle.players.length; // nonce based on current player count
      const ticketRanges = rngTicketRanges(battle.caseItemsData);
      const playerTicket = generateTicketFromHybridSeed(battle.hybridSeed, playerNonce);
      console.log(`[CaseBattle Join] Player joining team ${assignedTeam}, ticket: ${playerTicket} (nonce: ${playerNonce})`);

      // Create player object
      const playerObject = {
        userId: userId,
        username: user.username,
        team: assignedTeam,
        status: 'ready',
        caseValue: totalCost,
        cases: caseDetails.map(c => ({
          caseId: c.caseId,
          caseName: c.caseName,
          price: c.casePrice,
          drawnItem: c.drawnItem,
          itemValue: c.drawnItemValue,
        })),
        totalCaseValue: totalCost,
        totalItemValue: totalItemValue,
        // Store hybrid RNG components for auditability
        randomOrgSeed: battle.randomOrgSeed,
        eosBlockHash: battle.eosBlockHash,
        hybridSeed: battle.hybridSeed,
        seed: battle.hybridSeed,
        ticket: playerTicket,
        isBot: false,
      };

      // Add player to battle
      battle.players.push(playerObject);

      // Check if battle is now full
      let isFull = false;
      if (battle.mode === 'group') {
        isFull = battle.players.length >= battle.teamSize;
      } else {
        // normal/crazy: need teamSize players per team
        const team1Count = battle.players.filter(p => p.team === 1).length;
        const team2Count = battle.players.filter(p => p.team === 2).length;
        isFull = team1Count >= battle.teamSize && team2Count >= battle.teamSize;
      }

      // Update battle status
      if (isFull) {
        battle.status = 'active';
      }

      // Update legacy fields for backward compatibility
      if (battle.players.length === 2) {
        const team2Player = battle.players.find(p => p.team === 2);
        if (team2Player) {
          battle.player2Id = team2Player.userId;
          battle.player2Username = team2Player.username;
          battle.player2CaseValue = team2Player.totalCaseValue;
          battle.player2CaseItem = team2Player.cases.map(c => c.drawnItem).join(', ');
          battle.player2ItemValue = team2Player.totalItemValue;
          // Backward-compatible fields: store hybrid seed and ticket
          battle.player2Seed = team2Player.hybridSeed || team2Player.seed || null;
          battle.player2Ticket = team2Player.ticket;
        }
      }

      // Calculate pot from all players
      battle.pot = battle.players.reduce((sum, p) => sum + p.totalItemValue, 0);
      battle.updatedAt = new Date();
      
      await battle.save();
      
      // Emit real-time event for battle update
      io.emit('battle:updated', { battle });

      user.balance -= totalCost;
      await user.save();

      const itemDesc = caseDetails.map(c => c.drawnItem).join(', ');
      await Ledger.create({
        userId,
        description: `Case Battle joined (cases: $${(totalCost).toFixed(2)}) - Items: ${itemDesc}`,
        amount: -totalCost,
        type: 'case-battle-join',
        reference: battle._id,
      });

      // Increment usage count for each case
      for (const detail of caseDetails) {
        await Case.updateOne({ _id: detail.caseId }, { $inc: { usageCount: 1 } });
      }

      io.emit('caseBattleJoined', { battle });
      res.json({ success: true, battle });
    } catch (err) {
      console.error('Error joining case battle:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/case-battles/:battleId/summon-bot', auth, async (req, res) => {
    try {
      const userId = req.userId;
      const { battleId } = req.params;
      console.log(`[Summon Bot] Request received - userId: ${userId}, battleId: ${battleId}`);
      
      const battle = await CaseBattle.findOne({ id: battleId });
      if (!battle) return res.status(404).json({ error: 'Battle not found' });
      
      console.log(`[Summon Bot] Battle found - player1Id: ${battle.player1Id}, firstPlayer: ${battle.players?.[0]?.userId}`);
      
      // Allow summon-bot on 'waiting' or 'active' battles (not 'ended')
      if (battle.status === 'ended') return res.status(400).json({ error: 'Battle already finished' });
      
      // Check if user is the battle creator (new players array system or legacy player1Id)
      const isCreator = battle.player1Id === userId || battle.players?.[0]?.userId === userId;
      console.log(`[Summon Bot] isCreator check: player1Id match: ${battle.player1Id === userId}, firstPlayer match: ${battle.players?.[0]?.userId === userId}, result: ${isCreator}`);
      
      if (!isCreator) return res.status(403).json({ error: 'Only creator can summon bot' });
      
      // Calculate max players based on team size and mode
      console.log(`[Summon Bot] Battle ID: ${battleId}, Mode: ${battle.mode}, TeamSize: ${battle.teamSize}, Current Players: ${battle.players.length}`);
      console.log(`[Summon Bot] Battle object:`, { mode: battle.mode, teamSize: battle.teamSize, status: battle.status });
      
      // Handle missing teamSize (for old battles) - default to 1 (1v1)
      const effectiveTeamSize = battle.teamSize || 1;
      const maxPlayers = (battle.mode === 'group') ? effectiveTeamSize : (effectiveTeamSize * 2);
      const currentPlayerCount = battle.players.length;
      console.log(`[Summon Bot] EffectiveTeamSize: ${effectiveTeamSize}, MaxPlayers calculated: ${maxPlayers}, CurrentPlayerCount: ${currentPlayerCount}`);
      
      if (currentPlayerCount >= maxPlayers) {
        console.log(`[Summon Bot] Battle already full! ${currentPlayerCount} >= ${maxPlayers}`);
        return res.status(400).json({ error: 'Battle is already full' });
      }

      // Auto-fill remaining slots with bots
      const botsNeeded = maxPlayers - currentPlayerCount;
      const botNames = ['BotMaster', 'RoboCasher', 'AlgoBot', 'DigitalGambit', 'CyberWin', 'AutoVault', 'TechLuck', 'ByteWinner', 'PixelPro', 'NeonBot'];

      console.log(`[CaseBattle Bot] Filling ${botsNeeded} bot slots to reach maxPlayers: ${maxPlayers}`);

      for (let botIndex = 0; botIndex < botsNeeded; botIndex++) {
        // Use nanoid for unique but non-crypto-random suffix (avoid Math.random)
        const botUsername = botNames[botIndex % botNames.length] + '_' + nanoid(6);

        // Generate bot's case details using same cases as creator
        let caseDetails = [];
        let totalCost = 0;
        let totalItemValue = 0;

        // Use caseIds if available, otherwise fall back to legacy caseId or create dummy cases
        const casesToUse = battle.caseIds && battle.caseIds.length > 0 
          ? battle.caseIds 
          : (battle.caseId ? [battle.caseId] : []);

        if (casesToUse.length > 0) {
          for (const caseId of casesToUse) {
            const customCase = await Case.findById(caseId).catch(() => null);
            if (customCase) {
              const caseCost = customCase.calculatedPrice;
              const drawn = drawFromCase(customCase);
              totalCost += caseCost;
              totalItemValue += drawn.value;
              
              caseDetails.push({
                caseId: customCase._id,
                caseName: customCase.name,
                casePrice: caseCost,
                drawnItem: drawn.item,
                drawnItemValue: drawn.value,
                items: customCase.items || [], // Include all case items for reel
              });
            }
          }
        }

        // If no cases found, use a default value (for old battles with no caseIds)
        if (totalCost === 0 || totalItemValue === 0) {
          console.log(`[CaseBattle Bot] No cases found, using default values for bot`);
          totalCost = 5000; // Default case cost
          totalItemValue = 3000; // Default item value
          caseDetails = [{
            caseId: null,
            caseName: 'Random Case',
            casePrice: totalCost,
            drawnItem: '🎁',
            drawnItemValue: totalItemValue,
          }];
        }

        // Generate bot ticket using existing battle's hybrid seed
        const botNonce = battle.players.length; // Use number of existing players as nonce
        const botTicket = generateTicketFromHybridSeed(battle.hybridSeed, botNonce);
        
        console.log(`[CaseBattle Summon Bot] Generated ticket ${botTicket} using hybrid seed (bot nonce: ${botNonce})`);
        
        // Determine bot's team based on mode
        let botTeam;
        if (battle.mode === 'group') {
          // All players in group mode are on team 1
          botTeam = 1;
        } else {
          // Balance bot teams: assign to team with fewer players
          let team1Count = battle.players.filter(p => p.team === 1).length;
          let team2Count = battle.players.filter(p => p.team === 2).length;
          botTeam = team1Count <= team2Count ? 1 : 2;
        }

        console.log(`[CaseBattle Bot ${botIndex + 1}] Team: ${botTeam}, ticket: ${botTicket} (using hybrid seed nonce ${botNonce})`);

        // Create bot player object
        const botPlayerObject = {
          userId: 'bot_' + nanoid(8),
          username: botUsername,
          team: botTeam,
          status: 'ready',
          caseValue: totalCost,
          cases: caseDetails.map(c => ({
            caseId: c.caseId,
            caseName: c.caseName,
            price: c.casePrice,
            drawnItem: c.drawnItem,
            itemValue: c.drawnItemValue,
          })),
          totalCaseValue: totalCost,
          totalItemValue: totalItemValue,
          randomOrgSeed: battle.randomOrgSeed,
          eosBlockHash: battle.eosBlockHash,
          hybridSeed: battle.hybridSeed,
          ticket: botTicket,
          isBot: true,
        };

        // Add bot to players array
        battle.players.push(botPlayerObject);
      }

      // Update legacy fields for backward compatibility (1v1)
      const botData = battle.players.find(p => p.isBot);
      if (botData) {
        battle.player2Id = botData.userId;
        battle.player2Username = botData.username;
        battle.player2CaseValue = botData.totalCaseValue;
        battle.player2CaseItem = botData.cases.map(c => c.drawnItem).join(', ');
        battle.player2ItemValue = botData.totalItemValue;
        battle.player2Seed = botData.seed;
        battle.player2Ticket = botData.ticket;
        battle.player2IsBot = true;
      }

      // Calculate pot from all players
      battle.pot = battle.players.reduce((sum, p) => sum + p.totalItemValue, 0);
      battle.status = 'active';
      battle.updatedAt = new Date();
      await battle.save();
      
      // Emit real-time event for battle update
      io.emit('battle:updated', { battle });

      console.log(`[CaseBattle Bot] Battle now has ${battle.players.length} players (${maxPlayers} max), status: active`);

      io.emit('caseBattleJoined', { battle });
      res.json({ success: true, battle });
    } catch (err) {
      console.error('Error summoning bot:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/case-battles/:battleId/open', auth, async (req, res) => {
    try {
      const userId = req.userId;
      const { battleId } = req.params;
      const battle = await CaseBattle.findOne({ id: battleId });
      if (!battle) return res.status(404).json({ error: 'Battle not found' });
      if (battle.status === 'ended') return res.status(400).json({ error: 'Battle already ended' });
      if (battle.status !== 'active') return res.status(400).json({ error: 'Battle not active' });

      console.log(`[/open] Battle ${battleId}: player1Ready=${battle.player1Ready}, player2Ready=${battle.player2Ready}, isBot=${battle.player2IsBot}`);

      if (battle.player1Id === userId) {
        battle.player1Ready = true;
        console.log(`[/open] Player 1 marked ready`);
      }
      else if (battle.player2Id === userId && !battle.player2IsBot) {
        battle.player2Ready = true;
        console.log(`[/open] Player 2 marked ready`);
      }
      else if (!battle.player2IsBot) {
        console.log(`[/open] User ${userId} is not a participant`);
        return res.status(403).json({ error: 'Not a participant' });
      }

      // If bot battle, auto-mark bot as ready
      if (battle.player2IsBot) {
        battle.player2Ready = true;
        console.log(`[/open] Bot marked ready`);
      }

      // If both ready, auto-open battle
      console.log(`[/open] Checking ready state: p1=${battle.player1Ready}, p2=${battle.player2Ready}`);
      if (battle.player1Ready && battle.player2Ready) {
        battle.status = 'opened';
        console.log(`[/open] Both ready! Status set to 'opened'`);
        // Note: Do NOT auto-settle here. Let the frontend call /settle after the animation.
      }

      await battle.save();
      
      // Emit real-time event for battle opened/updated
      io.emit('battle:updated', { battle });
      io.emit('caseBattleOpened', { battle });
      
      res.json({ success: true, battle });
    } catch (err) {
      console.error('Error opening case battle:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/case-battles/:battleId/settle', async (req, res) => {
    try {
      const { battleId } = req.params;
      const { tiebreakWinner } = req.body; // Optional: team number (1 or 2) from tiebreaker RPS
      console.log(`[CaseBattle Settle] POST received - battleId: ${battleId}, tiebreakWinner in body:`, tiebreakWinner, 'full body:', JSON.stringify(req.body));
      const battle = await CaseBattle.findOne({ id: battleId });
      if (!battle) return res.status(404).json({ error: 'Battle not found' });
      // Allow settling if status is 'active' or 'opened' - not if already 'ended'
      if (battle.status === 'ended') return res.status(400).json({ error: 'Battle already settled' });
      if (battle.status !== 'active' && battle.status !== 'opened') return res.status(400).json({ error: 'Battle not ready to settle' });

      console.log(`[CaseBattle Settle] Starting settlement for battle ${battleId}`);
      console.log(`[CaseBattle Settle] Players:`, battle.players.length, `Pot: $${(battle.pot).toFixed(2)}`, `Threshold: $${(SETTLEMENT_THRESHOLD).toFixed(2)}`);

      // Use stored seeds and tickets for provably fair result
      if (!battle.caseItemsData || battle.caseItemsData.length === 0) {
        console.error(`[CaseBattle Settle] ERROR: No caseItemsData found for battle ${battleId}`);
        return res.status(400).json({ error: 'Battle data incomplete' });
      }

      const ticketRanges = rngTicketRanges(battle.caseItemsData);
      console.log(`[CaseBattle Settle] Ticket ranges:`, ticketRanges);
      
      // Calculate results for all players
      const playerResults = battle.players.map(player => {
        if (!player.ticket) {
          console.error(`[CaseBattle Settle] ERROR: Player ${player.username} has no ticket`);
          return null;
        }
        const result = rngWinningItem(player.ticket, ticketRanges);
        const itemValue = result.value || 0;
        console.log(`  ${player.username} - Ticket: ${player.ticket}, Won: ${result.item} (value: $${(itemValue).toFixed(2)})`);
        return {
          playerId: player.userId,
          username: player.username,
          team: player.team,
          itemValue: itemValue,
          itemName: result.item,
        };
      }).filter(Boolean);

      if (playerResults.length === 0) {
        console.error(`[CaseBattle Settle] ERROR: No valid player results`);
        return res.status(400).json({ error: 'Failed to calculate results' });
      }

      // Determine winner(s) by team
      let teamATotal = 0, teamBTotal = 0;
      playerResults.forEach(p => {
        if (p.team === 1) teamATotal += p.itemValue;
        else teamBTotal += p.itemValue;
      });

      console.log(`  Team A total: $${(teamATotal).toFixed(2)}, Team B total: $${(teamBTotal).toFixed(2)}`);

      // Winners are the team with highest total, OR use tiebreaker if provided
      let winnerTeam = teamATotal > teamBTotal ? 1 : (teamBTotal > teamATotal ? 2 : null);
      
      // If there's a tie and tiebreaker was provided, use it
      if (winnerTeam === null && tiebreakWinner) {
        console.log(`[CaseBattle Settle] Tie detected, using tiebreaker winner: Team ${tiebreakWinner}`);
        winnerTeam = tiebreakWinner;
      }
      
      const winners = winnerTeam ? playerResults.filter(p => p.team === winnerTeam).map(p => p.playerId) : [];

      console.log(`[CaseBattle Settle] Winners (${winners.length}):`, winners);

      // Calculate actual pot from player results
      const actualPot = playerResults.reduce((sum, p) => sum + p.itemValue, 0);
      battle.pot = actualPot;
      battle.winners = winners;
      battle.teamATotal = teamATotal;
      battle.teamBTotal = teamBTotal;
      battle.status = 'ended';
      battle.endedAt = new Date();
      battle.updatedAt = new Date();

      // Distribute pot to winners (split evenly)
      if (winners.length > 0) {
        // Use precise division, don't truncate
        const winningsPerWinner = actualPot / winners.length;
        console.log(`[CaseBattle Settle] Distributing pot of $${(actualPot).toFixed(2)} to ${winners.length} winner(s), each gets $${(winningsPerWinner).toFixed(2)}`);
        
        for (const winnerId of winners) {
          // Skip bots - only award real players
          if (winnerId.startsWith('bot_')) {
            console.log(`[CaseBattle Settle] Bot ${winnerId} won but winnings are visual only`);
            continue;
          }
          
          const winnerUser = await User.findById(winnerId).catch(() => null);
          if (winnerUser) {
            winnerUser.balance += winningsPerWinner;
            await winnerUser.save();
            await Ledger.create({
              userId: winnerId,
              description: `Case Battle won (pot: $${(actualPot).toFixed(2)})`,
              amount: winningsPerWinner,
              type: 'case-battle-win',
              reference: battle._id,
            });
            console.log(`[CaseBattle Settle] Winner ${winnerUser.username} awarded $${(winningsPerWinner).toFixed(2)}`);
          }
        }
      }

      console.log(`[CaseBattle Settle] Battle settled successfully, status: ended`);
      await battle.save();
      
      // Emit real-time events for battle end
      io.emit('battle:ended', { battle });
      io.emit('caseBattleEnded', { battle });
      
      res.json({ success: true, battle });
    } catch (err) {
      console.error('Error settling case battle:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/case-battles', async (req, res) => {
    try {
      // Show only waiting/active battles that were created in the last 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const battles = await CaseBattle.find({ 
        status: { $in: ['waiting', 'active'] },
        createdAt: { $gte: thirtyMinutesAgo }
      }).sort({ createdAt: -1 });
      res.json({ battles });
    } catch (err) {
      console.error('Error fetching battles:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/case-battles/:battleId', async (req, res) => {
    try {
      const { battleId } = req.params;
      const battle = await CaseBattle.findOne({ id: battleId });
      if (!battle) return res.status(404).json({ error: 'Battle not found' });
      
      // Debug: log if caseItemsData has images
      if (battle.caseItemsData && battle.caseItemsData.length > 0) {
        console.log(`[Battle ${battleId}] First item has image: ${!!battle.caseItemsData[0].image}, length: ${battle.caseItemsData[0].image?.length || 0}`);
      }
      
      res.json({ battle });
    } catch (err) {
      console.error('Error fetching battle:', err);
      res.status(500).json({ error: err.message });
    }
  });
}
