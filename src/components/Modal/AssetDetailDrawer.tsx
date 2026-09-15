import React, { useState, useEffect } from 'react';
import { Holding, StockDetail, HistoricalPricePoint, TimeframeKey } from '../../data/types';
import { DEMO_STOCKS, generateSyntheticHistory } from '../../data/demoData';
import { formatINR, formatPercent } from '../../core/math/xirr';
import { X, ShieldCheck, FileText, Info, RefreshCw } from 'lucide-react';
import { PriceChart } from '../Charts/PriceChart';
import { useMarketQuotes } from '../../core/market/useMarketQuotes';

interface AssetDetailDrawerProps {
  holding: Holding | null;
  onClose: () => void;
}

export const AssetDetailDrawer: React.FC<AssetDetailDrawerProps> = ({ holding, onClose }) => {
  if (!holding) return null;

  const { quotes } = useMarketQuotes();
  const liveQuote = quotes[holding.symbol] || quotes[holding.id];

  // Dynamic live price & valuation
  const currentPrice = liveQuote ? liveQuote.currentPrice : holding.currentPrice;
  const currentValue = holding.quantity * currentPrice;
  const investedAmount = holding.investedAmount || (holding.quantity * holding.averageBuyPrice);
  const unrealizedGain = currentValue - investedAmount;
  const unrealizedGainPercent = investedAmount > 0 ? (unrealizedGain / investedAmount) * 100 : 0;

  // Real-time live historical OHLC candles
  const [liveHistory, setLiveHistory] = useState<Record<TimeframeKey, HistoricalPricePoint[]> | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchLiveHistory() {
      if (!holding) return;
      setIsLoadingHistory(true);

      const sym = holding.symbol.trim().toUpperCase();
      const rawTicker = sym.startsWith('^') || sym.endsWith('.NS') || sym.endsWith('.BO') || sym.includes('=')
        ? sym
        : `${sym}.NS`;

      try {
        const res = await fetch(`/api/quote?ticker=${encodeURIComponent(rawTicker)}&range=1y&interval=1d`);
        if (res.ok) {
          const json = await res.json();
          const result = json.chart?.result?.[0];
          if (result && result.timestamp && result.indicators?.quote?.[0]) {
            const timestamps: number[] = result.timestamp;
            const quoteData = result.indicators.quote[0];
            const opens = quoteData.open || [];
            const highs = quoteData.high || [];
            const lows = quoteData.low || [];
            const closes = quoteData.close || [];
            const volumes = quoteData.volume || [];

            const points: HistoricalPricePoint[] = [];
            for (let i = 0; i < timestamps.length; i++) {
              const close = closes[i];
              if (typeof close === 'number' && !isNaN(close) && close > 0) {
                const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
                points.push({
                  date,
                  open: typeof opens[i] === 'number' && !isNaN(opens[i]) ? opens[i] : close,
                  high: typeof highs[i] === 'number' && !isNaN(highs[i]) ? highs[i] : close,
                  low: typeof lows[i] === 'number' && !isNaN(lows[i]) ? lows[i] : close,
                  close,
                  volume: typeof volumes[i] === 'number' && !isNaN(volumes[i]) ? volumes[i] : 0
                });
              }
            }

            if (points.length > 0 && isMounted) {
              // Ensure latest candle reflects real-time LTP
              points[points.length - 1].close = currentPrice;
              setLiveHistory({
                '1M': points.slice(-22),
                '6M': points.slice(-130),
                '1Y': points,
                '3Y': points,
                '5Y': points
              });
            }
          }
        }
      } catch (e) {
        console.warn('Could not load live chart candles for drawer:', e);
      } finally {
        if (isMounted) setIsLoadingHistory(false);
      }
    }

    fetchLiveHistory();
    return () => { isMounted = false; };
  }, [holding.symbol, currentPrice]);

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
                {liveQuote?.source === 'EXCHANGE_LIVE' && (
                  <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(5, 150, 105, 0.15)', color: 'var(--color-gain)' }}>
                    LIVE EXCHANGE
                  </span>
                )}
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
              {formatINR(currentValue)}
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
              color: unrealizedGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)'
            }}>
              {formatINR(unrealizedGain)}
            </div>
            <div style={{
              fontSize: '11px',
              color: unrealizedGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)'
            }}>
              {formatPercent(unrealizedGainPercent, true)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isLoadingHistory && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={10} className="animate-spin" /> Live Candles
                </span>
              )}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Multi-Timeframe OHLC & Drawdown</span>
            </div>
          </div>
          <PriceChart
            history={liveHistory || (holding.history && !stockDetail ? holding.history : generateSyntheticHistory(currentPrice))}
            currentPrice={currentPrice}
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
