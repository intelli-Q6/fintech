import React, { useState, useMemo } from 'react';
import { HistoricalPricePoint, TimeframeKey } from '../../data/types';
import { formatINR, formatPercent } from '../../core/math/xirr';
import { TrendingUp, BarChart2, ShieldAlert } from 'lucide-react';

interface PriceChartProps {
  history?: Record<TimeframeKey, HistoricalPricePoint[]>;
  currentPrice: number;
  symbol: string;
  height?: number;
}

type ChartMode = 'area' | 'candlestick' | 'drawdown';

export const PriceChart: React.FC<PriceChartProps> = ({
  history,
  currentPrice,
  symbol,
  height = 280
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('1Y');
  const [chartMode, setChartMode] = useState<ChartMode>('area');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points: HistoricalPricePoint[] = useMemo(() => {
    if (history && history[timeframe] && history[timeframe].length > 0) {
      return history[timeframe];
    }
    // Fallback if no history provided
    return [
      { date: '2024-01-01', open: currentPrice * 0.9, high: currentPrice * 0.92, low: currentPrice * 0.88, close: currentPrice * 0.91, volume: 100000 },
      { date: '2024-06-01', open: currentPrice * 0.95, high: currentPrice * 0.98, low: currentPrice * 0.94, close: currentPrice * 0.97, volume: 120000 },
      { date: '2024-09-15', open: currentPrice * 0.99, high: currentPrice * 1.02, low: currentPrice * 0.98, close: currentPrice, volume: 140000 }
    ];
  }, [history, timeframe, currentPrice]);

  const startPrice = points[0]?.close || currentPrice;
  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : points[points.length - 1];
  const activePrice = activePoint?.close || currentPrice;
  const periodDiff = activePrice - startPrice;
  const periodDiffPercent = startPrice > 0 ? (periodDiff / startPrice) * 100 : 0;
  const isGain = periodDiff >= 0;

  // Chart dimensions & padding
  const padding = { top: 20, right: 15, bottom: 45, left: 10 };
  const width = 600; // SVG viewBox coordinate width
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const volumeHeight = 40; // reserved at bottom of plot

  // Min and Max prices for Price & Candlestick Modes
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;
    points.forEach(p => {
      const low = chartMode === 'candlestick' ? p.low : p.close;
      const high = chartMode === 'candlestick' ? p.high : p.close;
      if (low < min) min = low;
      if (high > max) max = high;
      if (p.volume > maxVol) maxVol = p.volume;
    });
    const spread = max - min === 0 ? max * 0.1 : max - min;
    return {
      minPrice: Math.max(0, min - spread * 0.08),
      maxPrice: max + spread * 0.08,
      maxVolume: maxVol > 0 ? maxVol : 1
    };
  }, [points, chartMode]);

  // Drawdown calculation: peak-to-trough drop from running high
  const drawdownData = useMemo(() => {
    let peak = -Infinity;
    return points.map(p => {
      if (p.close > peak) peak = p.close;
      const dd = peak > 0 ? ((p.close - peak) / peak) * 100 : 0;
      return { date: p.date, drawdown: dd, price: p.close };
    });
  }, [points]);

  const maxDrawdown = useMemo(() => {
    return Math.min(...drawdownData.map(d => d.drawdown), 0);
  }, [drawdownData]);

  // Scale helpers
  const getX = (index: number) => {
    if (points.length <= 1) return padding.left;
    return padding.left + (index / (points.length - 1)) * plotWidth;
  };

  const getY = (price: number) => {
    const range = maxPrice - minPrice || 1;
    const effectiveHeight = plotHeight - volumeHeight;
    return padding.top + (1 - (price - minPrice) / range) * effectiveHeight;
  };

  const getDrawdownY = (dd: number) => {
    const minDD = Math.min(maxDrawdown, -5); // at least -5% scale
    const norm = Math.max(0, Math.min(1, dd / minDD)); // 0 is top, 1 is max drawdown
    return padding.top + norm * (plotHeight - 15);
  };

  const getVolY = (vol: number) => {
    const norm = Math.min(1, vol / maxVolume);
    return padding.top + plotHeight - norm * volumeHeight;
  };

  // Area Path String
  const areaPath = useMemo(() => {
    if (points.length < 2) return '';
    const coords = points.map((p, i) => `${getX(i).toFixed(1)},${getY(p.close).toFixed(1)}`);
    const line = `M ${coords.join(' L ')}`;
    const closeArea = ` L ${getX(points.length - 1).toFixed(1)},${padding.top + plotHeight - volumeHeight} L ${getX(0).toFixed(1)},${padding.top + plotHeight - volumeHeight} Z`;
    return { line, area: `${line} ${closeArea}` };
  }, [points, minPrice, maxPrice]);

  // Drawdown Path String
  const drawdownPath = useMemo(() => {
    if (drawdownData.length < 2) return '';
    const coords = drawdownData.map((d, i) => `${getX(i).toFixed(1)},${getDrawdownY(d.drawdown).toFixed(1)}`);
    const line = `M ${coords.join(' L ')}`;
    const closeArea = ` L ${getX(drawdownData.length - 1).toFixed(1)},${padding.top} L ${getX(0).toFixed(1)},${padding.top} Z`;
    return { line, area: `${line} ${closeArea}` };
  }, [drawdownData, maxDrawdown]);

  // Mouse handler for hover crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - padding.left) / plotWidth));
    const index = Math.round(ratio * (points.length - 1));
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const themeGainColor = 'var(--color-gain, #10b981)';
  const themeLossColor = 'var(--color-loss, #ef4444)';

  return (
    <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', padding: 14 }}>
      {/* Chart Header & Mode Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)' }}>
              {formatINR(activePrice, { showDecimals: true })}
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: '700',
              color: isGain ? themeGainColor : themeLossColor,
              display: 'flex',
              alignItems: 'center',
              gap: 3
            }}>
              {isGain ? '+' : ''}{formatINR(periodDiff, { showDecimals: true })} ({formatPercent(periodDiffPercent, true)})
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {activePoint ? `Date: ${activePoint.date} • Volume: ${activePoint.volume.toLocaleString('en-IN')}` : symbol}
          </div>
        </div>

        {/* View Mode & Timeframe Selector Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* Chart Mode Switcher */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: 2, borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setChartMode('area')}
              className={`btn btn-xs ${chartMode === 'area' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '3px 8px', fontSize: '11px', gap: 4 }}
              title="Area Line View"
            >
              <TrendingUp size={12} />
              <span>Area</span>
            </button>
            <button
              onClick={() => setChartMode('candlestick')}
              className={`btn btn-xs ${chartMode === 'candlestick' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '3px 8px', fontSize: '11px', gap: 4 }}
              title="Candlestick OHLC View"
            >
              <BarChart2 size={12} />
              <span>Candles</span>
            </button>
            <button
              onClick={() => setChartMode('drawdown')}
              className={`btn btn-xs ${chartMode === 'drawdown' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '3px 8px', fontSize: '11px', gap: 4 }}
              title="Underwater Drawdown Curve"
            >
              <ShieldAlert size={12} />
              <span>Drawdown</span>
            </button>
          </div>

          {/* Timeframe Buttons */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: 2, borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
            {(['1M', '6M', '1Y', '3Y', '5Y'] as TimeframeKey[]).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`btn btn-xs ${timeframe === tf ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '3px 7px', fontSize: '10px', minWidth: 28 }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="chartGainGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="chartLossGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="chartDrawdownGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="var(--border-subtle)" strokeDasharray="3,3" />
          <line x1={padding.left} y1={padding.top + (plotHeight - volumeHeight) / 2} x2={width - padding.right} y2={padding.top + (plotHeight - volumeHeight) / 2} stroke="var(--border-subtle)" strokeDasharray="3,3" />
          <line x1={padding.left} y1={padding.top + plotHeight - volumeHeight} x2={width - padding.right} y2={padding.top + plotHeight - volumeHeight} stroke="var(--border-subtle)" />

          {/* Volume Sub-Histogram (Area & Candlestick Modes) */}
          {chartMode !== 'drawdown' && (
            <g opacity="0.65">
              {points.map((p, idx) => {
                const barWidth = Math.max(2, (plotWidth / points.length) * 0.65);
                const x = getX(idx) - barWidth / 2;
                const y = getVolY(p.volume);
                const barH = padding.top + plotHeight - y;
                const isDayUp = p.close >= p.open;
                return (
                  <rect
                    key={`vol-${idx}`}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(1, barH)}
                    fill={isDayUp ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'}
                  />
                );
              })}
            </g>
          )}

          {/* MODE 1: Area / Line */}
          {chartMode === 'area' && areaPath && (
            <g>
              <path d={areaPath.area} fill={isGain ? 'url(#chartGainGrad)' : 'url(#chartLossGrad)'} />
              <path
                d={areaPath.line}
                fill="none"
                stroke={isGain ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* MODE 2: Candlestick */}
          {chartMode === 'candlestick' && (
            <g>
              {points.map((p, idx) => {
                const candleWidth = Math.max(3, (plotWidth / points.length) * 0.7);
                const x = getX(idx);
                const yOpen = getY(p.open);
                const yClose = getY(p.close);
                const yHigh = getY(p.high);
                const yLow = getY(p.low);
                const isGreen = p.close >= p.open;
                const color = isGreen ? '#10b981' : '#ef4444';
                const bodyY = Math.min(yOpen, yClose);
                const bodyH = Math.max(2, Math.abs(yClose - yOpen));

                return (
                  <g key={`candle-${idx}`}>
                    {/* Wick */}
                    <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={1} />
                    {/* Body */}
                    <rect
                      x={x - candleWidth / 2}
                      y={bodyY}
                      width={candleWidth}
                      height={bodyH}
                      fill={color}
                      stroke={color}
                      strokeWidth={0.5}
                      rx={1}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* MODE 3: Underwater Drawdown Curve */}
          {chartMode === 'drawdown' && drawdownPath && (
            <g>
              {/* Baseline at 0% */}
              <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#10b981" strokeWidth={1.5} />
              <text x={width - padding.right} y={padding.top - 5} fill="#10b981" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
                0% Peak
              </text>
              {/* Drawdown Area */}
              <path d={drawdownPath.area} fill="url(#chartDrawdownGrad)" />
              <path
                d={drawdownPath.line}
                fill="none"
                stroke="#ef4444"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Max Drawdown Watermark */}
              <text
                x={padding.left + 5}
                y={padding.top + plotHeight - 5}
                fill="#ef4444"
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                Max Drawdown: {maxDrawdown.toFixed(2)}%
              </text>
            </g>
          )}

          {/* Interactive Hover Crosshair */}
          {hoverIndex !== null && points[hoverIndex] && (
            <g>
              {/* Vertical line */}
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + plotHeight}
                stroke="var(--accent-primary)"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              {/* Glowing cursor point */}
              <circle
                cx={getX(hoverIndex)}
                cy={chartMode === 'drawdown' ? getDrawdownY(drawdownData[hoverIndex].drawdown) : getY(points[hoverIndex].close)}
                r={4.5}
                fill="var(--accent-primary)"
                stroke="#ffffff"
                strokeWidth={2}
              />
            </g>
          )}

          {/* X-Axis Date Labels */}
          {points.length > 0 && (
            <g fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">
              <text x={padding.left} y={height - 10}>{points[0].date}</text>
              <text x={padding.left + plotWidth / 2} y={height - 10} textAnchor="middle">
                {points[Math.floor(points.length / 2)].date}
              </text>
              <text x={width - padding.right} y={height - 10} textAnchor="end">
                {points[points.length - 1].date}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
