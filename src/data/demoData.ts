// Authentic Indian Financial Market Dataset & Sovereign Vault Universe

import {
  Holding,
  StockDetail,
  MutualFundDetail,
  BondDetail,
  ETFDetail,
  MacroIndicator,
  MacroIndicatorConfig,
  GoalItem,
  JournalEntry,
  HistoricalPricePoint,
  TimeframeKey
} from './types';

// Deterministic multi-timeframe OHLC candle and volume generator
export function generateSyntheticHistory(
  basePrice: number,
  volatility: number = 0.015,
  annualReturn: number = 0.16
): Record<TimeframeKey, HistoricalPricePoint[]> {
  const timeframes: { key: TimeframeKey; points: number; daysStep: number }[] = [
    { key: '1M', points: 22, daysStep: 1 },
    { key: '6M', points: 26, daysStep: 7 },
    { key: '1Y', points: 52, daysStep: 7 },
    { key: '3Y', points: 78, daysStep: 14 },
    { key: '5Y', points: 100, daysStep: 18 }
  ];

  const now = new Date();
  const result: Partial<Record<TimeframeKey, HistoricalPricePoint[]>> = {};

  timeframes.forEach(({ key, points, daysStep }) => {
    const list: HistoricalPricePoint[] = [];
    const drift = (annualReturn / 252) * daysStep;
    const stepVol = volatility * Math.sqrt(daysStep);

    // Calculate backward from current price
    const prices: number[] = [basePrice];
    let p = basePrice;
    for (let i = 1; i < points; i++) {
      const seed = Math.sin(p * 9.87 + i * 13.37) * 10000;
      const randNorm = (seed - Math.floor(seed) - 0.5) * 2;
      const change = drift + randNorm * stepVol;
      p = p / (1 + change);
      if (p <= 0) p = basePrice * 0.4;
      prices.unshift(p);
    }

    prices.forEach((close, idx) => {
      const pointDate = new Date(now.getTime() - (points - 1 - idx) * daysStep * 24 * 3600 * 1000);
      const dateStr = pointDate.toISOString().split('T')[0];
      const prevClose = idx > 0 ? prices[idx - 1] : close * 0.995;
      const open = Number((prevClose * (1 + Math.sin(idx * 7.1) * 0.003)).toFixed(2));
      const spread = Math.max(open, close) * 0.009 * (1 + Math.abs(Math.cos(idx)));
      const high = Number((Math.max(open, close) + spread).toFixed(2));
      const low = Number((Math.min(open, close) - spread * 0.85).toFixed(2));
      const vol = Math.floor(50000 + Math.abs(Math.sin(idx * 3.7)) * 250000);

      list.push({
        date: dateStr,
        open,
        high,
        low,
        close: Number(close.toFixed(2)),
        volume: vol
      });
    });

    if (list.length > 0) {
      list[list.length - 1].close = basePrice;
      list[list.length - 1].high = Math.max(list[list.length - 1].high, basePrice);
      list[list.length - 1].low = Math.min(list[list.length - 1].low, basePrice);
    }

    result[key] = list;
  });

  return result as Record<TimeframeKey, HistoricalPricePoint[]>;
}

// Master Indian Macro Catalog with Category and Custom Support
export const DEFAULT_MACRO_CATALOG: MacroIndicatorConfig[] = [
  { id: 'nifty', name: 'NIFTY 50', symbol: 'NIFTY', value: '25,388.90', change: '+112.40 (+0.44%)', isPositive: true, category: 'Index', enabled: true },
  { id: 'sensex', name: 'SENSEX', symbol: 'SENSEX', value: '82,995.10', change: '+324.20 (+0.39%)', isPositive: true, category: 'Index', enabled: true },
  { id: 'banknifty', name: 'NIFTY BANK', symbol: 'BANKNIFTY', value: '52,180.50', change: '+245.80 (+0.47%)', isPositive: true, category: 'Index', enabled: true },
  { id: 'niftyit', name: 'NIFTY IT', symbol: 'NIFTYIT', value: '43,210.15', change: '+310.20 (+0.72%)', isPositive: true, category: 'Index', enabled: true },
  { id: 'midcap150', name: 'NIFTY MIDCAP 150', symbol: 'MID150', value: '21,450.80', change: '+98.40 (+0.46%)', isPositive: true, category: 'Index', enabled: false },
  { id: 'smallcap250', name: 'NIFTY SMALLCAP 250', symbol: 'SML250', value: '18,320.60', change: '+142.10 (+0.78%)', isPositive: true, category: 'Index', enabled: false },
  { id: 'in10y', name: '10Y G-SEC YIELD', symbol: 'IN10Y', value: '6.78%', change: '-0.02% (Easing)', isPositive: true, category: 'Fixed Income', enabled: true },
  { id: 'us10y', name: 'US 10Y TREASURY', symbol: 'US10Y', value: '3.98%', change: '+0.04% (+1.02%)', isPositive: false, category: 'Fixed Income', enabled: false },
  { id: 'gold', name: 'GOLD (24K/10g)', symbol: 'GOLD', value: '₹74,450', change: '+₹420 (+0.57%)', isPositive: true, category: 'Commodity', enabled: true },
  { id: 'silver', name: 'SILVER (1kg)', symbol: 'SILVER', value: '₹89,200', change: '+₹750 (+0.85%)', isPositive: true, category: 'Commodity', enabled: false },
  { id: 'brent', name: 'BRENT CRUDE', symbol: 'OIL', value: '$78.20/bbl', change: '-$0.95 (-1.20%)', isPositive: true, category: 'Commodity', enabled: true },
  { id: 'usdinr', name: 'USD / INR', symbol: 'USDINR', value: '₹83.84', change: '+0.01 (+0.01%)', isPositive: false, category: 'Currency', enabled: true },
  { id: 'eurinr', name: 'EUR / INR', symbol: 'EURINR', value: '₹92.45', change: '-0.12 (-0.13%)', isPositive: true, category: 'Currency', enabled: false },
  { id: 'vix', name: 'INDIA VIX', symbol: 'VIX', value: '13.15', change: '-0.38 (-2.81%)', isPositive: true, category: 'Index', enabled: true },
  { id: 'btcinr', name: 'BITCOIN / INR', symbol: 'BTCINR', value: '₹53,40,000', change: '+₹1,12,000 (+2.14%)', isPositive: true, category: 'Crypto', enabled: false }
];

export const DEMO_MACRO_PULSE: MacroIndicator[] = DEFAULT_MACRO_CATALOG.filter(m => m.enabled);

