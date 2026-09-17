import React, { useState, useEffect, useMemo } from 'react';
import { DEMO_STOCKS, DEMO_MUTUAL_FUNDS, DEMO_BONDS, DEMO_ETFS, generateSyntheticHistory } from '../../data/demoData';
import { StockDetail, MutualFundDetail, BondDetail, ETFDetail, Holding } from '../../data/types';
import { formatINR, formatPercent } from '../../core/math/xirr';
import {
  Search,
  ShieldCheck,
  X,
  Layers,
  TrendingUp,
  PieChart,
  Landmark,
  ArrowRight,
  RefreshCw,
  Globe,
  Plus,
  Check,
  Sparkles,
  ExternalLink,
  Filter,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import { MiniSparkline } from '../../components/Charts/MiniSparkline';
import { useMarketQuotes } from '../../core/market/useMarketQuotes';
import { liveMarketApi, LiveMarketSearchResult, LiveMarketQuote } from '../../core/api/liveMarketApi';
import { amfiService } from '../../core/api/amfiService';
import { VaultStorage } from '../../data/storage';

interface ExploreViewProps {
  onSelectHolding: (h: Holding) => void;
  onUpdateHoldings?: (h: Holding[]) => void;
}

type AssetTabType = 'all' | 'stocks' | 'mfs' | 'etfs' | 'bonds';

export const ExploreView: React.FC<ExploreViewProps> = ({ onSelectHolding, onUpdateHoldings }) => {
  const { quotes, tickerState, syncAll, registerInstrument } = useMarketQuotes();
  const [activeAssetType, setActiveAssetType] = useState<AssetTabType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Live Exchange & AMFI Registry Search State
  const [liveRegistryResults, setLiveRegistryResults] = useState<LiveMarketSearchResult[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [addedSymbols, setAddedSymbols] = useState<string[]>([]);

  // Tab 1: All Instruments Filters
  const [allClasses, setAllClasses] = useState<{ stocks: boolean; mfs: boolean; etfs: boolean; bonds: boolean }>({
    stocks: true,
    mfs: true,
    etfs: true,
    bonds: true,
  });
  const [allPerformance, setAllPerformance] = useState<'all' | 'gainers' | 'losers'>('all');
  const [allSortBy, setAllSortBy] = useState<'default' | 'dayChangeDesc' | 'dayChangeAsc' | 'priceDesc' | 'priceAsc'>('default');

  // Tab 2: Equities Filters
  const [stockCap, setStockCap] = useState<'all' | 'Large Cap' | 'Mid Cap' | 'Small Cap'>('all');
  const [stockSector, setStockSector] = useState<string>('all');
  const [stockPE, setStockPE] = useState<'all' | 'under25' | '25to45' | 'over45'>('all');
  const [stockROE, setStockROE] = useState<'all' | 'above15' | 'above25'>('all');
  const [stockDebt, setStockDebt] = useState<'all' | 'low' | 'zero'>('all');
  const [stockSortBy, setStockSortBy] = useState<'marketCapDesc' | 'priceDesc' | 'priceAsc' | 'dayChangeDesc' | 'dayChangeAsc' | 'peAsc' | 'roeDesc' | 'betaAsc'>('marketCapDesc');
  const [stockActivePreset, setStockActivePreset] = useState<string | null>(null);

  // Tab 3: Mutual Funds Filters
  const [mfCategory, setMfCategory] = useState<string>('all');
  const [mfTER, setMfTER] = useState<'all' | 'ultra_low' | 'low' | 'standard'>('all');
  const [mfReturnHorizon, setMfReturnHorizon] = useState<'all' | '1y_35' | '3y_20' | '5y_20' | '5y_25'>('all');
  const [mfSharpe, setMfSharpe] = useState<'all' | 'above1.2' | 'above1.5'>('all');
  const [mfSortBy, setMfSortBy] = useState<'aumDesc' | 'cagr5yDesc' | 'cagr3yDesc' | 'cagr1yDesc' | 'terAsc' | 'navDesc'>('aumDesc');
  const [mfActivePreset, setMfActivePreset] = useState<string | null>(null);

  // Tab 4: ETFs Filters
  const [etfCategory, setEtfCategory] = useState<string>('all');
  const [etfPricing, setEtfPricing] = useState<'all' | 'discount' | 'fair_premium'>('all');
  const [etfExpense, setEtfExpense] = useState<'all' | 'under0.2' | 'under0.5'>('all');
  const [etfSortBy, setEtfSortBy] = useState<'aumDesc' | 'dayChangeDesc' | 'terAsc' | 'priceDesc'>('aumDesc');
  const [etfActivePreset, setEtfActivePreset] = useState<string | null>(null);

  // Tab 5: Bonds Filters
  const [bondIssuer, setBondIssuer] = useState<string>('all');
  const [bondRating, setBondRating] = useState<string>('all');
  const [bondPayout, setBondPayout] = useState<string>('all');
  const [bondYTM, setBondYTM] = useState<'all' | 'above7.0' | 'above7.5' | 'above8.0'>('all');
  const [bondSortBy, setBondSortBy] = useState<'ytmDesc' | 'couponDesc' | 'priceAsc' | 'priceDesc'>('ytmDesc');
  const [bondActivePreset, setBondActivePreset] = useState<string | null>(null);

  // Filter Reset Handlers
  const resetAllFilters = () => {
    setAllClasses({ stocks: true, mfs: true, etfs: true, bonds: true });
    setAllPerformance('all');
    setAllSortBy('default');
  };

  const resetStockFilters = () => {
    setStockCap('all');
    setStockSector('all');
    setStockPE('all');
    setStockROE('all');
    setStockDebt('all');
    setStockSortBy('marketCapDesc');
    setStockActivePreset(null);
  };

  const resetMFFilters = () => {
    setMfCategory('all');
    setMfTER('all');
    setMfReturnHorizon('all');
    setMfSharpe('all');
    setMfSortBy('aumDesc');
    setMfActivePreset(null);
  };

  const resetETFFilters = () => {
    setEtfCategory('all');
    setEtfPricing('all');
    setEtfExpense('all');
    setEtfSortBy('aumDesc');
    setEtfActivePreset(null);
  };

  const resetBondFilters = () => {
    setBondIssuer('all');
    setBondRating('all');
    setBondPayout('all');
    setBondYTM('all');
    setBondSortBy('ytmDesc');
    setBondActivePreset(null);
  };

  // Active Filter Counts
  const allActiveFilterCount =
    (allPerformance !== 'all' ? 1 : 0) +
    (allSortBy !== 'default' ? 1 : 0) +
    (!allClasses.stocks || !allClasses.mfs || !allClasses.etfs || !allClasses.bonds ? 1 : 0);

  const stockActiveFilterCount =
    (stockCap !== 'all' ? 1 : 0) +
    (stockSector !== 'all' ? 1 : 0) +
    (stockPE !== 'all' ? 1 : 0) +
    (stockROE !== 'all' ? 1 : 0) +
    (stockDebt !== 'all' ? 1 : 0) +
    (stockSortBy !== 'marketCapDesc' ? 1 : 0);

  const mfActiveFilterCount =
    (mfCategory !== 'all' ? 1 : 0) +
    (mfTER !== 'all' ? 1 : 0) +
    (mfReturnHorizon !== 'all' ? 1 : 0) +
    (mfSharpe !== 'all' ? 1 : 0) +
    (mfSortBy !== 'aumDesc' ? 1 : 0);

  const etfActiveFilterCount =
    (etfCategory !== 'all' ? 1 : 0) +
    (etfPricing !== 'all' ? 1 : 0) +
    (etfExpense !== 'all' ? 1 : 0) +
    (etfSortBy !== 'aumDesc' ? 1 : 0);

  const bondActiveFilterCount =
    (bondIssuer !== 'all' ? 1 : 0) +
    (bondRating !== 'all' ? 1 : 0) +
    (bondPayout !== 'all' ? 1 : 0) +
    (bondYTM !== 'all' ? 1 : 0) +
    (bondSortBy !== 'ytmDesc' ? 1 : 0);

  // Fetch initial live quotes on mount to ensure fresh prices
  useEffect(() => {
    syncAll(false);
  }, []);

  // Debounced Live Indian Market Registry Search (NSE/BSE & AMFI)
  useEffect(() => {
    const q = searchTerm.trim();
    if (q.length < 2) {
      setLiveRegistryResults([]);
      setIsSearchingLive(false);
      return;
    }

    setIsSearchingLive(true);
    const timeoutId = setTimeout(async () => {
      try {
        // Parallel queries to Yahoo Finance (NSE/BSE) and AMFI official registry
        const [equityResults, amfiResults] = await Promise.all([
          liveMarketApi.searchLiveEquities(q),
          amfiService.searchSchemes(q)
        ]);

        const formattedMFs: LiveMarketSearchResult[] = amfiResults.slice(0, 6).map(s => ({
          symbol: `AMFI-${s.schemeCode}`,
          name: s.schemeName,
          exchange: 'AMFI',
          type: 'MUTUAL_FUND',
          isin: `${s.schemeCode}`
        }));

        const combined = [...equityResults.slice(0, 8), ...formattedMFs];

        // Fetch live quotes for top equity results to show real-time LTP
        const resultsWithQuotes = await Promise.all(
          combined.map(async item => {
            if (item.type === 'EQUITY' || item.type === 'ETF') {
              const live = await liveMarketApi.fetchLiveQuote(item.symbol);
              if (live) {
                return {
                  ...item,
                  livePrice: live.currentPrice,
                  dayChangePercent: live.dayChangePercent
                };
              }
            } else if (item.type === 'MUTUAL_FUND') {
              const schemeCode = parseInt(item.isin || '0', 10);
              if (schemeCode > 0) {
                const navRes = await amfiService.fetchSchemeNAV(schemeCode);
                if (navRes) {
                  return {
                    ...item,
                    livePrice: navRes.nav,
                    dayChangePercent: navRes.dayChangePercent
                  };
                }
              }
            }
            return item;
          })
        );

        setLiveRegistryResults(resultsWithQuotes);
      } catch (err) {
        console.warn('Live search error:', err);
      } finally {
        setIsSearchingLive(false);
      }
    }, 380);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Transform StockDetail into Holding format for drawer view
  const handleStockClick = (s: StockDetail) => {
    const live = quotes[s.symbol];
    const price = live ? live.currentPrice : s.currentPrice;

    const fakeHolding: Holding = {
      id: `stock-${s.symbol}`,
      symbol: s.symbol,
      name: s.name,
      isin: s.isin,
      assetClass: 'equity',
      sector: s.sector,
      quantity: 100,
      averageBuyPrice: price * 0.90,
      currentPrice: price,
      investedAmount: price * 90,
      currentValue: price * 100,
      unrealizedGain: price * 10,
      unrealizedGainPercent: 11.1,
      allocationPercent: 8.5,
      peRatio: s.peRatio,
      sparkline: s.history ? s.history['1Y'].slice(-10).map(p => p.close) : [price * 0.92, price * 0.95, price * 0.99, price],
      riskGrade: s.beta > 1.2 ? 'High' : s.beta > 0.8 ? 'Moderate' : 'Low',
      history: s.history
    };
    onSelectHolding(fakeHolding);
  };

  // Transform MutualFundDetail into Holding format for drawer view
  const handleMFClick = (mf: MutualFundDetail) => {
    const live = quotes[mf.code];
    const nav = live ? live.currentPrice : mf.nav;

    const fakeHolding: Holding = {
      id: `mf-${mf.code}`,
      symbol: mf.code,
      name: mf.name,
      isin: mf.code,
      assetClass: 'mutual_fund',
      sector: mf.category,
      quantity: 500,
      averageBuyPrice: nav * 0.85,
      currentPrice: nav,
      investedAmount: nav * 0.85 * 500,
      currentValue: nav * 500,
      unrealizedGain: (nav - nav * 0.85) * 500,
      unrealizedGainPercent: 17.6,
      allocationPercent: 12.0,
      sparkline: [nav * 0.88, nav * 0.91, nav * 0.94, nav * 0.97, nav],
      riskGrade: mf.category.includes('Small') || mf.category.includes('Mid') ? 'High' : 'Moderate'
    };
    onSelectHolding(fakeHolding);
  };

  // Transform ETFDetail into Holding format for drawer view
  const handleETFClick = (etf: ETFDetail) => {
    const live = quotes[etf.symbol];
    const price = live ? live.currentPrice : etf.currentPrice;

    const fakeHolding: Holding = {
      id: `etf-${etf.symbol}`,
      symbol: etf.symbol,
      name: etf.name,
      isin: etf.isin,
      assetClass: etf.category === 'Commodity' ? 'gold' : 'equity',
      sector: etf.underlyingAsset,
      quantity: 200,
      averageBuyPrice: price * 0.92,
      currentPrice: price,
      investedAmount: price * 0.92 * 200,
      currentValue: price * 200,
      unrealizedGain: price * 0.08 * 200,
      unrealizedGainPercent: 8.7,
      allocationPercent: 6.5,
      sparkline: etf.history ? etf.history['1Y'].slice(-10).map(p => p.close) : [price * 0.93, price * 0.96, price],
      riskGrade: etf.category === 'Debt' ? 'Low' : 'Moderate',
      history: etf.history
    };
    onSelectHolding(fakeHolding);
  };

  // Transform BondDetail into Holding format for drawer view
  const handleBondClick = (b: BondDetail) => {
    const fakeHolding: Holding = {
      id: `bond-${b.isin}`,
      symbol: b.isin.slice(-8),
      name: b.name,
      isin: b.isin,
      assetClass: b.name.includes('Gold') ? 'gold' : 'bond',
      sector: b.issuerType,
      quantity: 10,
      averageBuyPrice: b.marketPrice * 0.96,
      currentPrice: b.marketPrice,
      investedAmount: b.marketPrice * 0.96 * 10,
      currentValue: b.marketPrice * 10,
      unrealizedGain: b.marketPrice * 0.04 * 10,
      unrealizedGainPercent: 4.17,
      allocationPercent: 5.0,
      sparkline: [b.marketPrice * 0.98, b.marketPrice * 0.99, b.marketPrice * 0.995, b.marketPrice],
      riskGrade: b.creditRating === 'SOVEREIGN' ? 'Low' : 'Moderate'
    };
    onSelectHolding(fakeHolding);
  };

  // Handle live search result selection (fetch real live quote & open factsheet drawer)
  const handleLiveResultClick = async (item: LiveMarketSearchResult) => {
    if (item.type === 'MUTUAL_FUND') {
      const schemeCode = parseInt(item.isin || '0', 10);
      const navRes = schemeCode > 0 ? await amfiService.fetchSchemeNAV(schemeCode) : null;
      const nav = navRes ? navRes.nav : item.livePrice || 50;

      const mfHolding: Holding = {
        id: `live-mf-${item.symbol}`,
        symbol: item.symbol,
        name: item.name,
        isin: item.isin || 'INF000000000',
        assetClass: 'mutual_fund',
        sector: 'Direct Mutual Fund (AMFI)',
        quantity: 100,
        averageBuyPrice: nav * 0.88,
        currentPrice: nav,
        investedAmount: nav * 88,
        currentValue: nav * 100,
        unrealizedGain: nav * 12,
        unrealizedGainPercent: 13.6,
        allocationPercent: 5.0,
        sparkline: [nav * 0.92, nav * 0.95, nav * 0.98, nav],
        riskGrade: 'Moderate'
      };
      onSelectHolding(mfHolding);
      return;
    }

    // Equity or ETF: fetch live quote with real historical candles
    const quote = await liveMarketApi.fetchLiveQuote(item.symbol, true);
    const price = quote ? quote.currentPrice : item.livePrice || 500;
    registerInstrument(item.symbol, item.name, item.type === 'ETF' ? 'etf' : 'equity', price, quote?.dayChange || 0, quote?.dayChangePercent || 0);

    const holding: Holding = {
      id: `live-${item.symbol}`,
      symbol: item.symbol,
      name: item.name,
      isin: item.isin || `INE${item.symbol.slice(0, 6)}0101`,
      assetClass: item.type === 'ETF' ? 'etf' : 'equity',
      sector: item.type === 'ETF' ? 'Exchange Traded Fund' : `${item.exchange} Listed Equity`,
      quantity: 50,
      averageBuyPrice: price * 0.88,
      currentPrice: price,
      investedAmount: price * 44,
      currentValue: price * 50,
      unrealizedGain: price * 6,
      unrealizedGainPercent: 13.6,
      allocationPercent: 6.0,
      peRatio: 25.0,
      sparkline: quote?.history && quote.history.length > 5 ? quote.history.slice(-10) : [price * 0.92, price * 0.95, price * 0.98, price],
      riskGrade: 'Moderate',
      history: generateSyntheticHistory(price, 0.016, 0.18)
    };
    onSelectHolding(holding);
  };

  // Add Live Searched Instrument directly to User's Sovereign Vault
  const handleAddToVault = (item: LiveMarketSearchResult, e: React.MouseEvent) => {
    e.stopPropagation();
    const price = item.livePrice || 500;
    const currentVault = VaultStorage.getHoldings();

    const newH: Holding = {
      id: `vault-add-${item.symbol}-${Date.now()}`,
      symbol: item.symbol,
      name: item.name,
      isin: item.isin || `INE${item.symbol.slice(0, 6)}0101`,
      assetClass: item.type === 'MUTUAL_FUND' ? 'mutual_fund' : item.type === 'ETF' ? 'etf' : 'equity',
      sector: item.exchange,
      quantity: 50,
      averageBuyPrice: price,
      currentPrice: price,
      investedAmount: price * 50,
      currentValue: price * 50,
      unrealizedGain: 0,
      unrealizedGainPercent: 0,
      allocationPercent: 5.0,
      sparkline: [price * 0.96, price * 0.98, price],
      riskGrade: 'Moderate'
    };

    const updated = [newH, ...currentVault];
    VaultStorage.saveHoldings(updated);
    if (onUpdateHoldings) onUpdateHoldings(updated);
    setAddedSymbols(prev => [...prev, item.symbol]);
  };

  // Dynamic sector & category option lists from data
  const uniqueStockSectors = useMemo(() => Array.from(new Set(DEMO_STOCKS.map(s => s.sector))).sort(), []);
  const uniqueMFCategories = useMemo(() => Array.from(new Set(DEMO_MUTUAL_FUNDS.map(m => m.category))).sort(), []);
  const uniqueBondIssuers = useMemo(() => Array.from(new Set(DEMO_BONDS.map(b => b.issuerType))).sort(), []);
  const uniqueBondRatings = useMemo(() => Array.from(new Set(DEMO_BONDS.map(b => b.creditRating))).sort(), []);

  // Comprehensive Search across EVERY asset class
  const query = searchTerm.trim().toLowerCase();

  const filteredStocks = useMemo(() => {
    let list = DEMO_STOCKS.filter(s => {
      // Global Search
      if (query && !(
        s.name.toLowerCase().includes(query) ||
        s.symbol.toLowerCase().includes(query) ||
        s.sector.toLowerCase().includes(query) ||
        s.isin.toLowerCase().includes(query) ||
        s.marketCapType.toLowerCase().includes(query)
      )) {
        return false;
      }

      // Equity-specific filters
      if (stockCap !== 'all' && s.marketCapType !== stockCap) return false;
      if (stockSector !== 'all' && s.sector !== stockSector) return false;

      if (stockPE === 'under25' && s.peRatio >= 25) return false;
      if (stockPE === '25to45' && (s.peRatio < 25 || s.peRatio > 45)) return false;
      if (stockPE === 'over45' && s.peRatio <= 45) return false;

      if (stockROE === 'above15' && s.roe < 15) return false;
      if (stockROE === 'above25' && s.roe < 25) return false;

      if (stockDebt === 'low' && s.debtToEquity >= 0.5) return false;
      if (stockDebt === 'zero' && s.debtToEquity > 0) return false;

      // In All tab, also respect allPerformance filter
      if (activeAssetType === 'all') {
        const live = quotes[s.symbol];
        const dayPct = live ? live.dayChangePercent : s.dayChangePercent;
        if (allPerformance === 'gainers' && dayPct < 0) return false;
        if (allPerformance === 'losers' && dayPct > 0) return false;
      }

      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      const priceA = quotes[a.symbol]?.currentPrice ?? a.currentPrice;
      const priceB = quotes[b.symbol]?.currentPrice ?? b.currentPrice;
      const dayChgA = quotes[a.symbol]?.dayChangePercent ?? a.dayChangePercent;
      const dayChgB = quotes[b.symbol]?.dayChangePercent ?? b.dayChangePercent;

      if (activeAssetType === 'all') {
        if (allSortBy === 'dayChangeDesc') return dayChgB - dayChgA;
        if (allSortBy === 'dayChangeAsc') return dayChgA - dayChgB;
        if (allSortBy === 'priceDesc') return priceB - priceA;
        if (allSortBy === 'priceAsc') return priceA - priceB;
        return 0;
      }

      switch (stockSortBy) {
        case 'marketCapDesc':
          return b.marketCap - a.marketCap;
        case 'priceDesc':
          return priceB - priceA;
        case 'priceAsc':
          return priceA - priceB;
        case 'dayChangeDesc':
          return dayChgB - dayChgA;
        case 'dayChangeAsc':
          return dayChgA - dayChgB;
        case 'peAsc':
          return a.peRatio - b.peRatio;
        case 'roeDesc':
          return b.roe - a.roe;
        case 'betaAsc':
          return a.beta - b.beta;
        default:
          return 0;
      }
    });

    return list;
  }, [query, stockCap, stockSector, stockPE, stockROE, stockDebt, stockSortBy, activeAssetType, allPerformance, allSortBy, quotes]);

  const filteredMFs = useMemo(() => {
    let list = DEMO_MUTUAL_FUNDS.filter(mf => {
      // Global Search
      if (query && !(
        mf.name.toLowerCase().includes(query) ||
        mf.code.toLowerCase().includes(query) ||
        mf.category.toLowerCase().includes(query) ||
        mf.benchmark.toLowerCase().includes(query) ||
        mf.fundManager.toLowerCase().includes(query) ||
        mf.topHoldings.some(th => th.name.toLowerCase().includes(query))
      )) {
        return false;
      }

      // Mutual Fund filters
      if (mfCategory !== 'all' && mf.category !== mfCategory) return false;

      if (mfTER === 'ultra_low' && mf.expenseRatio >= 0.3) return false;
      if (mfTER === 'low' && mf.expenseRatio >= 0.7) return false;
      if (mfTER === 'standard' && mf.expenseRatio < 0.7) return false;

      if (mfReturnHorizon === '1y_35' && mf.cagr1Y < 35) return false;
      if (mfReturnHorizon === '3y_20' && mf.cagr3Y < 20) return false;
      if (mfReturnHorizon === '5y_20' && mf.cagr5Y < 20) return false;
      if (mfReturnHorizon === '5y_25' && mf.cagr5Y < 25) return false;

      if (mfSharpe === 'above1.2' && mf.sharpeRatio < 1.2) return false;
      if (mfSharpe === 'above1.5' && mf.sharpeRatio < 1.5) return false;

      if (activeAssetType === 'all') {
        const live = quotes[mf.code];
        const dayPct = live ? live.dayChangePercent : mf.dayChangePercent;
        if (allPerformance === 'gainers' && dayPct < 0) return false;
        if (allPerformance === 'losers' && dayPct > 0) return false;
      }

      return true;
    });

    list = [...list].sort((a, b) => {
      const navA = quotes[a.code]?.currentPrice ?? a.nav;
      const navB = quotes[b.code]?.currentPrice ?? b.nav;
      const dayChgA = quotes[a.code]?.dayChangePercent ?? a.dayChangePercent;
      const dayChgB = quotes[b.code]?.dayChangePercent ?? b.dayChangePercent;

      if (activeAssetType === 'all') {
        if (allSortBy === 'dayChangeDesc') return dayChgB - dayChgA;
        if (allSortBy === 'dayChangeAsc') return dayChgA - dayChgB;
        if (allSortBy === 'priceDesc') return navB - navA;
        if (allSortBy === 'priceAsc') return navA - navB;
        return 0;
      }

      switch (mfSortBy) {
        case 'aumDesc':
          return b.aumCrores - a.aumCrores;
        case 'cagr5yDesc':
          return b.cagr5Y - a.cagr5Y;
        case 'cagr3yDesc':
          return b.cagr3Y - a.cagr3Y;
        case 'cagr1yDesc':
          return b.cagr1Y - a.cagr1Y;
        case 'terAsc':
          return a.expenseRatio - b.expenseRatio;
        case 'navDesc':
          return navB - navA;
        default:
          return 0;
      }
    });

    return list;
  }, [query, mfCategory, mfTER, mfReturnHorizon, mfSharpe, mfSortBy, activeAssetType, allPerformance, allSortBy, quotes]);

  const filteredETFs = useMemo(() => {
    let list = DEMO_ETFS.filter(etf => {
      if (query && !(
        etf.symbol.toLowerCase().includes(query) ||
        etf.name.toLowerCase().includes(query) ||
        etf.underlyingAsset.toLowerCase().includes(query) ||
        etf.isin.toLowerCase().includes(query) ||
        etf.category.toLowerCase().includes(query)
      )) {
        return false;
      }

      if (etfCategory !== 'all' && etf.category !== etfCategory) return false;

      if (etfPricing === 'discount' && etf.premiumDiscountPercent >= 0) return false;
      if (etfPricing === 'fair_premium' && etf.premiumDiscountPercent < 0) return false;

      if (etfExpense === 'under0.2' && etf.expenseRatio >= 0.2) return false;
      if (etfExpense === 'under0.5' && etf.expenseRatio >= 0.5) return false;

      if (activeAssetType === 'all') {
        const live = quotes[etf.symbol];
        const dayPct = live ? live.dayChangePercent : etf.dayChangePercent;
        if (allPerformance === 'gainers' && dayPct < 0) return false;
        if (allPerformance === 'losers' && dayPct > 0) return false;
      }

      return true;
    });

    list = [...list].sort((a, b) => {
      const priceA = quotes[a.symbol]?.currentPrice ?? a.currentPrice;
      const priceB = quotes[b.symbol]?.currentPrice ?? b.currentPrice;
      const dayChgA = quotes[a.symbol]?.dayChangePercent ?? a.dayChangePercent;
      const dayChgB = quotes[b.symbol]?.dayChangePercent ?? b.dayChangePercent;

      if (activeAssetType === 'all') {
        if (allSortBy === 'dayChangeDesc') return dayChgB - dayChgA;
        if (allSortBy === 'dayChangeAsc') return dayChgA - dayChgB;
        if (allSortBy === 'priceDesc') return priceB - priceA;
        if (allSortBy === 'priceAsc') return priceA - priceB;
        return 0;
      }

      switch (etfSortBy) {
        case 'aumDesc':
          return b.aumCrores - a.aumCrores;
        case 'dayChangeDesc':
          return dayChgB - dayChgA;
        case 'terAsc':
          return a.expenseRatio - b.expenseRatio;
        case 'priceDesc':
          return priceB - priceA;
        default:
          return 0;
      }
    });

    return list;
  }, [query, etfCategory, etfPricing, etfExpense, etfSortBy, activeAssetType, allPerformance, allSortBy, quotes]);

  const filteredBonds = useMemo(() => {
    let list = DEMO_BONDS.filter(b => {
      if (query && !(
        b.name.toLowerCase().includes(query) ||
        b.isin.toLowerCase().includes(query) ||
        b.issuerType.toLowerCase().includes(query) ||
        b.creditRating.toLowerCase().includes(query) ||
        b.couponRate.toString().includes(query) ||
        b.maturityDate.toLowerCase().includes(query)
      )) {
        return false;
      }

      if (bondIssuer !== 'all' && b.issuerType !== bondIssuer) return false;
      if (bondRating !== 'all' && b.creditRating !== bondRating) return false;
      if (bondPayout !== 'all' && b.paymentFrequency !== bondPayout) return false;

      if (bondYTM === 'above7.0' && b.ytm < 7.0) return false;
      if (bondYTM === 'above7.5' && b.ytm < 7.5) return false;
      if (bondYTM === 'above8.0' && b.ytm < 8.0) return false;

      return true;
    });

    list = [...list].sort((a, b) => {
      if (activeAssetType === 'all') {
        if (allSortBy === 'priceDesc') return b.marketPrice - a.marketPrice;
        if (allSortBy === 'priceAsc') return a.marketPrice - b.marketPrice;
        return 0;
      }

      switch (bondSortBy) {
        case 'ytmDesc':
          return b.ytm - a.ytm;
        case 'couponDesc':
          return b.couponRate - a.couponRate;
        case 'priceAsc':
          return a.marketPrice - b.marketPrice;
        case 'priceDesc':
          return b.marketPrice - a.marketPrice;
        default:
          return 0;
      }
    });

    return list;
  }, [query, bondIssuer, bondRating, bondPayout, bondYTM, bondSortBy, activeAssetType, allSortBy]);

  const totalMatches =
    (allClasses.stocks ? filteredStocks.length : 0) +
    (allClasses.mfs ? filteredMFs.length : 0) +
    (allClasses.etfs ? filteredETFs.length : 0) +
    (allClasses.bonds ? filteredBonds.length : 0);

  // Render Table Components
  const renderStocksTable = (stocks: StockDetail[], isEmbedded = false) => (
    <div className="terminal-card" style={isEmbedded ? { border: '1px solid var(--border-subtle)' } : undefined}>
      {isEmbedded && (
        <div className="terminal-header" style={{ padding: '10px 14px', background: 'var(--bg-subtle)' }}>
          <span className="terminal-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} style={{ color: 'var(--accent-primary)' }} />
            Equities (NSE / BSE) • {stocks.length} matches
          </span>
          <button onClick={() => setActiveAssetType('stocks')} className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}>
            View full equity table <ArrowRight size={12} />
          </button>
        </div>
      )}
      <div className="terminal-table-wrapper">
        <table className="terminal-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Sector</th>
              <th>Market Cap (₹ Cr)</th>
              <th>LTP (₹)</th>
              <th>Day Chg</th>
              <th>P/E</th>
              <th>P/B</th>
              <th>ROE</th>
              <th>ROCE</th>
              <th>D/E</th>
              <th>Beta</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map(s => {
              const live = quotes[s.symbol];
              const price = live ? live.currentPrice : s.currentPrice;
              const dayChg = live ? live.dayChange : s.dayChange;
              const dayPct = live ? live.dayChangePercent : s.dayChangePercent;
              const tickClass = live?.lastTick ? `tick-${live.lastTick}` : '';
              const isExchangeLive = live?.source === 'EXCHANGE_LIVE';

              return (
                <tr
                  key={s.symbol}
                  onClick={() => handleStockClick({ ...s, currentPrice: price, dayChange: dayChg, dayChangePercent: dayPct })}
                  style={{ cursor: 'pointer' }}
                  title="Click to view 5-Year Balance Sheets and Audited Financials"
                >
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {s.symbol}
                        </span>
                        {isExchangeLive && (
                          <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 4px', borderRadius: 3, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-gain)' }}>
                            LIVE
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.name}</span>
                    </div>
                  </td>
                  <td>{s.sector}</td>
                  <td className="tabular-nums">₹{s.marketCap.toLocaleString('en-IN')}</td>
                  <td className={`tabular-nums ${tickClass}`} style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    ₹{price.toFixed(2)}
                  </td>
                  <td className="tabular-nums">
                    <span className={`delta-badge ${dayChg >= 0 ? 'gain' : 'loss'}`}>
                      {formatPercent(dayPct, true)}
                    </span>
                  </td>
                  <td className="tabular-nums">{s.peRatio.toFixed(1)}</td>
                  <td className="tabular-nums">{s.pbRatio.toFixed(1)}</td>
                  <td className="tabular-nums" style={{ color: 'var(--color-gain)', fontWeight: '600' }}>
                    {s.roe.toFixed(1)}%
                  </td>
                  <td className="tabular-nums">{s.roce.toFixed(1)}%</td>
                  <td className="tabular-nums">{s.debtToEquity.toFixed(2)}</td>
                  <td className="tabular-nums">{s.beta.toFixed(2)}</td>
                  <td>
                    <MiniSparkline
                      data={s.history ? s.history['1Y'].slice(-14).map(p => p.close) : [price * 0.95, price]}
                      width={64}
                      height={18}
                      isPositive={dayChg >= 0}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMFsTable = (mfs: MutualFundDetail[], isEmbedded = false) => (
    <div className="terminal-card" style={isEmbedded ? { border: '1px solid var(--border-subtle)' } : undefined}>
      {isEmbedded && (
        <div className="terminal-header" style={{ padding: '10px 14px', background: 'var(--bg-subtle)' }}>
          <span className="terminal-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <PieChart size={14} style={{ color: 'var(--accent-primary)' }} />
            Mutual Funds (Direct) • {mfs.length} matches
          </span>
          <button onClick={() => setActiveAssetType('mfs')} className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}>
            View full mutual fund table <ArrowRight size={12} />
          </button>
        </div>
      )}
      <div className="terminal-table-wrapper">
        <table className="terminal-table">
          <thead>
            <tr>
              <th>Fund Scheme</th>
              <th>Category</th>
              <th>NAV (₹)</th>
              <th>AUM (₹ Cr)</th>
              <th>TER (Expense)</th>
              <th>1Y Return</th>
              <th>3Y CAGR</th>
              <th>5Y CAGR</th>
              <th>Sharpe</th>
              <th>Benchmark</th>
            </tr>
          </thead>
          <tbody>
            {mfs.map(mf => {
              const live = quotes[mf.code];
              const nav = live ? live.currentPrice : mf.nav;
              const isAMFI = live?.source === 'AMFI_LIVE';
              const tickClass = live?.lastTick ? `tick-${live.lastTick}` : '';

              return (
                <tr
                  key={mf.code}
                  onClick={() => handleMFClick({ ...mf, nav })}
                  style={{ cursor: 'pointer' }}
                  title="Click to view detailed fund factsheet"
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{mf.name}</span>
                      {isAMFI && (
                        <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: 3, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-gain)' }}>
                          AMFI LIVE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Manager: {mf.fundManager}</div>
                  </td>
                  <td>{mf.category}</td>
                  <td className={`tabular-nums ${tickClass}`} style={{ fontWeight: '600' }}>₹{nav.toFixed(2)}</td>
                  <td className="tabular-nums">₹{mf.aumCrores.toLocaleString('en-IN')}</td>
                  <td className="tabular-nums">{mf.expenseRatio}%</td>
                  <td className="tabular-nums" style={{ color: 'var(--color-gain)' }}>+{mf.cagr1Y}%</td>
                  <td className="tabular-nums" style={{ color: 'var(--color-gain)' }}>+{mf.cagr3Y}%</td>
                  <td className="tabular-nums" style={{ color: 'var(--color-gain)', fontWeight: '600' }}>+{mf.cagr5Y}%</td>
                  <td className="tabular-nums">{mf.sharpeRatio.toFixed(2)}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mf.benchmark}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderETFsTable = (etfs: ETFDetail[], isEmbedded = false) => (
    <div className="terminal-card" style={isEmbedded ? { border: '1px solid var(--border-subtle)' } : undefined}>
      {isEmbedded && (
        <div className="terminal-header" style={{ padding: '10px 14px', background: 'var(--bg-subtle)' }}>
          <span className="terminal-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={14} style={{ color: 'var(--accent-primary)' }} />
            Exchange Traded Funds (ETFs) • {etfs.length} matches
          </span>
          <button onClick={() => setActiveAssetType('etfs')} className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}>
            View full ETF table <ArrowRight size={12} />
          </button>
        </div>
      )}
      <div className="terminal-table-wrapper">
        <table className="terminal-table">
          <thead>
            <tr>
              <th>ETF Symbol</th>
              <th>Underlying Index / Asset</th>
              <th>Category</th>
              <th>LTP (₹)</th>
              <th>Day Chg</th>
              <th>NAV (₹)</th>
              <th>Premium / Discount</th>
              <th>TER</th>
              <th>AUM (₹ Cr)</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {etfs.map(etf => {
              const live = quotes[etf.symbol];
              const price = live ? live.currentPrice : etf.currentPrice;
              const dayPct = live ? live.dayChangePercent : etf.dayChangePercent;
              const tickClass = live?.lastTick ? `tick-${live.lastTick}` : '';
              const isLive = live?.source === 'EXCHANGE_LIVE';

              return (
                <tr
                  key={etf.symbol}
                  onClick={() => handleETFClick({ ...etf, currentPrice: price })}
                  style={{ cursor: 'pointer' }}
                  title="Click to view detailed ETF factsheet and chart"
                >
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                          {etf.symbol}
                        </span>
                        {isLive && (
                          <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 4px', borderRadius: 3, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-gain)' }}>
                            LIVE
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{etf.name}</span>
                    </div>
                  </td>
                  <td>{etf.underlyingAsset}</td>
                  <td>
                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)' }}>
                      {etf.category}
                    </span>
                  </td>
                  <td className={`tabular-nums ${tickClass}`} style={{ fontWeight: '600' }}>₹{price.toFixed(2)}</td>
                  <td className="tabular-nums">
                    <span className={`delta-badge ${dayPct >= 0 ? 'gain' : 'loss'}`}>
                      {formatPercent(dayPct, true)}
                    </span>
                  </td>
                  <td className="tabular-nums">₹{etf.nav.toFixed(2)}</td>
                  <td className="tabular-nums" style={{ color: etf.premiumDiscountPercent >= 0 ? 'var(--color-gain)' : 'var(--color-loss)' }}>
                    {etf.premiumDiscountPercent >= 0 ? `+${etf.premiumDiscountPercent}% (Fair)` : `${etf.premiumDiscountPercent}% (Discount)`}
                  </td>
                  <td className="tabular-nums">{etf.expenseRatio}%</td>
                  <td className="tabular-nums">₹{etf.aumCrores.toLocaleString('en-IN')} Cr</td>
                  <td>
                    <MiniSparkline
                      data={etf.history ? etf.history['1Y'].slice(-14).map(p => p.close) : [price * 0.96, price]}
                      width={64}
                      height={18}
                      isPositive={dayPct >= 0}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBondsTable = (bonds: BondDetail[], isEmbedded = false) => (
    <div className="terminal-card" style={isEmbedded ? { border: '1px solid var(--border-subtle)' } : undefined}>
      {isEmbedded && (
        <div className="terminal-header" style={{ padding: '10px 14px', background: 'var(--bg-subtle)' }}>
          <span className="terminal-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Landmark size={14} style={{ color: 'var(--accent-primary)' }} />
            Fixed Income & Sovereign Debt • {bonds.length} matches
          </span>
          <button onClick={() => setActiveAssetType('bonds')} className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }}>
            View full debt table <ArrowRight size={12} />
          </button>
        </div>
      )}
      <div className="terminal-table-wrapper">
        <table className="terminal-table">
          <thead>
            <tr>
              <th>Debt Instrument</th>
              <th>Issuer Type</th>
              <th>Credit Rating</th>
              <th>Coupon Rate</th>
              <th>YTM (%)</th>
              <th>Maturity Date</th>
              <th>Price (₹)</th>
              <th>Frequency</th>
            </tr>
          </thead>
          <tbody>
            {bonds.map(b => (
              <tr
                key={b.isin}
                onClick={() => handleBondClick(b)}
                style={{ cursor: 'pointer' }}
                title="Click to view bond maturity and coupon schedule"
              >
                <td>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{b.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ISIN: {b.isin}</div>
                </td>
                <td>{b.issuerType}</td>
                <td>
                  <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)' }}>
                    {b.creditRating}
                  </span>
                </td>
                <td className="tabular-nums" style={{ fontWeight: '600' }}>{b.couponRate.toFixed(2)}%</td>
                <td className="tabular-nums" style={{ color: 'var(--color-gain)', fontWeight: '700' }}>{b.ytm.toFixed(2)}%</td>
                <td className="tabular-nums">{b.maturityDate}</td>
                <td className="tabular-nums">₹{b.marketPrice.toFixed(2)}</td>
                <td>{b.paymentFrequency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Toolbar Renderer: Tab 1 (All Instruments)
  const renderAllFilterToolbar = () => (
    <div className="explorer-filter-toolbar animate-fade-in">
      <div className="filter-controls-row">
        <div className="filter-select-group">
          <label>Display Asset Classes</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setAllClasses(p => ({ ...p, stocks: !p.stocks }))}
              className={`filter-toggle-pill ${allClasses.stocks ? 'active' : ''}`}
              title="Toggle Equities"
            >
              <TrendingUp size={12} /> Equities ({filteredStocks.length})
            </button>
            <button
              type="button"
              onClick={() => setAllClasses(p => ({ ...p, mfs: !p.mfs }))}
              className={`filter-toggle-pill ${allClasses.mfs ? 'active' : ''}`}
              title="Toggle Mutual Funds"
            >
              <PieChart size={12} /> Mutual Funds ({filteredMFs.length})
            </button>
            <button
              type="button"
              onClick={() => setAllClasses(p => ({ ...p, etfs: !p.etfs }))}
              className={`filter-toggle-pill ${allClasses.etfs ? 'active' : ''}`}
              title="Toggle ETFs"
            >
              <Layers size={12} /> ETFs ({filteredETFs.length})
            </button>
            <button
              type="button"
              onClick={() => setAllClasses(p => ({ ...p, bonds: !p.bonds }))}
              className={`filter-toggle-pill ${allClasses.bonds ? 'active' : ''}`}
              title="Toggle Fixed Income"
            >
              <Landmark size={12} /> Fixed Income ({filteredBonds.length})
            </button>
          </div>
        </div>

        <div className="filter-select-group">
          <label>Day Performance</label>
          <select
            value={allPerformance}
            onChange={e => setAllPerformance(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Day Moves</option>
            <option value="gainers">Gainers Only (▲)</option>
            <option value="losers">Losers Only (▼)</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Sort Catalog</label>
          <select
            value={allSortBy}
            onChange={e => setAllSortBy(e.target.value as any)}
            className="filter-select"
          >
            <option value="default">Default Order</option>
            <option value="dayChangeDesc">Day Gainers (Highest %)</option>
            <option value="dayChangeAsc">Day Losers (Lowest %)</option>
            <option value="priceDesc">Price / NAV (High to Low)</option>
            <option value="priceAsc">Price / NAV (Low to High)</option>
          </select>
        </div>

        {allActiveFilterCount > 0 && (
          <button onClick={resetAllFilters} className="filter-reset-btn" title="Reset all filters">
            <RotateCcw size={12} /> Reset ({allActiveFilterCount})
          </button>
        )}
      </div>

      <div className="filter-presets-row">
        <span className="filter-preset-label">
          <Sparkles size={11} style={{ color: 'var(--accent-primary)' }} /> Quick Presets:
        </span>
        <button
          onClick={() => resetAllFilters()}
          className={`preset-chip ${allActiveFilterCount === 0 ? 'active' : ''}`}
        >
          All Assets
        </button>
        <button
          onClick={() => {
            setAllClasses({ stocks: true, mfs: true, etfs: false, bonds: false });
            setAllPerformance('all');
            setAllSortBy('default');
          }}
          className={`preset-chip ${allClasses.stocks && allClasses.mfs && !allClasses.etfs && !allClasses.bonds ? 'active' : ''}`}
        >
          Equities &amp; Mutual Funds
        </button>
        <button
          onClick={() => {
            setAllClasses({ stocks: true, mfs: true, etfs: true, bonds: true });
            setAllPerformance('gainers');
            setAllSortBy('dayChangeDesc');
          }}
          className={`preset-chip ${allPerformance === 'gainers' && allSortBy === 'dayChangeDesc' ? 'active' : ''}`}
        >
          📈 Top Day Gainers
        </button>
        <button
          onClick={() => {
            setAllClasses({ stocks: false, mfs: false, etfs: true, bonds: true });
            setAllPerformance('all');
            setAllSortBy('default');
          }}
          className={`preset-chip ${!allClasses.stocks && !allClasses.mfs && allClasses.etfs && allClasses.bonds ? 'active' : ''}`}
        >
          🏛️ Debt &amp; Commodities
        </button>
      </div>
    </div>
  );

  // Toolbar Renderer: Tab 2 (Equities)
  const renderStocksFilterToolbar = () => (
    <div className="explorer-filter-toolbar animate-fade-in">
      <div className="filter-controls-row">
        <div className="filter-select-group">
          <label>Market Cap</label>
          <select
            value={stockCap}
            onChange={e => {
              setStockCap(e.target.value as any);
              setStockActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All Market Caps</option>
            <option value="Large Cap">Large Cap</option>
            <option value="Mid Cap">Mid Cap</option>
            <option value="Small Cap">Small Cap</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Industry Sector</label>
          <select
            value={stockSector}
            onChange={e => {
              setStockSector(e.target.value);
              setStockActivePreset(null);
            }}
            className="filter-select"
            style={{ maxWidth: 200 }}
          >
            <option value="all">All Sectors ({uniqueStockSectors.length})</option>
            {uniqueStockSectors.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="filter-select-group">
          <label>P/E Valuation</label>
          <select
            value={stockPE}
            onChange={e => {
              setStockPE(e.target.value as any);
              setStockActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All P/E Ratios</option>
            <option value="under25">Value (&lt; 25x)</option>
            <option value="25to45">Moderate (25x - 45x)</option>
            <option value="over45">Growth (&gt; 45x)</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Return on Equity</label>
          <select
            value={stockROE}
            onChange={e => {
              setStockROE(e.target.value as any);
              setStockActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All ROE</option>
            <option value="above15">High ROE (&ge; 15%)</option>
            <option value="above25">Superior ROE (&ge; 25%)</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Debt to Equity</label>
          <select
            value={stockDebt}
            onChange={e => {
              setStockDebt(e.target.value as any);
              setStockActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All Leverage</option>
            <option value="low">Low Debt (D/E &lt; 0.5)</option>
            <option value="zero">Zero Debt (D/E = 0)</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Sort By</label>
          <select
            value={stockSortBy}
            onChange={e => {
              setStockSortBy(e.target.value as any);
              setStockActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="marketCapDesc">Market Cap (High &rarr; Low)</option>
            <option value="dayChangeDesc">Day Change (Top Gainers)</option>
            <option value="dayChangeAsc">Day Change (Top Losers)</option>
            <option value="priceDesc">LTP (High &rarr; Low)</option>
            <option value="priceAsc">LTP (Low &rarr; High)</option>
            <option value="peAsc">P/E Multiple (Lowest First)</option>
            <option value="roeDesc">ROE % (Highest First)</option>
            <option value="betaAsc">Beta (Lowest Volatility)</option>
          </select>
        </div>

        {stockActiveFilterCount > 0 && (
          <button onClick={resetStockFilters} className="filter-reset-btn" title="Reset all equity filters">
            <RotateCcw size={12} /> Reset ({stockActiveFilterCount})
          </button>
        )}
      </div>

      <div className="filter-presets-row">
        <span className="filter-preset-label">
          <Sparkles size={11} style={{ color: 'var(--accent-primary)' }} /> Quick Presets:
        </span>
        <button
          onClick={resetStockFilters}
          className={`preset-chip ${stockActiveFilterCount === 0 ? 'active' : ''}`}
        >
          All Equities
        </button>
        <button
          onClick={() => {
            resetStockFilters();
            setStockCap('Large Cap');
            setStockSortBy('marketCapDesc');
            setStockActivePreset('large_titans');
          }}
          className={`preset-chip ${stockActivePreset === 'large_titans' ? 'active' : ''}`}
        >
          ⚡ Large Cap Titans
        </button>
        <button
          onClick={() => {
            resetStockFilters();
            setStockROE('above25');
            setStockSortBy('roeDesc');
            setStockActivePreset('high_roe');
          }}
          className={`preset-chip ${stockActivePreset === 'high_roe' ? 'active' : ''}`}
        >
          💎 High ROE (&gt;25%)
        </button>
        <button
          onClick={() => {
            resetStockFilters();
            setStockDebt('zero');
            setStockActivePreset('debt_free');
          }}
          className={`preset-chip ${stockActivePreset === 'debt_free' ? 'active' : ''}`}
        >
          🛡️ Debt-Free Balance Sheets
        </button>
        <button
          onClick={() => {
            resetStockFilters();
            setStockSortBy('dayChangeDesc');
            setStockActivePreset('gainers');
          }}
          className={`preset-chip ${stockActivePreset === 'gainers' ? 'active' : ''}`}
        >
          📈 Top Gainers Today
        </button>
        <button
          onClick={() => {
            resetStockFilters();
            setStockPE('under25');
            setStockSortBy('peAsc');
            setStockActivePreset('deep_value');
          }}
          className={`preset-chip ${stockActivePreset === 'deep_value' ? 'active' : ''}`}
        >
          🎯 Deep Value (P/E &lt; 25)
        </button>
      </div>
    </div>
  );

  // Toolbar Renderer: Tab 3 (Mutual Funds)
  const renderMFsFilterToolbar = () => (
    <div className="explorer-filter-toolbar animate-fade-in">
      <div className="filter-controls-row">
        <div className="filter-select-group">
          <label>Fund Category</label>
          <select
            value={mfCategory}
            onChange={e => {
              setMfCategory(e.target.value);
              setMfActivePreset(null);
            }}
            className="filter-select"
            style={{ maxWidth: 200 }}
          >
            <option value="all">All Categories ({uniqueMFCategories.length})</option>
            {uniqueMFCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="filter-select-group">
          <label>Expense Ratio (TER)</label>
          <select
            value={mfTER}
            onChange={e => {
              setMfTER(e.target.value as any);
              setMfActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All Expense Ratios</option>
            <option value="ultra_low">Ultra Low (&lt; 0.3%)</option>
            <option value="low">Low TER (&lt; 0.7%)</option>
            <option value="standard">Standard (&ge; 0.7%)</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Performance Benchmark</label>
          <select
            value={mfReturnHorizon}
            onChange={e => {
              setMfReturnHorizon(e.target.value as any);
              setMfActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All Returns</option>
            <option value="1y_35">1Y Return &ge; 35%</option>
            <option value="3y_20">3Y CAGR &ge; 20%</option>
            <option value="5y_20">5Y CAGR &ge; 20%</option>
            <option value="5y_25">5Y CAGR &ge; 25%</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Risk-Adjusted (Sharpe)</label>
          <select
            value={mfSharpe}
            onChange={e => {
              setMfSharpe(e.target.value as any);
              setMfActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All Risk Profiles</option>
            <option value="above1.2">Moderate Sharpe (&ge; 1.2)</option>
            <option value="above1.5">High Alpha Sharpe (&ge; 1.5)</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Sort By</label>
          <select
            value={mfSortBy}
            onChange={e => {
              setMfSortBy(e.target.value as any);
              setMfActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="aumDesc">AUM Crores (High &rarr; Low)</option>
            <option value="cagr5yDesc">5Y CAGR (Highest First)</option>
            <option value="cagr3yDesc">3Y CAGR (Highest First)</option>
            <option value="cagr1yDesc">1Y Return (Highest First)</option>
            <option value="terAsc">TER Expense (Lowest First)</option>
            <option value="navDesc">NAV (High &rarr; Low)</option>
          </select>
        </div>

        {mfActiveFilterCount > 0 && (
          <button onClick={resetMFFilters} className="filter-reset-btn" title="Reset all mutual fund filters">
            <RotateCcw size={12} /> Reset ({mfActiveFilterCount})
          </button>
        )}
      </div>

      <div className="filter-presets-row">
        <span className="filter-preset-label">
          <Sparkles size={11} style={{ color: 'var(--accent-primary)' }} /> Quick Presets:
        </span>
        <button
          onClick={resetMFFilters}
          className={`preset-chip ${mfActiveFilterCount === 0 ? 'active' : ''}`}
        >
          All Funds
        </button>
        <button
          onClick={() => {
            resetMFFilters();
            setMfReturnHorizon('5y_20');
            setMfSortBy('cagr5yDesc');
            setMfActivePreset('top5y');
          }}
          className={`preset-chip ${mfActivePreset === 'top5y' ? 'active' : ''}`}
        >
          🏆 Top 5Y Wealth Creators (&gt;20% CAGR)
        </button>
        <button
          onClick={() => {
            resetMFFilters();
            setMfTER('ultra_low');
            setMfSortBy('terAsc');
            setMfActivePreset('low_ter');
          }}
          className={`preset-chip ${mfActivePreset === 'low_ter' ? 'active' : ''}`}
        >
          💰 Low TER Index Funds (&lt;0.3%)
        </button>
        <button
          onClick={() => {
            resetMFFilters();
            setMfCategory('Flexi Cap Fund');
            setMfSortBy('cagr3yDesc');
            setMfActivePreset('alpha');
          }}
          className={`preset-chip ${mfActivePreset === 'alpha' ? 'active' : ''}`}
        >
          🚀 Flexi Cap Alpha
        </button>
        <button
          onClick={() => {
            resetMFFilters();
            setMfSharpe('above1.5');
            setMfSortBy('aumDesc');
            setMfActivePreset('high_sharpe');
          }}
          className={`preset-chip ${mfActivePreset === 'high_sharpe' ? 'active' : ''}`}
        >
          🛡️ High Sharpe (&gt;1.5)
        </button>
      </div>
    </div>
  );

  // Toolbar Renderer: Tab 4 (ETFs)
  const renderETFsFilterToolbar = () => (
    <div className="explorer-filter-toolbar animate-fade-in">
      <div className="filter-controls-row">
        <div className="filter-select-group">
          <label>ETF Category</label>
          <select
            value={etfCategory}
            onChange={e => {
              setEtfCategory(e.target.value);
              setEtfActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All ETF Categories</option>
            <option value="Index">Index ETFs</option>
            <option value="Commodity">Commodity (Gold &amp; Silver)</option>
            <option value="Sectoral">Sectoral (Bank &amp; IT)</option>
            <option value="Debt">Debt &amp; Liquid Cash</option>
            <option value="Global">Global Tech</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>NAV Pricing</label>
          <select
            value={etfPricing}
            onChange={e => {
              setEtfPricing(e.target.value as any);
              setEtfActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All Pricing</option>
            <option value="discount">Trading at Discount (&lt; 0%)</option>
            <option value="fair_premium">Fair / Par (&ge; 0%)</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Expense Ratio</label>
          <select
            value={etfExpense}
            onChange={e => {
              setEtfExpense(e.target.value as any);
              setEtfActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All Expense Ratios</option>
            <option value="under0.2">Ultra Low (&lt; 0.2%)</option>
            <option value="under0.5">Low (&lt; 0.5%)</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Sort By</label>
          <select
            value={etfSortBy}
            onChange={e => {
              setEtfSortBy(e.target.value as any);
              setEtfActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="aumDesc">AUM Crores (High &rarr; Low)</option>
            <option value="dayChangeDesc">Day Change (Top Gainers)</option>
            <option value="terAsc">Expense Ratio (Lowest First)</option>
            <option value="priceDesc">LTP (High &rarr; Low)</option>
          </select>
        </div>

        {etfActiveFilterCount > 0 && (
          <button onClick={resetETFFilters} className="filter-reset-btn" title="Reset all ETF filters">
            <RotateCcw size={12} /> Reset ({etfActiveFilterCount})
          </button>
        )}
      </div>

      <div className="filter-presets-row">
        <span className="filter-preset-label">
          <Sparkles size={11} style={{ color: 'var(--accent-primary)' }} /> Quick Presets:
        </span>
        <button
          onClick={resetETFFilters}
          className={`preset-chip ${etfActiveFilterCount === 0 ? 'active' : ''}`}
        >
          All ETFs
        </button>
        <button
          onClick={() => {
            resetETFFilters();
            setEtfCategory('Commodity');
            setEtfSortBy('aumDesc');
            setEtfActivePreset('metals');
          }}
          className={`preset-chip ${etfActivePreset === 'metals' ? 'active' : ''}`}
        >
          🥇 Gold &amp; Silver Commodities
        </button>
        <button
          onClick={() => {
            resetETFFilters();
            setEtfCategory('Index');
            setEtfSortBy('aumDesc');
            setEtfActivePreset('broad_index');
          }}
          className={`preset-chip ${etfActivePreset === 'broad_index' ? 'active' : ''}`}
        >
          📊 Core Index BeES
        </button>
        <button
          onClick={() => {
            resetETFFilters();
            setEtfCategory('Global');
            setEtfSortBy('aumDesc');
            setEtfActivePreset('global_tech');
          }}
          className={`preset-chip ${etfActivePreset === 'global_tech' ? 'active' : ''}`}
        >
          🌐 Global Tech (Nasdaq 100)
        </button>
        <button
          onClick={() => {
            resetETFFilters();
            setEtfCategory('Debt');
            setEtfSortBy('aumDesc');
            setEtfActivePreset('liquid');
          }}
          className={`preset-chip ${etfActivePreset === 'liquid' ? 'active' : ''}`}
        >
          💧 Liquid Cash (Overnight Yield)
        </button>
      </div>
    </div>
  );

  // Toolbar Renderer: Tab 5 (Fixed Income & Bonds)
  const renderBondsFilterToolbar = () => (
    <div className="explorer-filter-toolbar animate-fade-in">
      <div className="filter-controls-row">
        <div className="filter-select-group">
          <label>Issuer Type</label>
          <select
            value={bondIssuer}
            onChange={e => {
              setBondIssuer(e.target.value);
              setBondActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All Issuer Types</option>
            {uniqueBondIssuers.map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>

        <div className="filter-select-group">
          <label>Credit Rating</label>
          <select
            value={bondRating}
            onChange={e => {
              setBondRating(e.target.value);
              setBondActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All Ratings</option>
            {uniqueBondRatings.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="filter-select-group">
          <label>Coupon Frequency</label>
          <select
            value={bondPayout}
            onChange={e => {
              setBondPayout(e.target.value);
              setBondActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All Frequencies</option>
            <option value="Annual">Annual</option>
            <option value="Semi-Annual">Semi-Annual</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Yield to Maturity (YTM)</label>
          <select
            value={bondYTM}
            onChange={e => {
              setBondYTM(e.target.value as any);
              setBondActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="all">All Yields</option>
            <option value="above7.0">YTM &ge; 7.0%</option>
            <option value="above7.5">YTM &ge; 7.5%</option>
            <option value="above8.0">High Yield (&ge; 8.0%)</option>
          </select>
        </div>

        <div className="filter-select-group">
          <label>Sort By</label>
          <select
            value={bondSortBy}
            onChange={e => {
              setBondSortBy(e.target.value as any);
              setBondActivePreset(null);
            }}
            className="filter-select"
          >
            <option value="ytmDesc">YTM Yield (Highest First)</option>
            <option value="couponDesc">Coupon Rate (Highest First)</option>
            <option value="priceAsc">Market Price (Lowest First)</option>
            <option value="priceDesc">Market Price (Highest First)</option>
          </select>
        </div>

        {bondActiveFilterCount > 0 && (
          <button onClick={resetBondFilters} className="filter-reset-btn" title="Reset all debt filters">
            <RotateCcw size={12} /> Reset ({bondActiveFilterCount})
          </button>
        )}
      </div>

      <div className="filter-presets-row">
        <span className="filter-preset-label">
          <Sparkles size={11} style={{ color: 'var(--accent-primary)' }} /> Quick Presets:
        </span>
        <button
          onClick={resetBondFilters}
          className={`preset-chip ${bondActiveFilterCount === 0 ? 'active' : ''}`}
        >
          All Debt
        </button>
        <button
          onClick={() => {
            resetBondFilters();
            setBondIssuer('Sovereign');
            setBondSortBy('ytmDesc');
            setBondActivePreset('sovereign_sgb');
          }}
          className={`preset-chip ${bondActivePreset === 'sovereign_sgb' ? 'active' : ''}`}
        >
          🏛️ Sovereign &amp; SGB (Govt. Backed)
        </button>
        <button
          onClick={() => {
            resetBondFilters();
            setBondRating('CRISIL AAA');
            setBondSortBy('ytmDesc');
            setBondActivePreset('aaa_corp');
          }}
          className={`preset-chip ${bondActivePreset === 'aaa_corp' ? 'active' : ''}`}
        >
          🏢 CRISIL AAA Rated Corporate PSUs
        </button>
        <button
          onClick={() => {
            resetBondFilters();
            setBondYTM('above7.5');
            setBondSortBy('ytmDesc');
            setBondActivePreset('high_yield');
          }}
          className={`preset-chip ${bondActivePreset === 'high_yield' ? 'active' : ''}`}
        >
          📈 Highest YTM (&gt;7.5%)
        </button>
        <button
          onClick={() => {
            resetBondFilters();
            setBondPayout('Semi-Annual');
            setBondSortBy('ytmDesc');
            setBondActivePreset('semi_annual');
          }}
          className={`preset-chip ${bondActivePreset === 'semi_annual' ? 'active' : ''}`}
        >
          📅 Regular Semi-Annual Income
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header & Global Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Asset Explorer</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Live Exchange Quotes (NSE / BSE), Official AMFI Daily NAVs &amp; Factual Disclosures
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: '1 1 320px', justifyContent: 'flex-end' }}>
          {/* Refresh Live Exchange Feed Button */}
          <button
            onClick={() => syncAll(true)}
            disabled={tickerState.isExchangeSyncing || tickerState.isAmfiSyncing}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px', gap: 5 }}
            title="Fetch real-time LTP from NSE / BSE & AMFI"
          >
            <RefreshCw size={12} className={tickerState.isExchangeSyncing || tickerState.isAmfiSyncing ? 'animate-spin' : ''} />
            <span>{tickerState.isExchangeSyncing ? 'Syncing Live...' : 'Refresh Live Prices'}</span>
          </button>

          {/* Search Bar */}
          <div style={{ position: 'relative', minWidth: 260, flex: '1 1 260px', maxWidth: 440 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search ANY stock, ETF, mutual fund (e.g. Trent, Suzlon, HDFC, Gold)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ width: '100%', paddingLeft: 30, paddingRight: searchTerm ? 30 : 12, height: 34, fontSize: '12px' }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 2
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Asset Category Tabs with Dynamic Match Badges */}
      <div className="tabs-bar">
        <button
          onClick={() => setActiveAssetType('all')}
          className={`tab-btn ${activeAssetType === 'all' ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <span>All Instruments ({totalMatches})</span>
          {allActiveFilterCount > 0 && <span className="filter-active-count">{allActiveFilterCount}</span>}
        </button>
        <button
          onClick={() => setActiveAssetType('stocks')}
          className={`tab-btn ${activeAssetType === 'stocks' ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <span>Equities ({filteredStocks.length})</span>
          {stockActiveFilterCount > 0 && <span className="filter-active-count">{stockActiveFilterCount}</span>}
        </button>
        <button
          onClick={() => setActiveAssetType('mfs')}
          className={`tab-btn ${activeAssetType === 'mfs' ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <span>Mutual Funds ({filteredMFs.length})</span>
          {mfActiveFilterCount > 0 && <span className="filter-active-count">{mfActiveFilterCount}</span>}
        </button>
        <button
          onClick={() => setActiveAssetType('etfs')}
          className={`tab-btn ${activeAssetType === 'etfs' ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <span>ETFs ({filteredETFs.length})</span>
          {etfActiveFilterCount > 0 && <span className="filter-active-count">{etfActiveFilterCount}</span>}
        </button>
        <button
          onClick={() => setActiveAssetType('bonds')}
          className={`tab-btn ${activeAssetType === 'bonds' ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <span>Fixed Income &amp; Sovereign Debt ({filteredBonds.length})</span>
          {bondActiveFilterCount > 0 && <span className="filter-active-count">{bondActiveFilterCount}</span>}
        </button>
      </div>

      {/* Dynamic Tab-Specific Filter Toolbar */}
      {activeAssetType === 'all' && renderAllFilterToolbar()}
      {activeAssetType === 'stocks' && renderStocksFilterToolbar()}
      {activeAssetType === 'mfs' && renderMFsFilterToolbar()}
      {activeAssetType === 'etfs' && renderETFsFilterToolbar()}
      {activeAssetType === 'bonds' && renderBondsFilterToolbar()}

      {/* LIVE MARKET REGISTRY SEARCH RESULTS SECTION (NSE / BSE / AMFI) */}
      {query.length >= 2 && (
        <div className="terminal-card" style={{ border: '1px solid var(--accent-border)', background: 'var(--bg-surface)' }}>
          <div className="terminal-header" style={{ padding: '10px 14px', background: 'var(--bg-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={15} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <span style={{ fontWeight: '700', fontSize: '13px' }}>
                  Live Indian Market Registry Search (NSE / BSE / AMFI)
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 8 }}>
                  {isSearchingLive ? 'Scanning live exchange feeds...' : `${liveRegistryResults.length} real-time instruments found for "${searchTerm}"`}
                </span>
              </div>
            </div>
            {isSearchingLive && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', color: 'var(--accent-primary)' }}>
                <RefreshCw size={11} className="animate-spin" /> Scanning
              </span>
            )}
          </div>

          {liveRegistryResults.length > 0 ? (
            <div className="terminal-table-wrapper">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Security / Scheme</th>
                    <th>Exchange</th>
                    <th>Type</th>
                    <th>Live Price / NAV (₹)</th>
                    <th>Day Change</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {liveRegistryResults.map(item => {
                    const isAdded = addedSymbols.includes(item.symbol);
                    const isGain = (item.dayChangePercent || 0) >= 0;

                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => handleLiveResultClick(item)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view full factual factsheet with live chart"
                      >
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                                {item.symbol}
                              </span>
                              <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: 3, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-gain)' }}>
                                LIVE FEED
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.name}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)' }}>
                            {item.exchange}
                          </span>
                        </td>
                        <td>
                          <span className={`asset-pill ${item.type === 'MUTUAL_FUND' ? 'mf' : item.type === 'ETF' ? 'etf' : 'equity'}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="tabular-nums" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                          {item.livePrice ? `₹${item.livePrice.toFixed(2)}` : 'Fetching...'}
                        </td>
                        <td className="tabular-nums">
                          {item.dayChangePercent !== undefined ? (
                            <span className={`delta-badge ${isGain ? 'gain' : 'loss'}`}>
                              {formatPercent(item.dayChangePercent, true)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleLiveResultClick(item)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '10px', padding: '3px 8px', gap: 4 }}
                            >
                              <Sparkles size={10} /> Inspect
                            </button>
                            <button
                              onClick={(e) => handleAddToVault(item, e)}
                              disabled={isAdded}
                              className={`btn ${isAdded ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                              style={{ fontSize: '10px', padding: '3px 8px', gap: 4 }}
                            >
                              {isAdded ? <><Check size={10} /> In Vault</> : <><Plus size={10} /> Add to Vault</>}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : !isSearchingLive ? (
            <div style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No additional external exchange instruments found for &ldquo;{searchTerm}&rdquo;. Check the local catalog tables below.
            </div>
          ) : null}
        </div>
      )}

      {/* Global No Results Found in Local Catalog */}
      {totalMatches === 0 && liveRegistryResults.length === 0 && !isSearchingLive && (
        <div className="terminal-card" style={{ padding: 40, textAlign: 'center' }}>
          <Search size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 6 }}>No Instruments Found</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 16px auto' }}>
            No equities, mutual funds, ETFs, or sovereign debt instruments matched &ldquo;{searchTerm}&rdquo;.
          </p>
          <button onClick={() => setSearchTerm('')} className="btn btn-secondary btn-sm">
            Clear Search Filter
          </button>
        </div>
      )}

      {/* View: All Instruments Consolidated Search */}
      {activeAssetType === 'all' && totalMatches > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {allClasses.stocks && filteredStocks.length > 0 && renderStocksTable(filteredStocks, true)}
          {allClasses.mfs && filteredMFs.length > 0 && renderMFsTable(filteredMFs, true)}
          {allClasses.etfs && filteredETFs.length > 0 && renderETFsTable(filteredETFs, true)}
          {allClasses.bonds && filteredBonds.length > 0 && renderBondsTable(filteredBonds, true)}
        </div>
      )}

      {/* View: Equities Only */}
      {activeAssetType === 'stocks' && (
        filteredStocks.length > 0 ? (
          renderStocksTable(filteredStocks, false)
        ) : (
          <div className="terminal-card" style={{ padding: 40, textAlign: 'center' }}>
            <Filter size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 6 }}>No Equities Match Filter Criteria</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 16px auto' }}>
              No companies matched your active sector, market cap, or valuation filters. Try clearing some criteria to expand your results.
            </p>
            <button onClick={resetStockFilters} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
              <RotateCcw size={12} /> Clear Equities Filters
            </button>
          </div>
        )
      )}

      {/* View: Mutual Funds Only */}
      {activeAssetType === 'mfs' && (
        filteredMFs.length > 0 ? (
          renderMFsTable(filteredMFs, false)
        ) : (
          <div className="terminal-card" style={{ padding: 40, textAlign: 'center' }}>
            <Filter size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 6 }}>No Mutual Funds Match Criteria</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 16px auto' }}>
              No mutual funds matched your active category, TER, or return horizon filters. Try resetting filters to view all funds.
            </p>
            <button onClick={resetMFFilters} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
              <RotateCcw size={12} /> Clear Mutual Fund Filters
            </button>
          </div>
        )
      )}

      {/* View: ETFs Only */}
      {activeAssetType === 'etfs' && (
        filteredETFs.length > 0 ? (
          renderETFsTable(filteredETFs, false)
        ) : (
          <div className="terminal-card" style={{ padding: 40, textAlign: 'center' }}>
            <Filter size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 6 }}>No ETFs Match Criteria</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 16px auto' }}>
              No exchange traded funds matched your active category or valuation filters. Try resetting filters to view all ETFs.
            </p>
            <button onClick={resetETFFilters} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
              <RotateCcw size={12} /> Clear ETF Filters
            </button>
          </div>
        )
      )}

      {/* View: Bonds Only */}
      {activeAssetType === 'bonds' && (
        filteredBonds.length > 0 ? (
          renderBondsTable(filteredBonds, false)
        ) : (
          <div className="terminal-card" style={{ padding: 40, textAlign: 'center' }}>
            <Filter size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: 6 }}>No Debt Instruments Match Criteria</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 16px auto' }}>
              No fixed income or sovereign debt securities matched your active rating or yield filters. Try resetting filters to view all debt instruments.
            </p>
            <button onClick={resetBondFilters} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
              <RotateCcw size={12} /> Clear Debt Filters
            </button>
          </div>
        )
      )}

      {/* Compliance Disclaimer */}
      <div className="compliance-notice">
        <ShieldCheck size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
        <div>
          <strong>Non-Intermediary Analytics:</strong> KoshQ displays factual corporate metrics, historical NAVs, and live exchange data across all asset classes. It does not provide buy/sell signals, analyst ratings, target prices, or broker order execution.
        </div>
      </div>
    </div>
  );
};

