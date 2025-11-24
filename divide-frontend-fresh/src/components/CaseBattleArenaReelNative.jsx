import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import api from '../services/api';
import { createSeededRng, pickSeeded } from '../utils/seededRng';
import '../styles/CaseBattleArenaReel.css';

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

// Single Player Card Component
function PlayerCard({ player, battleId, onSummon, onReveal }) {
  const isEmpty = player.id.startsWith('empty-');
  const [value, setValue] = useState(0);
  const [buttonState, setButtonState] = useState('SUMMON');
  const [isRevealing, setIsRevealing] = useState(false);
  const cardRef = useRef(null);
  const reelRef = useRef(null);

  const handleSummon = async () => {
    if (buttonState !== 'SUMMON') return;
    
    setButtonState('FILLING');
    try {
      const res = await api.post(`/case-battles/${battleId}/summon-bot`, {});
      if (res.success) {
        setButtonState('FILLED');
        onSummon?.();
      } else {
        setButtonState('SUMMON');
      }
    } catch (err) {
      console.error('Error summoning bot:', err);
      setButtonState('SUMMON');
    }
  };

  const revealCard = async () => {
    if (isRevealing || isEmpty) return;
    setIsRevealing(true);

    const playerCases = player.cases || [];
    let winningItem = { emoji: '❓', value: 0 };
    
    if (playerCases.length > 0) {
      const drawnCase = playerCases[0];
      winningItem = {
        emoji: drawnCase.drawnItem || '❓',
        value: drawnCase.itemValue || 0,
      };
    }

    soundManager.playTone(400, 0.1, 0.2);

    if (reelRef.current) {
      reelRef.current.innerHTML = '';
      
      const itemsToDisplay = playerCases.length > 0 
        ? playerCases.map(c => ({ emoji: c.drawnItem || '?', value: c.itemValue || 0 }))
        : [pickSeeded(ITEMS, createSeededRng(battleId || (player.id || ''), 0))];

      for (let i = 0; i < 10; i++) {
        itemsToDisplay.forEach(item => {
          const itemEl = document.createElement('div');
          itemEl.className = 'reel-item';
          itemEl.textContent = item.emoji;
          reelRef.current.appendChild(itemEl);
        });
      }

      const reelItems = Array.from(reelRef.current.children);
      const winPosition = reelItems.length - 5;
      const finalPosition = -(winPosition * 120);

      gsap.to(reelRef.current, {
        y: finalPosition,
        duration: 3,
        ease: 'power2.inOut',
        onComplete: () => {
          soundManager.playTone(800, 0.1, 0.2);
          setValue(winningItem.value);
          
          gsap.to(cardRef.current, {
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.8)',
            duration: 0.2,
            yoyo: true,
            repeat: 2,
          });

          soundManager.playTone(1200, 0.15, 0.2);
          
          gsap.to(cardRef.current, {
            boxShadow: '0 10px 40px rgba(0, 255, 255, 0.6)',
            duration: 0.4,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
              setIsRevealing(false);
              onReveal?.({ playerId: player.id, value: winningItem.value });
            },
          });
        },
      });
    }
  };

  return (
    <div 
      className={`player-card ${isEmpty ? 'player-card-empty' : ''}`}
      ref={cardRef}
      data-rarity={player.rarity}
    >
      <div className="player-header">
        <div className="player-avatar">{player.avatar}</div>
        <div className="player-info">
          <h4>{player.name}{player.isBot ? ' 🤖' : ''}</h4>
          <p>#{player.id}</p>
        </div>
      </div>

      <div className="case-reel-container">
        <div className="reel-items" ref={reelRef} id={`reel-items-${player.id}`}></div>
      </div>

      <div className="player-value" id={`value-${player.id}`}>
        ${value.toLocaleString()}
      </div>

      {isEmpty ? (
        <button
          className="btn-summon"
          onClick={handleSummon}
          disabled={buttonState !== 'SUMMON'}
        >
          {buttonState === 'SUMMON' && '🤖 SUMMON'}
          {buttonState === 'FILLING' && '⏳ FILLING...'}
          {buttonState === 'FILLED' && '✓ FILLED'}
        </button>
      ) : (
        <button className="btn-summon" disabled onClick={revealCard}>
          {player.isBot ? '✓ BOT' : '✓ PLAYER'}
        </button>
      )}
    </div>
  );
}

// Team Section Component
function TeamSection({ team, teamLetter, maxPlayers, battleId, onSummon, onReveal }) {
  const teamTotal = team.reduce((sum, p) => sum + (p.value || 0), 0);

  return (
    <div className="team-section">
      <div className="team-header">
        <h3>👥 TEAM {teamLetter}</h3>
        <div className="team-total">${teamTotal.toLocaleString()}</div>
      </div>
      <div className="team-players">
        {team.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            maxPlayers={maxPlayers}
            battleId={battleId}
            onSummon={onSummon}
            onReveal={onReveal}
          />
        ))}
      </div>
    </div>
  );
}

// Main Arena Component
export default function CaseBattleArenaReelNative({ battleData, onBattleComplete }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!battleData) return;

    const maxPlayersNeeded = battleData.mode === 'group' 
      ? battleData.teamSize 
      : battleData.teamSize * 2;

    const avatars = ['👤', '🎮', '💻', '🔥', '⚡', '💎'];
    
    const seedBase = battleData.hybridSeed || '';
    const existingPlayers = battleData.players.map((p, idx) => {
      const team = battleData.mode === 'group' 
        ? 'A' 
        : (idx < battleData.teamSize ? 'A' : 'B');

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
        cases: p.cases || [],
      };
    });

    const allPlayers = [...existingPlayers];
    while (allPlayers.length < maxPlayersNeeded) {
      const idx = allPlayers.length;
      const team = battleData.mode === 'group' ? 'A' : (idx < battleData.teamSize ? 'A' : 'B');
      
      allPlayers.push({
        id: `empty-${idx}`,
        name: 'Empty Slot',
        value: 0,
        team,
        avatar: '❓',
        userId: null,
        isBot: false,
        rarity: 'common',
        cases: [],
      });
    }

    setPlayers(allPlayers);
  }, [battleData]);

  const handleReveal = ({ playerId, value }) => {
    setPlayers(prev => 
      prev.map(p => p.id === playerId ? { ...p, value } : p)
    );
  };

  const teamA = players.filter(p => p.team === 'A');
  const teamB = players.filter(p => p.team === 'B');

  const handleSummon = () => {
    const filledCount = players.filter(p => !p.id.startsWith('empty-')).length;
    if (filledCount >= players.length) {
      startBattle();
    }
  };

  const startBattle = async () => {
    // Trigger all reveals simultaneously
    // This would call reveal methods on all PlayerCard refs
    setTimeout(() => {
      onBattleComplete?.();
    }, 5000);
  };

  return (
    <div className="arena-wrapper">
      <div className="arena-header">
        <h2>⚔️ BATTLE ARENA</h2>
        <p>Mode: {battleData?.mode || 'normal'} | Team Size: {battleData?.teamSize || 1}</p>
      </div>

      <div className="teams-container">
        <TeamSection
          team={teamA}
          teamLetter="A"
          maxPlayers={players.length}
          battleId={battleData?.id}
          onSummon={handleSummon}
          onReveal={handleReveal}
        />
        <TeamSection
          team={teamB}
          teamLetter="B"
          maxPlayers={players.length}
          battleId={battleData?.id}
          onSummon={handleSummon}
          onReveal={handleReveal}
        />
      </div>
    </div>
  );
}
