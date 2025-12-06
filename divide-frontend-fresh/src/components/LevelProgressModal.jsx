import React from 'react';
import ReactDOM from 'react-dom';

// Level progression thresholds matching utils/xpSystem.js
const LEVEL_THRESHOLDS = [
    { level: 1, xpRequired: 0, title: 'Sheep', color: '#94A3B8', emoji: '🐑' },
    { level: 2, xpRequired: 500, title: 'Normie', color: '#94A3B8', emoji: '😐' },
    { level: 3, xpRequired: 1200, title: 'Sleeper', color: '#94A3B8', emoji: '😴' },
    { level: 4, xpRequired: 2000, title: 'Unaware', color: '#94A3B8', emoji: '🙈' },
    { level: 5, xpRequired: 2500, title: 'Awakening', color: '#CD7F32', emoji: '🌅' },
    { level: 6, xpRequired: 3500, title: 'Questioner', color: '#CD7F32', emoji: '❓' },
    { level: 7, xpRequired: 4800, title: 'Doubter', color: '#CD7F32', emoji: '🤨' },
    { level: 8, xpRequired: 6500, title: 'Skeptic', color: '#CD7F32', emoji: '🧐' },
    { level: 9, xpRequired: 8500, title: 'Searcher', color: '#CD7F32', emoji: '🔍' },
    { level: 10, xpRequired: 10000, title: 'Truthseeker', color: '#C0C0C0', emoji: '👁️' },
    { level: 11, xpRequired: 13000, title: 'Whistleblower', color: '#C0C0C0', emoji: '📢' },
    { level: 12, xpRequired: 16500, title: 'Exposer', color: '#C0C0C0', emoji: '📸' },
    { level: 13, xpRequired: 20500, title: 'Revealer', color: '#C0C0C0', emoji: '🕯️' },
    { level: 14, xpRequired: 25000, title: 'Leaker', color: '#C0C0C0', emoji: '💧' },
    { level: 15, xpRequired: 30000, title: 'Infiltrator', color: '#C0C0C0', emoji: '🕵️' },
    { level: 16, xpRequired: 35500, title: 'Mole', color: '#C0C0C0', emoji: '🐀' },
    { level: 17, xpRequired: 41500, title: 'Insider', color: '#C0C0C0', emoji: '🔑' },
    { level: 18, xpRequired: 45000, title: 'Informant', color: '#C0C0C0', emoji: '🗣️' },
    { level: 19, xpRequired: 47500, title: 'Defector', color: '#C0C0C0', emoji: '🏃' },
    { level: 20, xpRequired: 50000, title: 'Conspirator', color: '#FFD700', emoji: '🤝' },
    { level: 21, xpRequired: 60000, title: 'Schemer', color: '#FFD700', emoji: '📝' },
    { level: 22, xpRequired: 70000, title: 'Plotter', color: '#FFD700', emoji: '🗺️' },
    { level: 23, xpRequired: 82000, title: 'Subversive', color: '#FFD700', emoji: '💣' },
    { level: 24, xpRequired: 95000, title: 'Dissident', color: '#FFD700', emoji: '✊' },
    { level: 25, xpRequired: 110000, title: 'Saboteur', color: '#FFD700', emoji: '🧨' },
    { level: 26, xpRequired: 125000, title: 'Anarchist', color: '#FFD700', emoji: '🏴' },
    { level: 27, xpRequired: 135000, title: 'Revolutionary', color: '#FFD700', emoji: '🚩' },
    { level: 28, xpRequired: 142000, title: 'Insurgent', color: '#FFD700', emoji: '⚔️' },
    { level: 29, xpRequired: 146000, title: 'Renegade', color: '#FFD700', emoji: '🏍️' },
    { level: 30, xpRequired: 150000, title: 'Propagandist', color: '#E5E4E2', emoji: '📰' },
    { level: 31, xpRequired: 180000, title: 'Psyop', color: '#E5E4E2', emoji: '🧠' },
    { level: 32, xpRequired: 215000, title: 'Honeypot', color: '#E5E4E2', emoji: '🍯' },
    { level: 33, xpRequired: 255000, title: 'Divider', color: '#E5E4E2', emoji: '➗' },
    { level: 34, xpRequired: 300000, title: 'Fed', color: '#E5E4E2', emoji: '🕶️' },
    { level: 35, xpRequired: 350000, title: 'Agent', color: '#E5E4E2', emoji: '🕴️' },
    { level: 36, xpRequired: 405000, title: 'Operator', color: '#E5E4E2', emoji: '🎧' },
    { level: 37, xpRequired: 440000, title: 'Handler', color: '#E5E4E2', emoji: '💼' },
    { level: 38, xpRequired: 465000, title: 'Puppetmaster', color: '#E5E4E2', emoji: '🎭' },
    { level: 39, xpRequired: 485000, title: 'Overlord', color: '#E5E4E2', emoji: '👹' },
    { level: 40, xpRequired: 500000, title: 'Illuminated', color: '#B9F2FF', emoji: '💡' },
    { level: 41, xpRequired: 650000, title: 'Awakened', color: '#B9F2FF', emoji: '👁️‍🗨️' },
    { level: 42, xpRequired: 820000, title: 'Enlightened', color: '#B9F2FF', emoji: '🧘' },
    { level: 43, xpRequired: 1010000, title: 'Initiated', color: '#B9F2FF', emoji: '📜' },
    { level: 44, xpRequired: 1220000, title: 'Ascended', color: '#B9F2FF', emoji: '☁️' },
    { level: 45, xpRequired: 1450000, title: 'Transcendent', color: '#B9F2FF', emoji: '✨' },
    { level: 46, xpRequired: 1600000, title: 'Omniscient', color: '#B9F2FF', emoji: '🔮' },
    { level: 47, xpRequired: 1730000, title: 'Untouchable', color: '#B9F2FF', emoji: '🛡️' },
    { level: 48, xpRequired: 1840000, title: 'Unstoppable', color: '#B9F2FF', emoji: '🚀' },
    { level: 49, xpRequired: 1930000, title: 'Unkillable', color: '#B9F2FF', emoji: '🧟' },
    { level: 50, xpRequired: 2000000, title: 'THEY', color: '#FF2D95', emoji: '👽' }
];