// Expanded Indian Equities Universe (12 Premier Stocks across Key Sectors)
export const DEMO_STOCKS: StockDetail[] = [
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    isin: 'INE040A01034',
    sector: 'Banking & Financial Services',
    marketCap: 1248000,
    marketCapType: 'Large Cap',
    currentPrice: 1642.50,
    dayChange: 14.80,
    dayChangePercent: 0.91,
    peRatio: 18.6,
    pbRatio: 2.65,
    dividendYield: 1.18,
    roe: 16.8,
    roce: 15.4,
    debtToEquity: 7.2,
    beta: 0.88,
    high52W: 1794.00,
    low52W: 1363.55,
    businessSummary: "India's largest private sector bank by assets and market capitalization, providing retail, wholesale, and treasury banking operations following its mega-merger with HDFC Ltd.",
    financials5Y: [
      { year: 'FY20', revenue: 138073, ebitda: 42120, netProfit: 26257, eps: 48.0, roe: 16.4, roce: 15.1, debtToEquity: 7.1, operatingCashFlow: 31200 },
      { year: 'FY21', revenue: 146063, ebitda: 46840, netProfit: 31116, eps: 56.6, roe: 16.6, roce: 15.3, debtToEquity: 7.0, operatingCashFlow: 42500 },
      { year: 'FY22', revenue: 157851, ebitda: 54200, netProfit: 36961, eps: 66.8, roe: 16.7, roce: 15.2, debtToEquity: 6.9, operatingCashFlow: -18000 },
      { year: 'FY23', revenue: 192800, ebitda: 64100, netProfit: 44108, eps: 79.3, roe: 17.0, roce: 15.8, debtToEquity: 6.8, operatingCashFlow: 75000 },
      { year: 'FY24', revenue: 315430, ebitda: 98400, netProfit: 60812, eps: 80.1, roe: 15.8, roce: 14.9, debtToEquity: 7.2, operatingCashFlow: 112000 }
    ],
    shareholding: { promoter: 0, fii: 47.8, dii: 33.4, public: 18.8 },
    history: generateSyntheticHistory(1642.50, 0.014, 0.14)
  },
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    isin: 'INE002A01018',
    sector: 'Conglomerate & Energy',
    marketCap: 1980000,
    marketCapType: 'Large Cap',
    currentPrice: 2935.00,
    dayChange: -8.50,
    dayChangePercent: -0.29,
    peRatio: 28.4,
    pbRatio: 2.45,
    dividendYield: 0.34,
    roe: 9.8,
    roce: 10.4,
    debtToEquity: 0.42,
    beta: 1.05,
    high52W: 3217.90,
    low52W: 2221.05,
    businessSummary: "Diverse conglomerate spanning oil-to-chemicals (O2C), telecom & digital services (Jio Platforms), retail (Reliance Retail), and new energy manufacturing gigafactories.",
    financials5Y: [
      { year: 'FY20', revenue: 596679, ebitda: 89000, netProfit: 39880, eps: 63.0, roe: 8.8, roce: 9.5, debtToEquity: 0.65, operatingCashFlow: 94800 },
      { year: 'FY21', revenue: 466307, ebitda: 80700, netProfit: 49128, eps: 76.4, roe: 7.6, roce: 8.2, debtToEquity: 0.38, operatingCashFlow: 26185 },
      { year: 'FY22', revenue: 699962, ebitda: 110500, netProfit: 60705, eps: 89.8, roe: 8.5, roce: 9.6, debtToEquity: 0.40, operatingCashFlow: 110654 },
      { year: 'FY23', revenue: 877835, ebitda: 142200, netProfit: 66702, eps: 98.6, roe: 9.1, roce: 10.1, debtToEquity: 0.44, operatingCashFlow: 115000 },
      { year: 'FY24', revenue: 914472, ebitda: 162500, netProfit: 69621, eps: 102.9, roe: 9.8, roce: 10.4, debtToEquity: 0.42, operatingCashFlow: 145000 }
    ],
    shareholding: { promoter: 50.3, fii: 21.6, dii: 16.5, public: 11.6 },
    history: generateSyntheticHistory(2935.00, 0.016, 0.18)
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd.',
    isin: 'INE467B01029',
    sector: 'Information Technology',
    marketCap: 1540000,
    marketCapType: 'Large Cap',
    currentPrice: 4250.00,
    dayChange: 26.50,
    dayChangePercent: 0.63,
    peRatio: 33.5,
    pbRatio: 14.8,
    dividendYield: 1.72,
    roe: 49.2,
    roce: 62.4,
    debtToEquity: 0.00,
    beta: 0.62,
    high52W: 4585.00,
    low52W: 3313.00,
    businessSummary: "Flagship IT services and consulting arm of the Tata Group, operating in 55 countries with world-class cash generation, zero net debt, and industry-leading operating margins.",
    financials5Y: [
      { year: 'FY20', revenue: 156949, ebitda: 42109, netProfit: 32340, eps: 86.2, roe: 38.0, roce: 49.5, debtToEquity: 0.0, operatingCashFlow: 32369 },
      { year: 'FY21', revenue: 164177, ebitda: 46546, netProfit: 32430, eps: 87.7, roe: 37.5, roce: 50.2, debtToEquity: 0.0, operatingCashFlow: 38802 },
      { year: 'FY22', revenue: 191754, ebitda: 53057, netProfit: 38327, eps: 104.7, roe: 43.2, roce: 54.8, debtToEquity: 0.0, operatingCashFlow: 39949 },
      { year: 'FY23', revenue: 225458, ebitda: 59258, netProfit: 42147, eps: 115.2, roe: 46.9, roce: 58.7, debtToEquity: 0.0, operatingCashFlow: 41965 },
      { year: 'FY24', revenue: 240893, ebitda: 64150, netProfit: 45908, eps: 126.9, roe: 49.2, roce: 62.4, debtToEquity: 0.0, operatingCashFlow: 44340 }
    ],
    shareholding: { promoter: 71.8, fii: 12.5, dii: 10.4, public: 5.3 },
    history: generateSyntheticHistory(4250.00, 0.013, 0.15)
  },
  {
    symbol: 'ITC',
    name: 'ITC Ltd.',
    isin: 'INE154A01025',
    sector: 'FMCG & Diversified',
    marketCap: 625000,
    marketCapType: 'Large Cap',
    currentPrice: 502.80,
    dayChange: 3.20,
    dayChangePercent: 0.64,
    peRatio: 30.6,
    pbRatio: 8.7,
    dividendYield: 2.74,
    roe: 28.5,
    roce: 37.8,
    debtToEquity: 0.00,
    beta: 0.45,
    high52W: 520.00,
    low52W: 399.30,
    businessSummary: "Dominant FMCG powerhouse in cigarettes, packaged foods (Aashirvaad, Sunfeast), paperboards, packaging, agri-business, and recently demerged hotels business.",
    financials5Y: [
      { year: 'FY20', revenue: 49404, ebitda: 19680, netProfit: 15306, eps: 12.4, roe: 23.5, roce: 31.2, debtToEquity: 0.0, operatingCashFlow: 13806 },
      { year: 'FY21', revenue: 49272, ebitda: 17274, netProfit: 13161, eps: 10.7, roe: 21.0, roce: 27.5, debtToEquity: 0.0, operatingCashFlow: 11500 },
      { year: 'FY22', revenue: 60668, ebitda: 20658, netProfit: 15486, eps: 12.6, roe: 24.8, roce: 32.8, debtToEquity: 0.0, operatingCashFlow: 14800 },
      { year: 'FY23', revenue: 70936, ebitda: 25665, netProfit: 19192, eps: 15.5, roe: 27.8, roce: 36.9, debtToEquity: 0.0, operatingCashFlow: 17900 },
      { year: 'FY24', revenue: 76840, ebitda: 27400, netProfit: 20422, eps: 16.4, roe: 28.5, roce: 37.8, debtToEquity: 0.0, operatingCashFlow: 19200 }
    ],
    shareholding: { promoter: 0, fii: 41.2, dii: 43.1, public: 15.7 },
    history: generateSyntheticHistory(502.80, 0.011, 0.13)
  },
  {
    symbol: 'LT',
    name: 'Larsen & Toubro Ltd.',
    isin: 'INE018A01030',
    sector: 'Infrastructure & Engineering',
    marketCap: 492000,
    marketCapType: 'Large Cap',
    currentPrice: 3580.00,
    dayChange: 18.00,
    dayChangePercent: 0.51,
    peRatio: 37.4,
    pbRatio: 5.2,
    dividendYield: 0.95,
    roe: 14.8,
    roce: 13.9,
    debtToEquity: 0.88,
    beta: 1.12,
    high52W: 3919.90,
    low52W: 2853.00,
    businessSummary: "India's premier engineering, procurement, and construction (EPC) conglomerate executing critical mega-infrastructure, defense, energy transition, and tech consulting projects.",
    financials5Y: [
      { year: 'FY20', revenue: 145452, ebitda: 16329, netProfit: 9549, eps: 68.0, roe: 14.8, roce: 12.9, debtToEquity: 1.1, operatingCashFlow: 14800 },
      { year: 'FY21', revenue: 135979, ebitda: 15624, netProfit: 11583, eps: 82.5, roe: 15.2, roce: 13.1, debtToEquity: 1.0, operatingCashFlow: 22100 },
      { year: 'FY22', revenue: 156521, ebitda: 18217, netProfit: 8669, eps: 61.7, roe: 11.2, roce: 11.8, debtToEquity: 0.95, operatingCashFlow: 19400 },
      { year: 'FY23', revenue: 183341, ebitda: 20753, netProfit: 10471, eps: 74.5, roe: 12.8, roce: 12.5, debtToEquity: 0.92, operatingCashFlow: 18600 },
      { year: 'FY24', revenue: 221113, ebitda: 23900, netProfit: 13059, eps: 95.1, roe: 14.8, roce: 13.9, debtToEquity: 0.88, operatingCashFlow: 25400 }
    ],
    shareholding: { promoter: 0, fii: 24.8, dii: 38.6, public: 36.6 },
    history: generateSyntheticHistory(3580.00, 0.017, 0.17)
  },
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd.',
    isin: 'INE155A01022',
    sector: 'Automobile & EV',
    marketCap: 345000,
    marketCapType: 'Large Cap',
    currentPrice: 968.40,
    dayChange: 14.20,
    dayChangePercent: 1.49,
    peRatio: 10.8,
    pbRatio: 3.40,
    dividendYield: 0.62,
    roe: 32.4,
    roce: 20.8,
    debtToEquity: 0.82,
    beta: 1.35,
    high52W: 1179.05,
    low52W: 606.30,
    businessSummary: "Global automotive pioneer commanding over 70% of India's electric passenger vehicle market, domestic commercial transport leadership, and British luxury marque Jaguar Land Rover (JLR).",
    financials5Y: [
      { year: 'FY20', revenue: 261068, ebitda: 19726, netProfit: -12071, eps: -31.5, roe: -28.4, roce: 4.2, debtToEquity: 2.1, operatingCashFlow: 26600 },
      { year: 'FY21', revenue: 249795, ebitda: 35730, netProfit: -13451, eps: -35.2, roe: -24.6, roce: 7.8, debtToEquity: 1.8, operatingCashFlow: 29000 },
      { year: 'FY22', revenue: 278454, ebitda: 24813, netProfit: -11441, eps: -29.8, roe: -23.1, roce: 6.5, debtToEquity: 1.6, operatingCashFlow: 14200 },
      { year: 'FY23', revenue: 345967, ebitda: 37011, netProfit: 2414, eps: 6.3, roe: 5.4, roce: 10.2, debtToEquity: 1.2, operatingCashFlow: 35400 },
      { year: 'FY24', revenue: 437928, ebitda: 62800, netProfit: 31399, eps: 82.1, roe: 32.4, roce: 20.8, debtToEquity: 0.82, operatingCashFlow: 54100 }
    ],
    shareholding: { promoter: 41.8, fii: 18.2, dii: 16.4, public: 23.6 },
    history: generateSyntheticHistory(968.40, 0.022, 0.28)
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd.',
    isin: 'INE090A01021',
    sector: 'Banking & Financial Services',
    marketCap: 875000,
    marketCapType: 'Large Cap',
    currentPrice: 1245.20,
    dayChange: 11.40,
    dayChangePercent: 0.92,
    peRatio: 17.2,
    pbRatio: 2.85,
    dividendYield: 0.80,
    roe: 18.5,
    roce: 16.8,
    debtToEquity: 6.8,
    beta: 0.95,
    high52W: 1298.00,
    low52W: 914.00,
    businessSummary: "Premier private banking powerhouse acclaimed for industry-leading Net Interest Margins (4.4%), pristine asset quality (Net NPA < 0.42%), and rapid digital business expansion.",
    financials5Y: [
      { year: 'FY20', revenue: 91247, ebitda: 28100, netProfit: 7931, eps: 12.3, roe: 7.3, roce: 9.8, debtToEquity: 7.4, operatingCashFlow: 18500 },
      { year: 'FY21', revenue: 100234, ebitda: 36400, netProfit: 16193, eps: 24.2, roe: 12.3, roce: 11.4, debtToEquity: 7.1, operatingCashFlow: 24200 },
      { year: 'FY22', revenue: 123400, ebitda: 42100, netProfit: 23339, eps: 33.6, roe: 14.8, roce: 13.5, debtToEquity: 6.9, operatingCashFlow: 31000 },
      { year: 'FY23', revenue: 147800, ebitda: 49200, netProfit: 31896, eps: 45.8, roe: 17.2, roce: 15.6, debtToEquity: 6.8, operatingCashFlow: 38400 },
      { year: 'FY24', revenue: 178200, ebitda: 59400, netProfit: 40888, eps: 58.4, roe: 18.5, roce: 16.8, debtToEquity: 6.8, operatingCashFlow: 46200 }
    ],
    shareholding: { promoter: 0, fii: 44.5, dii: 45.2, public: 10.3 },
    history: generateSyntheticHistory(1245.20, 0.015, 0.19)
  },
  {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd.',
    isin: 'INE397D01024',
    sector: 'Telecommunications & Digital',
    marketCap: 920000,
    marketCapType: 'Large Cap',
    currentPrice: 1548.00,
    dayChange: 21.00,
    dayChangePercent: 1.38,
    peRatio: 62.4,
    pbRatio: 9.80,
    dividendYield: 0.52,
    roe: 14.8,
    roce: 15.2,
    debtToEquity: 1.45,
    beta: 0.72,
    high52W: 1618.00,
    low52W: 885.00,
    businessSummary: "Leading pan-India and Africa telecom conglomerate operating high-ARPU 5G mobile networks, enterprise cloud connectivity (Airtel Business), home broadband, and data centers (Nxtra).",
    financials5Y: [
      { year: 'FY20', revenue: 87539, ebitda: 36608, netProfit: -32183, eps: -59.0, roe: -34.8, roce: 4.8, debtToEquity: 2.1, operatingCashFlow: 31800 },
      { year: 'FY21', revenue: 100616, ebitda: 45372, netProfit: -15084, eps: -27.6, roe: -19.4, roce: 7.2, debtToEquity: 1.9, operatingCashFlow: 39500 },
      { year: 'FY22', revenue: 116547, ebitda: 57534, netProfit: 4255, eps: 7.5, roe: 6.4, roce: 10.5, debtToEquity: 1.7, operatingCashFlow: 48200 },
      { year: 'FY23', revenue: 139145, ebitda: 71274, netProfit: 8346, eps: 14.7, roe: 11.2, roce: 12.8, debtToEquity: 1.6, operatingCashFlow: 58900 },
      { year: 'FY24', revenue: 149982, ebitda: 79100, netProfit: 14750, eps: 25.8, roe: 14.8, roce: 15.2, debtToEquity: 1.45, operatingCashFlow: 68400 }
    ],
    shareholding: { promoter: 53.2, fii: 24.1, dii: 19.5, public: 3.2 },
    history: generateSyntheticHistory(1548.00, 0.016, 0.22)
  },
  {
    symbol: 'SUNPHARMA',
    name: 'Sun Pharmaceutical Industries Ltd.',
    isin: 'INE044A01036',
    sector: 'Healthcare & Pharmaceuticals',
    marketCap: 442000,
    marketCapType: 'Large Cap',
    currentPrice: 1845.00,
    dayChange: -6.00,
    dayChangePercent: -0.32,
    peRatio: 38.5,
    pbRatio: 5.90,
    dividendYield: 0.73,
    roe: 16.2,
    roce: 18.5,
    debtToEquity: 0.05,
    beta: 0.58,
    high52W: 1912.00,
    low52W: 1108.00,
    businessSummary: "India's largest pharmaceutical company and the world's 4th largest specialty generics major, operating advanced global manufacturing with heavy R&D focus in dermatology and ophthalmology.",
    financials5Y: [
      { year: 'FY20', revenue: 32838, ebitda: 6990, netProfit: 3765, eps: 15.7, roe: 8.4, roce: 10.2, debtToEquity: 0.15, operatingCashFlow: 5800 },
      { year: 'FY21', revenue: 33498, ebitda: 8491, netProfit: 2904, eps: 12.1, roe: 6.2, roce: 11.4, debtToEquity: 0.08, operatingCashFlow: 7400 },
      { year: 'FY22', revenue: 38654, ebitda: 10243, netProfit: 3273, eps: 13.6, roe: 6.8, roce: 13.8, debtToEquity: 0.04, operatingCashFlow: 9200 },
      { year: 'FY23', revenue: 43279, ebitda: 11647, netProfit: 8474, eps: 35.3, roe: 15.1, roce: 16.4, debtToEquity: 0.02, operatingCashFlow: 10800 },
      { year: 'FY24', revenue: 48497, ebitda: 13320, netProfit: 9576, eps: 39.9, roe: 16.2, roce: 18.5, debtToEquity: 0.05, operatingCashFlow: 12400 }
    ],
    shareholding: { promoter: 54.5, fii: 17.8, dii: 19.4, public: 8.3 },
    history: generateSyntheticHistory(1845.00, 0.012, 0.18)
  },
  {
    symbol: 'TITAN',
    name: 'Titan Company Ltd.',
    isin: 'INE280A01028',
    sector: 'Consumer Discretionary & Retail',
    marketCap: 318000,
    marketCapType: 'Large Cap',
    currentPrice: 3585.00,
    dayChange: 32.00,
    dayChangePercent: 0.90,
    peRatio: 88.5,
    pbRatio: 24.2,
    dividendYield: 0.31,
    roe: 31.4,
    roce: 33.8,
    debtToEquity: 0.72,
    beta: 0.85,
    high52W: 3886.95,
    low52W: 2950.00,
    businessSummary: "Tata Group's retail titan dominating India's organized jewelry and lifestyle sectors through household brand names Tanishq, Mia, Zoya, Fastrack, and Titan Eye+.",
    financials5Y: [
      { year: 'FY20', revenue: 21052, ebitda: 2466, netProfit: 1501, eps: 16.9, roe: 22.8, roce: 26.2, debtToEquity: 0.45, operatingCashFlow: 1200 },
      { year: 'FY21', revenue: 21644, ebitda: 1724, netProfit: 974, eps: 11.0, roe: 13.0, roce: 15.4, debtToEquity: 0.58, operatingCashFlow: 1450 },
      { year: 'FY22', revenue: 28799, ebitda: 3341, netProfit: 2198, eps: 24.8, roe: 24.1, roce: 27.8, debtToEquity: 0.62, operatingCashFlow: 2100 },
      { year: 'FY23', revenue: 40575, ebitda: 4879, netProfit: 3274, eps: 36.9, roe: 30.5, roce: 34.2, debtToEquity: 0.68, operatingCashFlow: 2900 },
      { year: 'FY24', revenue: 51084, ebitda: 5410, netProfit: 3496, eps: 39.4, roe: 31.4, roce: 33.8, debtToEquity: 0.72, operatingCashFlow: 3500 }
    ],
    shareholding: { promoter: 52.9, fii: 18.5, dii: 11.2, public: 17.4 },
    history: generateSyntheticHistory(3585.00, 0.015, 0.16)
  },
  {
    symbol: 'ZOMATO',
    name: 'Zomato Ltd.',
    isin: 'INE758T01015',
    sector: 'Consumer Internet & Quick Commerce',
    marketCap: 248000,
    marketCapType: 'Large Cap',
    currentPrice: 278.50,
    dayChange: 8.20,
    dayChangePercent: 3.03,
    peRatio: 118.0,
    pbRatio: 11.4,
    dividendYield: 0.00,
    roe: 8.2,
    roce: 9.1,
    debtToEquity: 0.02,
    beta: 1.42,
    high52W: 298.20,
    low52W: 98.40,
    businessSummary: "India's preeminent consumer internet platform operating market-leading food delivery, B2B restaurant supplies (Hyperpure), and India's fastest-growing quick-commerce network (Blinkit).",
    financials5Y: [
      { year: 'FY20', revenue: 2604, ebitda: -2198, netProfit: -2385, eps: -4.8, roe: -48.2, roce: -42.1, debtToEquity: 0.05, operatingCashFlow: -1800 },
      { year: 'FY21', revenue: 1994, ebitda: -467, netProfit: -816, eps: -1.5, roe: -12.4, roce: -8.5, debtToEquity: 0.01, operatingCashFlow: -650 },
      { year: 'FY22', revenue: 4192, ebitda: -1851, netProfit: -1222, eps: -1.6, roe: -7.5, roce: -5.8, debtToEquity: 0.01, operatingCashFlow: -850 },
      { year: 'FY23', revenue: 7079, ebitda: -1210, netProfit: -971, eps: -1.1, roe: -5.1, roce: -3.8, debtToEquity: 0.01, operatingCashFlow: 220 },
      { year: 'FY24', revenue: 12114, ebitda: 450, netProfit: 351, eps: 0.4, roe: 8.2, roce: 9.1, debtToEquity: 0.02, operatingCashFlow: 1480 }
    ],
    shareholding: { promoter: 0, fii: 54.2, dii: 18.6, public: 27.2 },
    history: generateSyntheticHistory(278.50, 0.028, 0.45)
  },
  {
    symbol: 'HAL',
    name: 'Hindustan Aeronautics Ltd.',
    isin: 'INE066F01020',
    sector: 'Aerospace & Defense PSU',
    marketCap: 312000,
    marketCapType: 'Large Cap',
    currentPrice: 4660.00,
    dayChange: 72.00,
    dayChangePercent: 1.57,
    peRatio: 38.2,
    pbRatio: 10.4,
    dividendYield: 0.75,
    roe: 28.5,
    roce: 36.4,
    debtToEquity: 0.00,
    beta: 1.15,
    high52W: 5675.00,
    low52W: 1888.00,
    businessSummary: "Sovereign defense aerospace manufacturer with an order backlog exceeding ₹94,000 Cr, producing indigenous fighter aircraft (Tejas Mk1A), combat helicopters (Prachand, LCH), and aero engines.",
    financials5Y: [
      { year: 'FY20', revenue: 21438, ebitda: 4945, netProfit: 2842, eps: 42.5, roe: 21.2, roce: 27.4, debtToEquity: 0.0, operatingCashFlow: 4100 },
      { year: 'FY21', revenue: 22889, ebitda: 5350, netProfit: 3239, eps: 48.4, roe: 22.4, roce: 29.1, debtToEquity: 0.0, operatingCashFlow: 5200 },
      { year: 'FY22', revenue: 24620, ebitda: 5880, netProfit: 5080, eps: 75.9, roe: 26.8, roce: 33.2, debtToEquity: 0.0, operatingCashFlow: 6800 },
      { year: 'FY23', revenue: 26927, ebitda: 6660, netProfit: 5828, eps: 87.1, roe: 27.2, roce: 34.8, debtToEquity: 0.0, operatingCashFlow: 7400 },
      { year: 'FY24', revenue: 30381, ebitda: 8250, netProfit: 7621, eps: 113.9, roe: 28.5, roce: 36.4, debtToEquity: 0.0, operatingCashFlow: 9100 }
    ],
    shareholding: { promoter: 71.6, fii: 12.1, dii: 10.8, public: 5.5 },
    history: generateSyntheticHistory(4905.00, 0.024, 0.38)
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    isin: 'INE062A01020',
    sector: 'Banking PSU',
    marketCap: 888000,
    marketCapType: 'Large Cap',
    currentPrice: 995.70,
    dayChange: -8.40,
    dayChangePercent: -0.84,
    peRatio: 11.2,
    pbRatio: 1.45,
    dividendYield: 1.62,
    roe: 17.2,
    roce: 15.8,
    debtToEquity: 12.4,
    beta: 1.18,
    high52W: 1234.70,
    low52W: 821.10,
    businessSummary: "India's largest public sector commercial bank commanding a quarter of systemic deposits and loans with nationwide branch infrastructure.",
    financials5Y: [
      { year: 'FY20', revenue: 269852, ebitda: 68133, netProfit: 14488, eps: 16.2, roe: 7.7, roce: 8.2, debtToEquity: 13.8, operatingCashFlow: 35000 },
      { year: 'FY21', revenue: 278115, ebitda: 71554, netProfit: 20410, eps: 22.9, roe: 9.3, roce: 9.8, debtToEquity: 13.2, operatingCashFlow: 41000 },
      { year: 'FY22', revenue: 289700, ebitda: 75292, netProfit: 31676, eps: 35.5, roe: 12.6, roce: 11.9, debtToEquity: 12.8, operatingCashFlow: 52000 },
      { year: 'FY23', revenue: 342000, ebitda: 83700, netProfit: 50232, eps: 56.3, roe: 16.5, roce: 14.8, debtToEquity: 12.5, operatingCashFlow: 68000 },
      { year: 'FY24', revenue: 406000, ebitda: 98000, netProfit: 61077, eps: 68.4, roe: 17.2, roce: 15.8, debtToEquity: 12.4, operatingCashFlow: 82000 }
    ],
    shareholding: { promoter: 57.5, fii: 11.2, dii: 24.1, public: 7.2 },
    history: generateSyntheticHistory(995.70, 0.018, 0.16)
  },
  {
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Ltd.',
    isin: 'INE296A01024',
    sector: 'NBFC & Consumer Finance',
    marketCap: 642000,
    marketCapType: 'Large Cap',
    currentPrice: 1034.50,
    dayChange: 6.20,
    dayChangePercent: 0.60,
    peRatio: 26.5,
    pbRatio: 5.2,
    dividendYield: 0.52,
    roe: 22.1,
    roce: 18.9,
    debtToEquity: 3.8,
    beta: 1.25,
    high52W: 1176.40,
    low52W: 787.90,
    businessSummary: "Dominant consumer lending NBFC in India with an omnichannel presence across consumer durables, lifestyle, SME loans, and digital payments.",
    financials5Y: [
      { year: 'FY20', revenue: 26385, ebitda: 15900, netProfit: 5264, eps: 87.7, roe: 20.2, roce: 18.5, debtToEquity: 3.9, operatingCashFlow: 8200 },
      { year: 'FY21', revenue: 26683, ebitda: 17200, netProfit: 4420, eps: 73.5, roe: 12.8, roce: 12.1, debtToEquity: 3.6, operatingCashFlow: 9400 },
      { year: 'FY22', revenue: 31640, ebitda: 21600, netProfit: 7028, eps: 116.5, roe: 17.4, roce: 16.2, debtToEquity: 3.7, operatingCashFlow: 12500 },
      { year: 'FY23', revenue: 41400, ebitda: 28900, netProfit: 11508, eps: 190.5, roe: 23.5, roce: 20.1, debtToEquity: 3.8, operatingCashFlow: 18200 },
      { year: 'FY24', revenue: 54600, ebitda: 37800, netProfit: 14451, eps: 238.2, roe: 22.1, roce: 18.9, debtToEquity: 3.8, operatingCashFlow: 24500 }
    ],
    shareholding: { promoter: 55.9, fii: 19.8, dii: 14.1, public: 10.2 },
    history: generateSyntheticHistory(1034.50, 0.019, 0.22)
  },
  {
    symbol: 'LT',
    name: 'Larsen & Toubro Ltd.',
    isin: 'INE018A01030',
    sector: 'Infrastructure & Capital Goods',
    marketCap: 541000,
    marketCapType: 'Large Cap',
    currentPrice: 3930.70,
    dayChange: -18.50,
    dayChangePercent: -0.47,
    peRatio: 36.8,
    pbRatio: 5.1,
    dividendYield: 0.88,
    roe: 15.6,
    roce: 14.2,
    debtToEquity: 1.15,
    beta: 0.95,
    high52W: 4440.00,
    low52W: 3288.10,
    businessSummary: "India's premier engineering, procurement, and construction (EPC) conglomerate executing mega infrastructure, energy transit, and defense systems.",
    financials5Y: [
      { year: 'FY20', revenue: 145452, ebitda: 22800, netProfit: 9549, eps: 68.0, roe: 14.8, roce: 13.9, debtToEquity: 1.5, operatingCashFlow: 17200 },
      { year: 'FY21', revenue: 135979, ebitda: 21900, netProfit: 11583, eps: 82.5, roe: 15.2, roce: 14.1, debtToEquity: 1.4, operatingCashFlow: 22100 },
      { year: 'FY22', revenue: 156521, ebitda: 24800, netProfit: 8669, eps: 61.7, roe: 12.1, roce: 12.8, debtToEquity: 1.3, operatingCashFlow: 19800 },
      { year: 'FY23', revenue: 183341, ebitda: 28400, netProfit: 10471, eps: 74.5, roe: 13.8, roce: 13.5, debtToEquity: 1.2, operatingCashFlow: 24000 },
      { year: 'FY24', revenue: 221113, ebitda: 33500, netProfit: 13059, eps: 95.0, roe: 15.6, roce: 14.2, debtToEquity: 1.15, operatingCashFlow: 31000 }
    ],
    shareholding: { promoter: 0, fii: 24.8, dii: 38.6, public: 36.6 },
    history: generateSyntheticHistory(3930.70, 0.015, 0.17)
  },
  {
    symbol: 'TRENT',
    name: 'Trent Ltd. (Westside & Zudio)',
    isin: 'INE849A01020',
    sector: 'Retail & Consumer Apparel',
    marketCap: 99600,
    marketCapType: 'Large Cap',
    currentPrice: 2802.40,
    dayChange: 42.10,
    dayChangePercent: 1.53,
    peRatio: 98.4,
    pbRatio: 26.8,
    dividendYield: 0.18,
    roe: 32.4,
    roce: 34.8,
    debtToEquity: 0.28,
    beta: 1.12,
    high52W: 3400.00,
    low52W: 1920.00,
    businessSummary: "Tata Group retail powerhouse operating value fashion juggernaut Zudio, Westside lifestyle department stores, and Star Bazaar hypermarkets.",
    financials5Y: [
      { year: 'FY20', revenue: 3486, ebitda: 562, netProfit: 106, eps: 3.0, roe: 5.2, roce: 7.8, debtToEquity: 0.35, operatingCashFlow: 480 },
      { year: 'FY21', revenue: 2593, ebitda: 218, netProfit: -181, eps: -5.1, roe: -8.5, roce: 2.1, debtToEquity: 0.42, operatingCashFlow: 310 },
      { year: 'FY22', revenue: 4498, ebitda: 634, netProfit: 106, eps: 3.0, roe: 4.8, roce: 9.4, debtToEquity: 0.38, operatingCashFlow: 620 },
      { year: 'FY23', revenue: 8242, ebitda: 1119, netProfit: 394, eps: 11.1, roe: 14.5, roce: 18.2, debtToEquity: 0.32, operatingCashFlow: 1250 },
      { year: 'FY24', revenue: 12669, ebitda: 2110, netProfit: 1028, eps: 28.9, roe: 32.4, roce: 34.8, debtToEquity: 0.28, operatingCashFlow: 2100 }
    ],
    shareholding: { promoter: 37.0, fii: 27.2, dii: 15.6, public: 20.2 },
    history: generateSyntheticHistory(2802.40, 0.022, 0.45)
  },
  {
    symbol: 'SUZLON',
    name: 'Suzlon Energy Ltd.',
    isin: 'INE040H01021',
    sector: 'Renewable Energy & Wind Power',
    marketCap: 60200,
    marketCapType: 'Mid Cap',
    currentPrice: 44.12,
    dayChange: -0.65,
    dayChangePercent: -1.45,
    peRatio: 48.2,
    pbRatio: 12.8,
    dividendYield: 0.00,
    roe: 28.4,
    roce: 22.6,
    debtToEquity: 0.05,
    beta: 1.65,
    high52W: 86.00,
    low52W: 38.20,
    businessSummary: "Turnaround wind turbine manufacturer with a debt-free balance sheet and record multi-gigawatt order book from major Indian independent power producers.",
    financials5Y: [
      { year: 'FY20', revenue: 2973, ebitda: -425, netProfit: -2692, eps: -5.1, roe: -35.2, roce: -12.4, debtToEquity: 8.5, operatingCashFlow: -120 },
      { year: 'FY21', revenue: 3346, ebitda: 480, netProfit: 104, eps: 0.2, roe: 2.1, roce: 4.8, debtToEquity: 6.2, operatingCashFlow: 350 },
      { year: 'FY22', revenue: 6520, ebitda: 710, netProfit: -176, eps: -0.2, roe: -4.5, roce: 6.2, debtToEquity: 4.1, operatingCashFlow: 580 },
      { year: 'FY23', revenue: 5971, ebitda: 830, netProfit: 2887, eps: 2.8, roe: 45.2, roce: 18.5, debtToEquity: 0.3, operatingCashFlow: 920 },
      { year: 'FY24', revenue: 6529, ebitda: 1024, netProfit: 660, eps: 0.5, roe: 28.4, roce: 22.6, debtToEquity: 0.05, operatingCashFlow: 1140 }
    ],
    shareholding: { promoter: 13.3, fii: 22.5, dii: 10.1, public: 54.1 },
    history: generateSyntheticHistory(44.12, 0.035, 0.32)
  },
  {
    symbol: 'BEL',
    name: 'Bharat Electronics Ltd.',
    isin: 'INE263A01024',
    sector: 'Defense Electronics PSU',
    marketCap: 295000,
    marketCapType: 'Large Cap',
    currentPrice: 404.35,
    dayChange: 4.80,
    dayChangePercent: 1.20,
    peRatio: 52.4,
    pbRatio: 14.2,
    dividendYield: 0.85,
    roe: 27.6,
    roce: 35.8,
    debtToEquity: 0.00,
    beta: 1.08,
    high52W: 436.00,
    low52W: 242.00,
    businessSummary: "Navratna defense PSU commanding advanced radar, sonar, electronic warfare, missile guidance, and avionics systems for Indian armed forces.",
    financials5Y: [
      { year: 'FY20', revenue: 12921, ebitda: 2730, netProfit: 1794, eps: 2.5, roe: 18.5, roce: 24.8, debtToEquity: 0.0, operatingCashFlow: 2900 },
      { year: 'FY21', revenue: 14064, ebitda: 3181, netProfit: 2065, eps: 2.8, roe: 19.2, roce: 26.1, debtToEquity: 0.0, operatingCashFlow: 4100 },
      { year: 'FY22', revenue: 15314, ebitda: 3309, netProfit: 2349, eps: 3.2, roe: 20.4, roce: 27.5, debtToEquity: 0.0, operatingCashFlow: 4600 },
      { year: 'FY23', revenue: 17734, ebitda: 4091, netProfit: 2984, eps: 4.1, roe: 22.8, roce: 30.5, debtToEquity: 0.0, operatingCashFlow: 5400 },
      { year: 'FY24', revenue: 20268, ebitda: 5240, netProfit: 3985, eps: 5.5, roe: 27.6, roce: 35.8, debtToEquity: 0.0, operatingCashFlow: 6800 }
    ],
    shareholding: { promoter: 51.1, fii: 17.5, dii: 19.8, public: 11.6 },
    history: generateSyntheticHistory(404.35, 0.018, 0.28)
  },
  {
    symbol: 'DIXON',
    name: 'Dixon Technologies (India) Ltd.',
    isin: 'INE935N01020',
    sector: 'Electronic Manufacturing Services (EMS)',
    marketCap: 80500,
    marketCapType: 'Mid Cap',
    currentPrice: 13425.00,
    dayChange: 185.00,
    dayChangePercent: 1.40,
    peRatio: 88.5,
    pbRatio: 38.4,
    dividendYield: 0.08,
    roe: 42.5,
    roce: 48.2,
    debtToEquity: 0.12,
    beta: 1.28,
    high52W: 15900.00,
    low52W: 8100.00,
    businessSummary: "Pioneer in Indian electronics manufacturing services (EMS) producing smartphones, laptops, LED TVs, home appliances, and telecom equipment under PLI incentives.",
    financials5Y: [
      { year: 'FY20', revenue: 4400, ebitda: 223, netProfit: 120, eps: 20.5, roe: 26.2, roce: 32.1, debtToEquity: 0.35, operatingCashFlow: 180 },
      { year: 'FY21', revenue: 6448, ebitda: 286, netProfit: 160, eps: 27.2, roe: 22.8, roce: 28.5, debtToEquity: 0.28, operatingCashFlow: 210 },
      { year: 'FY22', revenue: 10697, ebitda: 379, netProfit: 190, eps: 32.1, roe: 20.5, roce: 26.8, debtToEquity: 0.32, operatingCashFlow: 350 },
      { year: 'FY23', revenue: 12192, ebitda: 513, netProfit: 255, eps: 42.8, roe: 23.5, roce: 31.2, debtToEquity: 0.22, operatingCashFlow: 480 },
      { year: 'FY24', revenue: 17691, ebitda: 712, netProfit: 375, eps: 62.9, roe: 42.5, roce: 48.2, debtToEquity: 0.12, operatingCashFlow: 890 }
    ],
    shareholding: { promoter: 33.6, fii: 19.8, dii: 24.2, public: 22.4 },
    history: generateSyntheticHistory(13425.00, 0.024, 0.35)
  },
  {
    symbol: 'POLYCAB',
    name: 'Polycab India Ltd.',
    isin: 'INE455K01017',
    sector: 'Wires & Cables / Fast Moving Electrical Goods',
    marketCap: 123800,
    marketCapType: 'Large Cap',
    currentPrice: 8241.00,
    dayChange: -64.00,
    dayChangePercent: -0.77,
    peRatio: 52.1,
    pbRatio: 14.8,
    dividendYield: 0.42,
    roe: 25.8,
    roce: 32.4,
    debtToEquity: 0.02,
    beta: 0.98,
    high52W: 9100.00,
    low52W: 4800.00,
    businessSummary: "Dominant manufacturer of wires, power cables, and FMEG products in India with widespread retail dealer distribution and institutional export leadership.",
    financials5Y: [
      { year: 'FY20', revenue: 8830, ebitda: 1135, netProfit: 766, eps: 51.5, roe: 23.8, roce: 28.5, debtToEquity: 0.05, operatingCashFlow: 920 },
      { year: 'FY21', revenue: 8926, ebitda: 1164, netProfit: 886, eps: 59.4, roe: 21.2, roce: 26.8, debtToEquity: 0.04, operatingCashFlow: 1050 },
      { year: 'FY22', revenue: 12204, ebitda: 1265, netProfit: 917, eps: 61.3, roe: 18.5, roce: 24.2, debtToEquity: 0.03, operatingCashFlow: 1180 },
      { year: 'FY23', revenue: 14108, ebitda: 1843, netProfit: 1282, eps: 85.6, roe: 21.4, roce: 28.5, debtToEquity: 0.02, operatingCashFlow: 1650 },
      { year: 'FY24', revenue: 18039, ebitda: 2492, netProfit: 1803, eps: 119.8, roe: 25.8, roce: 32.4, debtToEquity: 0.02, operatingCashFlow: 2300 }
    ],
    shareholding: { promoter: 63.2, fii: 13.5, dii: 12.1, public: 11.2 },
    history: generateSyntheticHistory(8241.00, 0.016, 0.28)
  },
  {
    symbol: 'IRCTC',
    name: 'Indian Railway Catering & Tourism Corp.',
    isin: 'INE335Y01012',
    sector: 'Railway Monopoly PSU',
    marketCap: 74200,
    marketCapType: 'Mid Cap',
    currentPrice: 463.70,
    dayChange: -2.80,
    dayChangePercent: -0.60,
    peRatio: 58.2,
    pbRatio: 22.4,
    dividendYield: 1.25,
    roe: 41.2,
    roce: 56.4,
    debtToEquity: 0.00,
    beta: 0.92,
    high52W: 1049.00,
    low52W: 450.00,
    businessSummary: "Monopoly miniratna PSU authorized by Indian Railways to provide online train ticket booking, packaged drinking water (Rail Neer), and onboard catering.",
    financials5Y: [
      { year: 'FY20', revenue: 2275, ebitda: 713, netProfit: 528, eps: 6.6, roe: 38.5, roce: 49.2, debtToEquity: 0.0, operatingCashFlow: 650 },
      { year: 'FY21', revenue: 783, ebitda: 188, netProfit: 189, eps: 2.4, roe: 13.2, roce: 18.5, debtToEquity: 0.0, operatingCashFlow: 240 },
      { year: 'FY22', revenue: 1879, ebitda: 704, netProfit: 663, eps: 8.3, roe: 39.8, roce: 52.1, debtToEquity: 0.0, operatingCashFlow: 720 },
      { year: 'FY23', revenue: 3541, ebitda: 1285, netProfit: 1006, eps: 12.6, roe: 45.4, roce: 61.2, debtToEquity: 0.0, operatingCashFlow: 1150 },
      { year: 'FY24', revenue: 4270, ebitda: 1460, netProfit: 1111, eps: 13.9, roe: 41.2, roce: 56.4, debtToEquity: 0.0, operatingCashFlow: 1320 }
    ],
    shareholding: { promoter: 62.4, fii: 7.8, dii: 13.5, public: 16.3 },
    history: generateSyntheticHistory(463.70, 0.019, 0.18)
  }
];

