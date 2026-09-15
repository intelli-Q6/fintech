import React, { useState, useId } from 'react';
import { formatINR } from '../../core/math/xirr';

// 1. High-Fidelity SVG Gradient Area Sparkline with Live Beacon Dot
export const Sparkline: React.FC<{
  data: number[];
  width?: number;
  height?: number;
  isPositive?: boolean;
}> = ({
  data,
  width = 72,
  height = 22,
  isPositive = true
}) => {
  const gradientId = useId();
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const usableH = height - pad * 2;
  const usableW = width - pad * 2;

  const points = data.map((val, idx) => {
    const x = pad + (idx / (data.length - 1)) * usableW;
    const y = height - pad - ((val - min) / range) * usableH;
    return { x, y, str: `${x.toFixed(1)},${y.toFixed(1)}` };
  });

  const pathD = `M ${points.map(p => p.str).join(' L ')}`;
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)},${height} L ${points[0].x.toFixed(1)},${height} Z`;

  const strokeColor = isPositive ? 'var(--color-gain)' : 'var(--color-loss)';
  const gradColor = isPositive ? '#10b981' : '#f43f5e';
  const lastPoint = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: 'visible', display: 'inline-block', verticalAlign: 'middle' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={gradColor} stopOpacity={0.32} />
          <stop offset="100%" stopColor={gradColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>

      {/* Area Gradient Fill */}
      <path d={areaD} fill={`url(#${gradientId})`} />

      {/* Sparkline Polyline */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Real-Time Last Tick Glowing Dot */}
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="2.5"
        fill={strokeColor}
        style={{ filter: `drop-shadow(0 0 3px ${strokeColor})` }}
      />
    </svg>
  );
};

// 2. Interactive SVG Donut Chart with Dynamic Center Readout & Slice Popout
export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

