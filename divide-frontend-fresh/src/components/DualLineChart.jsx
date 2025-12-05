// src/components/DualLineChart.jsx
// Polymarket-style dual line chart showing Option A vs B percentage over time
import React, { useMemo } from 'react';

export default function DualLineChart({ 
  voteHistory = [], 
  optionALabel = 'Option A',
  optionBLabel = 'Option B',
  colorA = '#ff1744',
  colorB = '#2979ff',
  height = 120,
  showLabels = true,
}) {
  // Process vote history into percentage data points
  const chartData = useMemo(() => {
    if (!voteHistory || voteHistory.length === 0) return [];
    
    return voteHistory.map((point, index) => {
      const total = (point.shortsA || 0) + (point.shortsB || 0);
      const pctA = total > 0 ? ((point.shortsA || 0) / total) * 100 : 50;
      const pctB = total > 0 ? ((point.shortsB || 0) / total) * 100 : 50;
      return {
        index,
        timestamp: point.timestamp,
        pctA,
        pctB,
        shortsA: point.shortsA || 0,
        shortsB: point.shortsB || 0,
        pot: point.pot || 0,
      };
    });
  }, [voteHistory]);

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <div style={{
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '12px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '8px',
      }}>
        No transaction history
      </div>
    );
  }

  // SVG dimensions
  const width = 300;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scale functions
  const xScale = (index) => padding.left + (index / Math.max(1, chartData.length - 1)) * chartWidth;
  const yScale = (pct) => padding.top + ((100 - pct) / 100) * chartHeight;

  // Generate path for a line
  const generatePath = (data, key) => {
    if (data.length === 0) return '';
    
    const points = data.map((d, i) => {
      const x = xScale(i);
      const y = yScale(d[key]);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });
    
    return points.join(' ');
  };

  // Generate area path (for gradient fill under line)
  const generateAreaPath = (data, key) => {
    if (data.length === 0) return '';
    
    const linePath = data.map((d, i) => {
      const x = xScale(i);
      const y = yScale(d[key]);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    // Close the path to bottom
    const lastX = xScale(data.length - 1);
    const firstX = xScale(0);
    const bottomY = padding.top + chartHeight;
    
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const pathA = generatePath(chartData, 'pctA');
  const pathB = generatePath(chartData, 'pctB');
  const areaA = generateAreaPath(chartData, 'pctA');
  const areaB = generateAreaPath(chartData, 'pctB');

  // Final percentages
  const finalA = chartData.length > 0 ? chartData[chartData.length - 1].pctA : 50;
  const finalB = chartData.length > 0 ? chartData[chartData.length - 1].pctB : 50;

  return (
    <div style={{ width: '100%' }}>
      <svg 
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Gradient for Option A area */}
          <linearGradient id="gradientA" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colorA} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colorA} stopOpacity="0.02" />
          </linearGradient>
          {/* Gradient for Option B area */}
          <linearGradient id="gradientB" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colorB} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colorB} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line 
          x1={padding.left} 
          y1={yScale(50)} 
          x2={width - padding.right} 
          y2={yScale(50)} 
          stroke="rgba(255,255,255,0.08)" 
          strokeDasharray="4,4"
        />
        <line 
          x1={padding.left} 
          y1={yScale(75)} 
          x2={width - padding.right} 
          y2={yScale(75)} 
          stroke="rgba(255,255,255,0.04)" 
          strokeDasharray="2,4"
        />
        <line 
          x1={padding.left} 
          y1={yScale(25)} 
          x2={width - padding.right} 
          y2={yScale(25)} 
          stroke="rgba(255,255,255,0.04)" 
          strokeDasharray="2,4"
        />

        {/* Area fills */}
        <path d={areaA} fill="url(#gradientA)" />
        <path d={areaB} fill="url(#gradientB)" />

        {/* Lines */}
        <path 
          d={pathA} 
          fill="none" 
          stroke={colorA} 
          strokeWidth="2" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path 
          d={pathB} 
          fill="none" 
          stroke={colorB} 
          strokeWidth="2" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End points */}
        {chartData.length > 0 && (
          <>
            <circle 
              cx={xScale(chartData.length - 1)} 
              cy={yScale(finalA)} 
              r="4" 
              fill={colorA}
              stroke="#0a0a0c"
              strokeWidth="2"
            />
            <circle 
              cx={xScale(chartData.length - 1)} 
              cy={yScale(finalB)} 
              r="4" 
              fill={colorB}
              stroke="#0a0a0c"
              strokeWidth="2"
            />
          </>
        )}

        {/* Y-axis labels */}
        <text x={padding.left - 2} y={yScale(100) + 4} fontSize="8" fill="rgba(255,255,255,0.3)" textAnchor="end">100%</text>
        <text x={padding.left - 2} y={yScale(50) + 3} fontSize="8" fill="rgba(255,255,255,0.3)" textAnchor="end">50%</text>
        <text x={padding.left - 2} y={yScale(0)} fontSize="8" fill="rgba(255,255,255,0.3)" textAnchor="end">0%</text>
      </svg>

      {/* Legend */}
      {showLabels && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '10px',
              height: '3px',
              borderRadius: '2px',
              background: colorA,
            }} />
            <span style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: '500',
            }}>
              {optionALabel}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: colorA,
              fontFamily: "'SF Mono', monospace",
            }}>
              {finalA.toFixed(0)}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '10px',
              height: '3px',
              borderRadius: '2px',
              background: colorB,
            }} />
            <span style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: '500',
            }}>
              {optionBLabel}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: colorB,
              fontFamily: "'SF Mono', monospace",
            }}>
              {finalB.toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
