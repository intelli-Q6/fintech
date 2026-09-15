// Live Indian Market Data API Client (NSE / BSE / AMFI)
// Connects to live exchange feeds via Yahoo Finance (with Vite dev proxy / CORS fallbacks) & AMFI API

export interface LiveMarketQuote {
  symbol: string;           // e.g. "RELIANCE", "HDFCBANK", "NIFTYBEES"
  fullTicker: string;       // e.g. "RELIANCE.NS"
  name: string;
  exchange: 'NSE' | 'BSE' | 'INDEX' | 'AMFI';
  currentPrice: number;
  previousClose: number;
  dayChange: number;
  dayChangePercent: number;
  dayHigh?: number;
  dayLow?: number;
  high52W?: number;
  low52W?: number;
  volume?: number;
  currency: string;
  lastUpdated: number;
  history?: number[];
}

export interface LiveMarketSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: 'EQUITY' | 'ETF' | 'MUTUAL_FUND' | 'INDEX';
  isin?: string;
  livePrice?: number;
  dayChangePercent?: number;
}

const QUOTE_CACHE_KEY = 'koshq_live_market_quotes_v1';
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory/storage freshness

class LiveMarketApiClient {
  private cache: Record<string, LiveMarketQuote> = {};

  constructor() {
    this.loadCache();
  }

  private loadCache(): void {
    try {
      const stored = localStorage.getItem(QUOTE_CACHE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
      }
    } catch {
      this.cache = {};
    }
  }

  private saveCache(): void {
    try {
      localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(this.cache));
    } catch {}
  }

  // Format symbol to Indian exchange ticker (e.g. "TCS" -> "TCS.NS")
  private normalizeTicker(symbol: string): string {
    const s = symbol.trim().toUpperCase();
    if (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) {
      return s;
    }
    // Index aliases
    if (s === 'NIFTY' || s === 'NIFTY50' || s === 'NIFTY 50') return '^NSEI';
    if (s === 'SENSEX' || s === 'BSE SENSEX') return '^BSESN';
    if (s === 'BANKNIFTY' || s === 'NIFTY BANK') return '^NSEBANK';
    return `${s}.NS`;
  }

  // Determine API base URL
  private getChartUrl(ticker: string, range = '1mo', interval = '1d'): string {
    const encoded = encodeURIComponent(ticker);
    return `/api/yahoo-chart/v8/finance/chart/${encoded}?range=${range}&interval=${interval}`;
  }

  private getSearchUrl(query: string): string {
    return `/api/yahoo-search/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0`;
  }

  // Fetch real-time quote for a single symbol
  public async fetchLiveQuote(rawSymbol: string, force = false): Promise<LiveMarketQuote | null> {
    const ticker = this.normalizeTicker(rawSymbol);
    const cleanSymbol = ticker.replace(/\.(NS|BO)$/, '').replace(/^\^/, '');
    const now = Date.now();

    const cached = this.cache[cleanSymbol];
    if (!force && cached && now - cached.lastUpdated < CACHE_TTL_MS) {
      return cached;
    }

    try {
      const url = this.getChartUrl(ticker);
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`Market API returned HTTP ${res.status}`);
      }

      const json = await res.json();
      const result = json.chart?.result?.[0];
      if (!result || !result.meta) {
        return cached || null;
      }

      const meta = result.meta;
      const price = meta.regularMarketPrice ?? 0;
      const prev = meta.chartPreviousClose ?? price;
      const diff = price - prev;
      const pct = prev > 0 ? (diff / prev) * 100 : 0;

      // Extract recent historical closing prices for sparklines
      const timestamps: number[] = result.timestamp || [];
      const quoteObj = result.indicators?.quote?.[0];
      const closePrices: number[] = quoteObj?.close || [];
      const validHistory = closePrices.filter(p => typeof p === 'number' && !isNaN(p));

      const quote: LiveMarketQuote = {
        symbol: cleanSymbol,
        fullTicker: ticker,
        name: meta.shortName || cleanSymbol,
        exchange: ticker.endsWith('.BO') ? 'BSE' : ticker.startsWith('^') ? 'INDEX' : 'NSE',
        currentPrice: Math.round(price * 100) / 100,
        previousClose: Math.round(prev * 100) / 100,
        dayChange: Math.round(diff * 100) / 100,
        dayChangePercent: Math.round(pct * 100) / 100,
        dayHigh: meta.regularMarketDayHigh,
        dayLow: meta.regularMarketDayLow,
        high52W: meta.fiftyTwoWeekHigh,
        low52W: meta.fiftyTwoWeekLow,
        volume: meta.regularMarketVolume,
        currency: meta.currency || 'INR',
        lastUpdated: now,
        history: validHistory.length > 0 ? validHistory : undefined
      };

      this.cache[cleanSymbol] = quote;
      this.saveCache();
      return quote;
    } catch (err) {
      console.warn(`Could not fetch live quote for ${rawSymbol}:`, err);
      return cached || null;
    }
  }

  // Batch fetch multiple quotes
  public async fetchBatchLiveQuotes(symbols: string[]): Promise<Record<string, LiveMarketQuote>> {
    const results: Record<string, LiveMarketQuote> = {};
    await Promise.all(
      symbols.map(async sym => {
        const q = await this.fetchLiveQuote(sym);
        if (q) {
          results[q.symbol] = q;
        }
      })
    );
    return results;
  }

  // Search live equities across the entire Indian market registry
  public async searchLiveEquities(query: string): Promise<LiveMarketSearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const url = this.getSearchUrl(query.trim());
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) return [];

      const data = await res.json();
      const rawQuotes = data.quotes || [];

      // Filter to Indian exchange instruments (.NS, .BO)
      const indianInstruments = rawQuotes.filter((q: any) => {
        const s = q.symbol || '';
        return s.endsWith('.NS') || s.endsWith('.BO');
      });

      const formatted: LiveMarketSearchResult[] = indianInstruments.map((q: any) => {
        const cleanSym = q.symbol.replace(/\.(NS|BO)$/, '');
        const isETF = q.quoteType === 'ETF' || cleanSym.endsWith('BEES') || cleanSym.endsWith('ETF');
        return {
          symbol: cleanSym,
          name: q.shortname || q.longname || cleanSym,
          exchange: q.symbol.endsWith('.BO') ? 'BSE' : 'NSE',
          type: isETF ? 'ETF' : 'EQUITY',
          isin: q.isin
        };
      });

      return formatted;
    } catch (err) {
      console.warn('Live search error:', err);
      return [];
    }
  }

  public getCachedQuote(symbol: string): LiveMarketQuote | null {
    const clean = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
    return this.cache[clean] || null;
  }
}

export const liveMarketApi = new LiveMarketApiClient();
