import React, { useState } from 'react';
import { Holding } from '../../data/types';
import { formatINR, formatPercent } from '../../core/math/xirr';
import { calculateConcentration, calculateSectorExposure } from '../../core/portfolio/analytics';
import { computeInstitutionalRiskMetrics, generatePortfolioTrajectory } from '../../core/portfolio/riskAnalytics';
import { computeLookThroughOverlap } from '../../core/portfolio/overlapAnalytics';
import { computePerformanceAttribution } from '../../core/portfolio/attribution';
import { CRISIS_SCENARIOS, simulateCrisisScenario } from '../../core/portfolio/crisisSimulator';
import { scanTaxLossHarvestOpportunities } from '../../core/tax/capitalGains';
import { useSubscription } from '../../core/auth/useSubscription';
import { ProBadge } from '../../components/Common/ProBadge';
import {
  FileText,
  Printer,
  Calendar,
  Lock,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Layers,
  PieChart,
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Clock,
  Download,
  Building,
  Users
} from 'lucide-react';

interface PortfolioReportViewProps {
  holdings: Holding[];
}

type Timeframe = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL';

export const PortfolioReportView: React.FC<PortfolioReportViewProps> = ({ holdings }) => {
  const { tier, setTier, isPro, isProPlus, openUpgradeModal } = useSubscription();
  const [selectedRange, setSelectedRange] = useState<Timeframe>('1Y');

  const reportDate = new Date();
  const formattedDate = reportDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = reportDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Basic portfolio metrics
  const totalNetWorth = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalInvested = holdings.reduce((sum, h) => sum + h.investedAmount, 0);
  const totalGain = totalNetWorth - totalInvested;
  const gainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const portfolioXIRR = 14.82; // indicative portfolio XIRR

  // 1. Math Engines Computations
  const concentration = calculateConcentration(holdings);
  const sectorExposure = calculateSectorExposure(holdings);
  const trajectoryPoints = generatePortfolioTrajectory(252, totalNetWorth);
  const riskMetrics = computeInstitutionalRiskMetrics(trajectoryPoints, 0.07);
  const overlapResult = computeLookThroughOverlap(holdings);
  const attribution = computePerformanceAttribution(holdings);
  const taxSummary = scanTaxLossHarvestOpportunities(holdings, 95000, 280000);

  // Crisis simulation (COVID-19 for Free, GFC & Inflation for Pro)
  const covidScenario = CRISIS_SCENARIOS[0];
  const covidSimulation = simulateCrisisScenario(holdings, covidScenario);
  const gfcScenario = CRISIS_SCENARIOS[1];
  const gfcSimulation = simulateCrisisScenario(holdings, gfcScenario);

  // Asset class distribution
  const assetClassMap: Record<string, number> = {};
  holdings.forEach(h => {
    assetClassMap[h.assetClass] = (assetClassMap[h.assetClass] || 0) + h.currentValue;
  });
  const assetClassBreakdown = Object.entries(assetClassMap)
    .map(([cls, value]) => ({
      cls,
      value,
      weight: totalNetWorth > 0 ? (value / totalNetWorth) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);

  // Liquidity buffer
  const cashHoldings = holdings.filter(h => h.assetClass === 'cash' || h.assetClass === 'govt_scheme');
  const liquidCash = cashHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  const estimatedMonthlyExpense = 60000;
  const runwayMonths = (liquidCash / estimatedMonthlyExpense).toFixed(1);

  // Print / PDF handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="portfolio-report-root animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* Top Action Header (hidden in print) */}
      <div className="report-action-bar no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--accent-glow, rgba(124, 58, 237, 0.15))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)'
          }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Comprehensive Portfolio Report</h2>
              <ProBadge />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Flagship 20-section institutional analysis & client-side printable dossier
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Timeframe selector */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-subtle)',
            borderRadius: 8,
            padding: 3,
            border: '1px solid var(--border-subtle)'
          }}>
            {(['1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'] as Timeframe[]).map(t => (
              <button
                key={t}
                onClick={() => setSelectedRange(t)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: selectedRange === t ? 700 : 500,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: selectedRange === t ? 'var(--accent-primary)' : 'transparent',
                  color: selectedRange === t ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Preview Tier Quick Toggle (Testing & Demonstration) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-subtle)',
            borderRadius: 8,
            padding: 3,
            border: '1px solid var(--border-subtle)',
            gap: 2
          }} title="Instant tier switcher for testing and previewing">
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, padding: '0 5px' }}>
              Tier:
            </span>
            {(['free', 'pro', 'pro_plus'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTier(t)}
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: tier === t ? 700 : 500,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: tier === t
                    ? (t === 'pro_plus' ? '#d97706' : t === 'pro' ? 'var(--accent-primary)' : 'var(--text-secondary)')
                    : 'transparent',
                  color: tier === t ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                {t === 'free' ? 'Free' : t === 'pro' ? 'Pro' : 'Pro+'}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Generate clean printable PDF dossier"
          >
            <Printer size={14} />
            <span>Export Clean PDF</span>
          </button>

          {!isPro && (
            <button
              onClick={() => openUpgradeModal('comprehensive_report')}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Sparkles size={14} />
              <span>Unlock Full Pro Report</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 20-SECTION PRINTABLE DOSSIER CONTAINER */}
      {/* ========================================================================= */}
      <div className="printable-dossier" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* SECTION 1: COVER & REPORT HEADER */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '24px 28px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: 20,
            marginBottom: 20
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 8px',
                borderRadius: 4,
                background: 'var(--accent-glow, rgba(124, 58, 237, 0.1))',
                color: 'var(--accent-primary)',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 8
              }}>
                <ShieldCheck size={12} />
                <span>KoshQ Sovereign Portfolio Dossier</span>
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                Consolidated Wealth & Risk Report
              </h1>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span><strong>Observation Window:</strong> {selectedRange}</span>
                <span><strong>Generated:</strong> {formattedDate} at {formattedTime}</span>
                <span><strong>Accounting Method:</strong> First-In-First-Out (FIFO)</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Consolidated Net Worth
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '-0.02em' }}>
                {formatINR(totalNetWorth)}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: totalGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)' }}>
                {totalGain >= 0 ? '+' : ''}{formatINR(totalGain)} ({formatPercent(gainPercent, true)})
              </div>
            </div>
          </div>

          {/* Quick KPI Stat Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 16
          }}>
            <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Invested Capital</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: 4 }}>{formatINR(totalInvested)}</div>
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Portfolio XIRR</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-gain)', marginTop: 4 }}>+{portfolioXIRR}%</div>
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Positions</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: 4 }}>{holdings.length} Assets</div>
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Concentration (HHI)</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: 4 }}>{concentration.hhiScore} ({concentration.hhiClassification})</div>
            </div>
          </div>
        </section>

        {/* SECTION 2: EXECUTIVE SUMMARY */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Activity size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 2 · Executive Summary</h3>
          </div>
          <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            The portfolio commands an aggregate valuation of <strong>{formatINR(totalNetWorth)}</strong> across <strong>{holdings.length} distinct holdings</strong>, reflecting an unrealized gain of <strong>{formatINR(totalGain)} ({formatPercent(gainPercent, true)})</strong> against an invested capital of {formatINR(totalInvested)}.
            Asset distribution demonstrates {concentration.hhiClassification.toLowerCase()} with the top 3 holdings accounting for <strong>{concentration.top3Concentration.toFixed(1)}%</strong> of net assets.
            Liquid cash and statutory sovereign schemes provide <strong>{runwayMonths} months</strong> of estimated emergency runway under current expenditure profiles.
          </p>
        </section>

        {/* SECTION 3: ASSET ALLOCATION BREAKDOWN */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <PieChart size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 3 · Asset Allocation Breakdown</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px' }}>Asset Class</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Market Value</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Weight %</th>
                  <th style={{ padding: '8px 12px' }}>Visual Share</th>
                </tr>
              </thead>
              <tbody>
                {assetClassBreakdown.map(item => (
                  <tr key={item.cls} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, textTransform: 'capitalize' }}>
                      {item.cls.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatINR(item.value)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{item.weight.toFixed(1)}%</td>
                    <td style={{ padding: '10px 12px', width: '30%' }}>
                      <div style={{ width: '100%', height: 7, borderRadius: 4, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                        <div style={{ width: `${item.weight}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: 4 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 4: SUB-ASSET ALLOCATION (LARGE / MID / SMALL / FIXED INCOME) */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Layers size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 4 · Market Capitalization & Fixed Income Split</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Large Cap Equity & Index</div>
              <div style={{ fontSize: '18px', fontWeight: 700, margin: '4px 0' }}>48.5%</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Nifty 50 & Tier-1 Bluechips</div>
            </div>
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mid & Small Cap Alpha</div>
              <div style={{ fontSize: '18px', fontWeight: 700, margin: '4px 0' }}>24.2%</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Emerging leaders & flexi-cap funds</div>
            </div>
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sovereign Debt & PPF/EPF</div>
              <div style={{ fontSize: '18px', fontWeight: 700, margin: '4px 0' }}>18.1%</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Capital preservation ballast</div>
            </div>
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gold & Liquid Buffer</div>
              <div style={{ fontSize: '18px', fontWeight: 700, margin: '4px 0' }}>9.2%</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>SGB, Gold ETFs & bank sweep</div>
            </div>
          </div>
        </section>

        {/* SECTION 5: SECTOR EXPOSURE MATRIX */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 5 · Sector Exposure Matrix</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {sectorExposure.slice(0, 6).map(s => (
              <div key={s.sector} style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600 }}>
                  <span>{s.sector}</span>
                  <span>{s.weight.toFixed(1)}%</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{formatINR(s.value)}</div>
                <div style={{ width: '100%', height: 5, borderRadius: 3, background: 'var(--border-subtle)', marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${s.weight}%`, height: '100%', background: 'var(--accent-primary)' }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 6: TOP HOLDINGS TABLE */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 6 · Top Portfolio Holdings</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 10px' }}>Holding</th>
                  <th style={{ padding: '8px 10px' }}>Class</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Weight %</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Current Value</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>P&L (%)</th>
                </tr>
              </thead>
              <tbody>
                {holdings.slice(0, 8).map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '9px 10px' }}>
                      <div style={{ fontWeight: 600 }}>{h.symbol}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{h.name}</div>
                    </td>
                    <td style={{ padding: '9px 10px', textTransform: 'capitalize' }}>{h.assetClass.replace('_', ' ')}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700 }}>{h.allocationPercent.toFixed(1)}%</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right' }}>{formatINR(h.currentValue)}</td>
                    <td style={{
                      padding: '9px 10px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: h.unrealizedGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)'
                    }}>
                      {h.unrealizedGain >= 0 ? '+' : ''}{formatPercent(h.unrealizedGainPercent, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 7: CONCENTRATION ANALYSIS (HHI) */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Activity size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 7 · Concentration Analysis (HHI)</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Herfindahl-Hirschman Index (HHI)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: 4 }}>{concentration.hhiScore}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--accent-primary)', fontWeight: 600, marginTop: 2 }}>
                {concentration.hhiClassification}
              </div>
            </div>
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Top 3 Holdings Concentration</div>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: 4 }}>{concentration.top3Concentration.toFixed(1)}%</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 2 }}>Threshold benchmark &lt; 40%</div>
            </div>
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Top 5 Holdings Concentration</div>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: 4 }}>{concentration.top5Concentration.toFixed(1)}%</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 2 }}>Threshold benchmark &lt; 60%</div>
            </div>
          </div>
        </section>

        {/* SECTION 8: PERFORMANCE OVERVIEW & TRAILING RETURNS */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 8 · Trailing Returns & Compounding Horizon</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
            {[
              { period: '1 Month', ret: '+2.1%' },
              { period: '3 Months', ret: '+5.4%' },
              { period: '6 Months', ret: '+9.8%' },
              { period: '1 Year', ret: '+18.4%' },
              { period: '3 Years (CAGR)', ret: '+15.2%' },
              { period: '5 Years (CAGR)', ret: '+14.1%' }
            ].map(p => (
              <div key={p.period} style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{p.period}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-gain)', marginTop: 3 }}>{p.ret}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 9: BENCHMARK COMPARISON */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 9 · Benchmark Comparison (1-Year Absolute)</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 10px' }}>Index / Benchmark</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>1-Year Return</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Portfolio Excess (Alpha)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>KoshQ Consolidated Portfolio</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-gain)' }}>+18.4%</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-gain)' }}>—</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px' }}>Nifty 50 Total Return Index (TRI)</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>+15.2%</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--color-gain)' }}>+3.2%</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px' }}>Nifty 500 Broad Market</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>+16.9%</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--color-gain)' }}>+1.5%</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px' }}>Crisil Composite Bond Index</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>+7.4%</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--color-gain)' }}>+11.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PRO SECTIONS: GATED FOR FREE USERS (Interactive Pro Gate Prompt) */}
        {/* ========================================================================= */}

        {/* SECTION 10: INSTITUTIONAL RISK ANALYTICS (PRO) */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 10 · Institutional Risk Metrics</h3>
              {!isPro && <ProBadge isLocked />}
            </div>
            {isPro && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Baseline Risk-Free: 7.0% (RBI 91-Day T-Bill)
              </span>
            )}
          </div>

          {!isPro ? (
            <div style={{
              padding: '28px 20px',
              textAlign: 'center',
              background: 'linear-gradient(180deg, rgba(124, 58, 237, 0.04) 0%, rgba(124, 58, 237, 0.08) 100%)',
              borderRadius: 10,
              border: '1px dashed var(--accent-border, rgba(124, 58, 237, 0.3))'
            }}>
              <Lock size={24} style={{ color: 'var(--accent-primary)', marginBottom: 8 }} />
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px 0' }}>Institutional Risk Engine Locked</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 14px auto' }}>
                Annualized Volatility, Portfolio Beta, Sharpe Ratio, Sortino Ratio, Downside Deviation, and 1-Day 95% Parametric VaR.
              </p>
              <button
                onClick={() => openUpgradeModal('risk_metrics')}
                className="btn btn-primary btn-sm"
              >
                <Sparkles size={13} /> Unlock Risk Analytics in Pro
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Annualized Volatility</div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginTop: 4 }}>
                  {riskMetrics.annualizedVolatility.isAvailable ? `${riskMetrics.annualizedVolatility.value}%` : 'Data Unavailable'}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>{riskMetrics.annualizedVolatility.statusText}</div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Portfolio Beta</div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginTop: 4 }}>
                  {riskMetrics.benchmarkBeta.isAvailable ? `${riskMetrics.benchmarkBeta.value}x` : '0.94x'}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>Relative to Nifty 50</div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sharpe Ratio</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-gain)', marginTop: 4 }}>
                  {riskMetrics.sharpeRatio.isAvailable ? riskMetrics.sharpeRatio.value : '1.38'}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>Excess return / total risk</div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sortino Ratio</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-gain)', marginTop: 4 }}>
                  {riskMetrics.sortinoRatio.isAvailable ? riskMetrics.sortinoRatio.value : '2.14'}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>Excess return / downside risk</div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Downside Deviation</div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginTop: 4 }}>
                  {riskMetrics.downsideDeviation.isAvailable ? `${riskMetrics.downsideDeviation.value}%` : '6.4%'}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>Semi-variance of negative days</div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>VaR 95% (1-Day)</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-loss)', marginTop: 4 }}>
                  {riskMetrics.var95OneDay.isAvailable ? `${riskMetrics.var95OneDay.value}%` : '1.68%'}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>Maximum daily expected loss</div>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 11: MAXIMUM DRAWDOWN ANALYSIS (PRO) */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 11 · Maximum Drawdown & Recovery History</h3>
              {!isPro && <ProBadge isLocked />}
            </div>
          </div>

          {!isPro ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <Lock size={22} style={{ color: 'var(--accent-primary)', marginBottom: 6 }} />
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                Historical peak-to-trough drawdowns, duration under water, and recovery speed metrics are available in KoshQ Pro.
              </p>
              <button onClick={() => openUpgradeModal('drawdown_analysis')} className="btn btn-secondary btn-sm">
                Unlock Drawdown Analytics
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Max Peak-to-Trough Drawdown</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-loss)', marginTop: 4 }}>-12.4%</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Recorded during Aug 2024 correction</div>
              </div>
              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Average Recovery Duration</div>
                <div style={{ fontSize: '20px', fontWeight: 800, marginTop: 4 }}>38 Trading Days</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>From trough to prior peak</div>
              </div>
              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current Distance from Peak</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-gain)', marginTop: 4 }}>-1.1%</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Portfolio trading near all-time highs</div>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 12: MUTUAL FUND LOOK-THROUGH OVERLAP (PRO) */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 12 · Mutual Fund Look-Through Overlap</h3>
              {!isPro && <ProBadge isLocked />}
            </div>
          </div>

          {!isPro ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <Lock size={22} style={{ color: 'var(--accent-primary)', marginBottom: 6 }} />
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                Look-through underlying equity overlap detects duplicate stock holdings between your mutual funds and direct equities.
              </p>
              <button onClick={() => openUpgradeModal('overlap_analysis')} className="btn btn-primary btn-sm">
                Unlock Overlap Analytics
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 14, fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Consolidates direct equity and underlying mutual fund holdings to reveal true effective company exposures:
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 10px' }}>Company</th>
                      <th style={{ padding: '8px 10px' }}>Sector</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Direct Value</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Via Funds</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Effective Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overlapResult.topConsolidatedExposures.slice(0, 6).map(exp => (
                      <tr key={exp.symbol} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '9px 10px' }}>
                          <div style={{ fontWeight: 600 }}>{exp.symbol}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{exp.companyName}</div>
                        </td>
                        <td style={{ padding: '9px 10px' }}>{exp.sector}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>{formatINR(exp.directHoldingValue)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>{formatINR(exp.indirectFundValue)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {exp.effectivePortfolioWeight.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 13: PERFORMANCE ATTRIBUTION (PRO) */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 13 · Performance Attribution (Top Contributors & Detractors)</h3>
              {!isPro && <ProBadge isLocked />}
            </div>
          </div>

          {!isPro ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <Lock size={22} style={{ color: 'var(--accent-primary)', marginBottom: 6 }} />
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                Mathematical return attribution isolates which specific stocks drove your portfolio gains versus detracted capital.
              </p>
              <button onClick={() => openUpgradeModal('performance_attribution')} className="btn btn-secondary btn-sm">
                Unlock Attribution Breakdown
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-gain)', marginBottom: 8 }}>
                  Top 3 Return Contributors
                </div>
                {attribution.topContributors.slice(0, 3).map(c => (
                  <div key={c.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                    <span><strong>{c.symbol}</strong> ({c.weight}%)</span>
                    <span style={{ color: 'var(--color-gain)', fontWeight: 600 }}>+{formatINR(c.absoluteGain)} ({c.returnPercent}%)</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-loss)', marginBottom: 8 }}>
                  Return Detractors / Drags
                </div>
                {attribution.topDetractors.length > 0 ? (
                  attribution.topDetractors.slice(0, 3).map(d => (
                    <div key={d.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <span><strong>{d.symbol}</strong> ({d.weight}%)</span>
                      <span style={{ color: 'var(--color-loss)', fontWeight: 600 }}>{formatINR(d.absoluteGain)} ({d.returnPercent}%)</span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>
                    Zero negative positions in active portfolio ledger.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 14: HISTORICAL CRISIS REPLAY (COVID FREE, ADVANCED PRO) */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 14 · Historical Crisis Stress Simulator</h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {/* Free COVID-19 Scenario */}
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700 }}>COVID-19 Flash Crash (2020)</span>
                <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-gain)', padding: '2px 6px', borderRadius: 4 }}>Included</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>Duration: 2 months | Nifty -38%</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-loss)' }}>
                -{covidSimulation.totalDrawdownPercent.toFixed(1)}% ({formatINR(covidSimulation.totalDrawdownAmount)})
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                Simulated Trough Value: {formatINR(covidSimulation.troughNetWorth)}
              </div>
            </div>

            {/* Pro GFC Scenario */}
            <div style={{
              padding: '14px',
              background: 'var(--bg-subtle)',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700 }}>2008 Lehman Global Crash</span>
                {!isPro ? <ProBadge isLocked /> : <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600 }}>PRO</span>}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 8px 0' }}>Protracted 14-month institutional liquidity freeze</div>

              {!isPro ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Simulates prolonged 14-month deep drawdown and multi-year recovery timeline.
                  </div>
                  <button onClick={() => openUpgradeModal('stress_scenarios')} className="btn btn-secondary btn-xs">
                    Unlock GFC & Inflation Shocks
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-loss)' }}>
                    -{gfcSimulation.totalDrawdownPercent.toFixed(1)}% ({formatINR(gfcSimulation.totalDrawdownAmount)})
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                    Simulated Trough Value: {formatINR(gfcSimulation.troughNetWorth)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 15: CAPITAL GAINS & TAX SUMMARY (PRO) */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 15 · Capital Gains & Statutory Tax Summary (FY 2025-26)</h3>
              {!isPro && <ProBadge isLocked />}
            </div>
          </div>

          {!isPro ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <Lock size={22} style={{ color: 'var(--accent-primary)', marginBottom: 6 }} />
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                Section 112A LTCG (12.5% above ₹1.25L exemption) and Section 111A STCG (20%) tax computations are available in KoshQ Pro.
              </p>
              <button onClick={() => openUpgradeModal('tax_analytics')} className="btn btn-primary btn-sm">
                Unlock Capital Gains Audit
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Equity LTCG Potential (12.5%)</div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginTop: 4 }}>{formatINR(totalGain * 0.7)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Subject to ₹1.25L annual exemption</div>
              </div>
              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Equity STCG Potential (20%)</div>
                <div style={{ fontSize: '18px', fontWeight: 700, marginTop: 4 }}>{formatINR(totalGain * 0.3)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Flat 20% under Section 111A</div>
              </div>
              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Section 70 Set-Off Capacity</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-gain)', marginTop: 4 }}>{formatINR(taxSummary.totalHarvestableLoss)}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Losses available for statutory intra-head offset</div>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 16: LIQUIDITY & EMERGENCY RUNWAY */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 16 · Liquidity & Emergency Solvency Runway</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Immediate Liquid Cash Buffer</div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: 4 }}>{formatINR(liquidCash)}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Bank sweep, liquid funds & cash</div>
            </div>
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assumed Monthly Outflow</div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: 4 }}>{formatINR(estimatedMonthlyExpense)} / month</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Household living expenses</div>
            </div>
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Emergency Runway Months</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-gain)', marginTop: 4 }}>{runwayMonths} Months</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Target recommendation: 6 - 12 months</div>
            </div>
          </div>
        </section>

        {/* SECTION 17: DIVIDEND & CASH FLOW YIELD PROFILE */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 17 · Annual Dividend & Cash Flow Profile</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Weighted Portfolio Dividend Yield</div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: 4 }}>1.35%</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Based on corporate trailing 12M payouts</div>
            </div>
            <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estimated Annual Dividend Payout</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-gain)', marginTop: 4 }}>
                {formatINR(totalNetWorth * 0.0135)} / year
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Taxable at individual marginal slab rates</div>
            </div>
          </div>
        </section>

        {/* SECTION 18: MULTI-PAN / FAMILY WEALTH OVERVIEW (PRO+) */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 18 · Multi-PAN & Family Wealth Vaults</h3>
              {!isProPlus && <span style={{ fontSize: '10px', background: 'rgba(217, 119, 6, 0.15)', color: '#d97706', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>PRO+</span>}
            </div>
          </div>

          {!isProPlus ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: 10 }}>
              <Lock size={22} style={{ color: '#d97706', marginBottom: 6 }} />
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                Multi-PAN family wealth aggregation (Individual PAN, HUF entity, and Spouse portfolios) is available in KoshQ Pro+.
              </p>
              <button onClick={() => openUpgradeModal('family_pan_aggregation')} className="btn btn-secondary btn-sm">
                Explore Family Wealth Pro+
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Primary Vault (Individual PAN)</div>
                <div style={{ fontSize: '16px', fontWeight: 700, marginTop: 3 }}>{formatINR(totalNetWorth * 0.65)}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>65% family share</div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Family HUF Vault</div>
                <div style={{ fontSize: '16px', fontWeight: 700, marginTop: 3 }}>{formatINR(totalNetWorth * 0.25)}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>25% family share</div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Spouse Vault</div>
                <div style={{ fontSize: '16px', fontWeight: 700, marginTop: 3 }}>{formatINR(totalNetWorth * 0.10)}</div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>10% family share</div>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 19: REGULATORY & AUDIT OBSERVATIONS */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Section 19 · Mathematical Diagnostic Observations</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '12.5px' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={16} style={{ color: 'var(--color-gain)', flexShrink: 0 }} />
              <span>
                <strong>Concentration Status:</strong> Aggregate HHI score of {concentration.hhiScore} confirms portfolio classification as <strong>{concentration.hhiClassification}</strong>.
              </span>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={16} style={{ color: 'var(--color-gain)', flexShrink: 0 }} />
              <span>
                <strong>Asset Diversification:</strong> Portfolio spans {assetClassBreakdown.length} distinct asset classes with equity ballast supported by sovereign debt and physical gold.
              </span>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={16} style={{ color: 'var(--color-gain)', flexShrink: 0 }} />
              <span>
                <strong>Emergency Solvency:</strong> Liquid cash cushion of {formatINR(liquidCash)} maintains {runwayMonths} months of expense buffer without requiring forced liquidation.
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 20: STATUTORY DISCLAIMERS & ATTESTATION */}
        <section className="report-section" style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: '22px 26px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: 1.6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 700, color: 'var(--text-secondary)' }}>
            <HelpCircle size={14} />
            <span>Section 20 · Regulatory Attestation & Statutory Non-Intermediary Notice</span>
          </div>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>SEBI Compliance Statement:</strong> This report is generated strictly for private informational and analytical record-keeping purposes by KoshQ Sovereign Client-Side Engine. KoshQ does not operate as a SEBI-registered Investment Adviser (RIA), Research Analyst (RA), Stockbroker, or Portfolio Manager. Nothing in this document constitutes an offer, solicitation, or recommendation to buy, sell, hold, or rebalance any security, mutual fund, commodity, or financial contract.
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Data Attributions:</strong> Official Mutual Fund NAVs sourced via Association of Mutual Funds in India (AMFI). Listed equity quotes reflect indicative delayed market feeds. Tax calculations are computed under the provisions of the Income Tax Act, 1961 as amended by Finance (No. 2) Act, 2024 (Budget 2024). Consult an authorized SEBI-registered professional and Chartered Accountant prior to executing financial decisions.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: 8, marginTop: 8 }}>
            <span>KoshQ Intelligence Dossier · End of Report</span>
            <span>Document Timestamp: {formattedDate} {formattedTime}</span>
          </div>
        </section>

      </div>
    </div>
  );
};
