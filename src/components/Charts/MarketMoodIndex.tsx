import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, Info, ShieldCheck, Activity, Compass, AlertCircle, RefreshCw } from 'lucide-react';
import { mmiService, MMIData } from '../../core/api/mmiService';

export interface MMIGaugeProps {
  value?: number;
  size?: number;
  showLabels?: boolean;
  showTitle?: boolean;
  lastUpdated?: string;
  onClick?: () => void;
}

// Polar to cartesian coordinate conversion for SVG gauge
function polarToCartesian(cx: number, cy: number, r: number, angleDegrees: number) {
  const angleInRadians = (angleDegrees * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy - r * Math.sin(angleInRadians)
  };
}

// Describe SVG arc in degrees (decreasing angle = clockwise on screen)
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const sweep = startAngle >= endAngle ? startAngle - endAngle : 360 - (endAngle - startAngle);
  const largeArcFlag = sweep <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

// SEBI Compliant Objective Sentiment Zones (Zero Buy/Sell Recommendations)
export const getMMIZone = (val: number) => {
  if (val < 30) {
    return {
      label: 'Extreme Fear',
      color: '#00c288',
      lightBg: 'rgba(0, 194, 136, 0.12)',
      sentimentTag: 'HIGH RISK AVERSION',
      description: 'Market participants displaying elevated risk aversion. Volatility elevated relative to short-term baseline.'
    };
  } else if (val < 50) {
    return {
      label: 'Fear',
      color: '#f59e0b',
      lightBg: 'rgba(245, 158, 11, 0.12)',
      sentimentTag: 'ELEVATED CAUTION',
      description: 'Cautious market sentiment with defensive posture and selective positioning across sectors.'
    };
  } else if (val < 70) {
    return {
      label: 'Greed',
      color: '#f97316',
      lightBg: 'rgba(249, 115, 22, 0.12)',
      sentimentTag: 'POSITIVE MOMENTUM',
      description: 'Constructive risk appetite observed across large-cap and mid-cap market segments.'
    };
  } else {
    return {
      label: 'Extreme Greed',
      color: '#ef4444',
      lightBg: 'rgba(239, 68, 68, 0.12)',
      sentimentTag: 'EXTENDED MOMENTUM',
      description: 'Extended bullish momentum. Key market indices trading significantly above historical moving averages.'
    };
  }
};

/**
 * Authentic Semicircular MMI Speedometer Gauge
 * Total sweep: 240 degrees (210° down-left to -30° down-right)
 */
