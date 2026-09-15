import React, { useState } from 'react';
import { Holding } from '../../data/types';
import { formatINR, formatPercent } from '../../core/math/xirr';
import { MetricCard } from '../../components/MetricCard/MetricCard';
import { DonutChart, DonutSegment } from '../../components/Charts/Charts';
import { useMarketQuotes } from '../../core/market/useMarketQuotes';
import {
  TrendingUp,
  PieChart,
  ShieldCheck,
  ArrowRight,
  Sliders,
  Calculator,
  Wallet,
  Lock,
  ChevronDown,
  ChevronUp,
  ChevronRight
} from 'lucide-react';

interface DashboardViewProps {
  holdings: Holding[];
  onSelectHolding: (h: Holding) => void;
  onNavigate: (module: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  holdings,
  onSelectHolding,
  onNavigate
}) => {
  const { quotes } = useMarketQuotes();
  const [showPhilosophyModal, setShowPhilosophyModal] = useState(false);

  // Compute live valuation across all holdings
  const liveTotalValue = holdings.reduce((sum, h) => {
    const live = quotes[h.symbol] || quotes[h.id];
    const price = live ? live.currentPrice : h.currentPrice;
    return sum + (h.quantity * price);
  }, 0);

  const totalInvested = holdings.reduce((sum, h) => sum + h.investedAmount, 0);
  const liveTotalGain = liveTotalValue - totalInvested;
  const liveGainPercent = totalInvested > 0 ? (liveTotalGain / totalInvested) * 100 : 0;

  // Day's return based on live fluctuations
  const daysTotalChange = holdings.reduce((sum, h) => {
    const live = quotes[h.symbol] || quotes[h.id];
    if (!live) return sum;
    return sum + (h.quantity * live.dayChange);
  }, 0);

  const prevCloseValue = liveTotalValue - daysTotalChange;
  const daysChangePercent = prevCloseValue > 0 ? (daysTotalChange / prevCloseValue) * 100 : 0;

  // Aggregate by asset class for Donut
  const classTotals: Record<string, number> = {};
  for (const h of holdings) {
    const live = quotes[h.symbol] || quotes[h.id];
    const price = live ? live.currentPrice : h.currentPrice;
    classTotals[h.assetClass] = (classTotals[h.assetClass] || 0) + (h.quantity * price);
  }

  const colorMap: Record<string, string> = {
    equity: '#2563eb',
    mutual_fund: '#7e22ce',
    gold: '#d97706',
    bond: '#b45309',
    govt_scheme: '#4338ca',
    cash: '#64748b'
  };

  const donutSegments: DonutSegment[] = Object.entries(classTotals).map(([key, val]) => ({
    name: key.replace('_', ' ').toUpperCase(),
    value: val,
    color: colorMap[key] || '#94a3b8'
  }));

  // Dynamic Asset Split (Growth: Equity + Mutual Funds vs Stability: Debt + Gold + Cash)
  const growthAssets = (classTotals['equity'] || 0) + (classTotals['mutual_fund'] || 0);
  const stabilityAssets = (classTotals['bond'] || 0) + (classTotals['govt_scheme'] || 0) + (classTotals['gold'] || 0) + (classTotals['cash'] || 0);
  const growthPct = liveTotalValue > 0 ? ((growthAssets / liveTotalValue) * 100).toFixed(0) : '0';
  const stabilityPct = liveTotalValue > 0 ? ((stabilityAssets / liveTotalValue) * 100).toFixed(0) : '0';

  // Map holdings with computed live metrics & identify Top 5 Core Holdings
  const holdingsWithLive = holdings.map(h => {
    const live = quotes[h.symbol] || quotes[h.id];
    const livePrice = live ? live.currentPrice : h.currentPrice;
    const currentVal = h.quantity * livePrice;
    const gain = currentVal - h.investedAmount;
    const gainPct = h.investedAmount > 0 ? (gain / h.investedAmount) * 100 : 0;
    const weight = liveTotalValue > 0 ? (currentVal / liveTotalValue) * 100 : 0;
    return {
      ...h,
      livePrice,
      currentVal,
      gain,
      gainPct,
      weight
    };
  });

  const topHoldings = [...holdingsWithLive]
    .sort((a, b) => b.currentVal - a.currentVal)
    .slice(0, 5);

  const getAssetPillClass = (ac: string) => {
    switch (ac) {
      case 'equity': return 'equity';
      case 'mutual_fund': return 'mf';
      case 'etf': return 'etf';
      case 'bond': return 'bond';
      case 'gold': return 'gold';
      case 'govt_scheme': return 'govt';
      default: return 'cash';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      {/* 1. Serene Executive Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
              Financial Command Centre
            </h1>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 12,
              background: 'rgba(5, 150, 105, 0.12)',
              color: 'var(--color-gain)',
              border: '1px solid rgba(5, 150, 105, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-gain)', display: 'inline-block' }} />
              LIVE PULSE
            </span>
          </div>
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            High-level sovereign wealth intelligence • Client-side private ledger
          </p>
        </div>

        {/* Primary Action Button to Full Vault */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowPhilosophyModal(!showPhilosophyModal)}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '11px', padding: '5px 10px', gap: 4, height: 28, color: 'var(--text-muted)' }}
            title="Click to view Sovereign Client-Side Governance Principles"
          >
            <Lock size={11} style={{ color: 'var(--accent-primary)' }} />
            <span>Zero-Egress</span>
            {showPhilosophyModal ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <button
            onClick={() => onNavigate('vault')}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', fontSize: '12px', fontWeight: 600, height: 28 }}
          >
            <Wallet size={12} />
            <span>Portfolio Vault</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Philosophy Accordion (Subtle & optional) */}
      {showPhilosophyModal && (
        <div
          className="animate-fade-in"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={13} style={{ color: 'var(--accent-primary)' }} />
            <span>Sovereign Client-Side Platform Principles</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: 1.4 }}>
            KoshQ operates strictly client-side in your browser. No portfolio data, broker credentials, or financial records leave your device. All valuation, XIRR calculations, tax models, and crisis simulations run directly on your CPU.
          </p>
        </div>
      )}

      {/* 2. Hero Net Worth Banner */}
      <div
        className="terminal-card"
        style={{
          padding: '22px 26px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
              Consolidated Net Worth
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                {formatINR(liveTotalValue)}
              </span>
              {daysTotalChange !== 0 && (
                <span
                  className={`delta-badge ${daysTotalChange >= 0 ? 'gain' : 'loss'}`}
                  style={{ fontSize: '12px', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}
                >
                  {daysTotalChange >= 0 ? '▲ +' : '▼ '}{formatINR(Math.abs(daysTotalChange))} ({daysChangePercent >= 0 ? '+' : ''}{daysChangePercent.toFixed(2)}%) Today
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span>Invested Capital: <strong style={{ color: 'var(--text-primary)' }}>{formatINR(totalInvested)}</strong></span>
              <span style={{ color: 'var(--border-subtle)' }}>•</span>
              <span>Total Gain: <strong style={{ color: liveTotalGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)' }}>
                {liveTotalGain >= 0 ? '+' : ''}{formatINR(liveTotalGain)} ({formatPercent(liveGainPercent, true)})
              </strong></span>
            </div>
          </div>

          {/* Quick Analytical Gateways */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('workbench')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '6px 12px', gap: 6, height: 32 }}
            >
              <Sliders size={12} />
              <span>Stress Lab</span>
            </button>
            <button
              onClick={() => onNavigate('calculators')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '6px 12px', gap: 6, height: 32 }}
            >
              <Calculator size={12} />
              <span>Calculators</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Three Streamlined Key Metrics */}
      <div className="metrics-deck">
        <MetricCard
          label="Portfolio XIRR"
          value="16.82%"
          deltaText="+2.4% vs Nifty"
          deltaType="gain"
          subtext="Benchmark: Nifty 50 TRI (14.4%)"
          sparklineData={[13.2, 14.1, 14.8, 15.6, 16.0, 16.4, 16.82]}
          icon={<TrendingUp size={13} />}
        />
        <MetricCard
          label="Asset Split (Growth / Stability)"
          value={`${growthPct}% / ${stabilityPct}%`}
          subtext="Equities & MFs vs Debt, Gold & Cash"
          deltaType="neutral"
          icon={<PieChart size={13} />}
        />
        <MetricCard
          label="Portfolio Health & Risk"
          value="Diversified"
          subtext={`${holdings.length} Assets across ${donutSegments.length} Asset Classes`}
          deltaType="gain"
          icon={<ShieldCheck size={13} />}
        />
      </div>

      {/* 4. Dual Section Overview: Allocation Donut & Top 5 Core Holdings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, alignItems: 'start' }}>
        {/* Left Card: Multi-Asset Distribution */}
        <div className="terminal-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Multi-Asset Allocation
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {donutSegments.length} Classes
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap', flex: 1 }}>
            <div style={{ flexShrink: 0 }}>
              <DonutChart
                segments={donutSegments}
                size={140}
                innerRadius={46}
              />
            </div>

            {/* Asset Breakdown Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 160 }}>
              {donutSegments.map(seg => {
                const pct = liveTotalValue > 0 ? ((seg.value / liveTotalValue) * 100).toFixed(1) : '0.0';
                return (
                  <div key={seg.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{seg.name}</span>
                    </div>
                    <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatINR(seg.value, { compact: true })}{' '}
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Card: Top 5 Core Holdings Snapshot */}
        <div className="terminal-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Top Core Positions
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Top {topHoldings.length} of {holdings.length}
            </span>
          </div>

          {/* Holdings List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topHoldings.map(h => (
              <div
                key={h.id}
                onClick={() => onSelectHolding(h)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease, transform 0.1s ease'
                }}
                className="holding-snapshot-row"
                title={`Click to inspect fundamental factsheet for ${h.symbol}`}
              >
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 120 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {h.symbol}
                    </span>
                    <span className={`asset-pill ${getAssetPillClass(h.assetClass)}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                      {h.assetClass.replace('_', ' ')}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.name}
                  </span>
                </div>

                {/* Weight bar & Current Value */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 70 }}>
                    <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                      {formatINR(h.currentVal)}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {h.weight.toFixed(1)}% weight
                    </span>
                  </div>

                  <span className={`delta-badge ${h.gain >= 0 ? 'gain' : 'loss'}`} style={{ fontSize: '10px', padding: '2px 6px', minWidth: 50, textAlign: 'center' }}>
                    {h.gain >= 0 ? '+' : ''}{h.gainPct.toFixed(1)}%
                  </span>

                  <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Footer Link to Full Ledger */}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => onNavigate('vault')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '11px', color: 'var(--accent-primary)', padding: '2px 6px', gap: 4 }}
            >
              <span>View all {holdings.length} holdings in Portfolio Vault</span>
              <ArrowRight size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
