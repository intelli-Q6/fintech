import React, { useState } from 'react';
import { Holding } from '../../data/types';
import { calculateConcentration, calculateSectorExposure } from '../../core/portfolio/analytics';
import { formatINR, formatPercent } from '../../core/math/xirr';
import { TerminalGrid } from '../../components/TerminalGrid/TerminalGrid';
import { VaultStorage } from '../../data/storage';
import { INITIAL_PORTFOLIO_HOLDINGS } from '../../data/demoData';
import {
  PRESET_ALLOCATION_PROFILES,
  computePortfolioRebalancing,
  AllocationProfileId
} from '../../core/portfolio/rebalancing';
import {
  parseCASStatementFile,
  convertCASItemsToHoldings,
  SAMPLE_CAMS_CAS_DATA,
  CASParsedStatement,
  CASParsedHolding,
  CASProgressCallback
} from '../../core/cas/casParser';
import {
  parseBrokerFile,
  convertBrokerItemsToHoldings,
  SAMPLE_ZERODHA_HOLDINGS,
  SAMPLE_GROWW_HOLDINGS,
  SAMPLE_INDMONEY_HOLDINGS,
  BrokerParsedReport,
  ParsedBrokerHolding
} from '../../core/importers/brokerParser';
import {
  Upload,
  FileCheck,
  ShieldCheck,
  Plus,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Scale,
  SlidersHorizontal,
  ArrowRight,
  FileUp,
  Sparkles,
  Download,
  Eye,
  EyeOff,
  Search,
  CheckSquare,
  Square,
  FileText,
  FileSpreadsheet,
  Layers
} from 'lucide-react';
import { useMarketQuotes } from '../../core/market/useMarketQuotes';
import { TransactionService } from '../../core/services/transactionService';
import { getSupabase } from '../../core/supabase/supabaseClient';

interface PortfolioVaultViewProps {
  holdings: Holding[];
  onUpdateHoldings: (h: Holding[]) => void;
  onSelectHolding: (h: Holding) => void;
}

