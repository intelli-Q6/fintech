import React, { useState } from 'react';
import { Search, BookOpen, GraduationCap, CheckCircle } from 'lucide-react';

interface GlossaryItem {
  term: string;
  category: 'Equities' | 'Mutual Funds' | 'Fixed Income' | 'Taxation' | 'Portfolio Math';
  definition: string;
  indianContext?: string;
}

const GLOSSARY_ITEMS: GlossaryItem[] = [
  {
    term: 'XIRR (Extended Internal Rate of Return)',
    category: 'Portfolio Math',
    definition: 'A method used to calculate the annualized returns on irregular investments made across different points in time, such as SIPs or sporadic lump sums.',
    indianContext: 'Standard metric mandated by SEBI for reporting mutual fund portfolio performance.'
  },
  {
    term: 'Section 112A (LTCG on Equity)',
    category: 'Taxation',
    definition: 'Indian Income Tax section governing Long-Term Capital Gains on listed equities and equity mutual funds held for more than 12 months.',
    indianContext: 'Gains up to ₹1,25,000 per financial year are exempt; excess is taxed at 12.5% without indexation.'
  },
  {
    term: 'Section 111A (STCG on Equity)',
    category: 'Taxation',
    definition: 'Indian Income Tax section governing Short-Term Capital Gains on listed equities held for 12 months or less.',
    indianContext: 'Taxed at a flat rate of 20% (Finance Act 2024).'
  },
  {
    term: 'YTM (Yield to Maturity)',
    category: 'Fixed Income',
    definition: 'The total anticipated annual return on a bond if the bond is held until it reaches maturity and all coupon payments are reinvested.',
    indianContext: 'Key metric for comparing Government of India (G-Sec) securities and Corporate PSU bonds.'
  },
  {
    term: 'ROCE (Return on Capital Employed)',
    category: 'Equities',
    definition: 'A financial ratio measuring how efficiently a company generates operating profit from its total capital base (both equity and debt).',
    indianContext: 'Formula: EBIT / (Total Assets - Current Liabilities). Critical for analyzing Indian capital-intensive sectors.'
  },
  {
    term: 'Direct Plan (Mutual Funds)',
    category: 'Mutual Funds',
    definition: 'Mutual fund units purchased directly from the Asset Management Company (AMC) without an intermediary or distributor.',
    indianContext: 'Carries a significantly lower Total Expense Ratio (TER) since no distributor commission (brokerage) is deducted.'
  },
  {
    term: 'Sovereign Gold Bond (SGB)',
    category: 'Fixed Income',
    definition: 'Government securities denominated in grams of gold issued by the Reserve Bank of India (RBI).',
    indianContext: 'Pays a 2.5% p.a. semi-annual coupon on the initial issue price, and capital gains upon maturity (8 years) are 100% tax-free.'
  },
  {
    term: 'HHI (Herfindahl-Hirschman Index)',
    category: 'Portfolio Math',
    definition: 'A statistical measure of concentration. In portfolios, it is the sum of the squared weights of individual holdings.',
    indianContext: 'Scores above 2,500 indicate high concentration risk in a few large-cap or individual stocks.'
  },
  {
    term: 'Tracking Error',
    category: 'Mutual Funds',
    definition: 'The standard deviation of excess returns of an ETF or Index Fund relative to its target benchmark.',
    indianContext: 'Lower tracking error indicates the fund closely replicates Nifty 50 or Sensex performance.'
  },
  {
    term: 'Total Expense Ratio (TER)',
    category: 'Mutual Funds',
    definition: 'The percentage of a fund’s total assets used to cover administrative, management, and operational costs.',
    indianContext: 'Regulated by SEBI slab rates based on the AUM size of the scheme.'
  }
];

export const AcademyView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'modules' | 'lexicon'>('modules');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredGlossary = GLOSSARY_ITEMS.filter(item => {
    const matchesSearch = item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Artha Academy & Lexicon</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Institutional Frameworks for Balance Sheet Reading, Risk Modeling & Indian Financial Law
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        <button
          onClick={() => setActiveTab('modules')}
          className={`tab-btn ${activeTab === 'modules' ? 'active' : ''}`}
        >
          <GraduationCap size={14} style={{ display: 'inline', marginRight: 6 }} />
          Learning Modules
        </button>
        <button
          onClick={() => setActiveTab('lexicon')}
          className={`tab-btn ${activeTab === 'lexicon' ? 'active' : ''}`}
        >
          <BookOpen size={14} style={{ display: 'inline', marginRight: 6 }} />
          Financial Lexicon ({GLOSSARY_ITEMS.length} Terms)
        </button>
      </div>

      {/* 1. Modules */}
      {activeTab === 'modules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div className="terminal-card" style={{ padding: 20 }}>
            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: 4, background: 'var(--accent-surface)', color: 'var(--accent-primary)', display: 'inline-block', marginBottom: 8 }}>
              MODULE 101 • FUNDAMENTALS
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 8 }}>
              How to Read Audited Balance Sheets & Cash Flows
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
              Why Operating Cash Flow (CFO) is the ultimate reality check for reported accounting Net Profit. Understanding working capital changes, contingent liabilities, and auditor qualifications.
            </p>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              15 Min Read • Includes Real Corporate Examples
            </div>
          </div>

          <div className="terminal-card" style={{ padding: 20 }}>
            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', display: 'inline-block', marginBottom: 8 }}>
              MODULE 201 • FIXED INCOME
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 8 }}>
              Bond Math: YTM, Modified Duration & Credit Spreads
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
              Understanding the inverse relationship between interest rates and bond prices. How Macaulay and Modified Duration dictate how much your debt portfolio will move if the RBI cuts repo rates.
            </p>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              20 Min Read • Yield Curve Dynamics
            </div>
          </div>

          <div className="terminal-card" style={{ padding: 20 }}>
            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-gain)', display: 'inline-block', marginBottom: 8 }}>
              MODULE 301 • PORTFOLIO THEORY
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 8 }}>
              Concentration vs Diversification: The Mathematics of Drawdowns
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
              The mathematical proof of why adding non-correlated assets (Equities + SGBs + Cash) improves your portfolio Sharpe ratio without sacrificing compounding returns.
            </p>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              18 Min Read • Volatility Dampening Models
            </div>
          </div>
        </div>
      )}

      {/* 2. Lexicon / Glossary */}
      {activeTab === 'lexicon' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: 200, flex: '1 1 200px', maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search financial terms, ratios..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ width: '100%', paddingLeft: 30, height: 32, fontSize: '12px' }}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="theme-select"
              style={{ height: 32 }}
            >
              <option value="ALL">All Categories</option>
              <option value="Equities">Equities</option>
              <option value="Mutual Funds">Mutual Funds</option>
              <option value="Fixed Income">Fixed Income</option>
              <option value="Taxation">Taxation</option>
              <option value="Portfolio Math">Portfolio Math</option>
            </select>
          </div>

          {/* Lexicon Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {filteredGlossary.map((item, idx) => (
              <div key={idx} className="terminal-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {item.term}
                  </h4>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 3 }}>
                    {item.category}
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
                  {item.definition}
                </p>

                {item.indianContext && (
                  <div style={{ fontSize: '11px', color: 'var(--accent-primary)', background: 'var(--accent-surface)', padding: 8, borderRadius: 'var(--radius-xs)', border: '1px solid var(--accent-border)' }}>
                    <strong>Indian Market Context:</strong> {item.indianContext}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
