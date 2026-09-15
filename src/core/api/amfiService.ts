// AMFI (Association of Mutual Funds in India) Client-Side Public API Client
// Data Source: Official AMFI Daily NAV feeds via mfapi.in (100% Free, CORS-enabled, Zero API Key)

export interface AMFINAVResult {
  schemeCode: number;
  schemeName: string;
  isin: string;
  category: string;
  nav: number;
  previousNav: number;
  dayChange: number;
  dayChangePercent: number;
  navDate: string;
  fetchedAt: number;
}

export interface AMFISchemeSearchItem {
  schemeCode: number;
  schemeName: string;
}

// Map known mutual fund scheme codes in KoshQ universe
export const KNOWN_AMFI_SCHEME_CODES: Record<string, number> = {
  'PPFAS_FLEXICAP': 122639, // Parag Parikh Flexi Cap Fund - Direct - Growth
  'UTI_NIFTY50': 120716,    // UTI Nifty 50 Index Fund - Direct - Growth
  'HDFC_MIDCAP': 118989,    // HDFC Mid-Cap Opportunities Fund - Direct - Growth
  'ICICI_PRU_VALUE': 120586,// ICICI Prudential Value Discovery Fund - Direct - Growth
  'MIRAE_LARGE': 107578,    // Mirae Asset Large Cap Fund - Direct - Growth
  'NIPPON_SMALL': 125497,   // Nippon India Small Cap Fund - Direct - Growth
  'QUANT_SMALL': 120828,    // Quant Small Cap Fund - Direct - Growth
  'SBI_BLUECHIP': 119598    // SBI Bluechip Fund - Direct - Growth
};

const CACHE_KEY = 'koshq_amfi_nav_cache_v1';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

class AMFIService {
  private cache: Record<number, AMFINAVResult> = {};

  constructor() {
    this.loadCache();
  }

  private loadCache(): void {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Unable to load AMFI cache from localStorage', e);
      this.cache = {};
    }
  }

  private saveCache(): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
    } catch (e) {
      console.warn('Unable to persist AMFI cache', e);
    }
  }

  public getCachedNAV(schemeCode: number): AMFINAVResult | null {
    const item = this.cache[schemeCode];
    if (!item) return null;
    return item;
  }

  public getAllCachedNAVs(): Record<number, AMFINAVResult> {
    return { ...this.cache };
  }

  public async fetchSchemeNAV(schemeCode: number, forceRefresh = false): Promise<AMFINAVResult | null> {
    const cached = this.cache[schemeCode];
    const now = Date.now();

    if (!forceRefresh && cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      return cached;
    }

    try {
      const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
      if (!response.ok) {
        throw new Error(`AMFI API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.data || data.data.length === 0) {
        return cached || null;
      }

      const latestEntry = data.data[0];
      const previousEntry = data.data[1] || latestEntry;

      const currentNAV = parseFloat(latestEntry.nav);
      const previousNAV = parseFloat(previousEntry.nav);
      const diff = currentNAV - previousNAV;
      const pct = previousNAV > 0 ? (diff / previousNAV) * 100 : 0;

      const result: AMFINAVResult = {
        schemeCode,
        schemeName: data.meta?.scheme_name || `Scheme ${schemeCode}`,
        isin: data.meta?.isin_growth || '',
        category: data.meta?.scheme_category || '',
        nav: currentNAV,
        previousNav: previousNAV,
        dayChange: Math.round(diff * 100) / 100,
        dayChangePercent: Math.round(pct * 100) / 100,
        navDate: latestEntry.date,
        fetchedAt: now
      };

      this.cache[schemeCode] = result;
      this.saveCache();
      return result;
    } catch (err) {
      console.warn(`Failed to fetch live AMFI NAV for scheme ${schemeCode}:`, err);
      return cached || null;
    }
  }

  public async syncAllKnownSchemes(forceRefresh = false): Promise<Record<number, AMFINAVResult>> {
    const schemeCodes = Object.values(KNOWN_AMFI_SCHEME_CODES);
    const results: Record<number, AMFINAVResult> = {};

    await Promise.all(
      schemeCodes.map(async code => {
        const res = await this.fetchSchemeNAV(code, forceRefresh);
        if (res) {
          results[code] = res;
        }
      })
    );

    return results;
  }

  public async searchSchemes(query: string): Promise<AMFISchemeSearchItem[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const response = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query.trim())}`);
      if (!response.ok) return [];

      const results: AMFISchemeSearchItem[] = await response.json();
      return results.slice(0, 15);
    } catch (err) {
      console.warn('Failed to search AMFI schemes:', err);
      return [];
    }
  }
}

export const amfiService = new AMFIService();