// Expanded Indian Mutual Funds Universe
export const DEMO_MUTUAL_FUNDS: MutualFundDetail[] = [
  {
    code: 'PPFAS_FLEXI',
    name: 'Parag Parikh Flexi Cap Fund (Direct - Growth)',
    category: 'Flexi Cap Fund',
    nav: 74.82,
    dayChangePercent: 0.48,
    aumCrores: 72400,
    expenseRatio: 0.62,
    benchmark: 'Nifty 500 TRI',
    fundManager: 'Rajeev Thakkar & Team',
    turnoverRatio: 18.2,
    cagr1Y: 34.2,
    cagr3Y: 21.4,
    cagr5Y: 23.8,
    sharpeRatio: 1.42,
    standardDeviation: 12.1,
    topHoldings: [
      { name: 'HDFC Bank Ltd.', weight: 7.8 },
      { name: 'Power Grid Corp', weight: 6.4 },
      { name: 'Bajaj Holdings', weight: 5.9 },
      { name: 'ITC Ltd.', weight: 5.4 },
      { name: 'Coal India', weight: 5.1 },
      { name: 'Alphabet Inc. (Google)', weight: 4.8 }
    ]
  },
  {
    code: 'UTI_NIFTY50',
    name: 'UTI Nifty 50 Index Fund (Direct - Growth)',
    category: 'Large Cap / Index',
    nav: 172.45,
    dayChangePercent: 0.42,
    aumCrores: 19800,
    expenseRatio: 0.18,
    benchmark: 'Nifty 50 TRI',
    fundManager: 'Sharwan Kumar Goyal',
    turnoverRatio: 9.4,
    cagr1Y: 28.5,
    cagr3Y: 15.2,
    cagr5Y: 17.8,
    sharpeRatio: 1.15,
    standardDeviation: 13.8,
    topHoldings: [
      { name: 'HDFC Bank Ltd.', weight: 11.2 },
      { name: 'Reliance Industries', weight: 9.8 },
      { name: 'ICICI Bank', weight: 7.9 },
      { name: 'Infosys Ltd.', weight: 5.8 },
      { name: 'ITC Ltd.', weight: 4.5 }
    ]
  },
  {
    code: 'NIPPON_SMALLCAP',
    name: 'Nippon India Small Cap Fund (Direct - Growth)',
    category: 'Small Cap Fund',
    nav: 168.20,
    dayChangePercent: 0.72,
    aumCrores: 56200,
    expenseRatio: 0.68,
    benchmark: 'Nifty Smallcap 250 TRI',
    fundManager: 'Samir Rachh',
    turnoverRatio: 24.5,
    cagr1Y: 48.2,
    cagr3Y: 31.8,
    cagr5Y: 34.6,
    sharpeRatio: 1.84,
    standardDeviation: 16.5,
    topHoldings: [
      { name: 'Tube Investments', weight: 2.8 },
      { name: 'HDFC Bank Ltd.', weight: 2.1 },
      { name: 'Apar Industries', weight: 2.0 },
      { name: 'KPIT Technologies', weight: 1.9 }
    ]
  },
  {
    code: 'HDFC_MIDCAP',
    name: 'HDFC Mid-Cap Opportunities Fund (Direct - Growth)',
    category: 'Mid Cap Fund',
    nav: 194.50,
    dayChangePercent: 0.65,
    aumCrores: 68500,
    expenseRatio: 0.74,
    benchmark: 'Nifty Midcap 150 TRI',
    fundManager: 'Chirag Setalvad',
    turnoverRatio: 22.0,
    cagr1Y: 44.8,
    cagr3Y: 28.6,
    cagr5Y: 29.4,
    sharpeRatio: 1.68,
    standardDeviation: 14.8,
    topHoldings: [
      { name: 'Indian Hotels', weight: 4.5 },
      { name: 'Tata Communications', weight: 4.1 },
      { name: 'Apollo Tyres', weight: 3.8 },
      { name: 'Federal Bank', weight: 3.6 },
      { name: 'Max Healthcare', weight: 3.4 }
    ]
  },
  {
    code: 'ICICI_PRU_VALUE',
    name: 'ICICI Prudential Value Discovery Fund (Direct - Growth)',
    category: 'Value / Contra Fund',
    nav: 412.80,
    dayChangePercent: 0.54,
    aumCrores: 44200,
    expenseRatio: 0.69,
    benchmark: 'Nifty 500 TRI',
    fundManager: 'Sankaran Naren',
    turnoverRatio: 38.4,
    cagr1Y: 36.5,
    cagr3Y: 24.2,
    cagr5Y: 22.8,
    sharpeRatio: 1.51,
    standardDeviation: 13.2,
    topHoldings: [
      { name: 'ICICI Bank Ltd.', weight: 8.2 },
      { name: 'Infosys Ltd.', weight: 7.4 },
      { name: 'Larsen & Toubro', weight: 6.8 },
      { name: 'Sun Pharma', weight: 5.9 },
      { name: 'NTPC Ltd.', weight: 5.2 }
    ]
  }
];

