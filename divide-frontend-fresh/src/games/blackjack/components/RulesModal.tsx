import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'main' | 'sidebbets'>('main');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto border-2 border-yellow-600"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-800 border-b-2 border-yellow-600 p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-yellow-400">Blackjack Rules & Payouts</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b-2 border-gray-700 bg-gray-800">
              <button
                onClick={() => setActiveTab('main')}
                className={`flex-1 py-3 px-4 font-semibold transition-colors ${
                  activeTab === 'main'
                    ? 'border-b-2 border-yellow-400 text-yellow-400 bg-gray-900'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Main Game
              </button>
              <button
                onClick={() => setActiveTab('sidebbets')}
                className={`flex-1 py-3 px-4 font-semibold transition-colors ${
                  activeTab === 'sidebbets'
                    ? 'border-b-2 border-yellow-400 text-yellow-400 bg-gray-900'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Side Bets
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {activeTab === 'main' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <section>
                    <h3 className="text-lg font-bold text-yellow-400 mb-2">Objective</h3>
                    <p className="text-gray-300">
                      Get a hand total closer to 21 than the dealer without going over. Blackjack (21 with 2 cards) pays 3:2.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-yellow-400 mb-2">Dealer Rules</h3>
                    <ul className="text-gray-300 space-y-1 list-disc list-inside">
                      <li>Dealer stands on hard 17 or higher</li>
                      <li>Dealer hits on soft 17 (Ace + 6)</li>
                      <li>Dealer's hole card is revealed after all players act</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-yellow-400 mb-2">Player Actions</h3>
                    <ul className="text-gray-300 space-y-2">
                      <li className="font-semibold">Hit:</li>
                      <li className="ml-4 text-sm">Take another card</li>
                      <li className="font-semibold">Stand:</li>
                      <li className="ml-4 text-sm">Keep your current hand</li>
                      <li className="font-semibold">Double Down:</li>
                      <li className="ml-4 text-sm">Double your bet and receive exactly one more card</li>
                      <li className="font-semibold">Split:</li>
                      <li className="ml-4 text-sm">Split matching cards into two hands (same bet each)</li>
                      <li className="font-semibold">Insurance:</li>
                      <li className="ml-4 text-sm">Offered when dealer shows Ace. Pays 2:1 if dealer has blackjack. Costs 50% of original bet.</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-yellow-400 mb-2">Payouts</h3>
                    <div className="space-y-2 text-gray-300">
                      <div className="flex justify-between">
                        <span>Blackjack (3:2):</span>
                        <span className="text-green-400 font-bold">×2.5</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Regular Win (1:1):</span>
                        <span className="text-green-400 font-bold">×2</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Push (Tie):</span>
                        <span className="text-yellow-400 font-bold">×1 (return bet)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bust/Loss:</span>
                        <span className="text-red-400 font-bold">×0 (lose bet)</span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-yellow-400 mb-2">Deck Info</h3>
                    <p className="text-gray-300 text-sm">
                      This game uses a 6-deck shoe and reshuffles when 50 cards or fewer remain.
                    </p>
                  </section>
                </motion.div>
              )}

              {activeTab === 'sidebbets' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <section>
                    <h3 className="text-lg font-bold text-purple-400 mb-2">Perfect Pairs</h3>
                    <p className="text-gray-300 text-sm mb-3">
                      Pays based on your first two cards being a pair:
                    </p>
                    <ul className="text-gray-300 space-y-1">
                      <li>• <span className="font-semibold text-red-400">Mixed Pair</span> (same rank, different color): <span className="text-green-400">5:1</span></li>
                      <li>• <span className="font-semibold text-blue-400">Colored Pair</span> (same rank, same color): <span className="text-green-400">12:1</span></li>
                      <li>• <span className="font-semibold text-yellow-400">Perfect Pair</span> (exact same card): <span className="text-green-400">25:1</span></li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-blue-400 mb-2">21+3</h3>
                    <p className="text-gray-300 text-sm mb-3">
                      Combines your first two cards with the dealer's up card (3 cards total):
                    </p>
                    <ul className="text-gray-300 space-y-1">
                      <li>• <span className="font-semibold">Flush</span> (all same suit): <span className="text-green-400">5:1</span></li>
                      <li>• <span className="font-semibold">Straight</span> (consecutive ranks): <span className="text-green-400">10:1</span></li>
                      <li>• <span className="font-semibold">Three of a Kind</span>: <span className="text-green-400">30:1</span></li>
                      <li>• <span className="font-semibold">Straight Flush</span> (consecutive + same suit): <span className="text-green-400">40:1</span></li>
                      <li>• <span className="font-semibold">Suited Three of a Kind</span>: <span className="text-green-400">100:1</span></li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-orange-400 mb-2">777 (Blazing Sevens)</h3>
                    <p className="text-gray-300 text-sm mb-3">
                      Based on sevens in your first two cards and dealer's up card:
                    </p>
                    <ul className="text-gray-300 space-y-1">
                      <li>• <span className="font-semibold">Any 7 in first two cards</span>: <span className="text-green-400">3:1</span></li>
                      <li>• <span className="font-semibold">Two 7s (any color)</span>: <span className="text-green-400">50:1</span></li>
                      <li>• <span className="font-semibold">Two 7s (same suit)</span>: <span className="text-green-400">100:1</span></li>
                      <li>• <span className="font-semibold">Three 7s (any suit)</span>: <span className="text-green-400">200:1</span></li>
                      <li>• <span className="font-semibold">Three 7s (same suit)</span>: <span className="text-green-400">500:1</span></li>
                      <li>• <span className="font-semibold text-yellow-400">JACKPOT: Three 7s same suit + dealer 7 same suit</span>: <span className="text-yellow-300 font-bold">1000:1</span></li>
                    </ul>
                  </section>

                  <section>
                    <p className="text-yellow-300 text-sm p-3 bg-yellow-900/20 rounded border border-yellow-600">
                      💡 Side bets are <span className="font-bold">optional</span>. They pay independently of the main bet outcome.
                    </p>
                  </section>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-800 border-t-2 border-yellow-600 p-4 flex justify-end">
              <motion.button
                onClick={onClose}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
