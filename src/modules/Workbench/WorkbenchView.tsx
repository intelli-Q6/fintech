import React, { useState } from 'react';
import { DEMO_STOCKS, DEMO_GOALS } from '../../data/demoData';
import { StockDetail, GoalItem } from '../../data/types';
import { formatINR, formatPercent } from '../../core/math/xirr';
import { calculateGoalSIP } from '../../core/calculators/engine';
import { CRISIS_SCENARIOS, runCrisisSimulation } from '../../core/portfolio/crisisSimulator';
import { VaultStorage } from '../../data/storage';
import {
  SlidersHorizontal,
  Scale,
  Activity,
  Target,
  ShieldCheck,
  CheckCircle,
  Plus,
  History,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

export const WorkbenchView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'compare' | 'screener' | 'scenarios' | 'goals'>('compare');

  // Crisis Replay State
  const userHoldings = VaultStorage.getHoldings();
  const [selectedCrisisId, setSelectedCrisisId] = useState('covid_2020');
  const [monthlyExpenses, setMonthlyExpenses] = useState(65000);
  const crisisResult = runCrisisSimulation(userHoldings, selectedCrisisId, monthlyExpenses);

  // Comparison State
  const [stockA, setStockA] = useState<StockDetail>(DEMO_STOCKS[0]); // HDFC Bank
  const [stockB, setStockB] = useState<StockDetail>(DEMO_STOCKS[1]); // Reliance

  // Screener State
  const [minMarketCap, setMinMarketCap] = useState(100000); // ₹1,00,000 Cr
  const [maxPE, setMaxPE] = useState(35);
  const [minROE, setMinROE] = useState(15);
  const [maxDebtEquity, setMaxDebtEquity] = useState(1.0);

  // Scenario Lab State
  const [marketDropPercent, setMarketDropPercent] = useState(10);
  const [inflationRate, setInflationRate] = useState(6);
  const [projectionYears, setProjectionYears] = useState(10);

  // Filtered Screener Results
  const screenerResults = DEMO_STOCKS.filter(s =>
    s.marketCap >= minMarketCap &&
    s.peRatio <= maxPE &&
    s.roe >= minROE &&
    s.debtToEquity <= maxDebtEquity
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Workbench & Scenario Lab</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Comparative Analysis, Deterministic Screeners & Stress Testing
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        <button
          onClick={() => setActiveTab('compare')}
          className={`tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
        >
          <Scale size={14} style={{ display: 'inline', marginRight: 6 }} />
          Comparative Engine
        </button>
        <button
          onClick={() => setActiveTab('screener')}
          className={`tab-btn ${activeTab === 'screener' ? 'active' : ''}`}
        >
          <SlidersHorizontal size={14} style={{ display: 'inline', marginRight: 6 }} />
          Sovereign Screener ({screenerResults.length} Matches)
        </button>
        <button
          onClick={() => setActiveTab('scenarios')}
          className={`tab-btn ${activeTab === 'scenarios' ? 'active' : ''}`}
        >
          <Activity size={14} style={{ display: 'inline', marginRight: 6 }} />
          Scenario Lab (Stress Test)
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`}
        >
          <Target size={14} style={{ display: 'inline', marginRight: 6 }} />
          Goal Architecture
        </button>
      </div>

      {/* 1. Comparative Engine */}
      {activeTab === 'compare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Selectors */}
          <div className="responsive-selectors">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                PRIMARY INSTRUMENT A
              </label>
              <select
                value={stockA.symbol}
                onChange={e => setStockA(DEMO_STOCKS.find(s => s.symbol === e.target.value) || DEMO_STOCKS[0])}
                className="input-field"
                style={{ width: '100%' }}
              >
                {DEMO_STOCKS.map(s => (
                  <option key={s.symbol} value={s.symbol}>{s.name} ({s.symbol})</option>
                ))}
              </select>
            </div>

            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-muted)' }}>VS</div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                COMPARATIVE INSTRUMENT B
              </label>
              <select
                value={stockB.symbol}
                onChange={e => setStockB(DEMO_STOCKS.find(s => s.symbol === e.target.value) || DEMO_STOCKS[1])}
                className="input-field"
                style={{ width: '100%' }}
              >
                {DEMO_STOCKS.map(s => (
                  <option key={s.symbol} value={s.symbol}>{s.name} ({s.symbol})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Objective Differential Table */}
          <div className="terminal-card">
            <div className="terminal-table-wrapper">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Characteristic Metric</th>
                    <th>{stockA.name} ({stockA.symbol})</th>
                    <th>{stockB.name} ({stockB.symbol})</th>
                    <th>Objective Observation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Sector</td>
                    <td>{stockA.sector}</td>
                    <td>{stockB.sector}</td>
                    <td style={{ color: 'var(--text-muted)' }}>Distinct Sector Dynamics</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Market Capitalization</td>
                    <td className="tabular-nums">₹{stockA.marketCap.toLocaleString('en-IN')} Cr</td>
                    <td className="tabular-nums">₹{stockB.marketCap.toLocaleString('en-IN')} Cr</td>
                    <td>{stockA.marketCap > stockB.marketCap ? `${stockA.symbol} is larger` : `${stockB.symbol} is larger`}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Trailing P/E Ratio</td>
                    <td className="tabular-nums">{stockA.peRatio.toFixed(1)}x</td>
                    <td className="tabular-nums">{stockB.peRatio.toFixed(1)}x</td>
                    <td>{stockA.peRatio < stockB.peRatio ? `${stockA.symbol} has lower multiple` : `${stockB.symbol} has lower multiple`}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Price to Book (P/B)</td>
                    <td className="tabular-nums">{stockA.pbRatio.toFixed(1)}x</td>
                    <td className="tabular-nums">{stockB.pbRatio.toFixed(1)}x</td>
                    <td>{stockA.pbRatio < stockB.pbRatio ? `${stockA.symbol} trades closer to book` : `${stockB.symbol} trades closer to book`}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Return on Equity (ROE)</td>
                    <td className="tabular-nums" style={{ color: 'var(--color-gain)', fontWeight: '600' }}>{stockA.roe.toFixed(1)}%</td>
                    <td className="tabular-nums" style={{ color: 'var(--color-gain)', fontWeight: '600' }}>{stockB.roe.toFixed(1)}%</td>
                    <td>{stockA.roe > stockB.roe ? `${stockA.symbol} has higher ROE` : `${stockB.symbol} has higher ROE`}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Return on Capital Employed (ROCE)</td>
                    <td className="tabular-nums">{stockA.roce.toFixed(1)}%</td>
                    <td className="tabular-nums">{stockB.roce.toFixed(1)}%</td>
                    <td>{stockA.roce > stockB.roce ? `${stockA.symbol} has higher ROCE` : `${stockB.symbol} has higher ROCE`}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Debt to Equity</td>
                    <td className="tabular-nums">{stockA.debtToEquity.toFixed(2)}</td>
                    <td className="tabular-nums">{stockB.debtToEquity.toFixed(2)}</td>
                    <td>{stockA.debtToEquity === 0 ? `${stockA.symbol} is zero debt` : stockB.debtToEquity === 0 ? `${stockB.symbol} is zero debt` : 'Relative leverage difference'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Historical Beta (Volatility)</td>
                    <td className="tabular-nums">{stockA.beta.toFixed(2)}</td>
                    <td className="tabular-nums">{stockB.beta.toFixed(2)}</td>
                    <td>{stockA.beta < stockB.beta ? `${stockA.symbol} has lower market correlation` : `${stockB.symbol} has lower market correlation`}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600' }}>Dividend Yield</td>
                    <td className="tabular-nums">{stockA.dividendYield.toFixed(2)}%</td>
                    <td className="tabular-nums">{stockB.dividendYield.toFixed(2)}%</td>
                    <td>{stockA.dividendYield > stockB.dividendYield ? `${stockA.symbol} higher cash yield` : `${stockB.symbol} higher cash yield`}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="compliance-notice">
            <ShieldCheck size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <strong>Objective Comparison Standard:</strong> KoshQ displays side-by-side differences without declaring "Winners", "Top Picks", or issuing "Buy/Sell" guidance.
            </div>
          </div>
        </div>
      )}

      {/* 2. Sovereign Screener */}
      {activeTab === 'screener' && (
        <div className="responsive-split-main">
          {/* Controls Panel */}
          <div className="terminal-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 14 }}>
              User-Controlled Filter Criteria
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: 4 }}>
                  <span>Min Market Cap:</span>
                  <span className="tabular-nums" style={{ fontWeight: '600' }}>₹{minMarketCap.toLocaleString('en-IN')} Cr</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="1500000"
                  step="50000"
                  value={minMarketCap}
                  onChange={e => setMinMarketCap(Number(e.target.value))}
                  className="range-slider"
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: 4 }}>
                  <span>Max P/E Multiple:</span>
                  <span className="tabular-nums" style={{ fontWeight: '600' }}>&le; {maxPE}x</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="70"
                  step="2"
                  value={maxPE}
                  onChange={e => setMaxPE(Number(e.target.value))}
                  className="range-slider"
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: 4 }}>
                  <span>Min Return on Equity (ROE):</span>
                  <span className="tabular-nums" style={{ fontWeight: '600' }}>&ge; {minROE}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={minROE}
                  onChange={e => setMinROE(Number(e.target.value))}
                  className="range-slider"
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: 4 }}>
                  <span>Max Debt to Equity:</span>
                  <span className="tabular-nums" style={{ fontWeight: '600' }}>&le; {maxDebtEquity}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={maxDebtEquity}
                  onChange={e => setMaxDebtEquity(Number(e.target.value))}
                  className="range-slider"
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  SAMPLE ILLUSTRATIVE PRESET:
                </span>
                <button
                  onClick={() => {
                    setMinMarketCap(500000);
                    setMaxPE(35);
                    setMinROE(20);
                    setMaxDebtEquity(0.5);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', fontSize: '11px' }}
                >
                  Screen: Large Cap, High ROE (&gt;20%), D/E &lt; 0.5
                </button>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="terminal-card">
            <div className="terminal-header">
              <span className="terminal-title">
                {screenerResults.length} Companies Match Your Selected Criteria
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Deterministic Filter Output</span>
            </div>

            <div className="terminal-table-wrapper">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Company Name</th>
                    <th>Sector</th>
                    <th>Market Cap (₹ Cr)</th>
                    <th>P/E</th>
                    <th>ROE</th>
                    <th>D/E</th>
                  </tr>
                </thead>
                <tbody>
                  {screenerResults.map(s => (
                    <tr key={s.symbol}>
                      <td style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{s.symbol}</td>
                      <td>{s.name}</td>
                      <td>{s.sector}</td>
                      <td className="tabular-nums">₹{s.marketCap.toLocaleString('en-IN')}</td>
                      <td className="tabular-nums">{s.peRatio.toFixed(1)}</td>
                      <td className="tabular-nums" style={{ color: 'var(--color-gain)', fontWeight: '600' }}>{s.roe.toFixed(1)}%</td>
                      <td className="tabular-nums">{s.debtToEquity.toFixed(2)}</td>
                    </tr>
                  ))}
                  {screenerResults.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                        No companies match the selected filter parameters. Adjust sliders to broaden criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="compliance-notice" style={{ margin: 12 }}>
              <ShieldCheck size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <div>
                <strong>Non-Advisory Tool Notice:</strong> The screener is a mechanical filtering tool executing your parameters. It does not rank, endorse, or recommend any security.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Scenario Lab (Historical Crisis Replay & Stress Tester) */}
      {activeTab === 'scenarios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Scenario Selector Bar */}
          <div className="terminal-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={18} style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Historical Crisis Replay Engine</h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Replay actual historical market panics against your current portfolio of {formatINR(crisisResult.originalNetWorth)}
                  </p>
                </div>
              </div>

              {/* Monthly living expense control for liquid runway */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Monthly Living Burn:</span>
                <span style={{ fontSize: '12px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{formatINR(monthlyExpenses)}</span>
                <input
                  type="range"
                  min="25000"
                  max="200000"
                  step="5000"
                  value={monthlyExpenses}
                  onChange={e => setMonthlyExpenses(Number(e.target.value))}
                  style={{ width: 90, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Crisis Scenario Selector Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              {CRISIS_SCENARIOS.map(scenario => {
                const isSelected = scenario.id === selectedCrisisId;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedCrisisId(scenario.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--accent-surface)' : 'var(--bg-subtle)',
                      border: isSelected ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '700', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      {scenario.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {scenario.period}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-loss)', marginTop: 2 }}>
                      Equity: {scenario.assetDrawdowns.equityLargeCap}% • Gold: +{scenario.assetDrawdowns.gold}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key Simulation Metrics */}
          <div className="grid-metrics-4">
            <div className="metric-card">
              <span className="metric-label">Current Net Worth</span>
              <div className="metric-value">{formatINR(crisisResult.originalNetWorth)}</div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Initial Baseline</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Projected Trough Net Worth</span>
              <div className="metric-value" style={{ color: 'var(--color-loss)' }}>
                {formatINR(crisisResult.troughNetWorth)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-loss)', fontWeight: '600' }}>
                -{formatINR(crisisResult.totalDrawdownAmount)} ({formatPercent(crisisResult.totalDrawdownPercent)})
              </span>
            </div>

            <div className="metric-card" style={{ borderColor: 'var(--accent-border)' }}>
              <span className="metric-label">Liquid Survival Runway</span>
              <div className="metric-value" style={{ color: crisisResult.liquidSurvivalRunwayMonths >= 6 ? 'var(--color-gain)' : 'var(--color-warning)' }}>
                {crisisResult.liquidSurvivalRunwayMonths} Months
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Safe in Cash/Debt ({formatINR(crisisResult.liquidCashBuffer)})
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Modeled Recovery Duration</span>
              <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>
                {crisisResult.scenario.recoveryMonths} Months
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Trough duration: {crisisResult.scenario.durationMonths} Months
              </span>
            </div>
          </div>

          {/* Drawdown & Recovery Trajectory Chart */}
          <div className="terminal-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <span className="terminal-title">24-Month Portfolio Recovery Arc</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 8 }}>
                  Historical path from Pre-Crisis through Trough to Recovery
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Values in ₹ Lakhs
              </span>
            </div>

            {/* Pure SVG Trajectory Arc */}
            <div style={{ position: 'relative', width: '100%', height: 160 }}>
              <svg viewBox="0 0 600 160" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="crisisGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid line */}
                <line x1="20" y1="30" x2="580" y2="30" stroke="var(--border-subtle)" strokeDasharray="3,3" />
                <line x1="20" y1="80" x2="580" y2="80" stroke="var(--border-subtle)" strokeDasharray="3,3" />
                <line x1="20" y1="130" x2="580" y2="130" stroke="var(--border-subtle)" strokeDasharray="3,3" />

                {/* Trajectory Polyline */}
                {(() => {
                  const pts = crisisResult.trajectoryPoints;
                  const min = Math.min(...pts.map(p => p.portfolioValue)) * 0.95;
                  const max = Math.max(...pts.map(p => p.portfolioValue)) * 1.05;
                  const range = max - min || 1;

                  const coords = pts.map((p, idx) => {
                    const x = 20 + (idx / (pts.length - 1)) * 560;
                    const y = 130 - ((p.portfolioValue - min) / range) * 100;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  });

                  const lineD = `M ${coords.join(' L ')}`;
                  const areaD = `${lineD} L 580,140 L 20,140 Z`;

                  return (
                    <g>
                      <path d={areaD} fill="url(#crisisGrad)" />
                      <path d={lineD} fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {pts.map((p, idx) => {
                        const x = 20 + (idx / (pts.length - 1)) * 560;
                        const y = 130 - ((p.portfolioValue - min) / range) * 100;
                        return (
                          <g key={idx}>
                            <circle
                              cx={x}
                              cy={y}
                              r={p.isTrough ? 5 : 3}
                              fill={p.isTrough ? 'var(--color-loss)' : 'var(--accent-primary)'}
                              stroke="#fff"
                              strokeWidth={p.isTrough ? 2 : 1}
                            />
                            {p.isTrough && (
                              <text x={x} y={y - 10} fill="var(--color-loss)" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="var(--font-mono)">
                                Trough: {formatINR(p.portfolioValue, { compact: true })}
                              </text>
                            )}
                            <text x={x} y={152} fill="var(--text-muted)" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">
                              {p.month}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Asset Class Stress Breakdown Table */}
          <div className="terminal-card">
            <div className="terminal-header">
              <span className="terminal-title">Asset Class Stress Distribution</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {crisisResult.scenario.name}
              </span>
            </div>

            <div className="terminal-table-wrapper">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Asset Class</th>
                    <th className="tabular-nums">Pre-Crisis Allocation</th>
                    <th className="tabular-nums">Stressed Trough Value</th>
                    <th className="tabular-nums">Absolute Impact</th>
                    <th className="tabular-nums">Empirical Drawdown %</th>
                    <th>Ballast & Resilience Role</th>
                  </tr>
                </thead>
                <tbody>
                  {crisisResult.assetClassLossBreakdown.map(b => {
                    const isGain = b.lossAmount <= 0;
                    return (
                      <tr key={b.assetClass}>
                        <td style={{ fontWeight: '600' }}>{b.assetClass}</td>
                        <td className="tabular-nums">{formatINR(b.preValue)}</td>
                        <td className="tabular-nums" style={{ fontWeight: '700' }}>{formatINR(b.postValue)}</td>
                        <td className="tabular-nums" style={{ color: isGain ? 'var(--color-gain)' : 'var(--color-loss)', fontWeight: '700' }}>
                          {isGain ? '+' : ''}{formatINR(-b.lossAmount)}
                        </td>
                        <td className="tabular-nums">
                          <span className={`delta-badge ${isGain ? 'gain' : 'loss'}`}>
                            {isGain ? '+' : ''}{(-b.lossPercent).toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {b.assetClass === 'Gold'
                            ? 'Primary safe-haven shock absorber; counteracts equity drops'
                            : b.assetClass === 'Bond'
                            ? 'G-Sec coupon yield anchor; capital gain if rates fall'
                            : b.assetClass === 'Cash'
                            ? 'Uncorrupted survival reserve preventing forced equity fire sales'
                            : 'Drawdown shock absorber; recovers during post-crisis easing'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Macro Trigger Narrative */}
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 16
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: 6 }}>
              Key Macro Drivers ({crisisResult.scenario.name})
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
              {crisisResult.scenario.description}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 6 }}>
              {crisisResult.scenario.keyMacroTriggers.map((trig, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                  <span>{trig}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="compliance-notice">
            <ShieldCheck size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <strong>Deterministic Stress Simulation Safe Harbor:</strong> Calculations model historical exchange data and empirical asset drawdowns. They are educational simulations and do not guarantee future performance or provide investment recommendations.
            </div>
          </div>
        </div>
      )}

      {/* 4. Goal Architecture */}
      {activeTab === 'goals' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {DEMO_GOALS.map(g => {
            const progress = Math.min((g.currentSaved / g.targetAmount) * 100, 100);
            return (
              <div key={g.id} className="terminal-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: 4, background: 'var(--accent-surface)', color: 'var(--accent-primary)' }}>
                    {g.category.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target: {g.targetYear}</span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: 12 }}>{g.title}</h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Current: {formatINR(g.currentSaved, { compact: true })}</span>
                  <span style={{ fontWeight: '700' }}>Target: {formatINR(g.targetAmount, { compact: true })}</span>
                </div>

                <div style={{ width: '100%', height: 6, background: 'var(--bg-surface-elevated)', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)' }} />
                </div>

                <div style={{ background: 'var(--bg-subtle)', padding: 10, borderRadius: 'var(--radius-xs)', fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Required Monthly Contribution: </span>
                  <span className="tabular-nums" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                    {formatINR(g.monthlyRequiredSIP)} / month
                  </span>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: 2 }}>
                    Assuming conservative 11% long-term asset CAGR
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