// Indian Exchange Traded Funds (ETFs)
export const DEMO_ETFS: ETFDetail[] = [
  {
    symbol: 'NIFTYBEES',
    name: 'Nippon India ETF Nifty 50 BeES',
    isin: 'INF732E01015',
    underlyingAsset: 'Nifty 50 Index',
    category: 'Index',
    currentPrice: 275.40,
    nav: 275.35,
    premiumDiscountPercent: 0.02,
    expenseRatio: 0.04,
    aumCrores: 28400,
    dayChangePercent: 0.65,
    trackingError: 0.03,
    history: generateSyntheticHistory(275.40, 0.012, 0.14)
  },
  {
    symbol: 'GOLDBEES',
    name: 'Nippon India ETF Gold BeES',
    isin: 'INF732E01031',
    underlyingAsset: 'Physical Gold (99.5% Purity)',
    category: 'Commodity',
    currentPrice: 68.50,
    nav: 68.48,
    premiumDiscountPercent: 0.03,
    expenseRatio: 0.78,
    aumCrores: 14200,
    dayChangePercent: 0.32,
    trackingError: 0.12,
    history: generateSyntheticHistory(68.50, 0.010, 0.11)
  },
  {
    symbol: 'BANKBEES',
    name: 'Nippon India ETF Bank BeES',
    isin: 'INF732E01049',
    underlyingAsset: 'Nifty Bank Index',
    category: 'Sectoral',
    currentPrice: 532.10,
    nav: 532.25,
    premiumDiscountPercent: -0.03,
    expenseRatio: 0.18,
    aumCrores: 9800,
    dayChangePercent: -0.15,
    trackingError: 0.05,
    history: generateSyntheticHistory(532.10, 0.018, 0.15)
  },
  {
    symbol: 'SILVERBEES',
    name: 'Nippon India ETF Silver BeES',
    isin: 'INF732E01247',
    underlyingAsset: 'Physical Silver (99.9% Purity)',
    category: 'Commodity',
    currentPrice: 89.20,
    nav: 89.15,
    premiumDiscountPercent: 0.05,
    expenseRatio: 0.52,
    aumCrores: 4600,
    dayChangePercent: 1.12,
    trackingError: 0.15,
    history: generateSyntheticHistory(89.20, 0.022, 0.18)
  },
  {
    symbol: 'ITBEES',
    name: 'Nippon India ETF Nifty IT',
    isin: 'INF732E01072',
    underlyingAsset: 'Nifty IT Index',
    category: 'Sectoral',
    currentPrice: 41.25,
    nav: 41.20,
    premiumDiscountPercent: 0.12,
    expenseRatio: 0.22,
    aumCrores: 3900,
    dayChangePercent: 0.85,
    trackingError: 0.06,
    history: generateSyntheticHistory(41.25, 0.016, 0.17)
  },
  {
    symbol: 'JUNIORBEES',
    name: 'Nippon India ETF Junior BeES',
    isin: 'INF732E01023',
    underlyingAsset: 'Nifty Next 50 Index',
    category: 'Index',
    currentPrice: 742.00,
    nav: 741.80,
    premiumDiscountPercent: 0.03,
    expenseRatio: 0.15,
    aumCrores: 5200,
    dayChangePercent: 0.45,
    trackingError: 0.07,
    history: generateSyntheticHistory(742.00, 0.017, 0.19)
  },
  {
    symbol: 'MON100',
    name: 'Motilal Oswal Nasdaq 100 ETF',
    isin: 'INF247L01AU4',
    underlyingAsset: 'Nasdaq 100 Index (Tech Leaders)',
    category: 'Global',
    currentPrice: 162.80,
    nav: 162.90,
    premiumDiscountPercent: -0.06,
    expenseRatio: 0.58,
    aumCrores: 7800,
    dayChangePercent: 1.40,
    trackingError: 0.18,
    history: generateSyntheticHistory(162.80, 0.019, 0.22)
  },
  {
    symbol: 'LIQUIDBEES',
    name: 'Nippon India ETF Liquid BeES',
    isin: 'INF732E01080',
    underlyingAsset: 'Tri-Party Repo (TREPS) Overnight',
    category: 'Debt',
    currentPrice: 1000.00,
    nav: 1000.00,
    premiumDiscountPercent: 0.00,
    expenseRatio: 0.65,
    aumCrores: 13500,
    dayChangePercent: 0.02,
    trackingError: 0.01,
    history: generateSyntheticHistory(1000.00, 0.001, 0.068)
  }
];

