import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Countdown from './Countdown';
import api from '../services/api';
import useSocket from '../hooks/useSocket';

export default function RuggedCard() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await api.get('/rugged/status');
        if (!mounted) return;
        setStatus(s);
      } catch (e) { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, []);

  // listen for live updates so the home card reflects current state
  const socket = useSocket('rugged');
  useEffect(() => {
    if (!socket) return;
    const onUpdate = (d) => setStatus(prev => ({ ...(prev || {}), price: d.price, rugged: !!d.rugged, ruggedCooldownUntil: d.ruggedCooldownUntil || null, noRugUntil: d.noRugUntil || null }));
    socket.on('rugged:update', onUpdate);
    socket.on('rugged:rugPull', onUpdate);
    return () => { socket.off('rugged:update', onUpdate); socket.off('rugged:rugPull', onUpdate); };
  }, [socket]);

  const activeCooldown = status && status.rugged && status.ruggedCooldownUntil ? status.ruggedCooldownUntil : null;
  const staged = status && !status.rugged && status.noRugUntil ? status.noRugUntil : null;

  return (
    <div style={{ background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 8, padding: 16, flex: '1 1 220px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Rugged — DC</h3>
        <div style={{ textAlign: 'right', fontSize: 13 }}>
          {activeCooldown ? (
            <div>
              <div style={{ fontSize: 12, color: '#ffd54d', fontWeight: 700 }}>Cooldown for:</div>
              <Countdown target={activeCooldown} />
            </div>
          ) : (
            <div style={{ color: '#9fb', fontWeight: 700 }}>Active</div>
          )}
        </div>
      </div>

      <div style={{ color: '#9fb', fontSize: 13, marginTop: 8, textAlign: 'center' }}>Live meme-coin market — buy/sell DC in real-time.</div>

      <div style={{ marginTop: 12, textAlign: 'center' }}>
        {activeCooldown ? (
          <div>
            <Countdown target={activeCooldown} prefix="Time until next pump" />
          </div>
        ) : null}
      </div>

      {/* bottom-aligned button to match other cards */}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
        <Link className="btn" to="/rugged">Pump</Link>
      </div>
    </div>
  );
}