export const MMIGauge: React.FC<MMIGaugeProps> = ({
  value = 10.36,
  size = 240,
  showLabels = true,
  showTitle = false,
  lastUpdated,
  onClick
}) => {
  const zone = getMMIZone(value);
  const clampedVal = Math.max(0, Math.min(100, value));

  // Gauge coordinate geometry
  const cx = 140;
  const cy = 125;
  const rOuter = 95;
  const rTrack = 82;
  const trackWidth = 14;

  // Gauge angle calculation (0 -> 210°, 30 -> 138°, 50 -> 90°, 70 -> 42°, 100 -> -30°)
  const needleAngle = 210 - (clampedVal / 100) * 240;
  const needleTip = polarToCartesian(cx, cy, rTrack - 12, needleAngle);

  // Active wedge sector end angle
  const wedgeStart = polarToCartesian(cx, cy, rTrack + trackWidth / 2, 210);
  const wedgeEnd = polarToCartesian(cx, cy, rTrack + trackWidth / 2, 138);

  // Arc path IDs for text labels
  const uniqueId = React.useId().replace(/:/g, '');

  const displayTimestamp = lastUpdated || 'Live Market Hours';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
    >
      {showTitle && (
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
            Know what's the sentiment on the street today
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginTop: 2 }}>
            Market Mood Indicator (MMI)
          </div>
        </div>
      )}

      <svg
        width={size}
        height={size * 0.78}
        viewBox="0 0 280 220"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Arc Paths for Curved Text Labels */}
          <path id={`arc-ef-${uniqueId}`} d={describeArc(cx, cy, rOuter + 8, 206, 142)} fill="none" />
          <path id={`arc-fear-${uniqueId}`} d={describeArc(cx, cy, rOuter + 8, 134, 94)} fill="none" />
          <path id={`arc-greed-${uniqueId}`} d={describeArc(cx, cy, rOuter + 8, 86, 46)} fill="none" />
          <path id={`arc-eg-${uniqueId}`} d={describeArc(cx, cy, rOuter + 8, 38, -26)} fill="none" />
        </defs>

        {/* 1. Translucent Active Sector Wedge */}
        {value < 30 && (
          <path
            d={`M ${cx} ${cy} L ${wedgeStart.x} ${wedgeStart.y} A ${rTrack + trackWidth / 2} ${rTrack + trackWidth / 2} 0 0 1 ${wedgeEnd.x} ${wedgeEnd.y} Z`}
            fill="rgba(0, 194, 136, 0.12)"
          />
        )}

        {/* 2. Base Neutral Track */}
        <path
          d={describeArc(cx, cy, rTrack, 210, -30)}
          fill="none"
          stroke="var(--bg-subtle, rgba(255,255,255,0.08))"
          strokeWidth={trackWidth}
          strokeLinecap="round"
        />

        {/* 3. Outer Thin Colored Perimeter Rings with Zones */}
        {/* Extreme Fear: 210° to 138° */}
        <path
          d={describeArc(cx, cy, rOuter, 210, 138)}
          fill="none"
          stroke="#00c288"
          strokeWidth={1.5}
        />
        {/* Fear: 138° to 90° */}
        <path
          d={describeArc(cx, cy, rOuter, 138, 90)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1.5}
        />
        {/* Greed: 90° to 42° */}
        <path
          d={describeArc(cx, cy, rOuter, 90, 42)}
          fill="none"
          stroke="#f97316"
          strokeWidth={1.5}
        />
        {/* Extreme Greed: 42° to -30° */}
        <path
          d={describeArc(cx, cy, rOuter, 42, -30)}
          fill="none"
          stroke="#ef4444"
          strokeWidth={1.5}
        />

        {/* Zone Separation Radial Tick Marks */}
        {[
          { angle: 210, color: '#00c288' },
          { angle: 138, color: '#f59e0b' },
          { angle: 90, color: '#f59e0b' },
          { angle: 42, color: '#f97316' },
          { angle: -30, color: '#ef4444' }
        ].map((tick, i) => {
          const p1 = polarToCartesian(cx, cy, rOuter - 4, tick.angle);
          const p2 = polarToCartesian(cx, cy, rOuter + 4, tick.angle);
          return (
            <line
              key={i}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={tick.color}
              strokeWidth={1.5}
            />
          );
        })}

        {/* 4. Active Highlight Arc for Current Zone */}
        {value < 30 ? (
          <path
            d={describeArc(cx, cy, rTrack, 210, 138)}
            fill="none"
            stroke="#00c288"
            strokeWidth={trackWidth}
            strokeLinecap="round"
          />
        ) : value < 50 ? (
          <path
            d={describeArc(cx, cy, rTrack, 138, 90)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={trackWidth}
          />
        ) : value < 70 ? (
          <path
            d={describeArc(cx, cy, rTrack, 90, 42)}
            fill="none"
            stroke="#f97316"
            strokeWidth={trackWidth}
          />
        ) : (
          <path
            d={describeArc(cx, cy, rTrack, 42, -30)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={trackWidth}
            strokeLinecap="round"
          />
        )}

        {/* 5. Curved Perimeter Labels */}
        {showLabels && (
          <>
            <text fontSize="7.5" fontWeight="700" fill="#00c288" letterSpacing="0.05em">
              <textPath href={`#arc-ef-${uniqueId}`} startOffset="50%" textAnchor="middle">
                EXTREME FEAR
              </textPath>
            </text>
            <text fontSize="8" fontWeight="700" fill="#f59e0b" letterSpacing="0.05em">
              <textPath href={`#arc-fear-${uniqueId}`} startOffset="50%" textAnchor="middle">
                FEAR
              </textPath>
            </text>
            <text fontSize="8" fontWeight="700" fill="#f97316" letterSpacing="0.05em">
              <textPath href={`#arc-greed-${uniqueId}`} startOffset="50%" textAnchor="middle">
                GREED
              </textPath>
            </text>
            <text fontSize="7.5" fontWeight="700" fill="#ef4444" letterSpacing="0.05em">
              <textPath href={`#arc-eg-${uniqueId}`} startOffset="50%" textAnchor="middle">
                EXTREME GREED
              </textPath>
            </text>
          </>
        )}

        {/* 6. Dynamic Needle Pointer */}
        <line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke={zone.color}
          strokeWidth={4.5}
          strokeLinecap="round"
        />
        {/* Center Hub Circle */}
        <circle cx={cx} cy={cy} r={6.5} fill={zone.color} />
        <circle cx={cx} cy={cy} r={2.5} fill="#ffffff" />

        {/* 7. Centered Score Display */}
        <text
          x={cx}
          y={cy + 34}
          textAnchor="middle"
          fontSize="26"
          fontWeight="800"
          fontFamily="var(--font-mono, monospace)"
          fill={zone.color}
          letterSpacing="-0.03em"
        >
          {value.toFixed(2)}
        </text>

        {/* Subtitle / Timestamp */}
        <text
          x={cx}
          y={cy + 52}
          textAnchor="middle"
          fontSize="9.5"
          fill="var(--text-muted, #94a3b8)"
          fontWeight="500"
        >
          {displayTimestamp}
        </text>
      </svg>
    </div>
  );
};

/**
 * Compact Header Card for the Dashboard indicated spot
 */