// Expanded Indian Fixed Income, Bonds, REITs & Sovereign Commodities
export const DEMO_BONDS: BondDetail[] = [
  {
    isin: 'IN0020230085',
    name: 'Government of India 7.18% GS 2033',
    issuerType: 'Sovereign',
    couponRate: 7.18,
    maturityDate: '14-Aug-2033',
    ytm: 6.94,
    creditRating: 'SOVEREIGN',
    faceValue: 100,
    marketPrice: 101.45,
    paymentFrequency: 'Semi-Annual',
    isSecured: true
  },
  {
    isin: 'INE040A08435',
    name: 'HDFC Bank Ltd. 7.75% Perpetual / 2028 NCD',
    issuerType: 'Corporate Private',
    couponRate: 7.75,
    maturityDate: '28-Jun-2028',
    ytm: 7.62,
    creditRating: 'CRISIL AAA',
    faceValue: 10000,
    marketPrice: 10080.00,
    paymentFrequency: 'Annual',
    isSecured: true
  },
  {
    isin: 'IN0020180017',
    name: 'Sovereign Gold Bond (SGB) 2018-19 Series V',
    issuerType: 'Sovereign',
    couponRate: 2.50,
    maturityDate: '23-Aug-2026',
    ytm: 8.85,
    creditRating: 'SOVEREIGN',
    faceValue: 3119,
    marketPrice: 7350.00,
    paymentFrequency: 'Semi-Annual',
    isSecured: true
  },
  {
    isin: 'INE041025011',
    name: 'Embassy Office Parks REIT (Commercial Grade-A)',
    issuerType: 'Corporate Private',
    couponRate: 6.85,
    maturityDate: 'Perpetual / Listed REIT',
    ytm: 7.45,
    creditRating: 'CRISIL AAA',
    faceValue: 300,
    marketPrice: 382.50,
    paymentFrequency: 'Semi-Annual',
    isSecured: true
  },
  {
    isin: 'INE261F08CF3',
    name: 'NABARD 7.60% Sovereign Backed NCD 2029',
    issuerType: 'Corporate PSU',
    couponRate: 7.60,
    maturityDate: '12-May-2029',
    ytm: 7.32,
    creditRating: 'CRISIL AAA',
    faceValue: 10000,
    marketPrice: 10120.00,
    paymentFrequency: 'Annual',
    isSecured: true
  },
  {
    isin: 'INE020B08DF2',
    name: 'REC Ltd. 7.45% 2030 Tax-Free Sovereign PSU Bond',
    issuerType: 'Corporate PSU',
    couponRate: 7.45,
    maturityDate: '18-Mar-2030',
    ytm: 7.15,
    creditRating: 'CRISIL AAA',
    faceValue: 1000,
    marketPrice: 1024.50,
    paymentFrequency: 'Annual',
    isSecured: true
  },
  {
    isin: 'IN0020210012',
    name: 'RBI 7.15% Floating Rate Savings Bonds (FRSB 2031)',
    issuerType: 'Sovereign',
    couponRate: 7.15,
    maturityDate: '01-Jul-2031',
    ytm: 7.15,
    creditRating: 'SOVEREIGN',
    faceValue: 1000,
    marketPrice: 1000.00,
    paymentFrequency: 'Semi-Annual',
    isSecured: true
  }
];

