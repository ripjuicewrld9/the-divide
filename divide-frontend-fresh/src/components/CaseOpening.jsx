import React, { useState, useEffect, useCallback } from 'react';
import './CaseOpening.css';
import '../styles/rarities.css';

export default function CaseOpening({ items, onComplete, autoSpin = false }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningItem, setWinningItem] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const rarityColors = {
    common: '#808080',
    uncommon: '#1eff00',
    rare: '#0070dd',
    epic: '#a335ee',
    legendary: '#ff8000',
  };

  // Select winner using percentage chances (not weights)
  const selectWinner = useCallback(() => {
    if (!items || items.length === 0) return null;
    
    const random = Math.random() * 100;
    let accumulatedChance = 0;
    
    for (let i = 0; i < items.length; i++) {
      accumulatedChance += (items[i].chance || 0);
      if (random <= accumulatedChance) {
        return i;
      }
    }
    
    return 0;
  }, [items]);

  const handleSpin = useCallback(() => {
    if (isSpinning || !items || items.length === 0) return;

    setIsSpinning(true);
    setWinningItem(null);

    const winnerIdx = selectWinner();
    setSelectedIndex(winnerIdx);

    // 3-second dramatic spin
    setTimeout(() => {
      setWinningItem(items[winnerIdx]);
      setIsSpinning(false);
      if (onComplete) {
        onComplete(items[winnerIdx]);
      }
    }, 3000);
  }, [isSpinning, items, selectWinner, onComplete]);

  useEffect(() => {
    if (autoSpin && !isSpinning && !winningItem && items && items.length > 0) {
      handleSpin();
    }
  }, [autoSpin, isSpinning, winningItem, items, handleSpin]);

  if (!items || items.length === 0) {
    return <div style={{ padding: '20px', color: '#e74c3c' }}>No items available</div>;
  }

  return (
    <div className="case-opening-container">
      {/* Dramatic Reel Section */}
      <div className="reel-wrapper">
        <div className="reel-container">
          <div
            className={`reel ${isSpinning ? 'spinning' : ''}`}
            style={{
              transform: isSpinning 
                ? 'translateY(-8000px)' 
                : `translateY(-${selectedIndex ? (selectedIndex + 2) * 100 : 0}px)`,
              transitionDuration: isSpinning ? '3s' : '0.3s',
            }}
          >
            {/* Triple items for seamless looping */}
            {[...items, ...items, ...items].map((item, idx) => (
              <div
                key={idx}
                className={`reel-item rarity-${item.rarity || 'common'}`}
                style={{ borderColor: rarityColors[item.rarity] || '#fff' }}
              >
                <div className="reel-item-emoji">
                  {item.rarity === 'common' && '🎲'}
                  {item.rarity === 'uncommon' && '⭐'}
                  {item.rarity === 'rare' && '💎'}
                  {item.rarity === 'mythic' && '👑'}
                  {item.rarity === 'legendary' && '🔥'}
                </div>
                <div className="reel-item-name">{item.name}</div>
                <div
                  className="reel-item-rarity"
                  style={{
                    backgroundColor: rarityColors[item.rarity] || '#fff',
                    color: item.rarity === 'uncommon' || item.rarity === 'legendary' ? '#000' : '#fff',
                  }}
                >
                  {item.rarity?.toUpperCase()}
                </div>
                <div className="reel-item-value">${(item.value || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Glow Indicator */}
        <div className="reel-indicator" />
      </div>

      {/* Result Display - Large and Dramatic */}
      {winningItem && !isSpinning && (
        <div className="result-display">
          <div className="result-label">🎉 YOU WIN! 🎉</div>
          <div className={`result-item rarity-${winningItem.rarity}`}>
            <div className="result-emoji">
              {winningItem.rarity === 'common' && '🎲'}
              {winningItem.rarity === 'uncommon' && '⭐'}
              {winningItem.rarity === 'rare' && '💎'}
              {winningItem.rarity === 'mythic' && '👑'}
              {winningItem.rarity === 'legendary' && '🔥'}
            </div>
            <div className="result-name">{winningItem.name}</div>
            <div
              className="result-rarity"
              style={{
                backgroundColor: rarityColors[winningItem.rarity],
                color: winningItem.rarity === 'uncommon' || winningItem.rarity === 'legendary' ? '#000' : '#fff',
              }}
            >
              {winningItem.rarity?.toUpperCase()}
            </div>
            <div className="result-value">${(winningItem.value).toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {!autoSpin && (
        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className={`spin-button ${isSpinning ? 'spinning' : ''}`}
        >
          {isSpinning ? '⏳ SPINNING...' : '🎰 OPEN CASE'}
        </button>
      )}
    </div>
  );
}
