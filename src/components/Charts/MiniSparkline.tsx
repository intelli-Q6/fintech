import React from 'react';

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  isPositive?: boolean;
  strokeWidth?: number;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  width = 80,
  height = 24,
  isPositive,
  strokeWidth = 1.5
}) => {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} />;
  }

  // Determine positive/negative trend if not explicitly passed
  const positive = isPositive !== undefined ? isPositive : data[data.length - 1] >= data[0];
  const strokeColor = positive ? 'var(--color-gain)' : 'var(--color-loss)';
  const fillColor = positive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const padding = 2;
  const usableHeight = height - padding * 2;
  const usableWidth = width - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * usableWidth;
    const y = height - padding - ((val - min) / range) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${usableWidth + padding},${height} L ${padding},${height} Z`;

  const lastPoint = points[points.length - 1].split(',');
  const lastX = Number(lastPoint[0]);
  const lastY = Number(lastPoint[1]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: 'visible', display: 'inline-block', verticalAlign: 'middle' }}
    >
      <path d={areaD} fill={fillColor} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2} fill={strokeColor} />
    </svg>
  );
};
