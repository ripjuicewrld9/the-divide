import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import { createSeededRng, shuffleSeeded, pickSeeded } from '../utils/seededRng';

const ITEMS = [
  { emoji: '🔫', name: 'Weapon', value: 100 },
  { emoji: '🎮', name: 'Controller', value: 150 },
  { emoji: '💎', name: 'Diamond', value: 500 },
  { emoji: '💰', name: 'Money', value: 600 },
  { emoji: '🎯', name: 'Target', value: 350 },
  { emoji: '🔥', name: 'Fire', value: 450 },
  { emoji: '⚡', name: 'Lightning', value: 380 },
  { emoji: '🏆', name: 'Trophy', value: 700 },
  { emoji: '👑', name: 'Crown', value: 550 },
  { emoji: '🌟', name: 'Star', value: 400 },
];

// Web Audio API for sounds
const createAudioContext = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  const playTone = (frequency, duration, volume = 0.3) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };
  
  return { audioContext, playTone };
};

const soundManager = createAudioContext();

export default function CaseBattleArenaReel({ battleData, onBattleComplete }) {
  const containerRef = useRef(null);
  const gameStateRef = useRef({
    phase: 'waiting', // waiting | revealing | complete
    players: [],
    currentlyRevealing: null,
    teamATotals: 0,
    teamBTotals: 0,
    maxPlayers: 0,
  });

  // Initialize socket for real-time updates
  const socket = useSocket(battleData?.id);

  useEffect(() => {
    if (!battleData || !containerRef.current) return;

    // Calculate max players needed for this battle
    const maxPlayersNeeded = battleData.mode === 'group' 
      ? battleData.teamSize 
      : battleData.teamSize * 2;

    // Initialize players from battleData
    const avatars = ['👤', '🎮', '💻', '🔥', '⚡', '💎'];
    const seedBase = battleData.hybridSeed || '';
    const existingPlayers = battleData.players.map((p, idx) => {
      let team = 'A';
      if (battleData.mode === 'group') {
        team = 'A';
      } else {
        team = idx < battleData.teamSize ? 'A' : 'B';
      }
      
      const rng = createSeededRng(seedBase, idx);
      const rarityIndex = Math.floor(rng() * 5);
      return {
        id: p.userId || `p${idx}`,
        name: p.username || `Player ${idx + 1}`,
        value: p.totalItemValue || 0,
        team,
        avatar: avatars[idx % avatars.length],
        userId: p.userId,
        isBot: p.isBot || false,
        rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary'][rarityIndex],
      };
    });

    // Create empty slots for unfilled positions
    const players = [...existingPlayers];
    while (players.length < maxPlayersNeeded) {
      const idx = players.length;
      const team = battleData.mode === 'group' ? 'A' : (idx < battleData.teamSize ? 'A' : 'B');
      
      players.push({
        id: `empty-${idx}`,
        name: 'Empty Slot',
        value: 0,
        team,
        avatar: '❓',
        userId: null,
        isBot: false,
        rarity: 'common',
      });
    }

    gameStateRef.current.players = players;
    gameStateRef.current.maxPlayers = maxPlayersNeeded;

    // Render initial UI
    renderArena();

    // Clean up socket listeners on unmount
    return () => {
      if (socket) {
        socket.off('voteUpdate');
        socket.off('newDivide');
        socket.off('divideEnded');
      }
    };
  }, [battleData, socket]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderArena = () => {
    if (!containerRef.current) return;

    const { players } = gameStateRef.current;
    
    // Split teams
    const teamA = players.filter(p => p.team === 'A');
    const teamB = players.filter(p => p.team === 'B');

    containerRef.current.innerHTML = `
      <style>
        .arena-wrapper {
          background: #0f0f12;
          min-height: 100vh;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .arena-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .arena-header h2 {
          font-size: 28px;
          font-weight: 900;
          background: linear-gradient(135deg, #00ffff, #ffd700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 12px;
        }

        .teams-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .team-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .team-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #1a1a1d;
          border-radius: 8px;
          border-left: 4px solid #00ffff;
        }

        .team-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: #00ffff;
        }

        .team-total {
          font-size: 20px;
          font-weight: 700;
          color: #ffd700;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }

        .player-card {
          background: #1a1a1d;
          border: 1px solid #2a2a2f;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          min-height: 260px;
          position: relative;
          overflow: hidden;
        }

        .player-card:hover {
          transform: translateY(-4px);
          border-color: #00ffff;
          box-shadow: 0 10px 40px rgba(0, 255, 255, 0.2);
        }

        .player-card[data-empty="true"] {
          opacity: 0.6;
          border-color: #444;
          background: #0f0f12;
        }

        .player-card[data-empty="true"]:hover {
          opacity: 1;
          border-color: #00ffff;
          box-shadow: 0 10px 40px rgba(0, 255, 255, 0.2);
        }

        .player-card.revealing {
          animation: pulse 0.6s ease-out;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }

        .player-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .player-avatar {
          font-size: 32px;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 255, 255, 0.1);
          border-radius: 50%;
          border: 1px solid #00ffff;
        }

        .player-info h4 {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .player-info p {
          font-size: 11px;
          color: #888;
          margin: 2px 0 0 0;
        }

        .case-reel-container {
          width: 100%;
          height: 120px;
          background: #0f0f12;
          border: 2px solid #2a2a2f;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .case-reel-container::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent);
          pointer-events: none;
        }

        .reel-items {
          display: flex;
          flex-direction: column;
          position: relative;
          width: 100%;
          height: 120px;
        }

        .reel-item {
          width: 100%;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(42, 42, 47, 0.3);
        }

        .player-value {
          text-align: center;
          padding: 8px;
          background: rgba(255, 215, 0, 0.1);
          border-radius: 6px;
          border: 1px solid rgba(255, 215, 0, 0.3);
          font-size: 18px;
          font-weight: 700;
          color: #ffd700;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
        }

        .btn-summon {
          width: 100%;
          padding: 10px;
          background: linear-gradient(135deg, #00ffff, #8a2be2);
          color: #000;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
        }

        .btn-summon:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(0, 255, 255, 0.6);
        }

        .btn-summon:disabled {
          background: #2a2a2f;
          color: #888;
          cursor: not-allowed;
          box-shadow: none;
          opacity: 0.6;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          padding: 24px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #00ffff, #8a2be2);
          color: #000;
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 40px rgba(0, 255, 255, 0.6);
        }

        .winner-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .winner-overlay.active {
          display: flex;
          opacity: 1;
        }

        .winner-content {
          text-align: center;
          font-size: 72px;
          font-weight: 900;
          color: #ffd700;
          text-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
          animation: winner-pop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes winner-pop {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>

      <div class="arena-header">
        <h2>⚔️ BATTLE ARENA</h2>
        <p style="color: #888; margin: 0; font-size: 12px;">Mode: ${battleData.mode || 'normal'} | Team Size: ${battleData.teamSize || 1}</p>
      </div>

      <div class="teams-container">
        <div class="team-section">
          <div class="team-header">
            <h3>👥 TEAM A</h3>
            <div class="team-total" id="teamA-total">$0</div>
          </div>
          <div id="teamA-players"></div>
        </div>

        <div class="team-section">
          <div class="team-header">
            <h3>👥 TEAM B</h3>
            <div class="team-total" id="teamB-total">$0</div>
          </div>
          <div id="teamB-players"></div>
        </div>
      </div>

      <div class="winner-overlay" id="winner-overlay">
        <div class="winner-content" id="winner-text">TEAM A WINS!</div>
      </div>

      <canvas id="confetti-canvas" style="position: fixed; top: 0; left: 0; z-index: 999;"></canvas>
    `;

    // Render teams
    renderTeam(teamA, 'A');
    renderTeam(teamB, 'B');

    // Attach event listeners for summon buttons
    gameStateRef.current.players.forEach(p => {
      const btn = document.getElementById(`btn-${p.id}`);
      if (btn) {
        btn.addEventListener('click', () => handleSummonForCard(p.id));
      }
    });

    updateTeamTotals();
  };

  const handleSummonForCard = async (playerId) => {
    const btn = document.getElementById(`btn-${playerId}`);
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    btn.textContent = '⏳ FILLING...';

    try {
      // Call backend to summon bot
      const res = await api.post(`/case-battles/${battleData.id}/summon-bot`, {});
      
      if (res.success && res.battle) {
        // Update the empty slot with the new bot data
        const newBot = res.battle.players[res.battle.players.length - 1];
        const slotIndex = gameStateRef.current.players.findIndex(p => p.id === playerId);
        
        if (slotIndex !== -1) {
          gameStateRef.current.players[slotIndex] = {
            id: newBot.userId || `p${slotIndex}`,
            name: newBot.username || `Bot ${slotIndex + 1}`,
            value: newBot.totalItemValue || 0,
            team: gameStateRef.current.players[slotIndex].team,
            avatar: '🤖',
            userId: newBot.userId,
            isBot: true,
            rarity: gameStateRef.current.players[slotIndex].rarity,
          };
        }
        
        // Re-render the team to show updated slots
        const teamLetter = gameStateRef.current.players[slotIndex]?.team;
        if (teamLetter) {
          const team = gameStateRef.current.players.filter(p => p.team === teamLetter);
          renderTeam(team, teamLetter);
        }
        
        // Check if battle is now full
        const playerCount = res.battle.players.length;
        const maxPlayers = gameStateRef.current.maxPlayers;
        
        if (playerCount >= maxPlayers) {
          // All slots filled, auto-start battle
          setTimeout(() => startBattle(), 1000);
        }
      } else {
        btn.disabled = false;
        btn.textContent = '🤖 SUMMON';
      }
    } catch (err) {
      console.error('Error summoning bot:', err);
      btn.disabled = false;
      btn.textContent = '🤖 SUMMON';
    }
  };

  const renderTeam = (team, teamLetter) => {
    const container = document.getElementById(`team${teamLetter}-players`);
    if (!container) return;

    container.innerHTML = team.map(p => {
      const isEmpty = p.id.startsWith('empty-');
      const buttonText = isEmpty ? '🤖 SUMMON' : (p.isBot ? '✓ BOT' : '✓ PLAYER');
      const buttonDisabled = !isEmpty;
      
      return `
        <div class="player-card" id="card-${p.id}" data-rarity="${p.rarity}" ${isEmpty ? 'data-empty="true"' : ''}>
          <div class="player-header">
            <div class="player-avatar">${p.avatar}</div>
            <div class="player-info">
              <h4>${p.name}${p.isBot ? ' 🤖' : ''}</h4>
              <p>#${p.id}</p>
            </div>
          </div>
          <div class="case-reel-container">
            <div class="reel-items" id="reel-items-${p.id}"></div>
          </div>
          <div class="player-value" id="value-${p.id}">$0</div>
          <button class="btn-summon" id="btn-${p.id}" data-player-id="${p.id}" ${buttonDisabled ? 'disabled' : ''}>${buttonText}</button>
        </div>
      `;
    }).join('');
  };

  const revealPlayerCard = async (playerId) => {
    const player = gameStateRef.current.players.find(p => p.id === playerId);
    if (!player || gameStateRef.current.currentlyRevealing) return;

    gameStateRef.current.currentlyRevealing = playerId;
    const card = document.getElementById(`card-${playerId}`);
    const reelContainer = document.getElementById(`reel-items-${playerId}`);
    const valueEl = document.getElementById(`value-${playerId}`);

    if (!reelContainer || !valueEl) return;

    // Get player's actual cases from battleData
    const playerData = battleData.players.find(p => p.userId === player.userId);
    let playerCases = [];
    let winningItem = { emoji: '❓', value: 0 };
    
    if (playerData && playerData.cases && playerData.cases.length > 0) {
      playerCases = playerData.cases.map(c => ({
        emoji: '💼',
        name: c.caseName || 'Case',
        value: c.itemValue || 0,
        drawn: c.drawnItem || '?'
      }));
      
      // Use the first case's drawn item as the winning item
      const drawnCase = playerData.cases[0];
      winningItem = {
        emoji: drawnCase.drawnItem || '❓',
        name: drawnCase.caseName || 'Case',
        value: drawnCase.itemValue || 0
      };
    } else {
      // Fallback to deterministic seeded items if no case data
      const baseSeed = (battleData && (battleData.hybridSeed || battleData.id)) || '';
      for (let i = 0; i < 5; i++) {
        const rng = createSeededRng(baseSeed + '::fallback', i);
        playerCases.push(pickSeeded(ITEMS, rng));
      }
      winningItem = playerCases[0];
    }

    // Populate reel with repeating player cases (10 iterations for continuous loop)
    reelContainer.innerHTML = '';
    const reelItems = [];
    const itemsPerReel = 10;
    
    for (let i = 0; i < itemsPerReel; i++) {
      const itemsToShow = playerCases.length > 0 ? playerCases : [pickSeeded(ITEMS, createSeededRng((battleData && (battleData.hybridSeed || battleData.id)) || '', i))];
      itemsToShow.forEach(item => {
        reelItems.push(item);
        const itemEl = document.createElement('div');
        itemEl.className = 'reel-item';
        itemEl.textContent = item.emoji || '?';
        reelContainer.appendChild(itemEl);
      });
    }

    // Position the winning item near the end (scroll to 5 items from bottom)
    player.value = winningItem.value;

    // Spin sound
    soundManager.playTone(400, 0.1, 0.2);

    // Spin reel - scroll to show the winning item
    const itemHeight = 120;
    const winPosition = reelItems.length - 5;
    const finalPosition = -(winPosition * itemHeight);
    
    gsap.to(reelContainer, {
      y: finalPosition,
      duration: 3,
      ease: 'power2.inOut',
      onComplete: () => {
        // Lock sound
        soundManager.playTone(800, 0.1, 0.2);

        // Lock glow
        gsap.to(card, {
          boxShadow: '0 0 30px rgba(255, 215, 0, 0.8)',
          duration: 0.2,
          yoyo: true,
          repeat: 2,
        });

        // Reveal value
        valueEl.textContent = '$' + winningItem.value.toLocaleString();

        // Counter animation
        const counter = { value: 0 };
        gsap.to(counter, {
          value: winningItem.value,
          duration: 0.8,
          ease: 'power2.out',
          onUpdate: () => {
            valueEl.textContent = '$' + Math.round(counter.value).toLocaleString();
          },
        });

        // Ding sound
        soundManager.playTone(1200, 0.15, 0.2);

        // Card glow
        gsap.to(card, {
          boxShadow: '0 10px 40px rgba(0, 255, 255, 0.6)',
          duration: 0.4,
          yoyo: true,
          repeat: 1,
        });

        gameStateRef.current.currentlyRevealing = null;
        updateTeamTotals();
      },
    });
  };

  const updateTeamTotals = () => {
    const { players } = gameStateRef.current;
    const teamATotal = players.filter(p => p.team === 'A').reduce((sum, p) => sum + p.value, 0);
    const teamBTotal = players.filter(p => p.team === 'B').reduce((sum, p) => sum + p.value, 0);

    gameStateRef.current.teamATotals = teamATotal;
    gameStateRef.current.teamBTotals = teamBTotal;

    const teamAEl = document.getElementById('teamA-total');
    const teamBEl = document.getElementById('teamB-total');
    if (teamAEl) teamAEl.textContent = '$' + teamATotal.toLocaleString();
    if (teamBEl) teamBEl.textContent = '$' + teamBTotal.toLocaleString();
  };

  const startBattle = async () => {
    gameStateRef.current.phase = 'revealing';
    
    // Create array of all reveal promises
    const revealPromises = gameStateRef.current.players.map(player => 
      new Promise(resolve => {
        revealPlayerCard(player.id);
        setTimeout(resolve, 3500); // Wait for spin to complete
      })
    );
    
    // Wait for all reveals to complete simultaneously
    await Promise.all(revealPromises);

    // Determine winner
    setTimeout(() => {
      const { teamATotals, teamBTotals } = gameStateRef.current;
      const winner = teamATotals > teamBTotals ? 'A' : teamBTotals > teamATotals ? 'B' : null;
      if (winner) {
        showWinner(winner);
      }
      if (onBattleComplete) {
        setTimeout(onBattleComplete, 2000);
      }
    }, 500);
  };

  const showWinner = (team) => {
    const overlay = document.getElementById('winner-overlay');
    const text = document.getElementById('winner-text');
    if (overlay && text) {
      text.textContent = `TEAM ${team} WINS! 🏆`;
      overlay.classList.add('active');

      // Screen shake
      gsap.to(document.body, {
        x: 10,
        duration: 0.05,
        repeat: 10,
        yoyo: true,
        ease: 'power2.out',
      });
    }
  };

  return <div ref={containerRef} style={{ width: '100%' }} />;
}