export const DonutChart: React.FC<{
  segments: DonutSegment[];
  size?: number;
  innerRadius?: number;
  onSelectSegment?: (seg: DonutSegment) => void;
}> = ({
  segments,
  size = 180,
  innerRadius = 54,
  onSelectSegment
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const radius = size / 2;
  let accumulatedAngle = 0;

  const activeSegment = hoveredIdx !== null ? segments[hoveredIdx] : null;
  const activePct = activeSegment
    ? ((activeSegment.value / total) * 100).toFixed(1)
    : '100';

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
      >
        {segments.map((seg, idx) => {
          const sliceAngle = (seg.value / total) * 360;
          const startAngle = accumulatedAngle;
          accumulatedAngle += sliceAngle;

          const startRad = (startAngle * Math.PI) / 180;
          const endRad = ((startAngle + sliceAngle) * Math.PI) / 180;

          const isHovered = hoveredIdx === idx;
          const currentRadius = isHovered ? radius + 3 : radius;
          const currentInner = isHovered ? innerRadius - 1 : innerRadius;

          const x1 = radius + currentRadius * Math.cos(startRad);
          const y1 = radius + currentRadius * Math.sin(startRad);
          const x2 = radius + currentRadius * Math.cos(endRad);
          const y2 = radius + currentRadius * Math.sin(endRad);

          const innerX1 = radius + currentInner * Math.cos(startRad);
          const innerY1 = radius + currentInner * Math.sin(startRad);
          const innerX2 = radius + currentInner * Math.cos(endRad);
          const innerY2 = radius + currentInner * Math.sin(endRad);

          const largeArcFlag = sliceAngle > 180 ? 1 : 0;

          const pathData = [
            `M ${innerX1} ${innerY1}`,
            `L ${x1} ${y1}`,
            `A ${currentRadius} ${currentRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            `L ${innerX2} ${innerY2}`,
            `A ${currentInner} ${currentInner} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1}`,
            'Z'
          ].join(' ');

          return (
            <path
              key={idx}
              d={pathData}
              fill={seg.color}
              stroke="var(--bg-surface)"
              strokeWidth="2"
              onMouseEnter={() => setHoveredIdx(idx)}
              onClick={() => onSelectSegment && onSelectSegment(seg)}
              style={{
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'pointer',
                opacity: hoveredIdx === null || isHovered ? 1 : 0.6,
                filter: isHovered ? `drop-shadow(0 0 6px ${seg.color})` : 'none'
              }}
            />
          );
        })}
      </svg>

      {/* Dynamic Center Readout on Segment Hover */}
      <div
        style={{
          position: 'absolute',
          textAlign: 'center',
          pointerEvents: 'none',
          maxWidth: innerRadius * 1.8,
          padding: 4
        }}
      >
        <div
          style={{
            fontSize: '9px',
            color: activeSegment ? activeSegment.color : 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {activeSegment ? activeSegment.name : 'Allocation'}
        </div>
        <div
          className="tabular-nums"
          style={{
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            marginTop: 1
          }}
        >
          {activePct}%
        </div>
        {activeSegment && (
          <div
            className="tabular-nums"
            style={{
              fontSize: '10px',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)'
            }}
          >
            {formatINR(activeSegment.value, { compact: true })}
          </div>
        )}
      </div>
    </div>
  );
};

// 3. Interactive Compound Wealth Area Chart for Calculators & Simulation Suites
export interface GrowthSchedulePoint {
  year: number;
  invested: number;
  interestEarned: number;
  closingBalance: number;
}

export const CompoundGrowthChart: React.FC<{
  schedule: GrowthSchedulePoint[];
  height?: number;
}> = ({ schedule, height = 200 }) => {
  const chartId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!schedule || schedule.length < 2) return null;

  const padLeft = 65;
  const padRight = 20;
  const padTop = 18;
  const padBottom = 28;
  const chartWidth = 560;

  const usableW = chartWidth - padLeft - padRight;
  const usableH = height - padTop - padBottom;

  const maxVal = Math.max(...schedule.map(s => s.closingBalance)) * 1.05 || 1;

  // Generate points for Invested line and Wealth line
  const wealthPoints = schedule.map((pt, idx) => {
    const x = padLeft + (idx / (schedule.length - 1)) * usableW;
    const y = padTop + usableH - (pt.closingBalance / maxVal) * usableH;
    return { x, y, pt };
  });

  const investedPoints = schedule.map((pt, idx) => {
    const x = padLeft + (idx / (schedule.length - 1)) * usableW;
    const y = padTop + usableH - (pt.invested / maxVal) * usableH;
    return { x, y, pt };
  });

  const wealthPathD = `M ${wealthPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
  const wealthAreaD = `${wealthPathD} L ${wealthPoints[wealthPoints.length - 1].x.toFixed(1)},${padTop + usableH} L ${wealthPoints[0].x.toFixed(1)},${padTop + usableH} Z`;

  const investedPathD = `M ${investedPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
  const investedAreaD = `${investedPathD} L ${investedPoints[investedPoints.length - 1].x.toFixed(1)},${padTop + usableH} L ${investedPoints[0].x.toFixed(1)},${padTop + usableH} Z`;

  // Determine hovered item (defaults to final maturity point)
  const activePt = hoverIndex !== null ? schedule[hoverIndex] : schedule[schedule.length - 1];
  const activeWealthCoord = hoverIndex !== null ? wealthPoints[hoverIndex] : wealthPoints[wealthPoints.length - 1];
  const activeInvestCoord = hoverIndex !== null ? investedPoints[hoverIndex] : investedPoints[investedPoints.length - 1];

  // Mouse move handler for scrubbing
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = chartWidth / rect.width;
    const relX = clientX * scaleX - padLeft;
    const ratio = Math.max(0, Math.min(1, relX / usableW));
    const targetIdx = Math.round(ratio * (schedule.length - 1));
    setHoverIndex(targetIdx);
  };

  // 3 Y-Axis Grid Marks
  const yTicks = [0.25, 0.6, 1.0].map(pct => {
    const val = maxVal * pct;
    const y = padTop + usableH - pct * usableH;
    return { val, y };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {/* Interactive Readout Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-subtle)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          flexWrap: 'wrap',
          gap: 6
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            YEAR {activePt.year}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Invested: <strong className="tabular-nums">{formatINR(activePt.invested, { compact: true })}</strong>
          </span>
          <span style={{ color: 'var(--color-gain)' }}>
            + Gains: <strong className="tabular-nums">+{formatINR(activePt.interestEarned, { compact: true })}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--text-muted)' }}>Corpus:</span>
          <span
            className="tabular-nums"
            style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}
          >
            {formatINR(activePt.closingBalance)}
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={`${chartId}-wealthGrad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.38} />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={`${chartId}-investedGrad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Horizontal Reference Grid Lines */}
        {yTicks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={padLeft}
              y1={t.y}
              x2={chartWidth - padRight}
              y2={t.y}
              stroke="var(--border-subtle)"
              strokeDasharray="3 3"
            />
            <text
              x={padLeft - 8}
              y={t.y + 3}
              textAnchor="end"
              fontSize="9"
              fill="var(--text-muted)"
              fontFamily="var(--font-mono)"
            >
              {formatINR(t.val, { compact: true })}
            </text>
          </g>
        ))}

        {/* Wealth Accumulation Area & Stroke */}
        <path d={wealthAreaD} fill={`url(#${chartId}-wealthGrad)`} />
        <path
          d={wealthPathD}
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Principal Invested Area & Stroke */}
        <path d={investedAreaD} fill={`url(#${chartId}-investedGrad)`} />
        <path
          d={investedPathD}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />

        {/* Vertical Crosshair Guide */}
        <line
          x1={activeWealthCoord.x}
          y1={padTop}
          x2={activeWealthCoord.x}
          y2={padTop + usableH}
          stroke="var(--accent-primary)"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity={0.8}
        />

        {/* Active Intersection Dots */}
        <circle
          cx={activeWealthCoord.x}
          cy={activeWealthCoord.y}
          r="4"
          fill="var(--accent-primary)"
          stroke="var(--bg-canvas)"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 5px var(--accent-glow))' }}
        />
        <circle
          cx={activeInvestCoord.x}
          cy={activeInvestCoord.y}
          r="3"
          fill="#94a3b8"
          stroke="var(--bg-canvas)"
          strokeWidth="1.5"
        />

        {/* X-Axis Baseline */}
        <line
          x1={padLeft}
          y1={padTop + usableH}
          x2={chartWidth - padRight}
          y2={padTop + usableH}
          stroke="var(--border-default)"
          strokeWidth="1"
        />

        {/* X-Axis Year Labels (First, Mid, Last) */}
        <text
          x={padLeft}
          y={padTop + usableH + 16}
          textAnchor="start"
          fontSize="10"
          fill="var(--text-muted)"
          fontFamily="var(--font-mono)"
        >
          Yr 1
        </text>
        {schedule.length > 4 && (
          <text
            x={padLeft + usableW / 2}
            y={padTop + usableH + 16}
            textAnchor="middle"
            fontSize="10"
            fill="var(--text-muted)"
            fontFamily="var(--font-mono)"
          >
            Yr {Math.round(schedule.length / 2)}
          </text>
        )}
        <text
          x={chartWidth - padRight}
          y={padTop + usableH + 16}
          textAnchor="end"
          fontSize="10"
          fill="var(--text-muted)"
          fontFamily="var(--font-mono)"
        >
          Yr {schedule[schedule.length - 1].year}
        </text>
      </svg>

      {/* Legend Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 3, background: 'var(--accent-primary)', borderRadius: 2 }} />
          <span>Compound Wealth Corpus</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 2, background: '#94a3b8', borderBottom: '1px dashed #94a3b8' }} />
          <span>Cumulative Capital Invested</span>
        </div>
      </div>
    </div>
  );
};
