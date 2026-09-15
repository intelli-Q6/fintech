// Institutional Market Data Service & Real-Time Ticker Engine for KoshQ
// Manages live equity, ETF, mutual fund, and macro indicator quotes with real-time exchange feeds (Yahoo Finance) and AMFI sync

import { amfiService, KNOWN_AMFI_SCHEME_CODES } from '../api/amfiService';
import { liveMarketApi } from '../api/liveMarketApi';
import { DEMO_STOCKS, DEMO_ETFS, DEMO_BONDS, DEMO_MUTUAL_FUNDS, DEFAULT_MACRO_CATALOG } from '../../data/demoData';

export interface LiveInstrumentQuote {
  id: string;
  symbol: string;
  name: string;
  assetClass: 'equity' | 'etf' | 'mutual_fund' | 'bond' | 'macro';
  currentPrice: number;
  previousClose: number;
  dayChange: number;
  dayChangePercent: number;
  lastTick: 'up' | 'down' | null;
  lastUpdated: number;
  source: 'EXCHANGE_LIVE' | 'AMFI_LIVE' | 'MARKET_SIM' | 'REFERENCE';
}

export type MarketSessionPhase = 'PRE_OPEN' | 'LIVE_TRADING' | 'POST_CLOSE' | 'CLOSED_REPLAY';

export interface MarketSessionInfo {
  phase: MarketSessionPhase;
  phaseLabel: string;
  isMarketOpen: boolean;
  istTime: string;
}

export type QuoteSubscriber = (quotes: Record<string, LiveInstrumentQuote>) => void;

class MarketDataService {
  private quotes: Record<string, LiveInstrumentQuote> = {};
  private subscribers: Set<QuoteSubscriber> = new Set();
  private timer: any = null;
  private isPaused: boolean = false;
  private tickIntervalMs: number = 3500;
  private isAmfiSyncing: boolean = false;
  private isExchangeSyncing: boolean = false;
  private lastSyncTime: number | null = null;
  private lastAmfiSyncTime: number | null = null;
  private lastExchangeSyncTime: number | null = null;

  constructor() {
    this.initializeQuotes();
    this.startTicker();
    // Fetch initial live quotes and AMFI NAVs in the background
    this.syncAllFeeds().catch(() => {});
  }

  // Calculate IST Market Hours Phase (9:15 AM - 3:30 PM IST, Mon-Fri)
  public getMarketSessionInfo(): MarketSessionInfo {
    const now = new Date();
    // Convert to IST (UTC + 5:30)
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istTime = new Date(utcTime + 5.5 * 3600000);

    const day = istTime.getDay(); // 0 = Sun, 6 = Sat
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const timeMinutes = hours * 60 + minutes;

    const timeStr = istTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const isWeekday = day >= 1 && day <= 5;

    if (!isWeekday) {
      return {
        phase: 'CLOSED_REPLAY',
        phaseLabel: 'Weekend • Simulated Replay',
        isMarketOpen: false,
        istTime: timeStr
      };
    }

    if (timeMinutes >= 9 * 60 && timeMinutes < 9 * 60 + 15) {
      return {
        phase: 'PRE_OPEN',
        phaseLabel: 'Pre-Open Session (09:00 - 09:15 IST)',
        isMarketOpen: false,
        istTime: timeStr
      };
    }

    if (timeMinutes >= 9 * 60 + 15 && timeMinutes < 15 * 60 + 30) {
      return {
        phase: 'LIVE_TRADING',
        phaseLabel: 'NSE/BSE Regular Trading Live',
        isMarketOpen: true,
        istTime: timeStr
      };
    }

    if (timeMinutes >= 15 * 60 + 30 && timeMinutes < 16 * 60) {
      return {
        phase: 'POST_CLOSE',
        phaseLabel: 'Post-Market Settlement',
        isMarketOpen: false,
        istTime: timeStr
      };
    }

    return {
      phase: 'CLOSED_REPLAY',
      phaseLabel: 'Off-Market • Simulated Replay',
      isMarketOpen: false,
      istTime: timeStr
    };
  }

