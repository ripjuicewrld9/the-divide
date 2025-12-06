import React from 'react';
import ReactDOM from 'react-dom';

// Level/Rank progression system
const RANKS = [
    { level: 1, name: 'Sheep', minXP: 0, color: '#9CA3AF', emoji: '🐑' },
    { level: 5, name: 'Wolf', minXP: 500, color: '#6B7280', emoji: '🐺' },
    { level: 10, name: 'Shark', minXP: 2000, color: '#3B82F6', emoji: '🦈' },
    { level: 20, name: 'Eagle', minXP: 10000, color: '#8B5CF6', emoji: '🦅' },
    { level: 35, name: 'Lion', minXP: 35000, color: '#F59E0B', emoji: '🦁' },
    { level: 50, name: 'Dragon', minXP: 100000, color: '#EF4444', emoji: '🐉' },
    { level: 75, name: 'Phoenix', minXP: 300000, color: '#F97316', emoji: '🔥' },
    { level: 100, name: 'Legend', minXP: 1000000, color: '#FFD700', emoji: '👑' },
];

// XP required for each level (simplified formula)
const getXPForLevel = (level) => {
    if (level <= 1) return 0;
    return Math.floor(100 * Math.pow(level, 1.5));
};

const getCurrentRank = (level) => {
    let currentRank = RANKS[0];
    for (const rank of RANKS) {
        if (level >= rank.level) {
            currentRank = rank;
        }
    }
    return currentRank;
};

const getNextRank = (level) => {
    for (const rank of RANKS) {
        if (level < rank.level) {
            return rank;
        }
    }
    return null; // Already max rank
};

export default function LevelProgressModal({ isOpen, onClose, currentLevel = 1, currentXP = 0 }) {
    if (!isOpen) return null;

    const currentRank = getCurrentRank(currentLevel);
    const nextRank = getNextRank(currentLevel);
    const xpForCurrentLevel = getXPForLevel(currentLevel);
    const xpForNextLevel = getXPForLevel(currentLevel + 1);
    const xpProgress = currentXP - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const progressPercent = Math.min(100, Math.max(0, (xpProgress / xpNeeded) * 100));

    const modalContent = (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, rgba(20,20,24,0.98) 0%, rgba(10,10,12,0.99) 100%)',
                    padding: '32px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    width: '100%',
                    maxWidth: '480px',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 50px 100px rgba(0,0,0,0.6)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{
                        fontSize: '22px',
                        fontWeight: '700',
                        color: '#fff',
                        margin: 0,
                    }}>
                        Level & Ranks
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '18px',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Current Status */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '24px',
                    border: `1px solid ${currentRank.color}30`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${currentRank.color}40 0%, ${currentRank.color}20 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            border: `2px solid ${currentRank.color}`,
                        }}>
                            {currentRank.emoji}
                        </div>
                        <div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: currentRank.color }}>
                                Level {currentLevel}
                            </div>
                            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                                {currentRank.name} Rank
                            </div>
                        </div>
                    </div>

                    {/* XP Progress Bar */}
                    <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                                Progress to Level {currentLevel + 1}
                            </span>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontFamily: 'SF Mono, monospace' }}>
                                {xpProgress.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                            </span>
                        </div>
                        <div style={{
                            height: '8px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${progressPercent}%`,
                                background: `linear-gradient(90deg, ${currentRank.color} 0%, ${nextRank?.color || currentRank.color} 100%)`,
                                borderRadius: '4px',
                                transition: 'width 0.3s ease',
                            }} />
                        </div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                        Total XP: <span style={{ color: '#FFD700', fontWeight: '600' }}>{currentXP.toLocaleString()}</span>
                    </div>
                </div>

                {/* How XP Works */}
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#3B82F6', marginBottom: '10px' }}>
                        💡 How XP Works
                    </h3>
                    <ul style={{
                        margin: 0,
                        paddingLeft: '16px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.7)',
                        lineHeight: '1.8',
                    }}>
                        <li><strong style={{ color: '#fff' }}>Wagering:</strong> Earn 1 XP per $1 wagered</li>
                        <li><strong style={{ color: '#fff' }}>Creating Divides:</strong> +50 XP per Divide you create</li>
                        <li><strong style={{ color: '#fff' }}>Winning:</strong> Bonus XP for winning positions</li>
                        <li><strong style={{ color: '#fff' }}>Social:</strong> Likes & comments earn XP</li>
                    </ul>
                </div>

                {/* All Ranks */}
                <div>
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '12px',
                    }}>
                        All Ranks
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {RANKS.map((rank, index) => {
                            const isCurrentRank = currentRank.name === rank.name;
                            const isUnlocked = currentLevel >= rank.level;
                            const isNextTarget = nextRank?.name === rank.name;

                            return (
                                <div
                                    key={rank.name}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: isCurrentRank
                                            ? `linear-gradient(135deg, ${rank.color}20 0%, ${rank.color}10 100%)`
                                            : 'rgba(255,255,255,0.02)',
                                        border: isCurrentRank
                                            ? `1px solid ${rank.color}50`
                                            : isNextTarget
                                                ? '1px solid rgba(255,255,255,0.15)'
                                                : '1px solid transparent',
                                        opacity: isUnlocked ? 1 : 0.5,
                                    }}
                                >
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: isUnlocked ? `${rank.color}30` : 'rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '18px',
                                        filter: isUnlocked ? 'none' : 'grayscale(1)',
                                    }}>
                                        {rank.emoji}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: isUnlocked ? rank.color : 'rgba(255,255,255,0.4)',
                                        }}>
                                            {rank.name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                            Level {rank.level}+ • {rank.minXP.toLocaleString()} XP
                                        </div>
                                    </div>
                                    {isCurrentRank && (
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: '600',
                                            color: '#000',
                                            background: rank.color,
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase',
                                        }}>
                                            Current
                                        </span>
                                    )}
                                    {!isUnlocked && isNextTarget && (
                                        <span style={{
                                            fontSize: '10px',
                                            fontWeight: '600',
                                            color: 'rgba(255,255,255,0.6)',
                                            background: 'rgba(255,255,255,0.1)',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                        }}>
                                            Next
                                        </span>
                                    )}
                                    {isUnlocked && !isCurrentRank && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill={rank.color}>
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                        </svg>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Social Status Note */}
                <div style={{
                    marginTop: '20px',
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                }}>
                    <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.7)',
                        lineHeight: '1.6',
                    }}>
                        <strong style={{ color: '#A855F7' }}>🎖️ Social Status:</strong> Your rank badge is displayed next to your name
                        in chats, feeds, and leaderboards. Higher ranks unlock exclusive features and recognition.
                    </p>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
}
