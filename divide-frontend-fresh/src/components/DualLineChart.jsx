// src/components/DualLineChart.jsx
// Rugged-style dual line chart for ended divides - smooth curves, gradients, glow
import React, { useMemo } from 'react';

export default function DualLineChart({ 
  voteHistory = [], 
  optionALabel = 'Option A',
  optionBLabel = 'Option B',
  colorA = '#ff1744',
  colorB = '#2979ff',
  height = 140,
  showLabels = true,
}) {
  const width = 320;
  const pad = 16;
  const w = width - pad * 2;
  const h = height - pad * 2 - 20; // Leave room for legend

  // Process vote history into percentage data points
  const chartData = useMemo(() => {
    if (!voteHistory || voteHistory.length === 0) return [];
    
    return voteHistory.map((point, index) => {
      const total = (point.shortsA || 0) + (point.shortsB || 0);
      const pctA = total > 0 ? ((point.shortsA || 0) / total) * 100 : 50;
      const pctB = total > 0 ? ((point.shortsB || 0) / total) * 100 : 50;
      return { index, pctA, pctB };
    });
  }, [voteHistory]);

  // Convert data to SVG points
  const pointsA = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    return chartData.map((d, i) => ({
      x: pad + (i / Math.max(1, chartData.length - 1)) * w,
      y: pad + (1 - d.pctA / 100) * h,
      pct: d.pctA,
    }));
  }, [chartData, w, h]);

  const pointsB = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    return chartData.map((d, i) => ({
      x: pad + (i / Math.max(1, chartData.length - 1)) * w,
      y: pad + (1 - d.pctB / 100) * h,
      pct: d.pctB,
    }));
  }, [chartData, w, h]);

  // Catmull-Rom to Bezier curve conversion for smooth lines
  const cr2bezier = (pts) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    
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

  const smoothPathA = useMemo(() => cr2bezier(pointsA), [pointsA]);
  const smoothPathB = useMemo(() => cr2bezier(pointsB), [pointsB]);

  // Area paths (line + close to bottom)
  const areaPathA = useMemo(() => {
    if (!pointsA || pointsA.length === 0) return '';
    const last = pointsA[pointsA.length - 1];
    const first = pointsA[0];
    const bottomY = pad + h;
    return `${smoothPathA} L ${last.x.toFixed(2)} ${bottomY} L ${first.x.toFixed(2)} ${bottomY} Z`;
  }, [smoothPathA, pointsA, h]);

  const areaPathB = useMemo(() => {
    if (!pointsB || pointsB.length === 0) return '';
    const last = pointsB[pointsB.length - 1];
    const first = pointsB[0];
    const bottomY = pad + h;
    return `${smoothPathB} L ${last.x.toFixed(2)} ${bottomY} L ${first.x.toFixed(2)} ${bottomY} Z`;
  }, [smoothPathB, pointsB, h]);

  // Y-axis grid ticks
  const yTicks = useMemo(() => {
    return [0, 25, 50, 75, 100].map(pct => ({
      pct,
      y: pad + (1 - pct / 100) * h,
    }));
  }, [h]);

  // Final percentages
  const finalA = pointsA.length > 0 ? pointsA[pointsA.length - 1].pct : 50;
  const finalB = pointsB.length > 0 ? pointsB[pointsB.length - 1].pct : 50;

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <div style={{
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '11px',
        background: 'linear-gradient(180deg, #06080a 0%, #0a0c10 100%)',
        borderRadius: '8px',
      }}>
        No transaction history
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <svg 
        width="100%" 
        viewBox={`0 0 ${width} ${height - 24}`}
        style={{ display: 'block', borderRadius: 8 }}
      >
        <defs>
          {/* Background gradient */}
          <linearGradient id="chartBg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#06080a" />
            <stop offset="50%" stopColor="#0a0c10" />
            <stop offset="100%" stopColor="#080a0e" />
          </linearGradient>
          
          {/* Area gradient A (red) */}
          <linearGradient id="areaGradA" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colorA} stopOpacity="0.25" />
            <stop offset="60%" stopColor={colorA} stopOpacity="0.08" />
            <stop offset="100%" stopColor={colorA} stopOpacity="0.02" />
          </linearGradient>
          
          {/* Area gradient B (blue) */}
          <linearGradient id="areaGradB" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colorB} stopOpacity="0.25" />
            <stop offset="60%" stopColor={colorB} stopOpacity="0.08" />
            <stop offset="100%" stopColor={colorB} stopOpacity="0.02" />
          </linearGradient>

          {/* Line gradient A */}
          <linearGradient id="lineGradA" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="100%" stopColor={colorA} />
          </linearGradient>

          {/* Line gradient B */}
          <linearGradient id="lineGradB" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#64b5f6" />
            <stop offset="100%" stopColor={colorB} />
          </linearGradient>

          {/* Glow filters */}
          <filter id="glowA" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowB" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="100%" height="100%" fill="url(#chartBg)" rx="8" />

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line 
              x1={pad} 
              x2={width - pad} 
              y1={t.y} 
              y2={t.y} 
              stroke={t.pct === 50 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'} 
              strokeWidth={1}
              strokeDasharray={t.pct === 50 ? '4 4' : '2 4'}
            />
            <text 
              x={pad + 2} 
              y={t.y - 4} 
              fontSize={8} 
              fill="rgba(255,255,255,0.25)"
            >
              {t.pct}%
            </text>
          </g>
        ))}

        {/* Area fills */}
        {areaPathA && <path d={areaPathA} fill="url(#areaGradA)" />}
        {areaPathB && <path d={areaPathB} fill="url(#areaGradB)" />}

        {/* Glow behind lines */}
        {smoothPathA && (
          <path 
            d={smoothPathA} 
            stroke={colorA}
            strokeWidth="6" 
            fill="none" 
            opacity="0.15" 
            filter="url(#glowA)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {smoothPathB && (
          <path 
            d={smoothPathB} 
            stroke={colorB}
            strokeWidth="6" 
            fill="none" 
            opacity="0.15" 
            filter="url(#glowB)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Main lines */}
        {smoothPathA && (
          <path 
            d={smoothPathA} 
            stroke="url(#lineGradA)"
            strokeWidth="2.5" 
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {smoothPathB && (
          <path 
            d={smoothPathB} 
            stroke="url(#lineGradB)"
            strokeWidth="2.5" 
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* End points */}
        {pointsA.length > 0 && (() => {
          const last = pointsA[pointsA.length - 1];
          return (
            <g>
              <circle cx={last.x} cy={last.y} r={5} fill={colorA} stroke="#0a0a0c" strokeWidth={2} />
              <circle cx={last.x} cy={last.y} r={2} fill="#fff" opacity={0.6} />
            </g>
          );
        })()}
        {pointsB.length > 0 && (() => {
          const last = pointsB[pointsB.length - 1];
          return (
            <g>
              <circle cx={last.x} cy={last.y} r={5} fill={colorB} stroke="#0a0a0c" strokeWidth={2} />
              <circle cx={last.x} cy={last.y} r={2} fill="#fff" opacity={0.6} />
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      {showLabels && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          marginTop: '6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '12px',
              height: '3px',
              borderRadius: '2px',
              background: `linear-gradient(90deg, #ff6b6b, ${colorA})`,
              boxShadow: `0 0 6px ${colorA}50`,
            }} />
            <span style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.5)',
              fontWeight: '500',
              maxWidth: '60px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {optionALabel}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: colorA,
              fontFamily: "'SF Mono', monospace",
              textShadow: `0 0 8px ${colorA}40`,
            }}>
              {finalA.toFixed(0)}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '12px',
              height: '3px',
              borderRadius: '2px',
              background: `linear-gradient(90deg, #64b5f6, ${colorB})`,
              boxShadow: `0 0 6px ${colorB}50`,
            }} />
            <span style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.5)',
              fontWeight: '500',
              maxWidth: '60px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {optionBLabel}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: colorB,
              fontFamily: "'SF Mono', monospace",
              textShadow: `0 0 8px ${colorB}40`,
            }}>
              {finalB.toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
