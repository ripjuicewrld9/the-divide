// Level progression thresholds and badges
// 50 levels from Newbie (1) to Legend (50)

export const LEVEL_THRESHOLDS = [
  { level: 1, xpRequired: 0, badgeName: 'newbie', badgeColorHex: '#94A3B8' },
  { level: 2, xpRequired: 500, badgeName: 'newbie', badgeColorHex: '#94A3B8' },
  { level: 3, xpRequired: 1200, badgeName: 'newbie', badgeColorHex: '#94A3B8' },
  { level: 4, xpRequired: 2000, badgeName: 'newbie', badgeColorHex: '#94A3B8' },
  { level: 5, xpRequired: 2500, badgeName: 'bronze', badgeColorHex: '#CD7F32' },
  { level: 6, xpRequired: 3500, badgeName: 'bronze', badgeColorHex: '#CD7F32' },
  { level: 7, xpRequired: 4800, badgeName: 'bronze', badgeColorHex: '#CD7F32' },
  { level: 8, xpRequired: 6500, badgeName: 'bronze', badgeColorHex: '#CD7F32' },
  { level: 9, xpRequired: 8500, badgeName: 'bronze', badgeColorHex: '#CD7F32' },
  { level: 10, xpRequired: 10000, badgeName: 'silver', badgeColorHex: '#C0C0C0' },
  { level: 11, xpRequired: 13000, badgeName: 'silver', badgeColorHex: '#C0C0C0' },
  { level: 12, xpRequired: 16500, badgeName: 'silver', badgeColorHex: '#C0C0C0' },
  { level: 13, xpRequired: 20500, badgeName: 'silver', badgeColorHex: '#C0C0C0' },
  { level: 14, xpRequired: 25000, badgeName: 'silver', badgeColorHex: '#C0C0C0' },
  { level: 15, xpRequired: 30000, badgeName: 'silver', badgeColorHex: '#C0C0C0' },
  { level: 16, xpRequired: 35500, badgeName: 'silver', badgeColorHex: '#C0C0C0' },
  { level: 17, xpRequired: 41500, badgeName: 'silver', badgeColorHex: '#C0C0C0' },
  { level: 18, xpRequired: 45000, badgeName: 'silver', badgeColorHex: '#C0C0C0' },
  { level: 19, xpRequired: 47500, badgeName: 'silver', badgeColorHex: '#C0C0C0' },
  { level: 20, xpRequired: 50000, badgeName: 'gold', badgeColorHex: '#FFD700' },
  { level: 21, xpRequired: 60000, badgeName: 'gold', badgeColorHex: '#FFD700' },
  { level: 22, xpRequired: 70000, badgeName: 'gold', badgeColorHex: '#FFD700' },
  { level: 23, xpRequired: 82000, badgeName: 'gold', badgeColorHex: '#FFD700' },
  { level: 24, xpRequired: 95000, badgeName: 'gold', badgeColorHex: '#FFD700' },
  { level: 25, xpRequired: 110000, badgeName: 'gold', badgeColorHex: '#FFD700' },
  { level: 26, xpRequired: 125000, badgeName: 'gold', badgeColorHex: '#FFD700' },
  { level: 27, xpRequired: 135000, badgeName: 'gold', badgeColorHex: '#FFD700' },
  { level: 28, xpRequired: 142000, badgeName: 'gold', badgeColorHex: '#FFD700' },
  { level: 29, xpRequired: 146000, badgeName: 'gold', badgeColorHex: '#FFD700' },
  { level: 30, xpRequired: 150000, badgeName: 'platinum', badgeColorHex: '#E5E4E2' },
  { level: 31, xpRequired: 180000, badgeName: 'platinum', badgeColorHex: '#E5E4E2' },
  { level: 32, xpRequired: 215000, badgeName: 'platinum', badgeColorHex: '#E5E4E2' },
  { level: 33, xpRequired: 255000, badgeName: 'platinum', badgeColorHex: '#E5E4E2' },
  { level: 34, xpRequired: 300000, badgeName: 'platinum', badgeColorHex: '#E5E4E2' },
  { level: 35, xpRequired: 350000, badgeName: 'platinum', badgeColorHex: '#E5E4E2' },
  { level: 36, xpRequired: 405000, badgeName: 'platinum', badgeColorHex: '#E5E4E2' },
  { level: 37, xpRequired: 440000, badgeName: 'platinum', badgeColorHex: '#E5E4E2' },
  { level: 38, xpRequired: 465000, badgeName: 'platinum', badgeColorHex: '#E5E4E2' },
  { level: 39, xpRequired: 485000, badgeName: 'platinum', badgeColorHex: '#E5E4E2' },
  { level: 40, xpRequired: 500000, badgeName: 'diamond', badgeColorHex: '#B9F2FF' },
  { level: 41, xpRequired: 650000, badgeName: 'diamond', badgeColorHex: '#B9F2FF' },
  { level: 42, xpRequired: 820000, badgeName: 'diamond', badgeColorHex: '#B9F2FF' },
  { level: 43, xpRequired: 1010000, badgeName: 'diamond', badgeColorHex: '#B9F2FF' },
  { level: 44, xpRequired: 1220000, badgeName: 'diamond', badgeColorHex: '#B9F2FF' },
  { level: 45, xpRequired: 1450000, badgeName: 'diamond', badgeColorHex: '#B9F2FF' },
  { level: 46, xpRequired: 1600000, badgeName: 'diamond', badgeColorHex: '#B9F2FF' },
  { level: 47, xpRequired: 1730000, badgeName: 'diamond', badgeColorHex: '#B9F2FF' },
  { level: 48, xpRequired: 1840000, badgeName: 'diamond', badgeColorHex: '#B9F2FF' },
  { level: 49, xpRequired: 1930000, badgeName: 'diamond', badgeColorHex: '#B9F2FF' },
  { level: 50, xpRequired: 2000000, badgeName: 'legend', badgeColorHex: '#FF2D95' }
];

