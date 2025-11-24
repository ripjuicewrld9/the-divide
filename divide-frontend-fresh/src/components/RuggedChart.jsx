import React, { useMemo } from 'react';

// SVG chart with smoother curve, subtle grid and glow. Expects priceHistory = [{ts, price}]
export default function RuggedChart({ priceHistory = [], width = 800, height = 220 }) {
  const pad = 12;
  const w = width - pad * 2;
  const h = height - pad * 2;

  // Map history to points in SVG space
  const points = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return [];
    const prices = priceHistory.map(p => Number(p.price || 0));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = Math.max(1e-8, max - min);
    const len = priceHistory.length;
    return priceHistory.map((p, i) => {
      const x = pad + (i / Math.max(1, len - 1)) * w;
      const y = pad + (1 - (Number(p.price || 0) - min) / range) * h;
      return { x, y, price: Number(p.price || 0) };
    });
  }, [priceHistory, w, h]);

  // Convert points to a smooth SVG path using Catmull-Rom -> Bezier
  const smoothPath = useMemo(() => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    // helper: compute control points
    const cr2bezier = (pts) => {
      let d = '';
      for (let i = 0; i < pts.length; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1] || pts[i];
        const p3 = pts[i + 2] || p2;
        if (i === 0) d += `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} `;
        const bp1x = p1.x + (p2.x - p0.x) / 6;
        const bp1y = p1.y + (p2.y - p0.y) / 6;
        const bp2x = p2.x - (p3.x - p1.x) / 6;
        const bp2y = p2.y - (p3.y - p1.y) / 6;
        d += `C ${bp1x.toFixed(2)} ${bp1y.toFixed(2)} ${bp2x.toFixed(2)} ${bp2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} `;
      }
      return d.trim();
    };
    return cr2bezier(points);
  }, [points]);

  const areaPath = useMemo(() => {
    if (!points || points.length === 0) return '';
    const last = points[points.length - 1];
    const first = points[0];
    // use the same smooth path for top and close it to the bottom
    const top = smoothPath;
    return `${top} L ${last.x.toFixed(2)} ${height - pad} L ${first.x.toFixed(2)} ${height - pad} Z`;
  }, [smoothPath, points, height, pad]);

  // Y-axis ticks for subtle labels/grid
  const yTicks = useMemo(() => {
    if (!points || points.length === 0) return [];
    const prices = points.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const ticks = 4;
    const out = [];
    for (let i = 0; i <= ticks; i++) {
      const v = min + (i / ticks) * (max - min);
      const y = pad + (1 - (v - min) / Math.max(1e-8, max - min)) * h;
      out.push({ v, y });
    }
    return out;
  }, [points, pad, h]);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', borderRadius: 8 }}>
      <defs>
        <linearGradient id="ruggedBg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#041018" />
          <stop offset="50%" stopColor="#06242b" />
          <stop offset="100%" stopColor="#081723" />
        </linearGradient>
        <linearGradient id="ruggedArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#8a4bff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ff3b7a" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="ruggedLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#00e6ff" />
          <stop offset="100%" stopColor="#ffd36a" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

  {/* background */}
  <rect x="0" y="0" width="100%" height="100%" fill="url(#ruggedBg)" />
  {/* subtle vignette */}
  <rect x="0" y="0" width="100%" height="100%" fill="url(#ruggedArea)" opacity={0.02} />

      {/* grid lines + labels */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad} x2={width - pad} y1={t.y} y2={t.y} stroke={i === 0 || i === yTicks.length - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'} strokeWidth={1} />
          <text x={pad + 4} y={t.y - 6} fontSize={10} fill="#9fb" >{(() => {
            const v = Number(t.v || 0) || 0;
            if (v > 0 && v < 0.000001) return '<0.000001';
            const fixed = v.toFixed(6);
            let out = fixed.replace(/0+$/,'').replace(/\.$/, '');
            if (out === '') out = '0';
            return out;
          })()}</text>
        </g>
      ))}

      {/* filled area */}
      {areaPath ? <path d={areaPath} fill="url(#ruggedArea)" /> : null}

      {/* glow behind line */}
      {smoothPath ? <path d={smoothPath} stroke="url(#ruggedLine)" strokeWidth="8" fill="none" opacity="0.12" filter="url(#glow)" strokeLinecap="round" strokeLinejoin="round" /> : null}

      {/* main line */}
      {smoothPath ? <path d={smoothPath} stroke="url(#ruggedLine)" strokeWidth="2.6" fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}

      {/* highlight last point */}
      {points.length ? (() => {
        const last = points[points.length - 1];
        return (
          <g>
            <circle cx={last.x} cy={last.y} r={4.2} fill="#ffd36a" stroke="#fff2" strokeWidth={0.6} />
            <circle cx={last.x} cy={last.y} r={2.2} fill="#1a1a1a" />
          </g>
        );
      })() : null}

    </svg>
  );
}
