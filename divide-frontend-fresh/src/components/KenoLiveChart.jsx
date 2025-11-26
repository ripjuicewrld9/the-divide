import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import KenoPnlChartWrapper from './KenoPnlChartWrapper';

export default function KenoLiveChart({ onClose }) {
    const { user } = useAuth();
    const [liveRounds, setLiveRounds] = useState(null);
    const [liveError, setLiveError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [liveChartResetTime, setLiveChartResetTime] = useState(Date.now());

    const [chartPos, setChartPos] = useState(() => {
        try { const v = localStorage.getItem('kenoLiveChartPos'); return v ? JSON.parse(v) : { left: 40, top: 120 }; } catch { return { left: 40, top: 120 }; }
    });

    const draggingRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        function onMove(e) {
            if (!draggingRef.current) return;
            const nx = e.clientX - dragOffsetRef.current.x;
            const ny = e.clientY - dragOffsetRef.current.y;
            setChartPos({ left: Math.max(8, nx), top: Math.max(8, ny) });
        }
        function onUp() {
            if (draggingRef.current) {
                draggingRef.current = false;
                try { localStorage.setItem('kenoLiveChartPos', JSON.stringify(chartPos)); } catch { /* ignore */ }
            }
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    }, [chartPos]);

    async function fetchRounds() {
        try {
            const res = await api.get('/keno/rounds?limit=200');
            const rounds = res?.rounds || [];
            const uid = user?.id || user?._id || user?.userId;

            let filtered = [];
            if (uid) {
                filtered = rounds.filter(r => {
                    const rid = r?.userId || r?.user || r?.user_id || (r.user && (r.user.id || r.user._id));
                    return String(rid) === String(uid);
                });
            } else {
                filtered = [];
            }
            setLiveRounds(filtered);
            setLiveError(null);
        } catch (err) {
            setLiveError(err?.message || String(err));
            setLiveRounds([]);
        }
    }

    useEffect(() => {
        let mounted = true;
        let timer = null;

        fetchRounds();
        timer = setInterval(() => { if (mounted) fetchRounds(); }, 5000);

        return () => { mounted = false; if (timer) clearInterval(timer); };
    }, []);

    return (
        <div
            role="dialog"
            aria-label="Live Chart"
            style={{ position: 'fixed', left: chartPos.left, top: chartPos.top, zIndex: 2000, cursor: 'default' }}
        >
            <div
                onMouseDown={(e) => {
                    draggingRef.current = true;
                    dragOffsetRef.current = { x: e.clientX - chartPos.left, y: e.clientY - chartPos.top };
                    e.preventDefault();
                }}
                style={{
                    width: 420,
                    background: 'linear-gradient(135deg,#071021, #0b1420)',
                    border: '1px solid rgba(148,0,0,0.08)',
                    padding: 8,
                    borderRadius: 8,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <div style={{ color: '#9fe', fontWeight: 700 }}>Live Chart</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                            className="btn small"
                            title="Refresh live rounds and reset chart"
                            onClick={async (e) => {
                                e.stopPropagation(); // Prevent drag start
                                try {
                                    setRefreshing(true);
                                    setLiveChartResetTime(Date.now());
                                    await fetchRounds();
                                } catch {
                                } finally {
                                    setRefreshing(false);
                                }
                            }}
                            style={{ width: 34, height: 28, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #00ffff, #ffd700)', color: '#1a1a1a', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                            {refreshing ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g>
                                        <path d="M21 12a9 9 0 1 0-3.03 6.97" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                                    </g>
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 12a9 9 0 1 0-3.03 6.97" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose && onClose(); }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '1.2em',
                                padding: '0 8px'
                            }}
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div style={{ width: 420, height: 180 }} onMouseDown={e => e.stopPropagation()}>
                    {liveError ? (
                        <div style={{ color: '#f77', padding: 12 }}>Failed to load rounds: {String(liveError)}</div>
                    ) : liveRounds == null ? (
                        <div style={{ padding: 12 }}>Loading...</div>
                    ) : (user == null) ? (
                        <div style={{ padding: 12 }}>Log in to view your recent rounds.</div>
                    ) : liveRounds.length === 0 ? (
                        <div style={{ padding: 12 }}>No recent rounds.</div>
                    ) : (
                        <KenoPnlChartWrapper rounds={liveRounds} resetTime={liveChartResetTime} />
                    )}
                </div>
            </div>
        </div>
    );
}
