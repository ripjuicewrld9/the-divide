import React from 'react';
import '../../styles/rarities.css';

export default function ItemCard({ item, chance, onHover }) {
  if (!item) return null;

  const rarity = item.rarity || 'common';
  const value = item.value || 0;
  const displayValue = (value / 100).toFixed(2);
  const displayChance = typeof chance === 'number' ? chance : (item.chance || 0);

  const rarityLabels = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
  };

  return (
    <div
      className={`item-card rarity-${rarity}`}
      onMouseEnter={() => onHover?.(item)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Item Icon/Emoji */}
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>
        {rarity === 'common' && '🎲'}
        {rarity === 'uncommon' && '⭐'}
        {rarity === 'rare' && '💎'}
        {rarity === 'epic' && '👑'}
        {rarity === 'legendary' && '🔥'}
      </div>

      {/* Item Name */}
      <div className="item-name">{item.name}</div>

      {/* Item Value */}
      <div className="item-value">${displayValue}</div>

      {/* Rarity Badge */}
      <div className="rarity-badge">{rarityLabels[rarity]}</div>

      {/* Probability (shown on hover) */}
      {displayChance > 0 && (
        <div className="item-probability">
          {displayChance.toFixed(1)}% chance
        </div>
      )}
    </div>
  );
}