  // Seed baseline quotes
  private initializeQuotes(): void {
    // 1. Stocks
    DEMO_STOCKS.forEach(s => {
      const prev = s.currentPrice - s.dayChange;
      this.quotes[s.symbol] = {
        id: `stock-${s.symbol}`,
        symbol: s.symbol,
        name: s.name,
        assetClass: 'equity',
        currentPrice: s.currentPrice,
        previousClose: prev > 0 ? prev : s.currentPrice,
        dayChange: s.dayChange,
        dayChangePercent: s.dayChangePercent,
        lastTick: null,
        lastUpdated: Date.now(),
        source: 'REFERENCE'
      };
    });

    // 2. ETFs
    DEMO_ETFS.forEach(etf => {
      const prev = etf.currentPrice / (1 + etf.dayChangePercent / 100);
      this.quotes[etf.symbol] = {
        id: `etf-${etf.symbol}`,
        symbol: etf.symbol,
        name: etf.name,
        assetClass: 'etf',
        currentPrice: etf.currentPrice,
        previousClose: prev,
        dayChange: Math.round((etf.currentPrice - prev) * 100) / 100,
        dayChangePercent: etf.dayChangePercent,
        lastTick: null,
        lastUpdated: Date.now(),
        source: 'REFERENCE'
      };
    });

    // 3. Mutual Funds
    DEMO_MUTUAL_FUNDS.forEach(mf => {
      this.quotes[mf.code] = {
        id: `mf-${mf.code}`,
        symbol: mf.code,
        name: mf.name,
        assetClass: 'mutual_fund',
        currentPrice: mf.nav,
        previousClose: mf.nav / (1 + mf.dayChangePercent / 100),
        dayChange: Math.round((mf.nav * (mf.dayChangePercent / 100)) * 100) / 100,
        dayChangePercent: mf.dayChangePercent,
        lastTick: null,
        lastUpdated: Date.now(),
        source: 'REFERENCE'
      };
    });

    // 4. Macro Tickers
    DEFAULT_MACRO_CATALOG.forEach(m => {
      const numericVal = parseFloat(m.value.replace(/[^0-9.]/g, '')) || 100;
      const numChange = parseFloat(m.change.replace(/[^0-9.-]/g, '')) || 0;
      this.quotes[m.symbol] = {
        id: `macro-${m.symbol}`,
        symbol: m.symbol,
        name: m.name,
        assetClass: 'macro',
        currentPrice: numericVal,
        previousClose: numericVal - numChange,
        dayChange: numChange,
        dayChangePercent: numericVal > 0 ? (numChange / numericVal) * 100 : 0,
        lastTick: null,
        lastUpdated: Date.now(),
        source: 'REFERENCE'
      };
    });
  }

  // Subscribe to quote stream
  public subscribe(callback: QuoteSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.quotes);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Broadcast to all active subscribers
  private notifySubscribers(): void {
    const copy = { ...this.quotes };
    this.subscribers.forEach(sub => {
      try {
        sub(copy);
      } catch (err) {
        console.error('Error notifying quote subscriber', err);
      }
    });
  }

