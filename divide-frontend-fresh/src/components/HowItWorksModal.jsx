import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

export default function HowItWorksModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('how');

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
            onClick={() => setActiveTab('how')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${
              activeTab === 'how'
                ? 'text-white border-b-2 border-red-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            The Game
          </button>
          <button
            onClick={() => setActiveTab('rake')}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${
              activeTab === 'rake'
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
            {activeTab === 'how' ? (
              <motion.div
                key="how"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* The Core Rule */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-red-500/10 via-purple-500/10 to-blue-500/10 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-yellow-400">⚠️</span>
                    <h3 className="text-lg font-bold text-white">BLIND BETS — MINORITY WINS</h3>
                  </div>
                  <p className="text-white font-semibold">
                    Every bet is a sacrifice. Win the money, lose the war. Win the war, lose the bet. <span className="text-gray-400">Pick your poison.</span>
                  </p>
                </div>

                {/* The Setup */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    <span className="text-white font-semibold">Create a Divide.</span> Pick a side. Seed the pot.<br/>
                    iPhone vs Android · Trump vs Biden · Cats vs Dogs · <span className="text-gray-500">anything tribal</span>
                  </p>
                  <p className="text-white font-semibold mt-3">
                    The side with <span className="text-green-400">fewer bets</span> wins <span className="text-green-400">97%</span> of the pot. All bets are blind.
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
                        You LOVE iPhones → you bet iPhone, hoping to be the minority<br/>
                        <span className="text-gray-500">But if you WIN the money... it means most people DIDN'T pick iPhone</span><br/>
                        <span className="text-yellow-400 font-semibold">You won cash but your tribe lost the popularity war</span> — ego wounded
                      </p>
                    </div>

                    {/* Scenario 2 */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">2</span>
                        <h4 className="font-bold text-white">The Mercenary</h4>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        You think Android will be minority → you bet Android even though you're an iPhone person<br/>
                        <span className="text-gray-500">If Android wins (minority), you get paid</span><br/>
                        <span className="text-yellow-400 font-semibold">But you just funded the enemy and betrayed your tribe</span> — ego sacrificed for profit
                      </p>
                    </div>

                    {/* Scenario 3 */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">3</span>
                        <h4 className="font-bold text-white">The Manipulator</h4>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        You bet your true side, then try to flip people to the other side<br/>
                        <span className="text-gray-500">You're literally convincing people your thing sucks so you can profit</span><br/>
                        <span className="text-yellow-400 font-semibold">You have to trash-talk your own belief to win</span> — ultimate ego death
                      </p>
                    </div>
                  </div>
                </div>

                {/* The Stakes */}
                <div className="p-5 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                  <h3 className="font-bold text-white mb-3">The sacrifice is ALWAYS there:</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">💰</span>
                      <span className="text-gray-300">Win money? <span className="text-white">Your side lost the social war.</span></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-400">👑</span>
                      <span className="text-gray-300">Win the social war? <span className="text-white">You lost your money.</span></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-400">🎭</span>
                      <span className="text-gray-300">Try to manipulate? <span className="text-white">You betray your own beliefs publicly.</span></span>
                    </li>
                  </ul>
                </div>

                {/* No House Edge */}
                <div className="p-5 rounded-xl bg-black/50 border border-white/5">
                  <p className="text-gray-400 text-sm leading-relaxed">
                    We keep <span className="text-white font-semibold">2-3%</span> to run the arena depending on Creator Rake.<br/>
                    Everything else is pure player-vs-player betrayal.
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-gray-500 text-xs">
                      No house edge. No RNG.<br/>
                      Just you, the herd, and chaos.
                    </p>
                  </div>
                </div>

                {/* Tagline */}
                <div className="text-center py-4">
                  <p className="text-lg font-bold bg-gradient-to-r from-red-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Welcome to the first real social blood sport with money on the line.
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
                        If creator bet $15k (High Roller tier), they get 60% of $500 = <span className="text-white">$300</span>
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
                      <span className="text-yellow-400 mt-0.5">⚡</span>
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
