/**
 * Global Theme Configuration
 * Matches Plinko design system
 */

export const theme = {
  // Backgrounds
  backgrounds: {
    primary: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0f0f1e 100%)',
    secondary: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(15, 15, 30, 0.8) 100%)',
  },

  // Colors
  colors: {
    cyan: '#00ffff',
    gold: '#ffd700',
    white: '#ffffff',
    slate300: '#cbd5e1',
    slate400: '#94a3b8',
    slate500: '#64748b',
  },

  // Borders
  borders: {
    cyanLight: 'rgba(0, 255, 255, 0.1)',
    cyanMedium: 'rgba(0, 255, 255, 0.2)',
    cyanDark: 'rgba(0, 255, 255, 0.3)',
  },

  // Common gradients
  gradients: {
    cyanGold: 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(255, 215, 0, 0.1))',
    cyanGoldText: 'linear-gradient(135deg, #00ffff, #ffd700)',
  },

  // Component backgrounds
  components: {
    sidebar: 'linear-gradient(135deg, rgba(26, 26, 46, 0.8) 0%, rgba(15, 15, 30, 0.8) 100%)',
    card: 'rgba(0, 0, 0, 0.4)',
    button: {
      primary: 'rgba(0, 255, 255, 0.2)',
      secondary: 'rgba(255, 215, 0, 0.2)',
      hover: 'rgba(0, 255, 255, 0.3)',
    },
  },
};

// Utility for applying gradient text
export const gradientTextStyle = {
  background: theme.gradients.cyanGoldText,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
} as const;
