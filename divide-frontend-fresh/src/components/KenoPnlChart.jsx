import React from 'react';
import { formatCurrency } from '../utils/format';

// Simple SVG line chart for session PnL: expects `points` array of { t: timestamp, wager: number, profit: number }
export default function KenoPnlChart({ points, width = 420, height = 180 }) {
  // Single-line profit chart. Points is array of { t, wager, profit } cumulative.
  if (!points || points.length === 0) return <div style={{ padding: 12, color: '#9fb' }}>No rounds to display.</div>;

  const padding = 24;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const xs = points.map(p => p.t);
  const minT = Math.min(...xs);
  const maxT = Math.max(...xs);
  const toX = (t) => (maxT === minT) ? padding + innerW / 2 : padding + ((t - minT) / (maxT - minT)) * innerW;

  const profits = points.map(p => p.profit);
  let minY = Math.min(...profits);
  let maxY = Math.max(...profits);
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const toY = (v) => padding + innerH - ((v - minY) / (maxY - minY)) * innerH;

  const makePath = (arr) => arr.map((p,i)=> `${i===0?'M':'L'} ${toX(p.t)} ${toY(p.profit)}`).join(' ');
  const tickTimes = [minT, (minT+maxT)/2, maxT];
  const fmt = (ts) => new Date(ts).toLocaleTimeString();

  const last = points[points.length-1];
  const isProfitable = last.profit > 0;
  const profitColor = isProfitable ? '#38c172' : '#ff0044';

  return (
    <svg width={width} height={height} style={{ background: 'transparent' }}>
      <defs>
        <linearGradient id="gProfitSmall" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={profitColor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={profitColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* grid */}
      {[0,0.25,0.5,0.75,1].map((v,i)=>(
        <line key={i} x1={padding} x2={width-padding} y1={padding + v*innerH} y2={padding + v*innerH} stroke="#0b2230" strokeWidth={1} />
      ))}

  {/* profit area */}
  <path d={`${makePath(points)} L ${padding+innerW} ${padding+innerH} L ${padding} ${padding+innerH} Z`} fill="url(#gProfitSmall)" />
  {/* profit line */}
  <path d={makePath(points)} fill="none" stroke={profitColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />

      {/* zero line */}
      {minY < 0 && maxY > 0 ? (<line x1={padding} x2={width-padding} y1={toY(0)} y2={toY(0)} stroke="#445" strokeDasharray="3 4" />) : null}

      {/* x ticks */}
      {tickTimes.map((t,i)=>(
        <g key={i} transform={`translate(${toX(t)}, ${height - padding + 6})`}>
          <text x={0} y={12} fontSize={11} fill="#9fb" textAnchor="middle">{fmt(t)}</text>
        </g>
      ))}

      {/* current stats (profit and wager) */}
      <g transform={`translate(${padding}, ${6})`}>
  <text x={0} y={12} fontSize={12} fill={isProfitable ? '#9ef0b9' : '#ff8b9b'} style={{ fontWeight: 700 }}>Profit: ${formatCurrency(last.profit, 2)}</text>
  <text x={160} y={12} fontSize={11} fill="#9fb">Wagered: ${formatCurrency(last.wager, 2)}</text>
      </g>
    </svg>
  );
}
