import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

export default function HowItWorksModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('classic');

  if (!isOpen) return null;

  return (
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
          <h2 className="text-xl font-bold bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            How The Divide Works
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('classic')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'classic'
              ? 'text-white border-b-2 border-red-500'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            Classic Mode
          </button>
          <button
            onClick={() => setActiveTab('hedge')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'hedge'
              ? 'text-white border-b-2 border-yellow-500'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            Hedge Mode
          </button>
          <button
            onClick={() => setActiveTab('rake')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'rake'
              ? 'text-white border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            Rake & Fees
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'classic' ? (
              <motion.div
                key="classic"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* The Core Rule */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-red-500/10 via-purple-500/10 to-blue-500/10 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <h3 className="text-lg font-bold text-white">BLIND PLAY — MINORITY WINS</h3>
                  </div>
                  <p className="text-white font-semibold">
                    Every play is a sacrifice. Win the money, lose the war. Win the war, lose your stake. <span className="text-gray-400">Pick your poison.</span>
                  </p>
                </div>

                {/* The Bulletproof Rule */}
                <div className="p-5 rounded-xl bg-gradient-to-r from-green-500/10 via-yellow-500/10 to-red-500/10 border border-yellow-500/30">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">The One-Line Rule</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-green-400 font-bold">📈 LONG</span> <span className="text-white">=</span> <span className="text-gray-300">you expect this side to be the <span className="font-semibold text-white">majority</span></span>
                    </p>
                    <p className="text-sm">
                      <span className="text-red-400 font-bold">📉 SHORT</span> <span className="text-white">=</span> <span className="text-gray-300">you expect this side to be the <span className="font-semibold text-white">minority</span></span>
                    </p>
                    <p className="text-sm mt-3">
                      <span className="text-yellow-400 font-bold">Minority eats 97% of the pot.</span>
                    </p>
                  </div>
                </div>

                {/* The Setup */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    <span className="text-white font-semibold">Create a Divide.</span> Go Long or Short on your side. Seed the pot.<br />
                    iPhone vs Android · Trump vs Biden · Cats vs Dogs · <span className="text-gray-500">anything tribal</span>
                  </p>
                  <p className="text-white font-semibold mt-3">
                    The side with <span className="text-green-400">fewer longs</span> wins <span className="text-green-400">97%</span> of the pot. All plays are blind.
                  </p>
                </div>

                {/* The Sacrifice - Three Scenarios */}
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                    The Sacrifice — You Can't Have Both
                  </h3>

                  <div className="space-y-4">
                    {/* Scenario 1 */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-sm">1</span>
                        <h4 className="font-bold text-white">The True Believer</h4>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        You LOVE iPhones → you Long iPhone, hoping the herd follows<br />
                        <span className="text-gray-500">But if you end up in the majority... you LOSE your money</span><br />
                        <span className="text-yellow-400 font-semibold">You won the popularity war but the minority ate your stake</span> — betrayed by loyalty
                      </p>
                    </div>

                    {/* Scenario 2 */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">2</span>
                        <h4 className="font-bold text-white">The Mercenary</h4>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        You think iPhone will be minority → you Long iPhone even though you're an Android person<br />
                        <span className="text-gray-500">If iPhone ends up minority, you get paid</span><br />
                        <span className="text-yellow-400 font-semibold">But you just publicly backed the enemy to profit</span> — ego sacrificed for greed
                      </p>
                    </div>

                    {/* Scenario 3 */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">3</span>
                        <h4 className="font-bold text-white">The Manipulator</h4>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        You Long the side you secretly want to lose, then shill the other side to pull the crowd<br />
                        <span className="text-gray-500">You're convincing everyone to go Long on something you're betting against</span><br />
                        <span className="text-yellow-400 font-semibold">You have to hype your opposition to win</span> — ultimate betrayal
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'hedge' ? (
              <motion.div
                key="hedge"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Hedge Mode Intro */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <h3 className="text-lg font-bold text-white">VERSUS MODE — PERFORMANCE WINS</h3>
                  </div>
                  <p className="text-white font-semibold">
                    No minority rule. No popularity contest. <span className="text-yellow-400">Pure price performance.</span>
                  </p>
                </div>

                {/* How it Works */}
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="font-bold text-white mb-4">How It Works</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">1</div>
                      <div>
                        <h4 className="font-bold text-white">Pick Your Asset</h4>
                        <p className="text-sm text-gray-400">Choose between two assets (e.g., BTC vs SOL). You are betting on which one will perform better.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold shrink-0">2</div>
                      <div>
                        <h4 className="font-bold text-white">Winner Takes All</h4>
                        <p className="text-sm text-gray-400">The asset with the higher percentage gain (or lower loss) wins the entire pot (minus fees).</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold shrink-0">3</div>
                      <div>
                        <h4 className="font-bold text-white">No Minority Rule</h4>
                        <p className="text-sm text-gray-400">Unlike Classic Mode, popularity doesn't matter. Even if 99% of people bet on BTC, if BTC outperforms SOL, BTC backers win.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Example */}
                <div className="p-5 rounded-xl bg-black/50 border border-white/5">
                  <h3 className="font-bold text-white mb-3">Example Scenario</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                      <span className="text-gray-300">BTC Performance</span>
                      <span className="text-green-400 font-mono font-bold">+5.0%</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white/5 rounded">
                      <span className="text-gray-300">SOL Performance</span>
                      <span className="text-green-400 font-mono font-bold">+2.5%</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/10 text-center">
                      <p className="text-white font-bold">BTC Wins!</p>
                      <p className="text-gray-500 text-xs">BTC backers take the pot. SOL backers lose.</p>
                    </div>
                  </div>
                </div>

                {/* Refund Rule */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <h4 className="font-bold text-blue-400 text-sm">Tie Breaker</h4>
                  </div>
                  <p className="text-xs text-gray-300">
                    If both assets have the exact same percentage performance, all bets are refunded (no rake taken).
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="rake"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Pot Split Overview */}
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="font-bold text-white mb-4">How the Pot Splits</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <span className="font-semibold text-green-400">Winner Pool</span>
                      <span className="font-bold text-white text-lg">97%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <span className="font-semibold text-red-400">House Fee</span>
                      <span className="font-bold text-white text-lg">2.5%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <span className="font-semibold text-purple-400">Creator Bonus Pool</span>
                      <span className="font-bold text-white text-lg">0.5%</span>
                    </div>
                  </div>
                </div>

                {/* Creator Tiers */}
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="font-bold text-white mb-2">Creator Bonus Tiers</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Creators earn from the 0.5% pool based on their skin in the game
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                      <div>
                        <span className="font-semibold text-yellow-400">Whale</span>
                        <span className="text-gray-500 text-xs ml-2">$50,000+</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white">100%</span>
                        <span className="text-gray-500 text-xs ml-1">of 0.5%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div>
                        <span className="font-semibold text-purple-400">High Roller</span>
                        <span className="text-gray-500 text-xs ml-2">$10k - $50k</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white">60%</span>
                        <span className="text-gray-500 text-xs ml-1">of 0.5%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div>
                        <span className="font-semibold text-blue-400">Player</span>
                        <span className="text-gray-500 text-xs ml-2">$1 - $10k</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white">30%</span>
                        <span className="text-gray-500 text-xs ml-1">of 0.5%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                      <div>
                        <span className="font-semibold text-gray-400">No Skin</span>
                        <span className="text-gray-500 text-xs ml-2">$0</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-500">0%</span>
                        <span className="text-gray-500 text-xs ml-1">(house keeps)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Example */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-500/20">
                  <h3 className="font-bold text-white mb-3">Example: $100,000 Pot</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Winners receive:</span>
                      <span className="text-green-400 font-semibold">$97,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">House fee (2.5%):</span>
                      <span className="text-red-400 font-semibold">$2,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Creator pool (0.5%):</span>
                      <span className="text-purple-400 font-semibold">$500</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 mt-2">
                      <p className="text-gray-500 text-xs">
                        If creator shorted $15k (High Roller tier), they get 60% of $500 = <span className="text-white">$300</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Key Points */}
                <div className="p-4 rounded-xl bg-black/50 border border-white/5">
                  <h4 className="font-semibold text-white text-sm mb-3">Key Points</h4>
                  <ul className="space-y-2 text-xs text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span><span className="text-white">97% always goes to winners</span> — this is sacred</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span><span className="text-white">House gets 2.5% minimum</span> — keeps the arena running</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span><span className="text-white">Creators earn up to 0.5%</span> — but only with skin in the game</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0"><path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" /></svg>
                      <span>No skin = no bonus — house keeps the creator pool</span>
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