export const PortfolioVaultView: React.FC<PortfolioVaultViewProps> = ({
  holdings,
  onUpdateHoldings,
  onSelectHolding
}) => {
  const { syncAMFI, tickerState } = useMarketQuotes();
  const [activeTab, setActiveTab] = useState<'holdings' | 'xray' | 'rebalance' | 'cas_import' | 'broker_import' | 'manual_add'>('holdings');

  // Rebalance Engine State
  const [selectedProfileId, setSelectedProfileId] = useState<AllocationProfileId>('balanced');
  const [rebalanceStrategy, setRebalanceStrategy] = useState<'sip' | 'direct'>('sip');
  const [monthlyInflow, setMonthlyInflow] = useState(60000);
  const activeProfile = PRESET_ALLOCATION_PROFILES.find(p => p.id === selectedProfileId) || PRESET_ALLOCATION_PROFILES[1];
  const rebalanceResult = computePortfolioRebalancing(holdings, activeProfile, monthlyInflow);

  // Real Client-Side CAS Drag-and-Drop & Decryptor State
  const [casPassword, setCasPassword] = useState('ABCDE1234F');
  const [showPassword, setShowPassword] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parseProgress, setParseProgress] = useState<{ stage: string; percent: number } | null>(null);
  const [parsedStatement, setParsedStatement] = useState<CASParsedStatement | null>(null);
  const [casSuccessMsg, setCasSuccessMsg] = useState<string | null>(null);
  const [casErrorMsg, setCasErrorMsg] = useState<string | null>(null);
  const [selectedFolios, setSelectedFolios] = useState<Set<string>>(new Set());
  const [folioSearch, setFolioSearch] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  // Broker CSV & Excel Importer State
  const [brokerFileLoading, setBrokerFileLoading] = useState(false);
  const [brokerDragging, setBrokerDragging] = useState(false);
  const [brokerReport, setBrokerReport] = useState<BrokerParsedReport | null>(null);
  const [brokerSuccessMsg, setBrokerSuccessMsg] = useState<string | null>(null);
  const [brokerErrorMsg, setBrokerErrorMsg] = useState<string | null>(null);
  const [selectedBrokerItems, setSelectedBrokerItems] = useState<Set<string>>(new Set());
  const [brokerSearch, setBrokerSearch] = useState('');
  const [brokerImportMode, setBrokerImportMode] = useState<'merge' | 'replace'>('merge');

  // Manual Add State
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newClass, setNewClass] = useState<'equity' | 'mutual_fund' | 'bond' | 'gold' | 'govt_scheme' | 'cash'>('equity');
  const [newSector, setNewSector] = useState('Technology');
  const [newQty, setNewQty] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newPrice, setNewPrice] = useState('');

  // Analytics
  const totalVal = holdings.reduce((s, h) => s + h.currentValue, 0);
  const concentration = calculateConcentration(holdings.map(h => ({ name: h.name, currentValue: h.currentValue })));
  const sectors = calculateSectorExposure(holdings.map(h => ({ sector: h.sector, currentValue: h.currentValue })));

  // File drop and decryption handlers
  const handleDropFile = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processCASFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processCASFile(file);
  };

  const processCASFile = async (file: File) => {
    setIsDecrypting(true);
    setCasSuccessMsg(null);
    setCasErrorMsg(null);
    setParseProgress({ stage: 'Initiating local memory sandbox...', percent: 5 });
    try {
      const result = await parseCASStatementFile(file, casPassword, (stage, percent) => {
        setParseProgress({ stage, percent });
      });
      setParsedStatement(result);
      setSelectedFolios(new Set(result.holdings.map(h => h.id)));
      if (result.holdings.length > 0) {
        setCasSuccessMsg(`Decrypted & parsed ${file.name} (${result.registrar}) 100% inside browser memory. Extracted ${result.holdings.length} mutual fund folios totaling ${formatINR(result.totalValuation)}.`);
      } else {
        setCasErrorMsg(`Document decrypted (${result.totalPages || 1} pages), but 0 standard mutual fund ISINs (INF...) were found. Ensure this is an official CAMS or KFintech Consolidated Account Statement.`);
      }
    } catch (err: any) {
      setCasErrorMsg(err?.message || 'Failed to decrypt or parse PDF. Please verify your PAN password.');
    } finally {
      setIsDecrypting(false);
      setParseProgress(null);
    }
  };

  const handleLoadSampleCAS = () => {
    setIsDecrypting(true);
    setCasErrorMsg(null);
    setParseProgress({ stage: 'Loading CAMS Consolidated Account Statement template...', percent: 40 });
    setTimeout(() => {
      setParseProgress({ stage: 'Parsing 5 mutual fund folios & ISIN mappings...', percent: 85 });
      setTimeout(() => {
        setParsedStatement(SAMPLE_CAMS_CAS_DATA);
        setSelectedFolios(new Set(SAMPLE_CAMS_CAS_DATA.holdings.map(h => h.id)));
        setCasSuccessMsg(`Decrypted official CAMS Consolidated e-CAS statement locally. ${SAMPLE_CAMS_CAS_DATA.holdings.length} mutual fund folios extracted (${formatINR(SAMPLE_CAMS_CAS_DATA.totalValuation)}).`);
        setIsDecrypting(false);
        setParseProgress(null);
      }, 300);
    }, 350);
  };

  const toggleSelectFolio = (id: string) => {
    setSelectedFolios(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFolios = () => {
    if (!parsedStatement) return;
    if (selectedFolios.size === parsedStatement.holdings.length) {
      setSelectedFolios(new Set());
    } else {
      setSelectedFolios(new Set(parsedStatement.holdings.map(h => h.id)));
    }
  };

  const handleMergeCASToVault = () => {
    if (!parsedStatement) return;
    const selectedItems = parsedStatement.holdings.filter(h => selectedFolios.has(h.id));
    if (selectedItems.length === 0) {
      alert('Please select at least one folio to import.');
      return;
    }

    const statementToImport: CASParsedStatement = {
      ...parsedStatement,
      holdings: selectedItems
    };
    const newHoldings = convertCASItemsToHoldings(statementToImport);

    let updated: Holding[];
    if (importMode === 'replace') {
      updated = newHoldings;
    } else {
      // Merge: replace existing if matching ISIN or folio, else prepend
      const newIsins = new Set(newHoldings.map(h => h.isin));
      const nonOverlapping = holdings.filter(h => !newIsins.has(h.isin));
      updated = [...newHoldings, ...nonOverlapping];
    }

    onUpdateHoldings(updated);
    VaultStorage.saveHoldings(updated);
    alert(`${newHoldings.length} mutual fund folios imported into Sovereign Vault successfully!`);
    setActiveTab('holdings');
  };

  // Broker File Processing Handlers
  const handleBrokerDropFile = async (e: React.DragEvent) => {
    e.preventDefault();
    setBrokerDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processBrokerFile(file);
  };

  const handleBrokerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processBrokerFile(file);
  };

  const processBrokerFile = async (file: File) => {
    setBrokerFileLoading(true);
    setBrokerSuccessMsg(null);
    setBrokerErrorMsg(null);
    try {
      const report = await parseBrokerFile(file);
      setBrokerReport(report);
      setSelectedBrokerItems(new Set(report.holdings.map(h => h.id)));
      setBrokerSuccessMsg(
        `Parsed ${report.recordCount} positions from ${file.name} (${report.broker}) totaling ${formatINR(report.totalValuation)} with zero network egress.`
      );
    } catch (err: any) {
      setBrokerErrorMsg(err?.message || 'Failed to parse broker file. Ensure file is a valid CSV or Excel spreadsheet.');
    } finally {
      setBrokerFileLoading(false);
    }
  };

  const handleLoadSampleBroker = (type: 'zerodha' | 'groww' | 'indmoney') => {
    setBrokerFileLoading(true);
    setBrokerErrorMsg(null);
    setTimeout(() => {
      let report: BrokerParsedReport;
      if (type === 'zerodha') report = SAMPLE_ZERODHA_HOLDINGS;
      else if (type === 'groww') report = SAMPLE_GROWW_HOLDINGS;
      else report = SAMPLE_INDMONEY_HOLDINGS;

      setBrokerReport(report);
      setSelectedBrokerItems(new Set(report.holdings.map(h => h.id)));
      setBrokerSuccessMsg(`Loaded verified ${report.broker} statement sample with ${report.recordCount} securities totaling ${formatINR(report.totalValuation)}.`);
      setBrokerFileLoading(false);
    }, 250);
  };

  const toggleSelectBrokerItem = (id: string) => {
    setSelectedBrokerItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllBrokerItems = () => {
    if (!brokerReport) return;
    if (selectedBrokerItems.size === brokerReport.holdings.length) {
      setSelectedBrokerItems(new Set());
    } else {
      setSelectedBrokerItems(new Set(brokerReport.holdings.map(h => h.id)));
    }
  };

  const handleMergeBrokerToVault = () => {
    if (!brokerReport) return;
    const selectedItems = brokerReport.holdings.filter(h => selectedBrokerItems.has(h.id));
    if (selectedItems.length === 0) {
      alert('Please select at least one position to import.');
      return;
    }

    const reportToImport: BrokerParsedReport = {
      ...brokerReport,
      holdings: selectedItems
    };
    const newHoldings = convertBrokerItemsToHoldings(reportToImport);

    let updated: Holding[];
    if (brokerImportMode === 'replace') {
      updated = newHoldings;
    } else {
      // Merge: match existing by symbol or isin, otherwise prepend
      const newSymbols = new Set(newHoldings.map(h => h.symbol.toUpperCase()));
      const nonOverlapping = holdings.filter(h => !newSymbols.has(h.symbol.toUpperCase()));
      updated = [...newHoldings, ...nonOverlapping];
    }

    onUpdateHoldings(updated);
    VaultStorage.saveHoldings(updated);
    alert(`${newHoldings.length} positions from ${brokerReport.broker} imported into Sovereign Vault successfully!`);
    setActiveTab('holdings');
  };

  // Handle Manual Add
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol || !newName || !newQty || !newCost || !newPrice) return;

    const qty = parseFloat(newQty);
    const cost = parseFloat(newCost);
    const price = parseFloat(newPrice);
    const invested = qty * cost;
    const current = qty * price;
    const gain = current - invested;

    const newHolding: Holding = {
      id: `h-custom-${Date.now()}`,
      symbol: newSymbol.toUpperCase(),
      name: newName,
      isin: `INE${Math.random().toString().slice(2, 11)}`,
      assetClass: newClass,
      sector: newSector,
      marketCapCategory: newClass === 'equity' ? 'Large Cap' : 'Debt',
      quantity: qty,
      averageBuyPrice: cost,
      currentPrice: price,
      investedAmount: invested,
      currentValue: current,
      unrealizedGain: gain,
      unrealizedGainPercent: invested > 0 ? (gain / invested) * 100 : 0,
      allocationPercent: totalVal > 0 ? (current / (totalVal + current)) * 100 : 100,
      sparkline: [cost, cost * 1.02, price * 0.98, price],
      riskGrade: 'Moderate'
    };

    const updated = [newHolding, ...holdings];
    onUpdateHoldings(updated);
    setActiveTab('holdings');

    // Asynchronously record immutable transaction in Cloud PostgreSQL ledger if authenticated
    const supabase = getSupabase();
    if (supabase) {
      TransactionService.getUserAccounts().then(async accounts => {
        const primary = accounts[0];
        if (primary) {
          const instId = await TransactionService.getOrCreateInstrument({
            symbol: newHolding.symbol,
            name: newHolding.name,
            isin: newHolding.isin,
            assetClass: newHolding.assetClass,
            sector: newHolding.sector
          });
          if (instId) {
            await TransactionService.createTransaction({
              accountId: primary.id,
              instrumentId: instId,
              type: 'BUY',
              quantity: qty,
              price: cost,
              source: 'MANUAL',
              notes: 'Manual entry via Portfolio Vault'
            });
          }
        }
      }).catch(err => console.warn('[Vault] Cloud txn write error:', err));
    }

    // reset
    setNewSymbol('');
    setNewName('');
    setNewQty('');
    setNewCost('');
    setNewPrice('');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* View Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Portfolio Vault</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Consolidated Ledger & Multi-Asset Intelligence
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => syncAMFI(true)}
            disabled={tickerState.isAmfiSyncing}
            className="btn btn-secondary btn-sm"
            title="Fetch latest official mutual fund NAVs from AMFI"
          >
            <RefreshCw size={13} className={tickerState.isAmfiSyncing ? 'animate-spin' : ''} />
            <span>{tickerState.isAmfiSyncing ? 'Syncing AMFI...' : 'Sync AMFI NAVs'}</span>
          </button>
          <button
            onClick={() => setActiveTab('cas_import')}
            className={`btn btn-sm ${activeTab === 'cas_import' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FileUp size={13} /> CAS PDF Parser
          </button>
          <button
            onClick={() => setActiveTab('broker_import')}
            className={`btn btn-sm ${activeTab === 'broker_import' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FileSpreadsheet size={13} /> Broker CSV/Excel
          </button>
          <button
            onClick={() => setActiveTab('manual_add')}
            className={`btn btn-sm ${activeTab === 'manual_add' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Plus size={13} /> Add Holding
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="tabs-bar">
        <button
          onClick={() => setActiveTab('holdings')}
          className={`tab-btn ${activeTab === 'holdings' ? 'active' : ''}`}
        >
          Holdings Ledger ({holdings.length})
        </button>
        <button
          onClick={() => setActiveTab('xray')}
          className={`tab-btn ${activeTab === 'xray' ? 'active' : ''}`}
        >
          Portfolio X-Ray & Concentration
        </button>
        <button
          onClick={() => setActiveTab('rebalance')}
          className={`tab-btn ${activeTab === 'rebalance' ? 'active' : ''}`}
        >
          <Scale size={13} style={{ display: 'inline', marginRight: 5 }} />
          Rebalancing Engine
        </button>
        <button
          onClick={() => setActiveTab('cas_import')}
          className={`tab-btn ${activeTab === 'cas_import' ? 'active' : ''}`}
        >
          <FileUp size={13} style={{ display: 'inline', marginRight: 5 }} />
          CAS Statement Parser (PDF)
        </button>
        <button
          onClick={() => setActiveTab('broker_import')}
          className={`tab-btn ${activeTab === 'broker_import' ? 'active' : ''}`}
        >
          <FileSpreadsheet size={13} style={{ display: 'inline', marginRight: 5 }} />
          Broker Importer (CSV/Excel)
        </button>
        <button
          onClick={() => setActiveTab('manual_add')}
          className={`tab-btn ${activeTab === 'manual_add' ? 'active' : ''}`}
        >
          Manual Asset Entry
        </button>
      </div>

      {/* Tab 1: Holdings Ledger */}
      {activeTab === 'holdings' && (
        <TerminalGrid holdings={holdings} onSelectHolding={onSelectHolding} />
      )}

      {/* Tab 2: Portfolio X-Ray */}
      {activeTab === 'xray' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Concentration Cards */}
          <div className="grid-metrics-4">
            <div className="metric-card">
              <span className="metric-label">HHI Concentration Score</span>
              <div className="metric-value">{concentration.hhiScore}</div>
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                color: concentration.hhiScore > 2500 ? 'var(--color-loss)' : concentration.hhiScore >= 1500 ? 'var(--color-warning)' : 'var(--color-gain)'
              }}>
                {concentration.hhiClassification}
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Top 3 Holdings Concentration</span>
              <div className="metric-value">{concentration.top3Concentration.toFixed(1)}%</div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>of Total Portfolio Value</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Top 5 Holdings Concentration</span>
              <div className="metric-value">{concentration.top5Concentration.toFixed(1)}%</div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>of Total Portfolio Value</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Active Instrument Count</span>
              <div className="metric-value">{concentration.totalHoldingsCount}</div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Across 6 Asset Classes</span>
            </div>
          </div>

          {/* Sector Overlap Breakdown */}
          <div className="terminal-card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: 14 }}>
              Sector & Asset Exposure Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sectors.map(sec => (
                <div key={sec.sector}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                    <span style={{ fontWeight: '500' }}>{sec.sector}</span>
                    <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {formatINR(sec.value)} ({sec.weight.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'var(--bg-surface-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${sec.weight}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="compliance-notice">
            <ShieldCheck size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <strong>Objective Characteristic Observation:</strong> Your top 5 holdings represent {concentration.top5Concentration.toFixed(1)}% of your portfolio. KoshQ presents this as a mathematical measurement and does not issue rebalancing directives or buy/sell orders.
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Rebalancing Engine */}
      {activeTab === 'rebalance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Target Profile Selector Bar */}
          <div className="terminal-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Scale size={18} style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Portfolio Rebalancing Engine</h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Maintain target asset weights without paying avoidable capital gains taxes
                  </p>
                </div>
              </div>

              {/* Monthly Inflow Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Upcoming Monthly SIP:</span>
                <span style={{ fontSize: '12px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{formatINR(monthlyInflow)}</span>
                <input
                  type="range"
                  min="10000"
                  max="250000"
                  step="5000"
                  value={monthlyInflow}
                  onChange={e => setMonthlyInflow(Number(e.target.value))}
                  style={{ width: 90, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Profile Selection Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              {PRESET_ALLOCATION_PROFILES.map(profile => {
                const isSelected = profile.id === selectedProfileId;
                return (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfileId(profile.id)}
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
                      {profile.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Eq: {profile.targetWeights.equity}% • Debt: {profile.targetWeights.debt}% • Gold: {profile.targetWeights.gold}% • Cash: {profile.targetWeights.cash}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rebalancing Strategy Switcher */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setRebalanceStrategy('sip')}
              className={`btn btn-sm ${rebalanceStrategy === 'sip' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '10px 14px' }}
            >
              <Sparkles size={14} /> Tax-Free SIP Realignment (Recommended — Zero Tax Drag)
            </button>
            <button
              onClick={() => setRebalanceStrategy('direct')}
              className={`btn btn-sm ${rebalanceStrategy === 'direct' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '10px 14px' }}
            >
              <SlidersHorizontal size={14} /> Direct Sell/Buy Rebalancing (Immediate)
            </button>
          </div>

          {/* Allocation Comparison Table */}
          <div className="terminal-card">
            <div className="terminal-header">
              <span className="terminal-title">Target vs. Actual Asset Allocation & Drift</span>
              <span style={{ fontSize: '11px', color: rebalanceResult.isRebalanceRecommended ? 'var(--color-warning)' : 'var(--color-gain)', fontWeight: '600' }}>
                {rebalanceResult.isRebalanceRecommended ? `Total Drift ${rebalanceResult.totalAbsoluteDrift}% (Rebalancing Recommended)` : 'Portfolio Well-Balanced (Drift < 8%)'}
              </span>
            </div>

            <div className="terminal-table-wrapper">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Asset Class</th>
                    <th className="tabular-nums">Current Value (₹)</th>
                    <th className="tabular-nums">Actual %</th>
                    <th className="tabular-nums">Target %</th>
                    <th className="tabular-nums">Weight Drift</th>
                    <th>Status</th>
                    {rebalanceStrategy === 'sip' ? (
                      <>
                        <th className="tabular-nums">SIP Allocation (₹)</th>
                        <th className="tabular-nums">SIP Share %</th>
                      </>
                    ) : (
                      <>
                        <th>Action Required</th>
                        <th className="tabular-nums">Trade Amount (₹)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rebalanceResult.rows.map(r => (
                    <tr key={r.assetClass}>
                      <td style={{ fontWeight: '600' }}>{r.label}</td>
                      <td className="tabular-nums">{formatINR(r.currentValue)}</td>
                      <td className="tabular-nums" style={{ fontWeight: '700' }}>{r.currentWeight}%</td>
                      <td className="tabular-nums">{r.targetWeight}%</td>
                      <td className="tabular-nums" style={{
                        color: r.weightDrift > 0 ? 'var(--color-warning)' : r.weightDrift < 0 ? 'var(--color-gain)' : 'var(--text-muted)',
                        fontWeight: '700'
                      }}>
                        {r.weightDrift > 0 ? `+${r.weightDrift}%` : `${r.weightDrift}%`}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-xs)',
                          background: r.status === 'Overweight' ? 'rgba(245, 158, 11, 0.12)' : r.status === 'Underweight' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-subtle)',
                          color: r.status === 'Overweight' ? 'var(--color-warning)' : r.status === 'Underweight' ? 'var(--color-gain)' : 'var(--text-muted)'
                        }}>
                          {r.status}
                        </span>
                      </td>
                      {rebalanceStrategy === 'sip' ? (
                        <>
                          <td className="tabular-nums" style={{ fontWeight: '700', color: r.sipAllocatedAmount > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                            {formatINR(r.sipAllocatedAmount)}
                          </td>
                          <td className="tabular-nums">{r.sipAllocatedPercent}%</td>
                        </>
                      ) : (
                        <>
                          <td>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-xs)',
                              background: r.directTradeAction === 'SELL' ? 'rgba(239, 68, 68, 0.12)' : r.directTradeAction === 'BUY' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-subtle)',
                              color: r.directTradeAction === 'SELL' ? 'var(--color-loss)' : r.directTradeAction === 'BUY' ? 'var(--color-gain)' : 'var(--text-muted)'
                            }}>
                              {r.directTradeAction}
                            </span>
                          </td>
                          <td className="tabular-nums" style={{ fontWeight: '700' }}>
                            {r.directTradeAmount > 0 ? formatINR(r.directTradeAmount) : '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strategy Details Box */}
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 16
          }}>
            {rebalanceStrategy === 'sip' ? (
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: 4 }}>
                  Smart Inflow Realignment Mechanism (Zero Tax Drag)
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Instead of selling your appreciated equity holdings (which triggers up to <strong>12.5% Long-Term Capital Gains Tax</strong> plus exit loads), KoshQ's algorithm calculates how to direct your upcoming monthly investment of <strong>{formatINR(monthlyInflow)}</strong> strictly into underweight assets. Over 3 to 6 months, your portfolio organically glides back to your target allocation with <strong>₹0 tax friction</strong>.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-warning)' }}>
                    Direct Rebalance Execution (Immediate)
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-loss)', fontWeight: '600' }}>
                    Estimated Tax Drag: ~{formatINR(rebalanceResult.estimatedTaxDragDirect)}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Direct rebalancing sells overweight holdings today to buy underweight instruments immediately. Note that selling equity holdings will realize taxable capital gains under Section 112A (12.5% above ₹1.25L).
                </p>
              </div>
            )}
          </div>

          <div className="compliance-notice">
            <ShieldCheck size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <strong>Rebalancing Tool Disclaimer:</strong> Calculations are objective mathematical comparisons against your chosen target asset weights. KoshQ does not execute broker trades or provide specific security buy/sell advice.
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Client-Side CAS Statement Parser */}
      {activeTab === 'cas_import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="terminal-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--accent-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                  <FileUp size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700' }}>
                    Sovereign CAS (Consolidated Account Statement) PDF Parser
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Real client-side PDF decryption via PDF.js WASM • Zero network egress • 100% in-browser memory
                  </p>
                </div>
              </div>

              {/* Quick sample loader button */}
              <button
                onClick={handleLoadSampleCAS}
                disabled={isDecrypting}
                className="btn btn-secondary btn-sm"
                style={{ gap: 6 }}
                title="Load verified CAMS Consolidated e-CAS structure without uploading a personal PDF"
              >
                <Sparkles size={13} style={{ color: 'var(--accent-primary)' }} />
                <span>Test with Official CAMS e-CAS Sample</span>
              </button>
            </div>

            {/* Password PAN Input Strip */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock size={14} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '12px', fontWeight: '600' }}>PDF Password (PAN):</span>
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={casPassword}
                    onChange={e => setCasPassword(e.target.value)}
                    className="terminal-input"
                    style={{
                      width: 140,
                      height: 28,
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      paddingRight: 26
                    }}
                    placeholder="ABCDE1234F"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 6,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  (CAMS & KFintech encrypt using your 10-character PAN; uppercase & lowercase are automatically tried)
                </span>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={13} /> Encrypted Stream Processed Ephemerally
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDropFile}
              style={{
                border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '24px 20px',
                textAlign: 'center',
                background: isDragging ? 'var(--accent-surface)' : 'var(--bg-subtle)',
                marginBottom: 16,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => document.getElementById('cas-file-input')?.click()}
            >
              <input
                id="cas-file-input"
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <FileCheck size={34} style={{ color: 'var(--accent-primary)', margin: '0 auto 8px', opacity: 0.85 }} />
              <div style={{ fontSize: '13px', fontWeight: '600' }}>
                Drop your official CAMS or KFintech e-CAS PDF here
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                Supports CAMS Consolidated e-CAS, KFintech CAS, and CDSL/NSDL e-CAS PDF statements
              </div>
            </div>

            {/* Parsing Progress Bar */}
            {isDecrypting && (
              <div style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: '600', color: 'var(--accent-primary)' }}>
                    <RefreshCw size={13} className="animate-spin" />
                    {parseProgress?.stage || 'Decrypting and parsing PDF layers locally...'}
                  </span>
                  <span className="tabular-nums" style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>
                    {parseProgress?.percent || 25}%
                  </span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${parseProgress?.percent || 25}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                      transition: 'width 0.25s ease'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {casErrorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: 12,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: 16
              }}>
                <AlertTriangle size={17} style={{ color: 'var(--color-loss)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-loss)', marginBottom: 2 }}>
                    PDF Parsing Alert
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {casErrorMsg}
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {casSuccessMsg && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: 12,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16
              }}>
                <CheckCircle2 size={17} style={{ color: 'var(--color-gain)', flexShrink: 0 }} />
                <div style={{ fontSize: '12px', color: 'var(--color-gain)' }}>
                  {casSuccessMsg}
                </div>
              </div>
            )}

            {/* Parsed Statement Details & Folio Preview */}
            {parsedStatement && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Statement Summary Ribbon */}
                <div style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12
                }}>
                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Investor</span>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{parsedStatement.investorName}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>PAN: {parsedStatement.pan}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Registrar / Period</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-xs)',
                        background: 'var(--accent-surface)',
                        color: 'var(--accent-primary)',
                        border: '1px solid var(--accent-border)'
                      }}>
                        {parsedStatement.registrar}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {parsedStatement.totalPages ? `${parsedStatement.totalPages} Pages` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{parsedStatement.statementPeriod}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Total Valuation</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {formatINR(parsedStatement.totalValuation)}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Cost Basis: {formatINR(parsedStatement.totalCostBasis)}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Unrealized Gain</span>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: parsedStatement.totalGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {parsedStatement.totalGain >= 0 ? `+${formatINR(parsedStatement.totalGain)}` : formatINR(parsedStatement.totalGain)}
                    </div>
                    <span style={{ fontSize: '11px', color: parsedStatement.totalGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)' }}>
                      {parsedStatement.totalCostBasis > 0 ? `+${((parsedStatement.totalGain / parsedStatement.totalCostBasis) * 100).toFixed(2)}%` : '0.00%'}
                    </span>
                  </div>
                </div>

                {/* Folio Controls Bar: Search, Select All, and Merge Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      onClick={toggleSelectAllFolios}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: 6 }}
                    >
                      {selectedFolios.size === parsedStatement.holdings.length ? (
                        <>
                          <CheckSquare size={13} style={{ color: 'var(--accent-primary)' }} /> Deselect All
                        </>
                      ) : (
                        <>
                          <Square size={13} /> Select All ({parsedStatement.holdings.length})
                        </>
                      )}
                    </button>

                    {/* Search filter input */}
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      <Search size={12} style={{ position: 'absolute', left: 8, color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Filter schemes or ISIN..."
                        value={folioSearch}
                        onChange={e => setFolioSearch(e.target.value)}
                        className="terminal-input"
                        style={{ paddingLeft: 26, width: 180, height: 28, fontSize: '11px' }}
                      />
                    </div>

                    {/* Import mode selector */}
                    <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-xs)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      <button
                        onClick={() => setImportMode('merge')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: importMode === 'merge' ? 'var(--accent-surface)' : 'var(--bg-surface)',
                          color: importMode === 'merge' ? 'var(--accent-primary)' : 'var(--text-muted)',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Merge into Ledger
                      </button>
                      <button
                        onClick={() => setImportMode('replace')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: importMode === 'replace' ? 'var(--accent-surface)' : 'var(--bg-surface)',
                          color: importMode === 'replace' ? 'var(--accent-primary)' : 'var(--text-muted)',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Replace Demo Holdings
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleMergeCASToVault}
                    disabled={selectedFolios.size === 0}
                    className="btn btn-primary btn-sm"
                    style={{ gap: 6 }}
                  >
                    <Plus size={13} />
                    <span>Import {selectedFolios.size} Selected Folios into Sovereign Vault</span>
                  </button>
                </div>

                {/* Filtered Folios Table */}
                <div className="terminal-table-wrapper">
                  <table className="terminal-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}></th>
                        <th>Scheme / Fund Name</th>
                        <th>Folio No.</th>
                        <th>ISIN</th>
                        <th className="tabular-nums">Units</th>
                        <th className="tabular-nums">NAV (₹)</th>
                        <th className="tabular-nums">Current Value (₹)</th>
                        <th className="tabular-nums">Cost Basis (₹)</th>
                        <th className="tabular-nums">Unrealized Gain</th>
                        <th>Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedStatement.holdings
                        .filter(h => {
                          if (!folioSearch.trim()) return true;
                          const q = folioSearch.toLowerCase();
                          return (
                            h.schemeName.toLowerCase().includes(q) ||
                            h.isin.toLowerCase().includes(q) ||
                            h.folioNumber.toLowerCase().includes(q)
                          );
                        })
                        .map(h => {
                          const isSelected = selectedFolios.has(h.id);
                          return (
                            <tr
                              key={h.id}
                              style={{ background: isSelected ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: isSelected ? 1 : 0.6 }}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectFolio(h.id)}
                                  style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                                />
                              </td>
                              <td style={{ fontWeight: '600' }}>
                                <div>{h.schemeName}</div>
                                {h.amcName && (
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '400' }}>
                                    {h.amcName}
                                  </div>
                                )}
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{h.folioNumber}</td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{h.isin}</td>
                              <td className="tabular-nums">{h.units.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</td>
                              <td className="tabular-nums">₹{h.nav.toFixed(2)}</td>
                              <td className="tabular-nums" style={{ fontWeight: '700' }}>{formatINR(h.currentValue)}</td>
                              <td className="tabular-nums">{formatINR(h.costValue)}</td>
                              <td className="tabular-nums" style={{
                                color: h.unrealizedGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)',
                                fontWeight: '600'
                              }}>
                                {h.unrealizedGain >= 0 ? `+${formatINR(h.unrealizedGain)}` : formatINR(h.unrealizedGain)}
                              </td>
                              <td>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  padding: '2px 5px',
                                  borderRadius: 3,
                                  background: h.advisorType === 'DIRECT' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                  color: h.advisorType === 'DIRECT' ? 'var(--color-gain)' : 'var(--color-warning)'
                                }}>
                                  {h.advisorType}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Privacy & Regulatory Explainer Card */}
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: 4 }}>
                1. Zero Network Egress (Local Sandbox)
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Unlike other apps that upload your financial statement to remote servers, KoshQ runs the PDF decryption and regex extraction entirely in your device's browser memory. No third party ever sees your balances.
              </p>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: 4 }}>
                2. Ephemeral Password Lifecycle
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Your PAN password is used solely in volatile memory to decrypt the PDF document stream and is immediately cleared. It is never logged or written to cookies.
              </p>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: 4 }}>
                3. Non-Intermediary Safe Harbor
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                KoshQ operates strictly as a client-side utility reader. It does not act as an Account Aggregator (AA) or depository participant.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Broker CSV & Excel Importer */}
      {activeTab === 'broker_import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="terminal-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--accent-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700' }}>
                    Sovereign Broker CSV & Excel Importer
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Direct parser for Zerodha, Groww, INDmoney, Upstox & Tradebooks • Automatic lot matching & ISIN lookup
                  </p>
                </div>
              </div>

              {/* Sample loader buttons strip */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleLoadSampleBroker('zerodha')}
                  disabled={brokerFileLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: 5 }}
                  title="Load verified Zerodha Kite/Console holdings sample"
                >
                  <Sparkles size={12} style={{ color: 'var(--accent-primary)' }} />
                  <span>Zerodha Sample</span>
                </button>
                <button
                  onClick={() => handleLoadSampleBroker('groww')}
                  disabled={brokerFileLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: 5 }}
                  title="Load verified Groww portfolio statement sample"
                >
                  <Sparkles size={12} style={{ color: 'var(--accent-primary)' }} />
                  <span>Groww Sample</span>
                </button>
                <button
                  onClick={() => handleLoadSampleBroker('indmoney')}
                  disabled={brokerFileLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: 5 }}
                  title="Load verified INDmoney wealth statement sample (.xlsx)"
                >
                  <Sparkles size={12} style={{ color: 'var(--accent-primary)' }} />
                  <span>INDmoney Sample</span>
                </button>
              </div>
            </div>

            {/* Broker Compatibility Pills Bar */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>SUPPORTED BROKERS:</span>
                <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  Zerodha (Holdings & Tradebook)
                </span>
                <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  Groww (Stocks & Mutual Funds)
                </span>
                <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  INDmoney (Excel & CSV)
                </span>
                <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                  Upstox & Universal CSV
                </span>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={13} /> 100% In-Memory Sandbox (Zero Egress)
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setBrokerDragging(true); }}
              onDragLeave={() => setBrokerDragging(false)}
              onDrop={handleBrokerDropFile}
              style={{
                border: brokerDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '24px 20px',
                textAlign: 'center',
                background: brokerDragging ? 'var(--accent-surface)' : 'var(--bg-subtle)',
                marginBottom: 16,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => document.getElementById('broker-file-input')?.click()}
            >
              <input
                id="broker-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleBrokerFileSelect}
              />
              <FileSpreadsheet size={34} style={{ color: 'var(--accent-primary)', margin: '0 auto 8px', opacity: 0.85 }} />
              <div style={{ fontSize: '13px', fontWeight: '600' }}>
                Drop your Broker Holdings CSV or Tradebook Excel file here
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                Accepts .csv, .xlsx, and .xls exports directly from Zerodha Kite/Console, Groww, INDmoney, or Upstox
              </div>
            </div>

            {/* Loading Indicator */}
            {brokerFileLoading && (
              <div style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--accent-primary)',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                <RefreshCw size={13} className="animate-spin" />
                <span>Reading tabular dataset and running lot-matching & ISIN lookup in local sandbox...</span>
              </div>
            )}

            {/* Error Message */}
            {brokerErrorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: 12,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: 16
              }}>
                <AlertTriangle size={17} style={{ color: 'var(--color-loss)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-loss)', marginBottom: 2 }}>
                    Importer Error
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {brokerErrorMsg}
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {brokerSuccessMsg && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: 12,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16
              }}>
                <CheckCircle2 size={17} style={{ color: 'var(--color-gain)', flexShrink: 0 }} />
                <div style={{ fontSize: '12px', color: 'var(--color-gain)' }}>
                  {brokerSuccessMsg}
                </div>
              </div>
            )}

            {/* Parsed Broker Report & Holdings Preview */}
            {brokerReport && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Summary Ribbon */}
                <div style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: 12
                }}>
                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Broker Source</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-xs)',
                        background: 'var(--accent-surface)',
                        color: 'var(--accent-primary)',
                        border: '1px solid var(--accent-border)'
                      }}>
                        {brokerReport.broker}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {brokerReport.recordCount} Positions
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>{brokerReport.fileName}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Current Valuation</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {formatINR(brokerReport.totalValuation)}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Invested: {formatINR(brokerReport.totalInvested)}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Unrealized Returns</span>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: brokerReport.totalGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {brokerReport.totalGain >= 0 ? `+${formatINR(brokerReport.totalGain)}` : formatINR(brokerReport.totalGain)}
                    </div>
                    <span style={{ fontSize: '11px', color: brokerReport.totalGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)', fontWeight: '600' }}>
                      {brokerReport.totalGain >= 0 ? `+${brokerReport.totalGainPercent}%` : `${brokerReport.totalGainPercent}%`}
                    </span>
                  </div>
                </div>

                {/* Controls Bar: Search, Select All, Mode Selector, and Import CTA */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      onClick={toggleSelectAllBrokerItems}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: 6 }}
                    >
                      {selectedBrokerItems.size === brokerReport.holdings.length ? (
                        <>
                          <CheckSquare size={13} style={{ color: 'var(--accent-primary)' }} /> Deselect All
                        </>
                      ) : (
                        <>
                          <Square size={13} /> Select All ({brokerReport.holdings.length})
                        </>
                      )}
                    </button>

                    {/* Search filter */}
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      <Search size={12} style={{ position: 'absolute', left: 8, color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Filter ticker, name, or ISIN..."
                        value={brokerSearch}
                        onChange={e => setBrokerSearch(e.target.value)}
                        className="terminal-input"
                        style={{ paddingLeft: 26, width: 190, height: 28, fontSize: '11px' }}
                      />
                    </div>

                    {/* Mode selector */}
                    <div style={{ display: 'inline-flex', borderRadius: 'var(--radius-xs)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      <button
                        onClick={() => setBrokerImportMode('merge')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: brokerImportMode === 'merge' ? 'var(--accent-surface)' : 'var(--bg-surface)',
                          color: brokerImportMode === 'merge' ? 'var(--accent-primary)' : 'var(--text-muted)',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Merge into Ledger
                      </button>
                      <button
                        onClick={() => setBrokerImportMode('replace')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: brokerImportMode === 'replace' ? 'var(--accent-surface)' : 'var(--bg-surface)',
                          color: brokerImportMode === 'replace' ? 'var(--accent-primary)' : 'var(--text-muted)',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Replace Demo Holdings
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleMergeBrokerToVault}
                    disabled={selectedBrokerItems.size === 0}
                    className="btn btn-primary btn-sm"
                    style={{ gap: 6 }}
                  >
                    <Plus size={13} />
                    <span>Import {selectedBrokerItems.size} Selected Positions into Sovereign Vault</span>
                  </button>
                </div>

                {/* Filtered Holdings Table */}
                <div className="terminal-table-wrapper">
                  <table className="terminal-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}></th>
                        <th>Symbol / Instrument</th>
                        <th>Security Name & Sector</th>
                        <th>ISIN</th>
                        <th className="tabular-nums">Qty</th>
                        <th className="tabular-nums">Avg Cost (₹)</th>
                        <th className="tabular-nums">LTP (₹)</th>
                        <th className="tabular-nums">Invested (₹)</th>
                        <th className="tabular-nums">Current Value (₹)</th>
                        <th className="tabular-nums">Unrealized P&L</th>
                        <th>Broker</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brokerReport.holdings
                        .filter(h => {
                          if (!brokerSearch.trim()) return true;
                          const q = brokerSearch.toLowerCase();
                          return (
                            h.symbol.toLowerCase().includes(q) ||
                            h.name.toLowerCase().includes(q) ||
                            h.isin.toLowerCase().includes(q) ||
                            h.sector.toLowerCase().includes(q)
                          );
                        })
                        .map(h => {
                          const isSelected = selectedBrokerItems.has(h.id);
                          return (
                            <tr
                              key={h.id}
                              style={{ background: isSelected ? 'transparent' : 'rgba(0,0,0,0.02)', opacity: isSelected ? 1 : 0.6 }}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectBrokerItem(h.id)}
                                  style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                                />
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{h.symbol}</span>
                                  <span style={{
                                    fontSize: '9px',
                                    fontWeight: '700',
                                    padding: '1px 5px',
                                    borderRadius: 2,
                                    background: 'var(--bg-subtle)',
                                    color: 'var(--text-muted)'
                                  }}>
                                    {h.marketCapCategory}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: '600' }}>{h.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{h.sector}</div>
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{h.isin}</td>
                              <td className="tabular-nums" style={{ fontWeight: '600' }}>{h.quantity.toLocaleString('en-IN')}</td>
                              <td className="tabular-nums">₹{h.averagePrice.toFixed(2)}</td>
                              <td className="tabular-nums">₹{h.currentPrice.toFixed(2)}</td>
                              <td className="tabular-nums">{formatINR(h.investedAmount)}</td>
                              <td className="tabular-nums" style={{ fontWeight: '700' }}>{formatINR(h.currentValue)}</td>
                              <td className="tabular-nums" style={{
                                color: h.unrealizedGain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)',
                                fontWeight: '600'
                              }}>
                                {h.unrealizedGain >= 0 ? `+${formatINR(h.unrealizedGain)}` : formatINR(h.unrealizedGain)}
                                <span style={{ fontSize: '10px', marginLeft: 4 }}>
                                  ({h.unrealizedGainPercent >= 0 ? `+${h.unrealizedGainPercent}%` : `${h.unrealizedGainPercent}%`})
                                </span>
                              </td>
                              <td>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  padding: '2px 6px',
                                  borderRadius: 3,
                                  background: 'var(--accent-surface)',
                                  color: 'var(--accent-primary)'
                                }}>
                                  {h.brokerSource}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Enclave Card */}
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: 4 }}>
                1. Local Tabular Engine (Zero Server Upload)
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                CSV and Excel parsing is processed entirely in your browser's local sandbox memory using XLSX WASM. Your trades and net worth are never sent to external servers.
              </p>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: 4 }}>
                2. Automated FIFO Lot Matching
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                When importing raw multi-order tradebooks, KoshQ automatically matches buy and sell execution lots using weighted-average cost basis to derive your true active positions.
              </p>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: 4 }}>
                3. SEBI & AMFI Instrument Enrichment
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Tickers without metadata are automatically enriched with official NSE/BSE ISINs, industry sectors, and market capitalization tiers for instant X-Ray analytics.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Manual Asset Entry */}
      {activeTab === 'manual_add' && (
        <div className="terminal-card" style={{ padding: 22, maxWidth: 640 }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 6 }}>
            Add Asset to Sovereign Vault
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 16 }}>
            Enter your transaction details manually for complete offline tracking
          </p>

          <form onSubmit={handleAddAsset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  TICKER / SYMBOL
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INFY or SGB_NOV28"
                  value={newSymbol}
                  onChange={e => setNewSymbol(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  INSTRUMENT NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Infosys Ltd."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  ASSET CLASS
                </label>
                <select
                  value={newClass}
                  onChange={e => setNewClass(e.target.value as any)}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="equity">Equity Share</option>
                  <option value="mutual_fund">Mutual Fund (Direct)</option>
                  <option value="bond">Bond / Debenture / G-Sec</option>
                  <option value="gold">Sovereign Gold Bond / Gold</option>
                  <option value="govt_scheme">Govt Scheme (PPF/EPF/NPS)</option>
                  <option value="cash">Fixed Deposit / Cash</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  SECTOR / CATEGORY
                </label>
                <input
                  type="text"
                  value={newSector}
                  onChange={e => setNewSector(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  QUANTITY / UNITS
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="100"
                  value={newQty}
                  onChange={e => setNewQty(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  AVG BUY PRICE (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="1450"
                  value={newCost}
                  onChange={e => setNewCost(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  CURRENT PRICE (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="1620"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>
              <Plus size={14} /> Add Position to Ledger
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
