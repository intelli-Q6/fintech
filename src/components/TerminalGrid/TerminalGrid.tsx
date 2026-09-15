import React, { useState } from 'react';
import { Holding } from '../../data/types';
import { formatINR, formatPercent } from '../../core/math/xirr';
import { Sparkline } from '../Charts/Charts';
import { ArrowUpDown, Search, Filter, Columns, Eye } from 'lucide-react';
import { useMarketQuotes } from '../../core/market/useMarketQuotes';

interface TerminalGridProps {
  holdings: Holding[];
  onSelectHolding: (holding: Holding) => void;
  compactMode?: boolean;
}

export const TerminalGrid: React.FC<TerminalGridProps> = ({
  holdings,
  onSelectHolding,
  compactMode = false
}) => {
  const { quotes } = useMarketQuotes();
  const [searchTerm, setSearchTerm] = useState('');
  const [assetFilter, setAssetFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof Holding>('currentValue');
  const [sortAsc, setSortAsc] = useState(false);
  const [isCompact, setIsCompact] = useState(compactMode);

  // Augment holdings with live market quotes
  const liveHoldings = holdings.map(h => {
    const liveQuote = quotes[h.symbol] || quotes[h.id];
    if (!liveQuote) return { ...h, livePrice: h.currentPrice, liveVal: h.currentValue, liveGain: h.unrealizedGain, liveGainPct: h.unrealizedGainPercent, lastTick: null, quoteSource: 'REFERENCE' };

    const livePrice = liveQuote.currentPrice;
    const liveVal = h.quantity * livePrice;
    const liveGain = liveVal - h.investedAmount;
    const liveGainPct = h.investedAmount > 0 ? (liveGain / h.investedAmount) * 100 : 0;

    return {
      ...h,
      livePrice,
      liveVal,
      liveGain,
      liveGainPct,
      lastTick: liveQuote.lastTick,
      quoteSource: liveQuote.source
    };
  });

  const filteredHoldings = liveHoldings
    .filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            h.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            h.isin.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAsset = assetFilter === 'ALL' || h.assetClass === assetFilter;
      return matchesSearch && matchesAsset;
    })
    .sort((a, b) => {
      const aVal = sortField === 'currentValue' ? a.liveVal : sortField === 'currentPrice' ? a.livePrice : (a[sortField] ?? 0);
      const bVal = sortField === 'currentValue' ? b.liveVal : sortField === 'currentPrice' ? b.livePrice : (b[sortField] ?? 0);
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });

  const handleSort = (field: keyof Holding) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

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
    <div className="terminal-card">
      <div className="terminal-header" style={{ flexWrap: 'wrap', gap: 8, padding: '8px 12px' }}>
        <div className="terminal-title">
          <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.04em' }}>PORTFOLIO WORKBENCH</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400', fontFamily: 'var(--font-mono)' }}>
            ({filteredHoldings.length} Positions)
          </span>
        </div>

        <div className="terminal-actions" style={{ flexWrap: 'wrap', gap: 6 }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 120, flex: '1 1 120px' }}>
            <Search size={12} style={{ position: 'absolute', left: 7, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search symbol, ISIN..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 24, height: 26, fontSize: '11px', width: '100%', borderRadius: 4 }}
            />
          </div>

          {/* Asset Class Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={11} style={{ color: 'var(--text-muted)' }} />
            <select
              value={assetFilter}
              onChange={e => setAssetFilter(e.target.value)}
              className="theme-select"
              style={{ height: 26, fontSize: '11px', padding: '2px 6px', borderRadius: 4 }}
            >
              <option value="ALL">All Classes</option>
              <option value="equity">Equities</option>
              <option value="mutual_fund">Mutual Funds</option>
              <option value="gold">Gold & SGB</option>
              <option value="bond">Bonds & Debt</option>
              <option value="govt_scheme">Govt Schemes</option>
              <option value="cash">Cash Buffer</option>
            </select>
          </div>

          {/* Column Density Toggle */}
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="btn btn-ghost btn-sm"
            style={{ height: 26, padding: '2px 8px', fontSize: '10px', gap: 4, borderRadius: 4 }}
            title={isCompact ? 'Expand all 11 columns' : 'Switch to compact essential columns'}
          >
            <Columns size={11} />
            <span>{isCompact ? 'Full Columns' : 'Compact'}</span>
          </button>
        </div>
      </div>

      <div className="terminal-table-wrapper">
        <table className="terminal-table" style={{ minWidth: isCompact ? '600px' : '840px' }}>
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('symbol')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Instrument <ArrowUpDown size={10} />
                </div>
              </th>
              <th>Class</th>
              <th className="sortable" onClick={() => handleSort('quantity')}>Qty</th>
              {!isCompact && (
                <th className="sortable" onClick={() => handleSort('averageBuyPrice')}>Avg Cost</th>
              )}
              <th className="sortable" onClick={() => handleSort('currentPrice')}>LTP / NAV</th>
              <th className="sortable" onClick={() => handleSort('currentValue')}>Current Value</th>
              <th className="sortable" onClick={() => handleSort('unrealizedGain')}>P&L (Unrealized)</th>
              <th className="sortable" onClick={() => handleSort('allocationPercent')}>Weight</th>
              {!isCompact && <th>P/E</th>}
              {!isCompact && <th>Risk</th>}
              <th>1Y Trend</th>
            </tr>
          </thead>
          <tbody>
            {filteredHoldings.map(h => {
              const isGain = h.liveGain >= 0;
              const tickClass = h.lastTick ? `tick-${h.lastTick}` : '';

              return (
                <tr
                  key={h.id}
                  onClick={() => onSelectHolding(h)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view comprehensive fundamental factsheet"
                >
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          {h.symbol}
                        </span>
                        {h.quoteSource === 'AMFI_LIVE' && (
                          <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 4px', borderRadius: 3, background: 'rgba(5, 150, 105, 0.12)', color: 'var(--color-gain)' }}>
                            AMFI
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`asset-pill ${getAssetPillClass(h.assetClass)}`}>
                      {h.assetClass.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="tabular-nums" style={{ fontSize: '11px' }}>{h.quantity.toLocaleString('en-IN')}</td>
                  {!isCompact && (
                    <td className="tabular-nums" style={{ fontSize: '11px' }}>{formatINR(h.averageBuyPrice, { showDecimals: true })}</td>
                  )}
                  <td className={`tabular-nums ${tickClass}`} style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '11px', transition: 'background-color 0.3s' }}>
                    {formatINR(h.livePrice, { showDecimals: true })}
                  </td>
                  <td className={`tabular-nums ${tickClass}`} style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '12px' }}>
                    {formatINR(h.liveVal)}
                  </td>
                  <td className="tabular-nums">
                    <span className={`delta-badge ${isGain ? 'gain' : 'loss'}`}>
                      {formatINR(h.liveGain, { compact: true })} ({formatPercent(h.liveGainPct, true)})
                    </span>
                  </td>
                  <td className="tabular-nums">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: '11px' }}>{h.allocationPercent.toFixed(1)}%</span>
                      <div style={{ width: 28, height: 3, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(h.allocationPercent * 3.5, 100)}%`, height: '100%', background: 'var(--accent-primary)' }} />
                      </div>
                    </div>
                  </td>
                  {!isCompact && (
                    <td className="tabular-nums" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      {h.peRatio ? h.peRatio.toFixed(1) : '—'}
                    </td>
                  )}
                  {!isCompact && (
                    <td>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '600',
                        padding: '1px 5px',
                        borderRadius: 'var(--radius-xs)',
                        background: h.riskGrade === 'Low' ? 'rgba(5, 150, 105, 0.1)' : h.riskGrade === 'Moderate' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                        color: h.riskGrade === 'Low' ? 'var(--color-gain)' : h.riskGrade === 'Moderate' ? 'var(--color-warning)' : 'var(--color-loss)'
                      }}>
                        {h.riskGrade}
                      </span>
                    </td>
                  )}
                  <td>
                    <Sparkline data={h.sparkline} width={56} height={16} isPositive={isGain} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