// Initial Sovereign Vault Portfolio (Consolidated ₹48,24,500)
export const INITIAL_PORTFOLIO_HOLDINGS: Holding[] = [
  {
    id: 'h-1',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    isin: 'INE040A01034',
    assetClass: 'equity',
    sector: 'Financials',
    marketCapCategory: 'Large Cap',
    quantity: 400,
    averageBuyPrice: 1350.00,
    currentPrice: 1642.50,
    investedAmount: 540000,
    currentValue: 657000,
    unrealizedGain: 117000,
    unrealizedGainPercent: 21.67,
    allocationPercent: 13.62,
    peRatio: 18.6,
    dividendYield: 1.18,
    sparkline: [1420, 1450, 1510, 1580, 1605, 1620, 1642],
    riskGrade: 'Moderate',
    history: generateSyntheticHistory(1642.50, 0.014, 0.14)
  },
  {
    id: 'h-2',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    isin: 'INE002A01018',
    assetClass: 'equity',
    sector: 'Energy & Digital',
    marketCapCategory: 'Large Cap',
    quantity: 180,
    averageBuyPrice: 2420.00,
    currentPrice: 2935.00,
    investedAmount: 435600,
    currentValue: 528300,
    unrealizedGain: 92700,
    unrealizedGainPercent: 21.28,
    allocationPercent: 10.95,
    peRatio: 28.4,
    dividendYield: 0.34,
    sparkline: [2750, 2820, 2890, 2960, 2910, 2940, 2935],
    riskGrade: 'Moderate',
    history: generateSyntheticHistory(2935.00, 0.016, 0.18)
  },
  {
    id: 'h-3',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    isin: 'INE467B01029',
    assetClass: 'equity',
    sector: 'Information Technology',
    marketCapCategory: 'Large Cap',
    quantity: 90,
    averageBuyPrice: 3550.00,
    currentPrice: 4250.00,
    investedAmount: 319500,
    currentValue: 382500,
    unrealizedGain: 63000,
    unrealizedGainPercent: 19.72,
    allocationPercent: 7.93,
    peRatio: 33.5,
    dividendYield: 1.72,
    sparkline: [3800, 3950, 4100, 4220, 4190, 4210, 4250],
    riskGrade: 'Low',
    history: generateSyntheticHistory(4250.00, 0.013, 0.15)
  },
  {
    id: 'h-4',
    symbol: 'PPFAS_FLEXI',
    name: 'Parag Parikh Flexi Cap Fund',
    isin: 'INF879O01019',
    assetClass: 'mutual_fund',
    sector: 'Multi-Cap Equity',
    marketCapCategory: 'Large Cap',
    quantity: 11000,
    averageBuyPrice: 52.40,
    currentPrice: 74.82,
    investedAmount: 576400,
    currentValue: 823020,
    unrealizedGain: 246620,
    unrealizedGainPercent: 42.79,
    allocationPercent: 17.06,
    sparkline: [62, 65, 68, 70, 72, 73.5, 74.8],
    riskGrade: 'Moderate',
    history: generateSyntheticHistory(74.82, 0.011, 0.22)
  },
  {
    id: 'h-5',
    symbol: 'UTI_NIFTY50',
    name: 'UTI Nifty 50 Index Fund',
    isin: 'INF789F01016',
    assetClass: 'mutual_fund',
    sector: 'Passive Index',
    marketCapCategory: 'Large Cap',
    quantity: 3200,
    averageBuyPrice: 135.00,
    currentPrice: 172.45,
    investedAmount: 432000,
    currentValue: 551840,
    unrealizedGain: 119840,
    unrealizedGainPercent: 27.74,
    allocationPercent: 11.44,
    sparkline: [148, 155, 161, 166, 170, 171, 172.4],
    riskGrade: 'Low',
    history: generateSyntheticHistory(172.45, 0.010, 0.16)
  },
  {
    id: 'h-6',
    symbol: 'SGB_AUG28',
    name: 'Sovereign Gold Bond 2020 Series V',
    isin: 'IN0020200153',
    assetClass: 'gold',
    sector: 'Precious Metals',
    marketCapCategory: 'Commodity',
    quantity: 50,
    averageBuyPrice: 5120.00,
    currentPrice: 7450.00,
    investedAmount: 256000,
    currentValue: 372500,
    unrealizedGain: 116500,
    unrealizedGainPercent: 45.51,
    allocationPercent: 7.72,
    sparkline: [6100, 6400, 6800, 7100, 7300, 7400, 7450],
    riskGrade: 'Low',
    history: generateSyntheticHistory(7450.00, 0.009, 0.12)
  },
  {
    id: 'h-7',
    symbol: 'GSEC_718_2033',
    name: 'GoI 7.18% GS 2033 (Sovereign Bond)',
    isin: 'IN0020230085',
    assetClass: 'bond',
    sector: 'Government Debt',
    marketCapCategory: 'Debt',
    quantity: 4000,
    averageBuyPrice: 99.80,
    currentPrice: 101.45,
    investedAmount: 399200,
    currentValue: 405800,
    unrealizedGain: 6600,
    unrealizedGainPercent: 1.65,
    allocationPercent: 8.41,
    sparkline: [99.8, 100.1, 100.4, 100.9, 101.1, 101.3, 101.4],
    riskGrade: 'Low',
    history: generateSyntheticHistory(101.45, 0.003, 0.07)
  },
  {
    id: 'h-8',
    symbol: 'PPF_SBI',
    name: 'Public Provident Fund (SBI)',
    isin: 'IN-GOVT-PPF-01',
    assetClass: 'govt_scheme',
    sector: 'Government Pension',
    marketCapCategory: 'Govt',
    quantity: 1,
    averageBuyPrice: 520000.00,
    currentPrice: 624500.00,
    investedAmount: 520000,
    currentValue: 624500,
    unrealizedGain: 104500,
    unrealizedGainPercent: 20.10,
    allocationPercent: 12.94,
    sparkline: [540, 560, 580, 595, 610, 620, 624.5],
    riskGrade: 'Low',
    history: generateSyntheticHistory(624500, 0.001, 0.071)
  },
  {
    id: 'h-9',
    symbol: 'LIQUID_CASH',
    name: 'Liquid Emergency Reserve (Swept FD)',
    isin: 'IN-LIQUID-01',
    assetClass: 'cash',
    sector: 'Cash & Equivalents',
    marketCapCategory: 'Debt',
    quantity: 1,
    averageBuyPrice: 479340,
    currentPrice: 479340,
    investedAmount: 479340,
    currentValue: 479340,
    unrealizedGain: 0,
    unrealizedGainPercent: 0.00,
    allocationPercent: 9.94,
    sparkline: [479, 479, 479, 479, 479, 479, 479],
    riskGrade: 'Low',
    history: generateSyntheticHistory(479340, 0.001, 0.068)
  }
];

