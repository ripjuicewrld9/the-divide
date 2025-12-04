import React from 'react';

const categories = [
  { name: 'All', icon: '🌐' },
  { name: 'Politics', icon: '🏛️' },
  { name: 'Sports', icon: '⚽' },
  { name: 'Crypto', icon: '₿' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Science', icon: '🔬' },
  { name: 'Business', icon: '💼' },
  { name: 'Other', icon: '❓' }
];

export default function CategoryNav({ activeCategory, onCategoryChange }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '12px 16px',
      marginBottom: '16px',
      borderBottom: '1px solid #1a1a1a',
    }}>
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        maxWidth: '100%',
        paddingBottom: '4px',
      }}>
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => onCategoryChange(cat.name)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: `1px solid ${activeCategory === cat.name ? '#6b1c1c' : '#1a1a1a'}`,
              background: activeCategory === cat.name ? 'rgba(107, 28, 28, 0.15)' : '#111',
              color: activeCategory === cat.name ? '#a33' : '#666',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '13px' }}>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