export const MMIHeaderWidget: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  const [mmiData, setMmiData] = useState<MMIData>(() => mmiService.getCurrentMMI());

  useEffect(() => {
    const unsub = mmiService.subscribe(data => {
      setMmiData(data);
    });
    return unsub;
  }, []);

  const zone = getMMIZone(mmiData.value);

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      title="Market Mood Indicator (MMI) — Click to inspect live street sentiment drivers"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 14px 6px 8px',
        background: 'var(--bg-surface, rgba(255,255,255,0.02))',
        border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
        borderRadius: 'var(--radius-md, 10px)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1))',
        userSelect: 'none'
      }}
      className="mmi-header-card"
    >
      {/* Mini Gauge Representation */}
      <div style={{ pointerEvents: 'none' }}>
        <MMIGauge
          value={mmiData.value}
          size={82}
          showLabels={false}
          lastUpdated={mmiData.lastUpdated}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Market Mood Indicator (MMI)
          </span>
          <span
            style={{
              fontSize: '8.5px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 4,
              background: zone.lightBg,
              color: zone.color,
              letterSpacing: '0.04em'
            }}
          >
            {zone.sentimentTag}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: zone.color,
              letterSpacing: '-0.02em'
            }}
          >
            {mmiData.value.toFixed(2)}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {zone.label}
          </span>
        </div>

        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {mmiData.lastUpdated} • Click to inspect
        </span>
      </div>
    </div>
  );
};

/**
 * Full Detailed MMI Modal matching Image 2
 * Fully responsive fixed overlay with keyboard escape handling
 */
export const MMIModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [mmiData, setMmiData] = useState<MMIData>(() => mmiService.getCurrentMMI());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const unsub = mmiService.subscribe(data => {
      setMmiData(data);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsub();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const zone = getMMIZone(mmiData.value);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await mmiService.fetchLiveMMI(true);
    setIsRefreshing(false);
  };

  const zonesList = [
    {
      range: '< 30',
      name: 'Extreme Fear',
      color: '#00c288',
      desc: 'Elevated market risk aversion. Volatility elevated relative to short-term baseline, with widespread cautious positioning.',
      active: mmiData.value < 30
    },
    {
      range: '30 - 50',
      name: 'Fear',
      color: '#f59e0b',
      desc: 'Cautious sentiment prevailing across participants with defensive sector rotation and consolidation.',
      active: mmiData.value >= 30 && mmiData.value < 50
    },
    {
      range: '50 - 70',
      name: 'Greed',
      color: '#f97316',
      desc: 'Constructive risk appetite observed with broad-based market participation and positive index momentum.',
      active: mmiData.value >= 50 && mmiData.value < 70
    },
    {
      range: '> 70',
      name: 'Extreme Greed',
      color: '#ef4444',
      desc: 'Extended bullish momentum. Key market indices trading significantly extended above historical moving averages.',
      active: mmiData.value >= 70
    }
  ];

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 640,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px 28px',
          background: 'var(--surface, #0f172a)',
          border: '1px solid var(--border-subtle, #334155)',
          borderRadius: 'var(--radius-lg, 14px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          position: 'relative'
        }}
      >
        {/* Top Header Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            style={{ gap: 5, fontSize: '11px', padding: '3px 8px' }}
            title="Refresh Live Research Feed"
          >
            <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Updating...' : 'Live Refresh'}</span>
          </button>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Header matching Image 2 */}
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Know what's the sentiment on the street today
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0 0 0', color: 'var(--text-primary)' }}>
            Market Mood Indicator (MMI)
          </h2>
        </div>

        {/* Large Centered Gauge matching Image 2 */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 16px 0' }}>
          <MMIGauge
            value={mmiData.value}
            size={280}
            showLabels={true}
            lastUpdated={mmiData.lastUpdated}
          />
        </div>

        {/* Real-Time Sentiment State Banner */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            background: zone.lightBg,
            border: `1px solid ${zone.color}33`,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: zone.color, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: zone.color }}>
              Current Sentiment: {zone.label} ({mmiData.value.toFixed(2)}) — {zone.sentimentTag}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 2 }}>
              {zone.description}
            </div>
          </div>
        </div>

        {/* 4 Zones Breakdown Table */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
            MMI Sentiment Zones
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {zonesList.map(z => (
              <div
                key={z.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: z.active ? z.color + '18' : 'var(--bg-subtle, rgba(255,255,255,0.02))',
                  border: z.active ? `1px solid ${z.color}44` : '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
                  fontSize: '11px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: z.color }} />
                  <strong style={{ color: z.color }}>{z.name}</strong>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>({z.range})</span>
                </div>
                <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '11px', textAlign: 'right' }}>
                  {z.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contributing Street Factors (Live Market Inputs) */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Live Street Factors & Market Inputs
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
            {mmiData.factors.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-subtle, rgba(255,255,255,0.02))',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
                  borderRadius: 6,
                  fontSize: '11px'
                }}
              >
                <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{f.label}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.value}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{f.sentiment}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regulatory Compliance & Non-Advisory Notice */}
        <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.5, textAlign: 'center' }}>
          <strong>Regulatory Notice:</strong> The Market Mood Indicator (MMI) is a mathematical sentiment model evaluating volatility, market breadth, and institutional activity. KoshQ does not provide buy/sell calls, target prices, or investment recommendations in accordance with SEBI guidelines.
        </div>
      </div>
    </div>,
    document.body
  );
};
