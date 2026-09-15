import React from 'react';
import { Sparkline } from '../Charts/Charts';

interface MetricCardProps {
  label: string;
  value: string;
  deltaText?: string;
  deltaType?: 'gain' | 'loss' | 'neutral';
  subtext?: string;
  sparklineData?: number[];
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  deltaText,
  deltaType = 'neutral',
  subtext,
  sparklineData,
  icon
}) => {
  // Format currency symbol with sub-scaled micro-typography if present
  const renderValue = () => {
    if (typeof value === 'string' && value.startsWith('₹')) {
      return (
        <>
          <span className="curr-sym">₹</span>
          {value.slice(1)}
        </>
      );
    }
    return value;
  };

  return (
    <div className="metric-card">
      <div className="metric-card-top">
        <span className="metric-label">{label}</span>
        {icon && <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{icon}</span>}
      </div>

      <div className="metric-card-bottom">
        <div className="metric-value">{renderValue()}</div>
        {deltaText && (
          <span className={`delta-badge ${deltaType}`}>
            {deltaType === 'gain' ? '▲' : deltaType === 'loss' ? '▼' : '•'} {deltaText}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', minHeight: 20 }}>
        {subtext && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtext}
          </span>
        )}
        {sparklineData && (
          <div style={{ flexShrink: 0, marginLeft: 'auto' }}>
            <Sparkline
              data={sparklineData}
              width={72}
              height={22}
              isPositive={deltaType !== 'loss'}
            />
          </div>
        )}
      </div>
    </div>
  );
};