const getCurrentRank = (level) => {
    return LEVEL_THRESHOLDS.find(r => r.level === level) || LEVEL_THRESHOLDS[0];
};

const getNextRank = (level) => {
    return LEVEL_THRESHOLDS.find(r => r.level === level + 1);
};

export default function LevelProgressModal({ isOpen, onClose, currentLevel = 1, currentXP = 0 }) {
    if (!isOpen) return null;

    const currentRank = getCurrentRank(currentLevel);
    const nextRank = getNextRank(currentLevel);
    const xpForCurrentLevel = currentRank.xpRequired;
    const xpForNextLevel = nextRank ? nextRank.xpRequired : currentRank.xpRequired;
    const xpProgress = currentXP - xpForCurrentLevel;
    const xpNeeded = nextRank ? xpForNextLevel - xpForCurrentLevel : 0;
    const progressPercent = nextRank ? Math.min(100, Math.max(0, (xpProgress / xpNeeded) * 100)) : 100;

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
                                {currentRank.title} Rank
                            </div>
                        </div>
                    </div>

                    {/* XP Progress Bar */}
                    <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                                {nextRank ? `Progress to Level ${currentLevel + 1}` : 'Max Level Reached'}
                            </span>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontFamily: 'SF Mono, monospace' }}>
                                {xpProgress.toLocaleString()} / {nextRank ? xpNeeded.toLocaleString() : '-'} XP
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
                        <li><strong style={{ color: '#fff' }}>Wagering:</strong> Earn 2 XP per $1 wagered</li>
                        <li><strong style={{ color: '#fff' }}>Creating Divides:</strong> +250 XP per Divide you create</li>
                        <li><strong style={{ color: '#fff' }}>Social:</strong> Likes & comments earn XP</li>
                        <li><strong style={{ color: '#fff' }}>Milestones:</strong> Bonus XP for pot milestones</li>
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
                        {LEVEL_THRESHOLDS.map((rank, index) => {
                            const isCurrentRank = currentRank.title === rank.title;
                            const isUnlocked = currentLevel >= rank.level;
                            const isNextTarget = nextRank?.title === rank.title;

                            return (
                                <div
                                    key={rank.title}
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
                                            {rank.title}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                            Level {rank.level} • {rank.xpRequired.toLocaleString()} XP
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