export const DEMO_GOALS: GoalItem[] = [
  {
    id: 'g-1',
    title: 'Financial Independence (FIRE) Target',
    category: 'FIRE',
    targetAmount: 50000000, // ₹5 Crore
    currentSaved: 4824500,
    targetYear: 2038,
    monthlyRequiredSIP: 78500
  },
  {
    id: 'g-2',
    title: 'Residential Property Down Payment',
    category: 'Home',
    targetAmount: 3500000, // ₹35 Lakh
    currentSaved: 1850000,
    targetYear: 2027,
    monthlyRequiredSIP: 42000
  },
  {
    id: 'g-3',
    title: 'Emergency Liquid Reserve (12 Months)',
    category: 'Emergency',
    targetAmount: 1200000, // ₹12 Lakh
    currentSaved: 850000,
    targetYear: 2025,
    monthlyRequiredSIP: 28000
  }
];

export const DEMO_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'j-1',
    date: '2024-08-12',
    assetSymbol: 'HDFCBANK',
    assetName: 'HDFC Bank Post-Merger Consolidation',
    title: 'Thesis on Deposit Accretion and Net Interest Margins',
    thesis: 'Valuation compressed to ~18x trailing earnings post HDFC Ltd merger. Credit-deposit ratio elevated at ~104%, but management is deliberately tempering loan growth to 12% to let deposit growth (18%) restore equilibrium. Once NIMs trough at 3.45%, operating leverage will drive ~16% ROE back.',
    expectedHorizon: '3 - 5 Years',
    tags: ['Value', 'Banking', 'Post-Merger', 'Margin Expansion']
  },
  {
    id: 'j-2',
    date: '2024-06-04',
    assetSymbol: 'SGB_AUG28',
    assetName: 'SGB Allocation Rationale',
    title: 'Gold as a Real Purchasing Power Hedge Against Rupee Depreciation',
    thesis: 'Locking in 2.5% p.a. semi-annual coupon on original face value plus capital gains tax exemption at redemption. Acts as a negative correlation ballast to equity drawdowns during geopolitical spikes.',
    expectedHorizon: 'Held till Maturity (2028)',
    tags: ['Gold', 'Macro Hedge', 'Tax-Free']
  }
];