export const XP_RATES = {
  usdWager: 2,        // $1 wagered on Divides (real-money zone)
  gcScWager: 1,       // $1 equivalent wagered in casino games
  likeGiven: 10,      // User gives a like (encourage engagement)
  likeReceived: 10,   // Divide creator receives a like (appreciation)
  dislikeReceived: 35, // Divide creator receives a dislike (CONTROVERSY = ENGAGEMENT!)
  divideCreated: 250, // User creates a new divide (boosted for content creators)
  dividePot100: 1000,  // Divide pot reaches $100 (milestone reward)
  dividePot1000: 5000 // Divide pot reaches $1000 (major milestone)
};

// Get level data for a given XP amount
export function getLevelFromXP(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xpRequired) {
      return LEVEL_THRESHOLDS[i];
    }
  }
  return LEVEL_THRESHOLDS[0];
}

// Get XP needed for next level
export function getXPToNextLevel(currentXP) {
  const currentLevel = getLevelFromXP(currentXP);
  const nextLevelData = LEVEL_THRESHOLDS.find(t => t.level === currentLevel.level + 1);
  if (!nextLevelData) return 0; // Max level reached
  return nextLevelData.xpRequired - currentXP;
}

// Get progress percentage to next level
export function getProgressPercent(currentXP) {
  const currentLevel = getLevelFromXP(currentXP);
  const nextLevelData = LEVEL_THRESHOLDS.find(t => t.level === currentLevel.level + 1);
  if (!nextLevelData) return 100; // Max level
  
  const currentThreshold = currentLevel.xpRequired;
  const nextThreshold = nextLevelData.xpRequired;
  const progress = currentXP - currentThreshold;
  const total = nextThreshold - currentThreshold;
  
  return Math.min(100, Math.max(0, (progress / total) * 100));
}
