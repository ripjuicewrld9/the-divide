import React from 'react';

function pretty(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
}

export default function KenoDebugOverlay({ result, picks = [] }) {
  const [open, setOpen] = React.useState(false);

  const data = React.useMemo(() => {
    if (!result) return { info: 'no result available' };
    // dedupe picks while preserving order
    const rawPicks = Array.isArray(picks) ? picks.map(Number) : (Array.isArray(result.request?.playerNumbers) ? result.request.playerNumbers.map(Number) : picks);
    const seen = new Set();
    const orderedUnique = [];
    for (const p of rawPicks) {
      if (!seen.has(p)) {
        seen.add(p);
        orderedUnique.push(p);
      }
    }
    return {
      timestamp: new Date().toISOString(),
      picks: orderedUnique,
      drawnNumbers: Array.isArray(result.drawnNumbers) ? result.drawnNumbers.map(Number) : result.drawnNumbers,
      matches: Array.isArray(result.matches) ? result.matches.map(Number) : result.matches,
      multiplier: result.multiplier,
      win: result.win,
      balance: result.balance,
      kenoNonce: result.kenoNonce ?? result.raw?.nonce ?? result.request?.nonce ?? null,
      roundId: result.roundId || result._id || null,
      serverSeedHashed: result.serverSeedHashed || null,
      request: result.request || null,
      raw: result,
    };
  }, [result, picks]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pretty(data));
      // quick visual feedback
      alert('Copied debug JSON to clipboard');
    } catch (e) {
      console.warn('KenoDebug: copy failed', e);
      alert('Copy failed — please select and copy manually');
    }
  };

  const btnStyle = {
    position: 'fixed', right: 18, bottom: 18, zIndex: 9999, borderRadius: 8,
    background: '#111', color: '#fff', padding: '8px 10px', cursor: 'pointer', opacity: 0.85,
    fontSize: 13, border: '1px solid rgba(255,255,255,0.06)'
  };

  const panelStyle = {
    position: 'fixed', right: 18, bottom: 64, zIndex: 9999, width: 420, maxHeight: '60vh', overflow: 'auto',
    background: 'rgba(10,10,10,0.92)', color: '#eaeaea', padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
  };

  return (
    <div aria-hidden>
      <div style={btnStyle} onClick={() => setOpen((v) => !v)} title="Toggle Keno debug overlay">
        {open ? 'Hide Keno Debug' : 'Show Keno Debug'}
      </div>
      {open ? (
        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Keno Debug</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copy} style={{ padding: '4px 8px' }}>Copy JSON</button>
              <button onClick={() => setOpen(false)} style={{ padding: '4px 8px' }}>Close</button>
            </div>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{pretty(data)}</pre>
        </div>
      ) : null}
    </div>
  );
}
