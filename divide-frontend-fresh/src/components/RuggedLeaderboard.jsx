import React, { useEffect, useState } from 'react';
import useSocket from '../hooks/useSocket';

export default function RuggedLeaderboard() {
    const [topCashouts, setTopCashouts] = useState([]);
    const socket = useSocket('rugged');

    useEffect(() => {
        if (!socket) return;

        const handleLeaderboard = (data) => {
            if (data && Array.isArray(data.topCashouts)) {
                setTopCashouts(data.topCashouts.slice(0, 3));
            }
        };

        socket.on('rugged:leaderboard', handleLeaderboard);
        socket.emit('rugged:getLeaderboard');

        return () => {
            socket.off('rugged:leaderboard', handleLeaderboard);
        };
    }, [socket]);

    const medals = ['🥇', '🥈', '🥉'];

    const displayData = topCashouts.length > 0 ? topCashouts : [
        { username: '---', multiplier: null, cashout: 0 },
        { username: '---', multiplier: null, cashout: 0 },
        { username: '---', multiplier: null, cashout: 0 }
    ];

    return (
        <>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid rgba(0, 255, 255, 0.1)'
            }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #ffd700, #ffaa00)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    🏆 Top Rug Pulls
                </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {displayData.map((entry, index) => (
                    <div
                        key={index}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '40px 1fr auto',
                            gap: '16px',
                            padding: '14px 16px',
                            background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                            borderRadius: '6px',
                            alignItems: 'center',
                            border: index === 0 ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid transparent',
                            opacity: entry.username === '---' ? 0.5 : 1
                        }}
                    >
                        <span style={{ fontSize: '24px', textAlign: 'center' }}>{medals[index]}</span>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                                {entry.username || 'Anonymous'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                {entry.multiplier ? `${Number(entry.multiplier).toFixed(2)}x multiplier` : '---'}
                            </div>
                        </div>
                        <div style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: index === 0 ? '#ffd700' : '#10b981'
                        }}>
                            {entry.cashout > 0 ? `$${Number(entry.cashout).toFixed(2)}` : '---'}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
