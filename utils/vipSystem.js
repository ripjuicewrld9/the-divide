// VIP System - Based on 30-day rolling wager
// Rewards go to Dividends balance, not main balance

// VIP TIER STRUCTURE
// Dividends is % of RAKE PAID (not wager) - paid from house profits only
// Example: $100k wagered → $2,500 rake paid (2.5%)
export const VIP_TIERS = {
  none: {
    name: 'None',
    minWager: 0,
    maxWager: 49999, // Up to $499.99
    withdrawalFeeDiscount: 0,
    rakeback: 0, // 0% dividends
    prioritySupport: false,
    color: '#666666',
    badge: null,
  },
  bronze: {
    name: 'Bronze',
    minWager: 50000, // $500 in cents
    maxWager: 499999, // Up to $4,999.99
    withdrawalFeeDiscount: 0,
    rakeback: 5, // 5% of rake paid back → +$125 on $100k wagered
    prioritySupport: false,
    color: '#CD7F32',
    badge: 'bronze_badge',
    perks: ['Bronze chat badge', '5% dividends on rake paid', 'Early supporter status'],
  },
  silver: {
    name: 'Silver',
    minWager: 500000, // $5,000 in cents
    maxWager: 2499999, // Up to $24,999.99
    withdrawalFeeDiscount: 0,
    rakeback: 10, // 10% of rake paid back → +$250 on $100k wagered
    prioritySupport: false,
    color: '#C0C0C0',
    badge: 'silver_badge',
    perks: ['Silver chat badge', '10% dividends on rake paid', 'Priority support'],
  },
  gold: {
    name: 'Gold',
    minWager: 2500000, // $25,000 in cents
    maxWager: 9999999, // Up to $99,999.99
    withdrawalFeeDiscount: 0,
    rakeback: 15, // 15% of rake paid back → +$375 on $100k wagered
    prioritySupport: true,
    color: '#FFD700',
    badge: 'gold_badge',
    perks: ['Gold tag in lobbies', '15% dividends on rake paid', 'Priority support'],
  },
  platinum: {
    name: 'Platinum',
    minWager: 10000000, // $100,000 in cents
    maxWager: 24999999, // Up to $249,999.99
    withdrawalFeeDiscount: 0,
    rakeback: 20, // 20% of rake paid back → +$500 on $100k wagered
    prioritySupport: true,
    color: '#E5E4E2',
    badge: 'platinum_badge',
    perks: ['Platinum animated border', '20% dividends on rake paid', 'Priority support'],
  },
  diamond: {
    name: 'Diamond',
    minWager: 25000000, // $250,000 in cents
    maxWager: Infinity,
    withdrawalFeeDiscount: 100, // FREE withdrawals FOREVER
    rakeback: 25, // 25% of rake paid back → +$625 on $100k wagered
    prioritySupport: true,
    color: '#B9F2FF',
    badge: 'diamond_badge',
    perks: ['Founding Whale badge', '25% dividends on rake paid', 'Zero withdrawal fees FOREVER', 'Private Discord access', 'Direct line to founders'],
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

// Calculate rakeback amount (in cents) for rake paid
// Rakeback is % of the RAKE the user paid, not their wager
// House rake is 2.5% of wager, so rakeback = (wager * 0.025) * tier%
export function calculateRakeback(wagerCents, vipTier) {
  const tier = VIP_TIERS[vipTier] || VIP_TIERS.none;
  if (tier.rakeback === 0) return 0;

  // Calculate the rake this user paid (2.5% of their wager)
  const rakePaid = wagerCents * 0.025;

  // Rakeback is % of rake paid (5%, 10%, 15%, or 20%)
  const rakeback = Math.floor(rakePaid * (tier.rakeback / 100));

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
