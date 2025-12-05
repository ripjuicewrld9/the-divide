// src/components/CategoryNav.jsx
// Premium minimalist category navigation

import React from 'react';

const categories = [
  { name: 'All', label: 'All' },
  { name: 'Politics', label: 'Politics' },
  { name: 'Sports', label: 'Sports' },
  { name: 'Crypto', label: 'Crypto' },
  { name: 'Entertainment', label: 'Entertainment' },
  { name: 'Science', label: 'Science' },
  { name: 'Business', label: 'Business' },
  { name: 'Other', label: 'Other' }
];

export default function CategoryNav({ activeCategory, onCategoryChange }) {
  return (
    <div style={{
      marginBottom: '24px',
    }}>
      {/* Horizontal scrolling pills */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {categories.map((cat) => {
          const isActive = activeCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => onCategoryChange(cat.name)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: isActive 
                  ? 'rgba(255,255,255,0.1)' 
                  : 'transparent',
                color: isActive 
                  ? 'rgba(255,255,255,0.9)' 
                  : 'rgba(255,255,255,0.4)',
                fontSize: '13px',
                fontWeight: isActive ? '600' : '500',
                letterSpacing: '-0.01em',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
      
      {/* Subtle divider */}
      <div style={{
        height: '1px',
        background: 'rgba(255,255,255,0.06)',
        marginTop: '8px',
      }} />
    </div>
  );
}
