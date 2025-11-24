import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WinOverlayProps {
  amount: number;
  visible: boolean;
  status?: 'win' | 'push';
}

export const WinOverlay: React.FC<WinOverlayProps> = ({ amount, visible, status = 'win' }) => {
  const isWin = status === 'win';
  const isPush = status === 'push';
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
          }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ 
            duration: 0.4,
            ease: [0.34, 1.56, 0.64, 1]
          }}
          style={{
            position: 'absolute',
            left: '25%',
            top: '40%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 999,
            width: 'min(420px, 90%)',
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
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    delay: 0.2,
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                  }}
                  style={{ 
                    fontSize: '48px',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  +${amount.toFixed(2)}
                </motion.div>
              )}
              
              {/* Animated progress bar */}
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
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