  // Start continuous tick generation
  public startTicker(): void {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      if (this.isPaused) return;
      this.executeTick();
    }, this.tickIntervalMs);
  }

  // Execute 1 simulated market tick cycle
  private executeTick(): void {
    const symbols = Object.keys(this.quotes).filter(s => {
      const q = this.quotes[s];
      // Do not tick AMFI mutual funds during trading, as NAVs update once daily
      return q.source !== 'AMFI_LIVE';
    });

    if (symbols.length === 0) return;

    // Pick 1 to 3 random instruments to fluctuate
    const tickCount = Math.floor(Math.random() * 3) + 1;
    const chosenSymbols = new Set<string>();
    while (chosenSymbols.size < tickCount && chosenSymbols.size < symbols.length) {
      const randIndex = Math.floor(Math.random() * symbols.length);
      chosenSymbols.add(symbols[randIndex]);
    }

    chosenSymbols.forEach(sym => {
      const q = this.quotes[sym];
      if (!q) return;

      // Realistic Brownian micro-delta (-0.20% to +0.20%)
      const deltaPercent = (Math.random() * 0.4 - 0.19) / 100;
      const newPrice = Math.max(0.01, q.currentPrice * (1 + deltaPercent));
      const diff = newPrice - q.previousClose;
      const totalPct = q.previousClose > 0 ? (diff / q.previousClose) * 100 : 0;
      const direction: 'up' | 'down' = newPrice >= q.currentPrice ? 'up' : 'down';

      // Decimal precision: 2 decimals, or 4 for currency/yields
      const precision = sym.includes('USD') || sym.includes('YIELD') ? 4 : 2;
      const roundedPrice = parseFloat(newPrice.toFixed(precision));

      this.quotes[sym] = {
        ...q,
        currentPrice: roundedPrice,
        dayChange: parseFloat(diff.toFixed(precision)),
        dayChangePercent: parseFloat(totalPct.toFixed(2)),
        lastTick: direction,
        lastUpdated: Date.now()
      };
    });

    this.notifySubscribers();

    // Clear tick animation indicator after 900ms
    setTimeout(() => {
      chosenSymbols.forEach(sym => {
        if (this.quotes[sym] && this.quotes[sym].lastTick !== null) {
          this.quotes[sym] = {
            ...this.quotes[sym],
            lastTick: null
          };
        }
      });
      this.notifySubscribers();
    }, 900);
  }

  // Synchronize Live Exchange Quotes for Stocks, ETFs & Macro Indices
  public async syncExchangeQuotes(symbolsToSync?: string[]): Promise<void> {
    if (this.isExchangeSyncing) return;
    this.isExchangeSyncing = true;
    this.notifySubscribers();

    try {
      const targetSymbols = symbolsToSync && symbolsToSync.length > 0
        ? symbolsToSync
        : Object.keys(this.quotes).filter(k => {
            const q = this.quotes[k];
            return q.assetClass === 'equity' || q.assetClass === 'etf' || q.assetClass === 'macro';
          });

      // Fetch live quotes via liveMarketApi
      await Promise.all(
        targetSymbols.map(async sym => {
          try {
            const live = await liveMarketApi.fetchLiveQuote(sym, true);
            if (live && live.currentPrice > 0) {
              const old = this.quotes[sym] || this.quotes[live.symbol];
              const direction = old && live.currentPrice >= old.currentPrice ? 'up' : 'down';
              const targetKey = this.quotes[sym] ? sym : live.symbol;

              this.quotes[targetKey] = {
                id: old?.id || `live-${live.symbol}`,
                symbol: live.symbol,
                name: live.name || old?.name || live.symbol,
                assetClass: old?.assetClass || 'equity',
                currentPrice: live.currentPrice,
                previousClose: live.previousClose,
                dayChange: live.dayChange,
                dayChangePercent: live.dayChangePercent,
                lastTick: direction,
                lastUpdated: Date.now(),
                source: 'EXCHANGE_LIVE'
              };
            }
          } catch {}
        })
      );

      this.lastSyncTime = Date.now();
      this.lastExchangeSyncTime = Date.now();
    } catch (e) {
      console.warn('Exchange sync error', e);
    } finally {
      this.isExchangeSyncing = false;
      this.notifySubscribers();
    }
  }

  // Synchronize Live Mutual Fund NAVs from official AMFI
  public async syncAMFINAVs(force = false): Promise<void> {
    if (this.isAmfiSyncing) return;
    this.isAmfiSyncing = true;
    this.notifySubscribers();

    try {
      const results = await amfiService.syncAllKnownSchemes(force);

      // Update mapped mutual fund quotes with live AMFI data
      Object.entries(KNOWN_AMFI_SCHEME_CODES).forEach(([internalKey, schemeCode]) => {
        const amfiData = results[schemeCode];
        if (amfiData && this.quotes[internalKey]) {
          const old = this.quotes[internalKey];
          const direction = amfiData.nav >= old.currentPrice ? 'up' : 'down';
          this.quotes[internalKey] = {
            ...old,
            currentPrice: amfiData.nav,
            previousClose: amfiData.previousNav,
            dayChange: amfiData.dayChange,
            dayChangePercent: amfiData.dayChangePercent,
            lastTick: direction,
            lastUpdated: Date.now(),
            source: 'AMFI_LIVE'
          };
        }
      });

      this.lastSyncTime = Date.now();
      this.lastAmfiSyncTime = Date.now();
    } catch (e) {
      console.warn('AMFI sync error', e);
    } finally {
      this.isAmfiSyncing = false;
      this.notifySubscribers();
    }
  }

  // Sync all live feeds (Exchange + AMFI)
  public async syncAllFeeds(force = true): Promise<void> {
    await Promise.all([
      this.syncExchangeQuotes(),
      this.syncAMFINAVs(force)
    ]);
  }

  // Register a newly searched live instrument into the active workstation quote stream
  public registerLiveInstrument(
    symbol: string,
    name: string,
    assetClass: 'equity' | 'etf' | 'mutual_fund' | 'bond',
    price: number,
    dayChange = 0,
    dayChangePercent = 0
  ): LiveInstrumentQuote {
    const cleanSym = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
    const existing = this.quotes[cleanSym];
    if (existing) return existing;

    const prev = price - dayChange;
    const newQuote: LiveInstrumentQuote = {
      id: `${assetClass}-${cleanSym}`,
      symbol: cleanSym,
      name,
      assetClass,
      currentPrice: price,
      previousClose: prev > 0 ? prev : price,
      dayChange,
      dayChangePercent,
      lastTick: null,
      lastUpdated: Date.now(),
      source: 'EXCHANGE_LIVE'
    };

    this.quotes[cleanSym] = newQuote;
    this.notifySubscribers();
    return newQuote;
  }

  // Ticker Controls
  public pauseTicker(): void {
    this.isPaused = true;
    this.notifySubscribers();
  }

  public resumeTicker(): void {
    this.isPaused = false;
    this.notifySubscribers();
  }

  public toggleTicker(): boolean {
    this.isPaused = !this.isPaused;
    this.notifySubscribers();
    return !this.isPaused;
  }

  public setTickSpeed(intervalMs: number): void {
    this.tickIntervalMs = Math.max(1000, intervalMs);
    this.startTicker();
  }

  public getTickerState() {
    return {
      isPaused: this.isPaused,
      tickIntervalMs: this.tickIntervalMs,
      isAmfiSyncing: this.isAmfiSyncing,
      isExchangeSyncing: this.isExchangeSyncing,
      lastSyncTime: this.lastSyncTime,
      lastAmfiSyncTime: this.lastAmfiSyncTime,
      lastExchangeSyncTime: this.lastExchangeSyncTime,
      totalQuotes: Object.keys(this.quotes).length
    };
  }

  public getQuote(symbol: string): LiveInstrumentQuote | undefined {
    return this.quotes[symbol] || this.quotes[symbol.replace(/\.(NS|BO)$/, '')];
  }

  public getAllQuotes(): Record<string, LiveInstrumentQuote> {
    return { ...this.quotes };
  }
}

export const marketDataService = new MarketDataService();
