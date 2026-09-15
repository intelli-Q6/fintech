// KoshQ Market Data Abstraction Layer
// Decouples the application domain model from specific market data vendors (Section 24 mandate)

import { HistoricalPricePoint } from '../../data/types';

export interface MarketQuote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  open?: number;
  high?: number;
  low?: number;
  high52W?: number;
  low52W?: number;
  volume?: number;
  currency: string;
  timestamp: string;
}

export interface CanonicalInstrument {
  isin?: string;
  symbol: string;
  name: string;
  exchange: string;
  assetClass: 'equity' | 'mutual_fund' | 'etf' | 'bond' | 'gold' | 'govt_scheme' | 'cash';
  currency: string;
}

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketQuote | null>;
  getQuotes(symbols: string[]): Promise<Map<string, MarketQuote>>;
  getHistoricalPrices(symbol: string, range?: string, interval?: string): Promise<HistoricalPricePoint[]>;
  searchInstruments(query: string): Promise<CanonicalInstrument[]>;
}

/**
 * Yahoo Finance Edge Provider Adapter
 * Connects through the Vercel serverless proxy with Edge CDN caching (15-45s)
 */
export class YahooFinanceAdapter implements MarketDataProvider {
  private cache = new Map<string, { quote: MarketQuote; fetchedAt: number }>();
  private readonly CACHE_TTL_MS = 15000; // 15 seconds client cache

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL_MS) {
      return cached.quote;
    }

    try {
      const res = await fetch(`/api/quote?ticker=${encodeURIComponent(symbol)}&range=1d&interval=1m`);
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) return null;

      const regularPrice = meta.regularMarketPrice ?? 0;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? regularPrice;
      const change = regularPrice - prevClose;
      const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

      const quote: MarketQuote = {
        symbol: meta.symbol || symbol,
        name: meta.longName || meta.shortName || symbol,
        price: regularPrice,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        open: meta.regularMarketOpen,
        high: meta.regularMarketDayHigh,
        low: meta.regularMarketDayLow,
        high52W: meta.fiftyTwoWeekHigh,
        low52W: meta.fiftyTwoWeekLow,
        volume: meta.regularMarketVolume,
        currency: meta.currency || 'INR',
        timestamp: new Date().toISOString()
      };

      this.cache.set(symbol, { quote, fetchedAt: Date.now() });
      return quote;
    } catch (e) {
      console.warn(`[MarketDataProvider] Error fetching quote for ${symbol}:`, e);
      return null;
    }
  }

  async getQuotes(symbols: string[]): Promise<Map<string, MarketQuote>> {
    const results = new Map<string, MarketQuote>();
    const promises = symbols.map(async sym => {
      const q = await this.getQuote(sym);
      if (q) results.set(sym, q);
    });
    await Promise.allSettled(promises);
    return results;
  }

  async getHistoricalPrices(symbol: string, range = '1mo', interval = '1d'): Promise<HistoricalPricePoint[]> {
    try {
      const res = await fetch(`/api/quote?ticker=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`);
      if (!res.ok) return [];
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) return [];

      const timestamps: number[] = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};
      const opens = quotes.open || [];
      const highs = quotes.high || [];
      const lows = quotes.low || [];
      const closes = quotes.close || [];
      const volumes = quotes.volume || [];

      const points: HistoricalPricePoint[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] != null && !isNaN(closes[i])) {
          const d = new Date(timestamps[i] * 1000);
          points.push({
            date: d.toISOString().split('T')[0],
            open: Math.round((opens[i] ?? closes[i]) * 100) / 100,
            high: Math.round((highs[i] ?? closes[i]) * 100) / 100,
            low: Math.round((lows[i] ?? closes[i]) * 100) / 100,
            close: Math.round(closes[i] * 100) / 100,
            volume: volumes[i] ?? 0
          });
        }
      }
      return points;
    } catch (e) {
      console.warn(`[MarketDataProvider] Error fetching candles for ${symbol}:`, e);
      return [];
    }
  }

  async searchInstruments(query: string): Promise<CanonicalInstrument[]> {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const data = await res.json();
      const quotes = data?.quotes || [];

      return quotes.map((q: any) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchange || 'NSE',
        assetClass: q.quoteType === 'MUTUALFUND' ? 'mutual_fund' : q.quoteType === 'ETF' ? 'etf' : 'equity',
        currency: 'INR'
      }));
    } catch (e) {
      console.warn('[MarketDataProvider] Search failed:', e);
      return [];
    }
  }
}

// Global default provider
export const defaultMarketProvider = new YahooFinanceAdapter();
