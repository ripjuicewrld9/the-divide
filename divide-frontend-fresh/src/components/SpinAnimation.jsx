import React, { useState, useEffect, useCallback } from 'react';
import './SpinAnimation.css';

/**
 * SpinAnimation Component
 * 
 * Displays a scrolling reel of item names that spins and lands on the winning item.
 * Automatically triggers after a battle countdown completes.
 */
export default function SpinAnimation({ items, winningIndex, onSpinComplete, autoStart = false }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayItems, setDisplayItems] = useState([]);

  useEffect(() => {
    if (items && items.length > 0) {
      // Create a padded list for infinite scroll effect
      // Prepend and append items for seamless looping
      const padded = [...items, ...items, ...items];
      setDisplayItems(padded);
    }
  }, [items]);

  const startSpin = useCallback(() => {
    if (isSpinning || displayItems.length === 0) return;
    
    setIsSpinning(true);
    
    // 3-second spin with deceleration
    setTimeout(() => {
      setIsSpinning(false);
      if (onSpinComplete) {
        onSpinComplete();
      }
    }, 3000);
  }, [isSpinning, displayItems.length, onSpinComplete]);

  useEffect(() => {
    if (autoStart && !isSpinning && displayItems.length > 0) {
      startSpin();
    }
  }, [autoStart, isSpinning, displayItems.length, startSpin]);

  return (
    <div className="spin-animation-container">
      <div className="spin-wrapper">
        {/* Overlay gradient for visual effect */}
        <div className="spin-overlay-top"></div>
        
        {/* The spinning reel */}
        <div
          className={`spin-reel ${isSpinning ? 'spinning' : ''}`}
          style={{
            transform: isSpinning
              ? `translateY(-${(items.length * 2 + winningIndex) * 80}px)`
              : `translateY(-${items.length * 80}px)`,
          }}
        >
          {displayItems.map((item, idx) => (
            <div key={idx} className="spin-item">
              <div className="spin-item-content">
                <div className="spin-item-emoji">
                  {item.rarity === 'common' && '🎲'}
                  {item.rarity === 'uncommon' && '⭐'}
                  {item.rarity === 'rare' && '💎'}
                  {item.rarity === 'epic' && '👑'}
                  {item.rarity === 'legendary' && '🔥'}
                </div>
                <div className="spin-item-name">{item.name}</div>
                <div className="spin-item-value">${(item.value / 100).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Center indicator - where the item lands */}
        <div className="spin-indicator"></div>
        
        <div className="spin-overlay-bottom"></div>
      </div>

      {/* Spin Button */}
      {!isSpinning && displayItems.length > 0 && (
        <button onClick={startSpin} className="spin-button">
          🎲 START SPIN
        </button>
      )}

      {isSpinning && (
        <div className="spin-status">
          ⏳ Spinning...
        </div>
      )}
    </div>
  );
}
