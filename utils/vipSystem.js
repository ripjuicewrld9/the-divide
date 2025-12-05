// VIP System - Based on 30-day rolling wager
// Rewards go to Dividends balance, not main balance

export const VIP_TIERS = {
  none: {
    name: 'None',
    minWager: 0,
    withdrawalFeeDiscount: 0, // % discount on withdrawal fees
    rakeback: 0, // % of rake returned as dividends
    prioritySupport: false,
    color: '#666666',
    badge: null,
  },
  bronze: {
    name: 'Bronze',
    minWager: 50000, // $500 in cents
    withdrawalFeeDiscount: 0,
    rakeback: 0.5, // 0.5% rakeback
    prioritySupport: false,
    color: '#CD7F32',
    badge: 'bronze_badge',
    perks: ['Basic profile border', 'Bronze chat name color', '0.5% rakeback to Dividends'],
  },
  silver: {
    name: 'Silver',
    minWager: 500000, // $5,000 in cents
    withdrawalFeeDiscount: 10, // 10% off withdrawal fees
    rakeback: 1, // 1% rakeback
    prioritySupport: true,
    color: '#C0C0C0',
    badge: 'silver_badge',
    perks: ['Animated border', 'Silver chat badge', '1% rakeback to Dividends', '10% off withdrawal fees', 'Priority support'],
  },
  gold: {
    name: 'Gold',
    minWager: 2500000, // $25,000 in cents
    withdrawalFeeDiscount: 25, // 25% off withdrawal fees
    rakeback: 1.5, // 1.5% rakeback
    prioritySupport: true,
    color: '#FFD700',
    badge: 'gold_badge',
    perks: ['Exclusive animated avatar frame', 'Gold tag in lobbies', '1.5% rakeback to Dividends', '25% off withdrawal fees', 'Priority support'],
  },
  platinum: {
    name: 'Platinum',
    minWager: 10000000, // $100,000 in cents
    withdrawalFeeDiscount: 50, // 50% off withdrawal fees
    rakeback: 2, // 2% rakeback
    prioritySupport: true,
    color: '#E5E4E2',
    badge: 'platinum_badge',
    perks: ['Personal animated banner', 'Custom win sound', '2% rakeback to Dividends', '50% off withdrawal fees', 'Priority support'],
  },
  diamond: {
    name: 'Diamond',
    minWager: 25000000, // $250,000 in cents (requires manual approval)
    withdrawalFeeDiscount: 100, // FREE withdrawals
    rakeback: 3, // 3% rakeback
    prioritySupport: true,
    color: '#B9F2FF',
    badge: 'diamond_badge',
    perks: ['Founding Whale badge', '3% rakeback to Dividends', 'Zero withdrawal fees FOREVER', 'Private Discord access', 'Direct line to founders'],
    requiresApproval: true,
  },
};

// Get VIP tier based on 30-day wager (in cents)
export function getVipTier(wagerLast30Days, diamondApproved = false) {
  if (wagerLast30Days >= VIP_TIERS.diamond.minWager && diamondApproved) {
    return 'diamond';
  }
  if (wagerLast30Days >= VIP_TIERS.platinum.minWager) {
    return 'platinum';
  }
  if (wagerLast30Days >= VIP_TIERS.gold.minWager) {
    return 'gold';
  }
  if (wagerLast30Days >= VIP_TIERS.silver.minWager) {
    return 'silver';
  }
  if (wagerLast30Days >= VIP_TIERS.bronze.minWager) {
    return 'bronze';
  }
  return 'none';
}

// Get VIP tier info
export function getVipTierInfo(tierName) {
  return VIP_TIERS[tierName] || VIP_TIERS.none;
}

// Calculate rakeback amount (in cents) for a wager
export function calculateRakeback(wagerCents, vipTier) {
  const tier = VIP_TIERS[vipTier] || VIP_TIERS.none;
  if (tier.rakeback === 0) return 0;
  
  // Rakeback is % of the house rake (2-3% of wager)
  // We give back a % of what the house takes
  const houseRakePercent = 0.025; // Average 2.5% house rake
  const houseRake = wagerCents * houseRakePercent;
  const rakeback = Math.floor(houseRake * (tier.rakeback / 100));
  
  return rakeback;
}

// Apply withdrawal fee discount
export function applyVipWithdrawalDiscount(baseFeePercent, vipTier) {
  const tier = VIP_TIERS[vipTier] || VIP_TIERS.none;
  if (tier.withdrawalFeeDiscount === 100) return 0; // Free withdrawals
  
  const discount = tier.withdrawalFeeDiscount / 100;
  return baseFeePercent * (1 - discount);
}

// Update user's 30-day rolling wager
export function updateRollingWager(wagerHistory = []) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Filter to last 30 days and sum
  const recentWagers = wagerHistory.filter(w => new Date(w.date) >= thirtyDaysAgo);
  const total = recentWagers.reduce((sum, w) => sum + (w.amount || 0), 0);
  
  return {
    wagerLast30Days: total,
    // Clean up old entries (keep last 35 days for safety margin)
    cleanedHistory: wagerHistory.filter(w => {
      const date = new Date(w.date);
      return date >= new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
    }),
  };
}

// Add today's wager to history
export function addDailyWager(wagerHistory = [], amountCents) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existingToday = wagerHistory.find(w => {
    const wDate = new Date(w.date);
    wDate.setHours(0, 0, 0, 0);
    return wDate.getTime() === today.getTime();
  });
  
  if (existingToday) {
    existingToday.amount += amountCents;
  } else {
    wagerHistory.push({ date: today, amount: amountCents });
  }
  
  return wagerHistory;
}

// Get progress to next VIP tier
export function getVipProgress(wagerLast30Days, currentTier) {
  const tiers = ['none', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const currentIndex = tiers.indexOf(currentTier);
  
  if (currentIndex >= tiers.length - 1) {
    return { nextTier: null, progress: 100, remaining: 0 };
  }
  
  const nextTier = tiers[currentIndex + 1];
  const nextTierInfo = VIP_TIERS[nextTier];
  const currentTierInfo = VIP_TIERS[currentTier] || VIP_TIERS.none;
  
  const currentMin = currentTierInfo.minWager;
  const nextMin = nextTierInfo.minWager;
  
  const progress = Math.min(100, Math.max(0, 
    ((wagerLast30Days - currentMin) / (nextMin - currentMin)) * 100
  ));
  
  const remaining = Math.max(0, nextMin - wagerLast30Days);
  
  return { nextTier, progress, remaining };
}
