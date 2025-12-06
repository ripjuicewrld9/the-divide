// DivideResolutionAnimation.jsx
// Epic win animation showing: Minority wins the pot, Majority won the social war
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/format';

// Confetti particle component
const Particle = ({ color, delay, duration, x, y }) => (
    <motion.div
        initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
        animate={{
            opacity: [1, 1, 0],
            x: x,
            y: y,
            scale: [1, 1.2, 0.5],
            rotate: [0, 180, 360],
        }}
        transition={{ duration, delay, ease: 'easeOut' }}
        style={{
            position: 'absolute',
            width: '10px',
            height: '10px',
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            background: color,
            boxShadow: `0 0 10px ${color}`,
        }}
    />
);

// Money rain particle
const MoneyRain = ({ delay }) => (
    <motion.div
        initial={{ y: -50, opacity: 0, rotate: -20 }}
        animate={{ y: 800, opacity: [0, 1, 1, 0], rotate: [0, 20, -20, 0] }}
        transition={{ duration: 3, delay, ease: 'linear' }}
        style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            fontSize: '24px',
            filter: 'drop-shadow(0 0 10px rgba(74, 222, 128, 0.5))',
        }}
    >
        💵
    </motion.div>
);

export default function DivideResolutionAnimation({
    isOpen,
    onClose,
    divide,
    userPosition = null, // { side: 'A' or 'B', amount: cents }
}) {
    const [stage, setStage] = useState(0); // 0: intro, 1: battle, 2: reveal, 3: result
    const [particles, setParticles] = useState([]);
    const containerRef = useRef(null);

    if (!isOpen || !divide) return null;

    const winnerSide = divide.winnerSide; // 'A' or 'B'
    const loserSide = winnerSide === 'A' ? 'B' : 'A';

    const winnerOption = winnerSide === 'A' ? divide.optionA : divide.optionB;
    const loserOption = loserSide === 'A' ? divide.optionA : divide.optionB;

    const winnerTotal = winnerSide === 'A' ? (divide.totalA || divide.votesA || 0) : (divide.totalB || divide.votesB || 0);
    const loserTotal = loserSide === 'A' ? (divide.totalA || divide.votesA || 0) : (divide.totalB || divide.votesB || 0);

    const totalPot = winnerTotal + loserTotal;
    const winnerPct = totalPot > 0 ? Math.round((winnerTotal / totalPot) * 100) : 50;
    const loserPct = 100 - winnerPct;

    const winnerColor = winnerSide === 'A' ? '#ff1744' : '#2979ff';
    const loserColor = loserSide === 'A' ? '#ff1744' : '#2979ff';

    const isUserWinner = userPosition && userPosition.side === winnerSide;
    const userWinAmount = isUserWinner ? (userPosition.amount * (loserTotal / winnerTotal) * 0.97) : 0;

    // Progress through animation stages
    useEffect(() => {
        if (!isOpen) {
            setStage(0);
            return;
        }

        const timers = [
            setTimeout(() => setStage(1), 500),   // Start battle
            setTimeout(() => setStage(2), 2500),  // Reveal winner
            setTimeout(() => setStage(3), 4000),  // Show result
        ];

        return () => timers.forEach(clearTimeout);
    }, [isOpen]);

    // Generate confetti on winner reveal
    useEffect(() => {
        if (stage === 2) {
            const newParticles = [];
            for (let i = 0; i < 50; i++) {
                newParticles.push({
                    id: i,
                    color: i % 2 === 0 ? winnerColor : '#ffd700',
                    delay: Math.random() * 0.5,
                    duration: 1 + Math.random() * 1,
                    x: (Math.random() - 0.5) * 400,
                    y: Math.random() * 300 + 100,
                });
            }
            setParticles(newParticles);
        }
    }, [stage, winnerColor]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={stage >= 3 ? onClose : undefined}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.95)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    cursor: stage >= 3 ? 'pointer' : 'default',
                    overflow: 'hidden',
                }}
                ref={containerRef}
            >
                {/* Money rain in background */}
                {stage >= 2 && (
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                        {[...Array(20)].map((_, i) => (
                            <MoneyRain key={i} delay={i * 0.15} />
                        ))}
                    </div>
                )}

                {/* Main content container */}
                <div style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '700px',
                    padding: '40px',
                    textAlign: 'center',
                }}>

                    {/* Stage 0 & 1: The Battle */}
                    <AnimatePresence mode="wait">
                        {stage <= 1 && (
                            <motion.div
                                key="battle"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                            >
                                {/* Title */}
                                <motion.h1
                                    initial={{ y: -50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        letterSpacing: '0.3em',
                                        textTransform: 'uppercase',
                                        color: '#666',
                                        marginBottom: '20px',
                                    }}
                                >
                                    THE DIVIDE HAS SPOKEN
                                </motion.h1>

                                {/* VS Battle */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '30px',
                                    marginBottom: '40px',
                                }}>
                                    {/* Side A */}
                                    <motion.div
                                        initial={{ x: -100, opacity: 0 }}
                                        animate={{
                                            x: 0,
                                            opacity: 1,
                                            scale: stage === 1 ? [1, 1.05, 1] : 1,
                                        }}
                                        transition={{
                                            x: { delay: 0.3 },
                                            scale: { duration: 0.5, repeat: Infinity },
                                        }}
                                        style={{
                                            padding: '24px 32px',
                                            borderRadius: '16px',
                                            background: 'linear-gradient(135deg, rgba(255, 23, 68, 0.2) 0%, rgba(255, 23, 68, 0.1) 100%)',
                                            border: '2px solid rgba(255, 23, 68, 0.4)',
                                            minWidth: '160px',
                                        }}
                                    >
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
                                            {divide.optionA}
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#ff1744' }}>
                                            {Math.round(((divide.totalA || divide.votesA || 0) / totalPot) * 100)}%
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                                            ${formatCurrency(divide.totalA || divide.votesA || 0, 0)}
                                        </div>
                                    </motion.div>

                                    {/* VS */}
                                    <motion.div
                                        animate={{
                                            rotate: stage === 1 ? [0, 5, -5, 0] : 0,
                                            scale: stage === 1 ? [1, 1.2, 1] : 1,
                                        }}
                                        transition={{ duration: 0.3, repeat: Infinity }}
                                        style={{
                                            fontSize: '32px',
                                            fontWeight: '900',
                                            background: 'linear-gradient(135deg, #ff1744, #7c4dff, #2979ff)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            textShadow: '0 0 40px rgba(255, 255, 255, 0.3)',
                                        }}
                                    >
                                        ⚔️
                                    </motion.div>

                                    {/* Side B */}
                                    <motion.div
                                        initial={{ x: 100, opacity: 0 }}
                                        animate={{
                                            x: 0,
                                            opacity: 1,
                                            scale: stage === 1 ? [1, 1.05, 1] : 1,
                                        }}
                                        transition={{
                                            x: { delay: 0.3 },
                                            scale: { duration: 0.5, repeat: Infinity, delay: 0.25 },
                                        }}
                                        style={{
                                            padding: '24px 32px',
                                            borderRadius: '16px',
                                            background: 'linear-gradient(135deg, rgba(41, 121, 255, 0.2) 0%, rgba(41, 121, 255, 0.1) 100%)',
                                            border: '2px solid rgba(41, 121, 255, 0.4)',
                                            minWidth: '160px',
                                        }}
                                    >
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
                                            {divide.optionB}
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#2979ff' }}>
                                            {Math.round(((divide.totalB || divide.votesB || 0) / totalPot) * 100)}%
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                                            ${formatCurrency(divide.totalB || divide.votesB || 0, 0)}
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Loading text */}
                                <motion.p
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    style={{ color: '#666', fontSize: '14px' }}
                                >
                                    Resolving the divide...
                                </motion.p>
                            </motion.div>
                        )}

                        {/* Stage 2 & 3: The Reveal */}
                        {stage >= 2 && (
                            <motion.div
                                key="reveal"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                            >
                                {/* Confetti particles */}
                                <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none' }}>
                                    {particles.map(p => (
                                        <Particle key={p.id} {...p} />
                                    ))}
                                </div>

                                {/* The Paradox Reveal */}
                                <motion.div
                                    initial={{ y: -30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    style={{ marginBottom: '40px' }}
                                >
                                    <div style={{
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        letterSpacing: '0.3em',
                                        textTransform: 'uppercase',
                                        color: '#888',
                                        marginBottom: '16px',
                                    }}>
                                        THE PARADOX OF THE DIVIDE
                                    </div>
                                </motion.div>

                                {/* Two-panel result */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '20px',
                                    marginBottom: '40px',
                                }}>
                                    {/* Losers - Won the Social War */}
                                    <motion.div
                                        initial={{ x: -50, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        style={{
                                            padding: '24px',
                                            borderRadius: '16px',
                                            background: 'linear-gradient(135deg, rgba(120, 120, 120, 0.2) 0%, rgba(80, 80, 80, 0.1) 100%)',
                                            border: `2px solid ${loserColor}40`,
                                            position: 'relative',
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute',
                                            top: '-12px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                                            padding: '4px 16px',
                                            borderRadius: '20px',
                                            fontSize: '10px',
                                            fontWeight: '800',
                                            letterSpacing: '0.1em',
                                            color: '#000',
                                        }}>
                                            👑 WON THE SOCIAL WAR
                                        </div>

                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
                                                The Majority
                                            </div>
                                            <div style={{
                                                fontSize: '20px',
                                                fontWeight: '800',
                                                color: loserColor,
                                                marginBottom: '8px',
                                            }}>
                                                {loserOption}
                                            </div>
                                            <div style={{
                                                fontSize: '48px',
                                                fontWeight: '900',
                                                color: loserColor,
                                                textShadow: `0 0 30px ${loserColor}50`,
                                            }}>
                                                {loserPct}%
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                                                Most longs went here
                                            </div>
                                        </div>

                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 1 }}
                                            style={{
                                                marginTop: '16px',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                            }}
                                        >
                                            <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>
                                                💔 But lost all their money
                                            </div>
                                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#ef4444' }}>
                                                -${formatCurrency(loserTotal, 0)}
                                            </div>
                                        </motion.div>
                                    </motion.div>

                                    {/* Winners - Won the Money */}
                                    <motion.div
                                        initial={{ x: 50, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.6 }}
                                        style={{
                                            padding: '24px',
                                            borderRadius: '16px',
                                            background: `linear-gradient(135deg, ${winnerColor}30 0%, ${winnerColor}10 100%)`,
                                            border: `3px solid ${winnerColor}`,
                                            position: 'relative',
                                            boxShadow: `0 0 40px ${winnerColor}30`,
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute',
                                            top: '-12px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            background: 'linear-gradient(135deg, #ffd700, #ffaa00)',
                                            padding: '4px 16px',
                                            borderRadius: '20px',
                                            fontSize: '10px',
                                            fontWeight: '800',
                                            letterSpacing: '0.1em',
                                            color: '#000',
                                        }}>
                                            💰 WON THE MONEY
                                        </div>

                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
                                                The Minority
                                            </div>
                                            <div style={{
                                                fontSize: '20px',
                                                fontWeight: '800',
                                                color: winnerColor,
                                                marginBottom: '8px',
                                            }}>
                                                {winnerOption}
                                            </div>
                                            <motion.div
                                                animate={{ scale: [1, 1.1, 1] }}
                                                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                                                style={{
                                                    fontSize: '48px',
                                                    fontWeight: '900',
                                                    color: winnerColor,
                                                    textShadow: `0 0 30px ${winnerColor}`,
                                                }}
                                            >
                                                {winnerPct}%
                                            </motion.div>
                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                                                Fewer longs = bigger wins
                                            </div>
                                        </div>

                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 1.2, type: 'spring' }}
                                            style={{
                                                marginTop: '16px',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                background: 'rgba(74, 222, 128, 0.15)',
                                                border: '1px solid rgba(74, 222, 128, 0.4)',
                                            }}
                                        >
                                            <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: '600' }}>
                                                🎉 Split the entire pot
                                            </div>
                                            <motion.div
                                                animate={{ scale: [1, 1.05, 1] }}
                                                transition={{ duration: 0.3, repeat: Infinity }}
                                                style={{ fontSize: '24px', fontWeight: '900', color: '#4ade80' }}
                                            >
                                                +${formatCurrency(totalPot * 0.97, 0)}
                                            </motion.div>
                                        </motion.div>
                                    </motion.div>
                                </div>

                                {/* User result if they participated */}
                                {stage >= 3 && userPosition && (
                                    <motion.div
                                        initial={{ y: 30, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        style={{
                                            padding: '20px',
                                            borderRadius: '12px',
                                            background: isUserWinner
                                                ? 'linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)'
                                                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)',
                                            border: `2px solid ${isUserWinner ? '#4ade80' : '#ef4444'}`,
                                            marginBottom: '24px',
                                        }}
                                    >
                                        <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
                                            Your Result
                                        </div>
                                        <div style={{
                                            fontSize: '32px',
                                            fontWeight: '900',
                                            color: isUserWinner ? '#4ade80' : '#ef4444',
                                        }}>
                                            {isUserWinner ? `+$${formatCurrency(userWinAmount, 2)}` : `-$${formatCurrency(userPosition.amount, 2)}`}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                            {isUserWinner
                                                ? 'Your Long was in the minority — you ate the pot!'
                                                : 'Your Long joined the majority — they took your stake'}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Close hint */}
                                {stage >= 3 && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1 }}
                                        style={{ color: '#555', fontSize: '12px' }}
                                    >
                                        Click anywhere to close
                                    </motion.p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
