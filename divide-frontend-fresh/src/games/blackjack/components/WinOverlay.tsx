import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WinBreakdown {
  mainPayout?: number;
  mainOutcome?: 'win' | 'loss' | 'push' | 'blackjack' | 'bust';
  perfectPairsPayout?: number;
  perfectPairsRatio?: string;
  twentyPlusThreePayout?: number;
  twentyPlusThreeRatio?: string;
  blazingSevensPayout?: number;
  blazingSevenRatio?: string;
}

interface WinOverlayProps {
  amount: number;
  visible: boolean;
  breakdown?: WinBreakdown;
  onDismiss?: () => void;
}

export const WinOverlay: React.FC<WinOverlayProps> = ({ amount, visible, breakdown, onDismiss }) => {
  const hasMainWin = breakdown?.mainPayout && breakdown.mainPayout > 0;
  const hasPerfectPairs = breakdown?.perfectPairsPayout && breakdown.perfectPairsPayout > 0;
  const hasTwentyPlusThree = breakdown?.twentyPlusThreePayout && breakdown.twentyPlusThreePayout > 0;
  const hasBlazingSevens = breakdown?.blazingSevensPayout && breakdown.blazingSevensPayout > 0;
  const isPush = breakdown?.mainOutcome === 'push' && !hasPerfectPairs && !hasTwentyPlusThree && !hasBlazingSevens;
  const isWin = amount > 0;
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ 
            duration: 0.4,
            ease: [0.34, 1.56, 0.64, 1]
          }}
          onClick={onDismiss}
          style={{
            position: 'absolute',
            top: '40%',
            left: '0',
            right: '0',
            marginLeft: 'auto',
            marginRight: 'auto',
            pointerEvents: onDismiss ? 'auto' : 'none',
            cursor: onDismiss ? 'pointer' : 'default',
            zIndex: 999,
            width: 'min(350px, 80%)',
          }}
        >
          <motion.div 
            animate={{
              boxShadow: isWin 
                ? [
                    '0 0 40px rgba(16, 185, 129, 0.3)',
                    '0 0 60px rgba(16, 185, 129, 0.5)',
                    '0 0 40px rgba(16, 185, 129, 0.3)',
                  ]
                : '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              background: isWin 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)'
                : 'rgba(100, 116, 139, 0.15)',
              border: isWin 
                ? '2px solid rgba(16, 185, 129, 0.4)' 
                : '2px solid rgba(148, 163, 184, 0.3)',
              borderRadius: '16px',
              padding: '24px',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Animated background gradient */}
            {isWin && (
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
            )}
            
            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{ 
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  color: isWin ? '#10b981' : '#94a3b8',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                }}
              >
                {isPush ? '🤝 Push' : '🎉 Winner'}
              </motion.div>
              
              {isPush ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{ 
                    fontSize: '32px',
                    fontWeight: 800,
                    color: '#e2e8f0',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Bet Returned
                </motion.div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Main bet payout */}
                  {hasMainWin && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                      }}
                    >
                      <span style={{ 
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#10b981',
                      }}>
                        {breakdown.mainOutcome === 'blackjack' ? '♠️ Blackjack' : '🎴 Main Bet'}
                      </span>
                      <span style={{ 
                        fontSize: '20px',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}>
                        +${breakdown.mainPayout?.toFixed(2)}
                      </span>
                    </motion.div>
                  )}

                  {/* Perfect Pairs */}
                  {hasPerfectPairs && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'rgba(236, 72, 153, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(236, 72, 153, 0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ 
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#ec4899',
                        }}>
                          💎 Perfect Pairs
                        </span>
                        {breakdown.perfectPairsRatio && (
                          <span style={{
                            fontSize: '10px',
                            color: '#ec4899',
                            opacity: 0.7,
                          }}>
                            {breakdown.perfectPairsRatio}
                          </span>
                        )}
                      </div>
                      <span style={{ 
                        fontSize: '20px',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}>
                        +${breakdown.perfectPairsPayout?.toFixed(2)}
                      </span>
                    </motion.div>
                  )}

                  {/* 21+3 */}
                  {hasTwentyPlusThree && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'rgba(139, 92, 246, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ 
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#8b5cf6',
                        }}>
                          🎯 21+3
                        </span>
                        {breakdown.twentyPlusThreeRatio && (
                          <span style={{
                            fontSize: '10px',
                            color: '#8b5cf6',
                            opacity: 0.7,
                          }}>
                            {breakdown.twentyPlusThreeRatio}
                          </span>
                        )}
                      </div>
                      <span style={{ 
                        fontSize: '20px',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}>
                        +${breakdown.twentyPlusThreePayout?.toFixed(2)}
                      </span>
                    </motion.div>
                  )}

                  {/* Blazing 7s */}
                  {hasBlazingSevens && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ 
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#ef4444',
                        }}>
                          🔥 Blazing 7s
                        </span>
                        {breakdown.blazingSevenRatio && (
                          <span style={{
                            fontSize: '10px',
                            color: '#ef4444',
                            opacity: 0.7,
                          }}>
                            {breakdown.blazingSevenRatio}
                          </span>
                        )}
                      </div>
                      <span style={{ 
                        fontSize: '20px',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}>
                        +${breakdown.blazingSevensPayout?.toFixed(2)}
                      </span>
                    </motion.div>
                  )}

                  {/* Total */}
                  {amount > 0 && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ 
                        delay: 0.6,
                        type: "spring",
                        stiffness: 200,
                        damping: 15
                      }}
                      style={{ 
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#94a3b8',
                        marginTop: '8px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      Total: <span style={{
                        fontSize: '32px',
                        fontWeight: 900,
                        background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        marginLeft: '8px',
                      }}>
                        +${amount.toFixed(2)}
                      </span>
                    </motion.div>
                  )}
                </div>
              )}
              
              {/* Animated progress bar */}
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.7, duration: 0.6, ease: 'easeOut' }}
                style={{ 
                  height: '4px',
                  marginTop: '20px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <motion.div
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  style={{
                    height: '100%',
                    width: '50%',
                    background: isWin 
                      ? 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.8), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.6), transparent)',
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WinOverlay;
