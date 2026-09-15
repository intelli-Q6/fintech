import React, { useState } from 'react';
import { DEMO_JOURNAL_ENTRIES } from '../../data/demoData';
import { JournalEntry } from '../../data/types';
import {
  computeTaxSummary,
  TaxableTransaction,
  scanTaxLossHarvestOpportunities,
  TaxLossHarvestOpportunity
} from '../../core/tax/capitalGains';
import { formatINR, formatPercent } from '../../core/math/xirr';
import { VaultStorage } from '../../data/storage';
import {
  FileText,
  BookOpen,
  Receipt,
  Plus,
  ShieldCheck,
  Download,
  Search,
  ExternalLink,
  Scissors,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const ResearchStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'annual_report' | 'journal' | 'tax' | 'harvesting'>('annual_report');

  // Journal State
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => VaultStorage.getJournal());
  const [newTitle, setNewTitle] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newThesis, setNewThesis] = useState('');
  const [newHorizon, setNewHorizon] = useState('3 - 5 Years');

  // Annual Report Analyser Selected Document
  const [selectedDoc, setSelectedDoc] = useState<'hdfc' | 'tcs'>('hdfc');

  // Sample Tax Transactions (FY 2025-26: 01-Apr-2025 to 31-Mar-2026)
  const sampleTransactions: TaxableTransaction[] = [
    {
      id: 'tx-1',
      assetName: 'Tata Motors Ltd.',
      assetClass: 'equity',
      buyDate: new Date('2023-04-10'),
      sellDate: new Date('2025-05-15'),
      buyPrice: 420,
      sellPrice: 960,
      quantity: 250
    },
    {
      id: 'tx-2',
      assetName: 'Parag Parikh Flexi Cap Fund',
      assetClass: 'mutual_fund_equity',
      buyDate: new Date('2023-08-15'),
      sellDate: new Date('2025-06-20'),
      buyPrice: 51.5,
      sellPrice: 72.8,
      quantity: 2000
    },
    {
      id: 'tx-3',
      assetName: 'Zomato Ltd.',
      assetClass: 'equity',
      buyDate: new Date('2025-01-10'),
      sellDate: new Date('2025-07-05'),
      buyPrice: 155,
      sellPrice: 210,
      quantity: 500
    }
  ];

  const taxSummary = computeTaxSummary(sampleTransactions, 30);

  // Tax Loss Harvesting Calculations
  const userHoldings = VaultStorage.getHoldings();
  const harvestSummary = scanTaxLossHarvestOpportunities(userHoldings, taxSummary.equitySTCGTotal, taxSummary.equityLTCGTotal);
  const [selectedHarvestIds, setSelectedHarvestIds] = useState<string[]>(() =>
    harvestSummary.opportunities.map(o => o.holdingId)
  );

  const toggleHarvestSelection = (id: string) => {
    setSelectedHarvestIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectedOpportunities = harvestSummary.opportunities.filter(o =>
    selectedHarvestIds.includes(o.holdingId)
  );
  const totalSelectedLoss = selectedOpportunities.reduce((s, o) => s + o.unrealizedLoss, 0);
  const totalSelectedSavings = selectedOpportunities.reduce((s, o) => s + o.potentialTaxSaved, 0);
  const projectedTaxAfterHarvest = Math.max(0, taxSummary.estimatedTaxPayable - totalSelectedSavings);

  const exportScheduleCGCSV = () => {
    const rows = [
      ['Holding Term', 'Security Symbol', 'Security Name', 'Quantity', 'Average Cost (INR)', 'Current Price (INR)', 'Unrealized Loss (INR)', 'Applicable Rate (%)', 'Tax Savings (INR)', 'Replacement Allocation Proxy'],
      ...selectedOpportunities.map(o => [
        o.holdingTerm,
        o.symbol,
        `"${o.name}"`,
        o.quantity,
        o.averageBuyPrice,
        o.currentPrice,
        o.unrealizedLoss,
        o.applicableRate,
        o.potentialTaxSaved,
        `"${o.replacementProxy}"`
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `koshq_tax_loss_harvest_schedule_FY25-26_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRealizedScheduleCSV = () => {
    const rows = [
      ['Security', 'Asset Class', 'Buy Date', 'Sell Date', 'Holding Period (Days)', 'Buy Price (INR)', 'Sell Price (INR)', 'Quantity', 'Cost Basis (INR)', 'Sale Consideration (INR)', 'Realized Gain (INR)', 'Classification (Sec 111A/112A)'],
      ...sampleTransactions.map(t => {
        const days = Math.round((t.sellDate.getTime() - t.buyDate.getTime()) / (1000 * 60 * 60 * 24));
        const gain = (t.sellPrice - t.buyPrice) * t.quantity;
        const isLongTerm = days > 365;
        return [
          `"${t.assetName}"`,
          t.assetClass,
          t.buyDate.toISOString().split('T')[0],
          t.sellDate.toISOString().split('T')[0],
          days,
          t.buyPrice,
          t.sellPrice,
          t.quantity,
          t.buyPrice * t.quantity,
          t.sellPrice * t.quantity,
          gain,
          isLongTerm ? 'LTCG (Sec 112A @ 12.5%)' : 'STCG (Sec 111A @ 20%)'
        ];
      })
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `koshq_realized_schedule_CG_FY25-26_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newSymbol || !newThesis) return;

    const entry: JournalEntry = {
      id: `j-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      assetSymbol: newSymbol.toUpperCase(),
      assetName: newSymbol.toUpperCase(),
      title: newTitle,
      thesis: newThesis,
      expectedHorizon: newHorizon,
      tags: ['Thesis', 'Fundamental']
    };

    const updated = [entry, ...journalEntries];
    setJournalEntries(updated);
    VaultStorage.saveJournal(updated);
    setNewTitle('');
    setNewSymbol('');
    setNewThesis('');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Research Studio & Tax Ledger</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Annual Report Intelligence, Thesis Journaling & FY Capital Gains Calculations
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs-bar">
        <button
          onClick={() => setActiveTab('annual_report')}
          className={`tab-btn ${activeTab === 'annual_report' ? 'active' : ''}`}
        >
          <FileText size={14} style={{ display: 'inline', marginRight: 6 }} />
          Annual Report Analyser
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`tab-btn ${activeTab === 'journal' ? 'active' : ''}`}
        >
          <BookOpen size={14} style={{ display: 'inline', marginRight: 6 }} />
          Investment Thesis Journal ({journalEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          className={`tab-btn ${activeTab === 'tax' ? 'active' : ''}`}
        >
          <Receipt size={14} style={{ display: 'inline', marginRight: 6 }} />
          Tax & Capital Gains Organizer (FY 2025-26)
        </button>
        <button
          onClick={() => setActiveTab('harvesting')}
          className={`tab-btn ${activeTab === 'harvesting' ? 'active' : ''}`}
        >
          <Scissors size={14} style={{ display: 'inline', marginRight: 6 }} />
          Tax Loss Harvester & Schedule-CG
        </button>
      </div>

      {/* 1. Annual Report Analyser */}
      {activeTab === 'annual_report' && (
        <div className="responsive-split-main">
          {/* Document Picker */}
          <div className="terminal-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
              Audited Corporate Filings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                onClick={() => setSelectedDoc('hdfc')}
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  background: selectedDoc === 'hdfc' ? 'var(--accent-surface)' : 'var(--bg-subtle)',
                  border: selectedDoc === 'hdfc' ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '13px' }}>HDFC Bank FY24 Annual Report</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Integrated 468-Page Filing</div>
              </div>

              <div
                onClick={() => setSelectedDoc('tcs')}
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  background: selectedDoc === 'tcs' ? 'var(--accent-surface)' : 'var(--bg-subtle)',
                  border: selectedDoc === 'tcs' ? '1px solid var(--accent-border)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '13px' }}>TCS Ltd. FY24 Integrated Report</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>Annual Financial Disclosures</div>
              </div>
            </div>

            <div style={{ marginTop: 20, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>UPLOAD YOUR OWN PDF:</span>
              <div style={{
                border: '1px dashed var(--border-default)',
                borderRadius: 'var(--radius-xs)',
                padding: 14,
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: 6,
                cursor: 'pointer'
              }}>
                Drop BSE/NSE Annual Report PDF (Up to 50MB)
              </div>
            </div>
          </div>

          {/* Analysis View */}
          <div className="terminal-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '700', textTransform: 'uppercase' }}>
                  EXTRACTED FACTUAL DIGEST
                </span>
                <h3 style={{ fontSize: '17px', fontWeight: '700' }}>
                  {selectedDoc === 'hdfc' ? 'HDFC Bank Ltd. — FY 2023-24 Operational & Statutory Extraction' : 'Tata Consultancy Services — FY 2023-24 Integrated Report Extraction'}
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Source: Official SEBI/BSE Submission</span>
            </div>

            {selectedDoc === 'hdfc' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '13px', lineHeight: 1.6 }}>
                <div>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: 4 }}>
                    1. Mega-Merger Completion & Balance Sheet Expansion
                  </h4>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    "The amalgamated entity commenced unified operations effective July 1, 2023. Total balance sheet size expanded to ₹36,17,623 Crore, an increase of 46.8% over the prior year. Advances grew to ₹24,84,882 Crore while total deposits reached ₹23,79,786 Crore."
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                    [Citation: Annual Report FY24, Page 48, Section: Management Discussion & Analysis]
                  </span>
                </div>

                <div>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: 4 }}>
                    2. Net Interest Margin (NIM) & Credit-to-Deposit Ratio Dynamics
                  </h4>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    "Core Net Interest Margin (NIM) on total assets normalized to 3.44% (compared to 4.1% pre-merger). The bank has intentionally calibrated loan growth to 12% to facilitate faster deposit mobilization (18%) and lower the CD ratio toward pre-merger norms."
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                    [Citation: Annual Report FY24, Page 92, Note 18: Segment Disclosures]
                  </span>
                </div>

                <div>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: 4 }}>
                    3. Statutory Risk Disclosures Mentioned in Filing
                  </h4>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    "Key external and internal risk factors identified by the Risk Management Committee: (a) Liquidity coverage ratio volatility during high systemic credit cycles; (b) Regulatory harmonization of erstwhile HDFC Ltd non-banking assets under master banking guidelines."
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                    [Citation: Annual Report FY24, Page 144, Risk Management Framework]
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '13px', lineHeight: 1.6 }}>
                <div>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: 4 }}>
                    1. Cash Flow Conversion & Capital Allocation
                  </h4>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    "Consolidated Net Cash Flow from Operations stood at ₹44,340 Crore, representing 100.2% of Net Income. The company returned ₹46,223 Crore to shareholders through regular dividends and the share buyback completed in December 2023."
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                    [Citation: TCS FY24 Report, Page 72, Consolidated Cash Flow Statement]
                  </span>
                </div>
              </div>
            )}

            <div className="compliance-notice" style={{ marginTop: 20 }}>
              <ShieldCheck size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <div>
                <strong>Factual Extraction Disclaimer:</strong> Summaries are extracted strictly from corporate disclosures with exact page citations. KoshQ does not provide qualitative buy, sell, or hold recommendations based on document analysis.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Investment Thesis Journal */}
      {activeTab === 'journal' && (
        <div className="responsive-split-workbench">
          {/* New Entry Form */}
          <div className="terminal-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: 12 }}>
              Log New Investment Thesis
            </h3>
            <form onSubmit={handleAddJournal} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  TICKER SYMBOL
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TCS"
                  value={newSymbol}
                  onChange={e => setNewSymbol(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  THESIS HEADLINE
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Competitive advantage in BFSI cloud migration"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  EXPECTED INVESTMENT HORIZON
                </label>
                <select
                  value={newHorizon}
                  onChange={e => setNewHorizon(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="1 - 3 Years">1 - 3 Years</option>
                  <option value="3 - 5 Years">3 - 5 Years</option>
                  <option value="5 - 10 Years">5 - 10 Years (Multi-Cycle)</option>
                  <option value="Retirement Horizon">Retirement Horizon</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  DETAILED THESIS & REASONS FOR RESEARCHING
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Record your core assumptions, key metrics to watch (e.g. margins > 25%), and what would prove your thesis wrong..."
                  value={newThesis}
                  onChange={e => setNewThesis(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: 4 }}>
                <Plus size={14} /> Commit to Sovereign Journal
              </button>
            </form>
          </div>

          {/* Timeline Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {journalEntries.map(entry => (
              <div key={entry.id} className="terminal-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                      {entry.assetSymbol}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• Logged on {entry.date}</span>
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 4, background: 'var(--bg-surface-elevated)' }}>
                    Horizon: {entry.expectedHorizon}
                  </span>
                </div>

                <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: 8 }}>{entry.title}</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                  {entry.thesis}
                </p>

                <div style={{ display: 'flex', gap: 6 }}>
                  {entry.tags.map((t, idx) => (
                    <span key={idx} style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 3 }}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Tax & Capital Gains Organizer */}
      {activeTab === 'tax' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="grid-metrics-4">
            <div className="metric-card">
              <span className="metric-label">Equity LTCG Total (FY25-26)</span>
              <div className="metric-value">{formatINR(taxSummary.equityLTCGTotal)}</div>
              <span style={{ fontSize: '11px', color: 'var(--color-gain)' }}>
                Exempt under Sec 112A: {formatINR(taxSummary.equityLTCGExempt)}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Taxable LTCG (@ 12.5%)</span>
              <div className="metric-value">{formatINR(taxSummary.equityLTCGTaxable)}</div>
              <span style={{ fontSize: '11px', color: 'var(--color-loss)' }}>
                Payable: {formatINR(taxSummary.equityLTCGTaxPayable)}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Equity STCG (@ 20%)</span>
              <div className="metric-value">{formatINR(taxSummary.equitySTCGTotal)}</div>
              <span style={{ fontSize: '11px', color: 'var(--color-loss)' }}>
                Payable: {formatINR(taxSummary.equitySTCGTaxPayable)}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Total Estimated Tax</span>
              <div className="metric-value" style={{ color: 'var(--color-loss)' }}>
                {formatINR(taxSummary.estimatedTaxPayable)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>On Total Realized {formatINR(taxSummary.totalRealizedGain)}</span>
            </div>
          </div>

          <div className="terminal-card">
            <div className="terminal-header">
              <span className="terminal-title">Realized Capital Gains Schedule (FY 2025-26)</span>
              <button className="btn btn-secondary btn-sm" onClick={exportRealizedScheduleCSV}>
                <Download size={13} /> Export ITR Schedule CSV
              </button>
            </div>

            <div className="terminal-table-wrapper">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Security</th>
                    <th>Buy Date</th>
                    <th>Sell Date</th>
                    <th>Holding Period</th>
                    <th>Buy (₹)</th>
                    <th>Sell (₹)</th>
                    <th>Realized Gain</th>
                    <th>Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleTransactions.map(t => {
                    const days = Math.round((t.sellDate.getTime() - t.buyDate.getTime()) / (1000 * 60 * 60 * 24));
                    const gain = (t.sellPrice - t.buyPrice) * t.quantity;
                    const isLongTerm = days > 365;
                    return (
                      <tr key={t.id}>
                        <td style={{ fontWeight: '600' }}>{t.assetName}</td>
                        <td className="tabular-nums">{t.buyDate.toISOString().split('T')[0]}</td>
                        <td className="tabular-nums">{t.sellDate.toISOString().split('T')[0]}</td>
                        <td className="tabular-nums">{days} Days</td>
                        <td className="tabular-nums">₹{t.buyPrice}</td>
                        <td className="tabular-nums">₹{t.sellPrice}</td>
                        <td className="tabular-nums" style={{ color: gain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)', fontWeight: '600' }}>
                          {formatINR(gain)}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: 3,
                            background: isLongTerm ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: isLongTerm ? 'var(--color-gain)' : 'var(--color-warning)'
                          }}>
                            {isLongTerm ? 'LTCG (Sec 112A)' : 'STCG (Sec 111A)'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="compliance-notice">
            <ShieldCheck size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <strong>Record-Keeping Disclaimer:</strong> This module is a calculation and record-keeping tool based on Finance Act 2024 provisions. It does not constitute formal tax advice or filing verification. Consult a Chartered Accountant for ITR filing.
            </div>
          </div>
        </div>
      )}

      {/* 4. Tax Loss Harvester & Schedule-CG Workspace */}
      {activeTab === 'harvesting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top Metric Cards */}
          <div className="grid-metrics-4">
            <div className="metric-card">
              <span className="metric-label">FY25-26 Realized Gains</span>
              <div className="metric-value">{formatINR(taxSummary.totalRealizedGain)}</div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                STCG: {formatINR(taxSummary.equitySTCGTotal)} • LTCG: {formatINR(taxSummary.equityLTCGTotal)}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Selected Harvestable Loss</span>
              <div className="metric-value" style={{ color: 'var(--color-loss)' }}>
                -{formatINR(totalSelectedLoss)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {selectedOpportunities.length} opportunities selected
              </span>
            </div>

            <div className="metric-card" style={{ borderColor: 'var(--accent-border)' }}>
              <span className="metric-label">Net Potential Tax Saved</span>
              <div className="metric-value" style={{ color: 'var(--color-gain)' }}>
                +{formatINR(totalSelectedSavings)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-gain)', fontWeight: '600' }}>
                Direct Cashflow Retained
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Projected Tax Liability</span>
              <div className="metric-value" style={{ color: projectedTaxAfterHarvest === 0 ? 'var(--color-gain)' : 'var(--text-primary)' }}>
                {formatINR(projectedTaxAfterHarvest)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Down from {formatINR(taxSummary.estimatedTaxPayable)}
              </span>
            </div>
          </div>

          {/* Harvesting Action Table */}
          <div className="terminal-card">
            <div className="terminal-header" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span className="terminal-title">Section 70 / 71 Loss Set-Off Scanner</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 8 }}>
                  (Finance Act 2024: STCL offsets STCG/LTCG @ 20%; LTCL offsets LTCG @ 12.5%)
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={exportScheduleCGCSV}
                  className="btn btn-secondary btn-sm"
                  title="Export Schedule-CG compatible CSV"
                >
                  <Download size={13} /> Export Schedule-CG CSV
                </button>
                <button
                  onClick={() => alert(`Simulated harvest of ${formatINR(totalSelectedLoss)} recorded. Estimated tax savings of ${formatINR(totalSelectedSavings)} locked in.`)}
                  className="btn btn-primary btn-sm"
                  style={{ gap: 6 }}
                >
                  <Sparkles size={13} /> Simulate Harvest Execution
                </button>
              </div>
            </div>

            <div className="terminal-table-wrapper">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedHarvestIds.length === harvestSummary.opportunities.length}
                        onChange={() => {
                          if (selectedHarvestIds.length === harvestSummary.opportunities.length) {
                            setSelectedHarvestIds([]);
                          } else {
                            setSelectedHarvestIds(harvestSummary.opportunities.map(o => o.holdingId));
                          }
                        }}
                        style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                    </th>
                    <th>Holding / Instrument</th>
                    <th>Term & Section</th>
                    <th className="tabular-nums">Qty</th>
                    <th className="tabular-nums">Avg Cost (₹)</th>
                    <th className="tabular-nums">LTP (₹)</th>
                    <th className="tabular-nums">Unrealized Loss</th>
                    <th className="tabular-nums">Tax Saved (₹)</th>
                    <th>Market Replacement Proxy (Non-Wash)</th>
                  </tr>
                </thead>
                <tbody>
                  {harvestSummary.opportunities.map(o => {
                    const isSelected = selectedHarvestIds.includes(o.holdingId);
                    return (
                      <tr
                        key={o.holdingId}
                        onClick={() => toggleHarvestSelection(o.holdingId)}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'var(--accent-surface)' : undefined
                        }}
                      >
                        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleHarvestSelection(o.holdingId)}
                            style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{o.symbol}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.name}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-xs)',
                            background: o.applicableRate === 20 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: o.applicableRate === 20 ? 'var(--color-loss)' : 'var(--color-warning)'
                          }}>
                            {o.holdingTerm} • {o.applicableRate}%
                          </span>
                        </td>
                        <td className="tabular-nums">{o.quantity}</td>
                        <td className="tabular-nums">₹{o.averageBuyPrice.toFixed(2)}</td>
                        <td className="tabular-nums">₹{o.currentPrice.toFixed(2)}</td>
                        <td className="tabular-nums" style={{ color: 'var(--color-loss)', fontWeight: '700' }}>
                          -{formatINR(o.unrealizedLoss)} ({formatPercent(o.unrealizedLossPercent)})
                        </td>
                        <td className="tabular-nums" style={{ color: 'var(--color-gain)', fontWeight: '700' }}>
                          +{formatINR(o.potentialTaxSaved)}
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {o.replacementProxy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 70 Regulatory Explainer Card */}
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 14
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: 4 }}>
                Section 70 (Inter-Source Set-Off Rules)
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Short-Term Capital Loss (STCL) can be legally set off against <strong>both STCG (20%) and LTCG (12.5%)</strong>. Long-Term Capital Loss (LTCL) can only be set off against LTCG. Losses must be declared in ITR filed on or before the due date (July 31st) to enable up to <strong>8 years of carry-forward</strong>.
              </p>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: 4 }}>
                Market Replacement & Non-Wash Strategy
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Unlike the United States (which enforces a strict 30-day Wash Sale Rule), Indian income tax laws have no explicit wash sale restriction. However, sovereign best practice recommends reinvesting proceeds immediately into a low-cost sector ETF or index proxy to preserve equity beta while banking the tax benefit.
              </p>
            </div>
          </div>

          <div className="compliance-notice">
            <ShieldCheck size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <strong>Non-Intermediary Safe Harbor:</strong> Tax loss harvesting analytics are calculated purely for educational and record-keeping simulation. KoshQ does not execute broker trades, custody funds, or provide tax certification.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
