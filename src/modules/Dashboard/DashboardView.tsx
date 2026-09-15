import React, { useState } from 'react';
import { Holding } from '../../data/types';
import { formatINR, formatPercent } from '../../core/math/xirr';
import { MetricCard } from '../../components/MetricCard/MetricCard';
import { DonutChart, DonutSegment } from '../../components/Charts/Charts';
import { TerminalGrid } from '../../components/TerminalGrid/TerminalGrid';
import { useMarketQuotes } from '../../core/market/useMarketQuotes';
import {
  TrendingUp,
  PieChart,
  ShieldCheck,
  Compass,
  Calculator,
  Sliders,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Info,
  ChevronDown,
  ChevronUp,
  Scale,
  LayoutGrid,
  Rows,
  Maximize2,
  Lock
} from 'lucide-react';

interface DashboardViewProps {
  holdings: Holding[];
  onSelectHolding: (h: Holding) => void;
  onNavigate: (module: any) => void;
}

type LayoutMode = 'split' | 'stacked' | 'table';

export const DashboardView: React.FC<DashboardViewProps> = ({
  holdings,
  onSelectHolding,
  onNavigate
}) => {
  const { quotes } = useMarketQuotes();
  const [showPhilosophyModal, setShowPhilosophyModal] = useState(false);
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');

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

  // Top Movers & Velocity calculations
  const sortedHoldings = [...holdings].sort((a, b) => {
    const quoteA = quotes[a.symbol] || quotes[a.id];
    const quoteB = quotes[b.symbol] || quotes[b.id];
    const chgA = quoteA ? quoteA.dayChangePercent : a.unrealizedGainPercent;
    const chgB = quoteB ? quoteB.dayChangePercent : b.unrealizedGainPercent;
    return chgB - chgA;
  });

  const topGainers = sortedHoldings.slice(0, 3);
  const topDecliners = [...sortedHoldings].reverse().slice(0, 3);

  // Asset Allocation Sub-Component (Reusable across split & stacked modes)
  const renderAllocationCard = (isCompact = false) => (
    <div className="terminal-card" style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Multi-Asset Allocation
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {donutSegments.length} Classes
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCompact ? 'space-around' : 'center', gap: 14 }}>
        <div style={{ flexShrink: 0 }}>
          <DonutChart
            segments={donutSegments}
            size={isCompact ? 115 : 130}
            innerRadius={isCompact ? 36 : 42}
            onSelectSegment={(seg) => setSelectedAssetFilter(seg.name)}
          />
        </div>

        {/* Breakdown List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
          {donutSegments.map(seg => {
            const pct = liveTotalValue > 0 ? ((seg.value / liveTotalValue) * 100).toFixed(1) : '0.0';
            return (
              <div key={seg.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 500 }}>{seg.name}</span>
                </div>
                <span className="tabular-nums" style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '11px' }}>
                  {formatINR(seg.value, { compact: true })}{' '}
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Movers Sub-Component
  const renderMoversCard = () => (
    <div className="terminal-card" style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Flame size={13} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
            Intraday Velocity
          </span>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Real-Time</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
        {/* Top 2 Gainers */}
        {topGainers.slice(0, 2).map(h => {
          const live = quotes[h.symbol] || quotes[h.id];
          const dayPct = live ? live.dayChangePercent : h.unrealizedGainPercent;
          return (
            <div
              key={h.id}
              className="mover-chip"
              onClick={() => onSelectHolding(h)}
              title={`View ${h.symbol}`}
              style={{ padding: '4px 8px' }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {h.symbol}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                  {formatINR(live ? live.currentPrice : h.currentPrice, { compact: true })}
                </div>
              </div>
              <span className="delta-badge gain" style={{ fontSize: '9px', padding: '1px 4px' }}>
                +{dayPct.toFixed(1)}%
              </span>
            </div>
          );
        })}

        {/* Top 2 Decliners */}
        {topDecliners.slice(0, 2).map(h => {
          const live = quotes[h.symbol] || quotes[h.id];
          const dayPct = live ? live.dayChangePercent : h.unrealizedGainPercent;
          const isLoss = dayPct < 0;
          return (
            <div
              key={h.id}
              className="mover-chip"
              onClick={() => onSelectHolding(h)}
              title={`View ${h.symbol}`}
              style={{ padding: '4px 8px' }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {h.symbol}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                  {formatINR(live ? live.currentPrice : h.currentPrice, { compact: true })}
                </div>
              </div>
              <span className={`delta-badge ${isLoss ? 'loss' : 'gain'}`} style={{ fontSize: '9px', padding: '1px 4px' }}>
                {dayPct >= 0 ? '+' : ''}{dayPct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Streamlined Executive Header: Single Row with Integrated Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '17px', fontWeight: '700', letterSpacing: '-0.02em', margin: 0 }}>
            Financial Command Centre
          </h1>
          <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: 'var(--accent-surface)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border)' }}>
            LIVE LEDGER
          </span>
          <button
            onClick={() => setShowPhilosophyModal(!showPhilosophyModal)}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '10px', padding: '1px 6px', gap: 4, height: 22, color: 'var(--text-muted)' }}
            title="Click to view Sovereign Client-Side Governance Principles"
          >
            <Lock size={10} style={{ color: 'var(--accent-primary)' }} />
            <span>Zero-Egress Client-Side</span>
            {showPhilosophyModal ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        </div>

        {/* View Layout Switcher & Fast Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="segmented-capsule-bar" style={{ padding: 2 }}>
            <button
              onClick={() => setLayoutMode('split')}
              className={`segmented-pill-btn ${layoutMode === 'split' ? 'active' : ''}`}
              style={{ padding: '2px 8px', fontSize: '11px', gap: 4 }}
              title="Split Cockpit (Holdings Table & Analytics visible simultaneously)"
            >
              <LayoutGrid size={11} />
              <span>Cockpit</span>
            </button>
            <button
              onClick={() => setLayoutMode('stacked')}
              className={`segmented-pill-btn ${layoutMode === 'stacked' ? 'active' : ''}`}
              style={{ padding: '2px 8px', fontSize: '11px', gap: 4 }}
              title="Compact Stacked (Overview bar with full-width table)"
            >
              <Rows size={11} />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setLayoutMode('table')}
              className={`segmented-pill-btn ${layoutMode === 'table' ? 'active' : ''}`}
              style={{ padding: '2px 8px', fontSize: '11px', gap: 4 }}
              title="Full Ledger Table Focus"
            >
              <Maximize2 size={11} />
              <span>Table Focus</span>
            </button>
          </div>

          <button onClick={() => onNavigate('workbench')} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', height: 26, fontSize: '11px' }}>
            <Sliders size={11} /> Lab
          </button>
          <button onClick={() => onNavigate('calculators')} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', height: 26, fontSize: '11px' }}>
            <Calculator size={11} /> Calcs
          </button>
        </div>
      </div>

      {/* Expandable Philosophy & Compliance Drawer (Only shown when requested) */}
      {showPhilosophyModal && (
        <div
          className="animate-fade-in"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
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
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            KoshQ operates strictly client-side in your browser. No portfolio data, broker credentials, or financial records leave your device. All valuation, XIRR calculations, tax models, and crisis simulations run on your CPU.
          </p>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            <strong>Regulatory Non-Intermediary Notice:</strong> KoshQ is an analytics and calculation tool. It does not solicit, distribute, recommend, or broker securities. The investor retains sovereign responsibility.
          </div>
        </div>
      )}

      {/* High-Density Executive Metrics Strip (Height ~64px) */}
      <div className="metrics-deck" style={{ marginBottom: 4 }}>
        <MetricCard
          label="Consolidated Net Worth"
          value={formatINR(liveTotalValue)}
          deltaText={formatPercent(liveGainPercent, true)}
          deltaType={liveGainPercent >= 0 ? 'gain' : 'loss'}
          subtext={`Invested: ${formatINR(totalInvested)}`}
          sparklineData={[4100000, 4250000, 4380000, 4520000, 4680000, 4790000, liveTotalValue]}
          icon={<TrendingUp size={13} />}
        />
        <MetricCard
          label="Portfolio XIRR"
          value="16.82%"
          deltaText="+2.4% vs Nifty"
          deltaType="gain"
          subtext="Benchmark: Nifty 50 TRI (14.4%)"
          sparklineData={[13.2, 14.1, 14.8, 15.6, 16.0, 16.4, 16.82]}
        />
        <MetricCard
          label="Unrealized Returns"
          value={formatINR(liveTotalGain)}
          deltaText={daysTotalChange !== 0 ? `${daysTotalChange >= 0 ? '+' : ''}${formatINR(daysTotalChange)} Today` : "All-Time"}
          deltaType={liveTotalGain >= 0 ? 'gain' : 'loss'}
          subtext="Realized FY25-26: ₹2,14,500"
        />
        <MetricCard
          label="Asset Split (Eq / Debt)"
          value="68.2% / 31.8%"
          subtext="Target Balance: 70% / 30%"
          deltaType="neutral"
          icon={<PieChart size={13} />}
        />
      </div>

      {/* Main Content Area based on User's Space Preference */}
      {layoutMode === 'split' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.75fr) minmax(280px, 1fr)', gap: 10, alignItems: 'start' }}>
          {/* Left Column: Portfolio Workbench Table (Immediately Visible!) */}
          <div>
            <TerminalGrid holdings={holdings} onSelectHolding={onSelectHolding} compactMode={true} />
          </div>

          {/* Right Column: Visual Intelligence Deck */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {renderAllocationCard(true)}
            {renderMoversCard()}

            {/* Quick Analytical Suites Mini Card */}
            <div className="terminal-card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>
                Analytical Suites
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                <button
                  onClick={() => onNavigate('vault')}
                  className="mover-chip"
                  style={{ padding: '6px 8px', justifyContent: 'center', textAlign: 'center', border: '1px solid var(--border-subtle)' }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>X-Ray</span>
                </button>
                <button
                  onClick={() => onNavigate('explore')}
                  className="mover-chip"
                  style={{ padding: '6px 8px', justifyContent: 'center', textAlign: 'center', border: '1px solid var(--border-subtle)' }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>Explorer</span>
                </button>
                <button
                  onClick={() => onNavigate('workbench')}
                  className="mover-chip"
                  style={{ padding: '6px 8px', justifyContent: 'center', textAlign: 'center', border: '1px solid var(--border-subtle)' }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>Stress Test</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {layoutMode === 'stacked' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Compact Overview Bar: Allocation on Left, Movers in Center, Suites on Right */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: 10 }}>
            {renderAllocationCard(false)}
            {renderMoversCard()}
            <div className="terminal-card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>
                  Portfolio Health
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 2 }}>
                  <div>HHI Concentration: <strong style={{ color: 'var(--color-gain)' }}>1,842 (Diversified)</strong></div>
                  <div style={{ marginTop: 2 }}>Portfolio Beta: <strong>0.84</strong> vs Nifty</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={() => onNavigate('vault')} className="btn btn-secondary btn-sm" style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}>
                  X-Ray
                </button>
                <button onClick={() => onNavigate('workbench')} className="btn btn-secondary btn-sm" style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}>
                  Stress Lab
                </button>
              </div>
            </div>
          </div>

          {/* Full Width Holdings Table */}
          <TerminalGrid holdings={holdings} onSelectHolding={onSelectHolding} compactMode={false} />
        </div>
      )}

      {layoutMode === 'table' && (
        <div>
          <TerminalGrid holdings={holdings} onSelectHolding={onSelectHolding} compactMode={false} />
        </div>
      )}
    </div>
  );
};
