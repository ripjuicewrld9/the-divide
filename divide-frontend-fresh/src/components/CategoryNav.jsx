import React from 'react';
import '../styles/CategoryNav.css';

const categories = [
  { name: 'All', icon: '🌐', color: '#00aaff' },
  { name: 'Politics', icon: '🏛️', color: '#ff0044' },
  { name: 'Sports', icon: '⚽', color: '#00ff88' },
  { name: 'Crypto', icon: '₿', color: '#f7931a' },
  { name: 'Entertainment', icon: '🎬', color: '#ff44aa' },
  { name: 'Science', icon: '🔬', color: '#44aaff' },
  { name: 'Business', icon: '💼', color: '#ffaa00' },
  { name: 'Other', icon: '❓', color: '#888888' }
];

export default function CategoryNav({ activeCategory, onCategoryChange }) {
  return (
    <div className="category-nav">
      <div className="category-nav-scroll">
        {categories.map((cat) => (
          <button
            key={cat.name}
            className={`category-pill ${activeCategory === cat.name ? 'active' : ''}`}
            onClick={() => onCategoryChange(cat.name)}
            style={{
              '--category-color': cat.color,
              borderColor: activeCategory === cat.name ? cat.color : 'rgba(255, 255, 255, 0.1)',
              boxShadow: activeCategory === cat.name 
                ? `0 0 20px ${cat.color}40, inset 0 0 20px ${cat.color}20` 
                : 'none'
            }}
          >
            <span className="category-icon">{cat.icon}</span>
            <span className="category-name">{cat.name}</span>
            {activeCategory === cat.name && (
              <div 
                className="category-active-indicator"
                style={{ backgroundColor: cat.color }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
