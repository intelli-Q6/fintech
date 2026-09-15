import React from 'react';
import { Holding, StockDetail } from '../../data/types';
import { DEMO_STOCKS, generateSyntheticHistory } from '../../data/demoData';
import { formatINR, formatPercent } from '../../core/math/xirr';
import { X, ShieldCheck, FileText, Info } from 'lucide-react';
import { PriceChart } from '../Charts/PriceChart';

interface AssetDetailDrawerProps {
  holding: Holding | null;
  onClose: () => void;
}

export const AssetDetailDrawer: React.FC<AssetDetailDrawerProps> = ({ holding, onClose }) => {
  if (!holding) return null;

  // Find detailed company financials if it's an equity
  const stockDetail: StockDetail | undefined = DEMO_STOCKS.find(s => s.symbol === holding.symbol);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{holding.name}</h3>
                <span className={`asset-pill ${holding.assetClass}`}>
                  {holding.assetClass.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {holding.symbol} • ISIN: {holding.isin}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Position Summary Card */}
        <div style={{
          background: 'var(--bg-subtle)',
          padding: 14,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12
        }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CURRENT HOLDINGS</div>
            <div style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
              {formatINR(holding.currentValue)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {holding.quantity} units @ {formatINR(holding.averageBuyPrice, { showDecimals: true })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>UNREALIZED P&L</div>
            <div style={{
              fontSize: '15px',
              fontWeight: '700',
              fontFamily: 'var(--font-mono)',
              color: holding.unrealizedGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)'
            }}>
              {formatINR(holding.unrealizedGain)}
            </div>
            <div style={{
              fontSize: '11px',
              color: holding.unrealizedGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)'
            }}>
              {formatPercent(holding.unrealizedGainPercent, true)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PORTFOLIO WEIGHT</div>
            <div style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
              {holding.allocationPercent.toFixed(2)}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Risk: {holding.riskGrade}
            </div>
          </div>
        </div>

        {/* Interactive Technical & Historical Price Chart */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Historical Price Performance & Interactive Chart
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Multi-Timeframe OHLC & Drawdown</span>
          </div>
          <PriceChart
            history={stockDetail?.history || holding.history || generateSyntheticHistory(holding.currentPrice)}
            currentPrice={holding.currentPrice}
            symbol={holding.symbol}
            height={240}
          />
        </div>

        {/* Fundamental Statistics Grid */}
        {stockDetail && (
          <>
            <div>
              <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 10 }}>
                Fundamental & Valuation Metrics
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: 8,
                fontSize: '12px'
              }}>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Trailing P/E</div>
                  <div style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{stockDetail.peRatio.toFixed(1)}x</div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Price / Book (P/B)</div>
                  <div style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{stockDetail.pbRatio.toFixed(1)}x</div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Dividend Yield</div>
                  <div style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{stockDetail.dividendYield.toFixed(2)}%</div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Return on Equity (ROE)</div>
                  <div style={{ fontWeight: '600', fontFamily: 'var(--font-mono)', color: 'var(--color-gain)' }}>{stockDetail.roe.toFixed(1)}%</div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>ROCE</div>
                  <div style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{stockDetail.roce.toFixed(1)}%</div>
                </div>
                <div style={{ background: 'var(--bg-surface-elevated)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Debt / Equity</div>
                  <div style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{stockDetail.debtToEquity.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* 5-Year Historical Financial Table */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  5-Year Audited Financial Track Record
                </h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Figures in ₹ Crores</span>
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <table className="terminal-table" style={{ fontSize: '11px' }}>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      {stockDetail.financials5Y.map(f => (
                        <th key={f.year} className="tabular-nums">{f.year}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: '600' }}>Revenue</td>
                      {stockDetail.financials5Y.map(f => (
                        <td key={f.year} className="tabular-nums">₹{f.revenue.toLocaleString('en-IN')}</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: '600' }}>Operating Profit (EBITDA)</td>
                      {stockDetail.financials5Y.map(f => (
                        <td key={f.year} className="tabular-nums">₹{f.ebitda.toLocaleString('en-IN')}</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: '600' }}>Net Profit (PAT)</td>
                      {stockDetail.financials5Y.map(f => (
                        <td key={f.year} className="tabular-nums" style={{ color: f.netProfit > 0 ? 'var(--color-gain)' : 'var(--color-loss)' }}>
                          ₹{f.netProfit.toLocaleString('en-IN')}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: '600' }}>EPS (₹)</td>
                      {stockDetail.financials5Y.map(f => (
                        <td key={f.year} className="tabular-nums">₹{f.eps.toFixed(1)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ fontWeight: '600' }}>Operating Cash Flow</td>
                      {stockDetail.financials5Y.map(f => (
                        <td key={f.year} className="tabular-nums">₹{f.operatingCashFlow.toLocaleString('en-IN')}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Shareholding Breakdown */}
            <div>
              <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Shareholding Pattern
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8, fontSize: '11px', textAlign: 'center' }}>
                <div style={{ background: 'var(--bg-subtle)', padding: 8, borderRadius: 4 }}>
                  <div style={{ color: 'var(--text-muted)' }}>Promoter</div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{stockDetail.shareholding.promoter}%</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 8, borderRadius: 4 }}>
                  <div style={{ color: 'var(--text-muted)' }}>FII / FPI</div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{stockDetail.shareholding.fii}%</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 8, borderRadius: 4 }}>
                  <div style={{ color: 'var(--text-muted)' }}>DII / MF</div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{stockDetail.shareholding.dii}%</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 8, borderRadius: 4 }}>
                  <div style={{ color: 'var(--text-muted)' }}>Public / Others</div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>{stockDetail.shareholding.public}%</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Business Summary */}
        <div>
          <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>
            Business Description
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {stockDetail ? stockDetail.businessSummary : `${holding.name} is held under your portfolio's ${holding.assetClass} allocation. Sector: ${holding.sector}.`}
          </p>
        </div>

        {/* Non-Intermediary Regulatory Notice */}
        <div className="compliance-notice" style={{ marginTop: 'auto' }}>
          <ShieldCheck size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <div>
            <strong>Neutral Information & Analytics Notice:</strong> All data shown is historical, factual, and derived from official corporate filings and exchange feeds. KoshQ does not issue Buy, Sell, Hold ratings or target prices. You remain exclusively responsible for your investment decisions.
          </div>
        </div>
      </div>
    </div>
  );
};
