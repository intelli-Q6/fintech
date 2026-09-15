// Domain Types & Data Contracts for KoshQ

export type AssetClass = 'equity' | 'mutual_fund' | 'etf' | 'bond' | 'gold' | 'govt_scheme' | 'cash';

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  isin: string;
  assetClass: AssetClass;
  sector: string;
  marketCapCategory?: 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'Debt' | 'Commodity' | 'Govt';
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  allocationPercent: number;
  peRatio?: number;
  dividendYield?: number;
  sparkline: number[]; // 7-day or 1-year historical price trend points
  riskGrade: 'Low' | 'Moderate' | 'High';
  history?: Record<TimeframeKey, HistoricalPricePoint[]>;
}

export interface FinancialStatementYear {
  year: string;
  revenue: number; // in ₹ Crores
  ebitda: number;
  netProfit: number;
  eps: number;
  roe: number;
  roce: number;
  debtToEquity: number;
  operatingCashFlow: number;
}

export interface StockDetail {
  symbol: string;
  name: string;
  isin: string;
  sector: string;
  marketCap: number; // in ₹ Cr
  marketCapType: 'Large Cap' | 'Mid Cap' | 'Small Cap';
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  roe: number;
  roce: number;
  debtToEquity: number;
  beta: number;
  high52W: number;
  low52W: number;
  businessSummary: string;
  financials5Y: FinancialStatementYear[];
  shareholding: {
    promoter: number;
    fii: number;
    dii: number;
    public: number;
  };
  history?: Record<TimeframeKey, HistoricalPricePoint[]>;
}

export interface MutualFundDetail {
  code: string;
  name: string;
  category: string;
  nav: number;
  dayChangePercent: number;
  aumCrores: number;
  expenseRatio: number;
  benchmark: string;
  fundManager: string;
  turnoverRatio: number;
  cagr1Y: number;
  cagr3Y: number;
  cagr5Y: number;
  sharpeRatio: number;
  standardDeviation: number;
  topHoldings: { name: string; weight: number }[];
}

export interface ETFDetail {
  symbol: string;
  name: string;
  isin: string;
  underlyingAsset: string;
  category: 'Index' | 'Commodity' | 'Sectoral' | 'Debt' | 'Global';
  currentPrice: number;
  nav: number;
  premiumDiscountPercent: number;
  expenseRatio: number;
  aumCrores: number;
  dayChangePercent: number;
  trackingError?: number;
  history?: Record<TimeframeKey, HistoricalPricePoint[]>;
}

export interface BondDetail {
  isin: string;
  name: string;
  issuerType: 'Sovereign' | 'Corporate PSU' | 'Corporate Private';
  couponRate: number;
  maturityDate: string;
  ytm: number;
  creditRating: string;
  faceValue: number;
  marketPrice: number;
  paymentFrequency: 'Annual' | 'Semi-Annual';
  isSecured: boolean;
}

export interface HistoricalPricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeframeKey = '1M' | '6M' | '1Y' | '3Y' | '5Y';

export interface MacroIndicator {
  name: string;
  symbol: string;
  value: string;
  change: string;
  isPositive: boolean;
}

export type MacroCategory = 'Index' | 'Commodity' | 'Currency' | 'Fixed Income' | 'Crypto' | 'Custom';

export interface MacroIndicatorConfig extends MacroIndicator {
  id: string;
  category: MacroCategory;
  enabled: boolean;
  isCustom?: boolean;
}

export interface GoalItem {
  id: string;
  title: string;
  category: 'Retirement' | 'FIRE' | 'Home' | 'Education' | 'Emergency' | 'Custom';
  targetAmount: number;
  currentSaved: number;
  targetYear: number;
  monthlyRequiredSIP: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  assetSymbol: string;
  assetName: string;
  title: string;
  thesis: string;
  expectedHorizon: string;
  postMortemReview?: string;
  tags: string[];
}

export interface ScreenerFilterState {
  minMarketCap: number;
  maxPE: number;
  minROE: number;
  minROCE: number;
  maxDebtEquity: number;
  minSalesGrowth: number;
  sector: string;
}
