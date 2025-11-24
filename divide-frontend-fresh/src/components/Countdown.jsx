import React, { useEffect, useState } from 'react';

export default function Countdown({ target, prefix = '', className = '', style = {} }) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!target) return;
    const targetTs = new Date(target).getTime();
    function tick() {
      const now = Date.now();
      setRemainingMs(Math.max(0, targetTs - now));
    }
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [target]);

  if (!target) return null;
  if (remainingMs <= 0) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const timeStr = hours > 0
    ? `${hours}h ${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`
    : `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;

  return (
    <div className={className} style={{ textAlign: 'center', color: '#e6fffa', ...style }}>
      {prefix ? <div style={{ fontSize: 12, opacity: 0.9 }}>{prefix}</div> : null}
      <div style={{ fontSize: 28, fontWeight: 800 }}>{timeStr}</div>
    </div>
  );
}
