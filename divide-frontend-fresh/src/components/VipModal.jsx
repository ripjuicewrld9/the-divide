import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const VIP_TIERS = [
  {
    name: 'None',
    minWager: 0,
    rakeback: 0,
    color: '#666666',
    perks: ['No VIP benefits yet'],
  },
  {
    name: 'Bronze',
    minWager: 500,
    rakeback: 5,
    color: '#CD7F32',
    perks: ['Bronze chat badge', '5% dividends on house fees', 'Early supporter status'],
  },
  {
    name: 'Silver',
    minWager: 5000,
    rakeback: 10,
    color: '#C0C0C0',
    perks: ['Silver chat badge', '10% dividends on house fees', 'Priority support'],
  },
  {
    name: 'Gold',
    minWager: 25000,
    rakeback: 15,
    color: '#FFD700',
    perks: ['Gold tag in lobbies', '15% dividends on house fees', 'Priority support'],
  },
  {
    name: 'Platinum',
    minWager: 100000,
    rakeback: 20,
    color: '#E5E4E2',
    perks: ['Platinum animated border', '20% dividends on house fees', 'Priority support'],
  },
  {
    name: 'Diamond',
    minWager: 250000,
    rakeback: 25,
    color: '#B9F2FF',
    perks: ['Founding Whale badge', '25% dividends on house fees', 'Zero withdrawal fees FOREVER', 'Private Discord access', 'Direct line to founders'],
    requiresApproval: true,
  },
];

export default function VipModal({ isOpen, onClose, currentTier = 'none', wagerLast30Days = 0 }) {
  if (!isOpen) return null;

  const currentTierIndex = VIP_TIERS.findIndex(t => t.name.toLowerCase() === currentTier.toLowerCase());
  const currentTierInfo = VIP_TIERS[currentTierIndex] || VIP_TIERS[0];
  const nextTier = currentTierIndex < VIP_TIERS.length - 1 ? VIP_TIERS[currentTierIndex + 1] : null;

  const wagerInDollars = wagerLast30Days / 100;
  const progressToNext = nextTier
    ? Math.min(100, ((wagerInDollars - currentTierInfo.minWager) / (nextTier.minWager - currentTierInfo.minWager)) * 100)
    : 100;
  const remainingToNext = nextTier ? Math.max(0, nextTier.minWager - wagerInDollars) : 0;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-[#0a0a0b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: '90vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="url(#vipGradient)" stroke="url(#vipGradient)" strokeWidth="1" />
                <defs>
                  <linearGradient id="vipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD700" />
                    <stop offset="50%" stopColor="#FFA500" />
                    <stop offset="100%" stopColor="#FF6347" />
                  </linearGradient>
                </defs>
              </svg>
              <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                VIP Program
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-xl"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
            {/* Current Status */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Your Current Tier</span>
                <span
                  className="text-lg font-bold px-3 py-1 rounded-full"
                  style={{
                    color: currentTierInfo.color,
                    background: `${currentTierInfo.color}20`,
                    border: `1px solid ${currentTierInfo.color}40`
                  }}
                >
                  {currentTierInfo.name}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">30-Day Wager</span>
                <span className="text-white font-semibold">${wagerInDollars.toLocaleString()}</span>
              </div>
              {nextTier && (
                <>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${progressToNext}%`,
                        background: `linear-gradient(90deg, ${currentTierInfo.color}, ${nextTier.color})`
                      }}
                    />
                  </div>
                  <p className="text-gray-500 text-xs">
                    ${remainingToNext.toLocaleString()} more to reach <span style={{ color: nextTier.color }}>{nextTier.name}</span>
                  </p>
                </>
              )}
            </div>

            {/* How Dividends Work */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <span className="text-green-400">💰</span> How Dividends Work
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                The house takes <span className="text-white font-semibold">2.5%</span> from each pot.
                VIP members get a percentage of that fee back as <span className="text-green-400 font-semibold">Dividends</span>.
              </p>
              <div className="mt-3 p-3 bg-black/30 rounded-lg">
                <p className="text-gray-400 text-xs">
                  <span className="text-white">Example:</span> You wager $100 → House takes $2.50 rake →
                  {currentTierInfo.rakeback > 0
                    ? <span className="text-green-400"> You get ${(2.50 * currentTierInfo.rakeback / 100).toFixed(2)} back ({currentTierInfo.rakeback}%)</span>
                    : <span className="text-gray-500"> No dividends (reach Bronze for 5%)</span>
                  }
                </p>
              </div>
            </div>

            {/* Tier Table */}
            <h3 className="font-bold text-white mb-4">VIP Tiers</h3>
            <div className="space-y-3">
              {VIP_TIERS.map((tier, index) => {
                const isCurrentTier = tier.name.toLowerCase() === currentTier.toLowerCase();
                const isLocked = index > currentTierIndex;

                return (
                  <div
                    key={tier.name}
                    className={`p-4 rounded-xl border transition-all ${isCurrentTier
                      ? 'border-white/30 bg-white/5'
                      : isLocked
                        ? 'border-white/5 bg-white/[0.02] opacity-60'
                        : 'border-white/10 bg-white/[0.02]'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ background: tier.color }}
                        />
                        <span className="font-bold" style={{ color: tier.color }}>
                          {tier.name}
                        </span>
                        {isCurrentTier && (
                          <span className="text-xs bg-white/10 text-white px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                        {tier.requiresApproval && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                            Invite Only
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400 text-sm">
                        {tier.minWager > 0 ? `$${tier.minWager.toLocaleString()}+` : 'Start'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-green-400 font-semibold text-sm">
                        {tier.rakeback}% Dividends
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {tier.perks.map((perk, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400"
                        >
                          {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* House Revenue Note */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <span>🏠</span> House Revenue Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Winner Pool</span>
                  <span className="text-green-400 font-semibold">97%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">House Fee</span>
                  <span className="text-white font-semibold">2.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Creator Bonus Pool</span>
                  <span className="text-yellow-400 font-semibold">0.5%</span>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-3">
                Dividends are paid from the 2.5% house fee — the house profit funds your VIP rewards.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
