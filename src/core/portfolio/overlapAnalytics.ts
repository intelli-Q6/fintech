// Mutual Fund & Direct Equity Look-Through Overlap Analytics Engine
// Computes Pairwise Portfolio Overlap % and Common Underlying Company Concentrations

import { Holding } from '../../data/types';

export interface UnderlyingSecurity {
  symbol: string;
  name: string;
  weightInFund: number; // percentage e.g. 8.5%
  sector: string;
}

export interface FundLookThrough {
  fundHoldingId: string;
  fundName: string;
  fundSymbol: string;
  fundValue: number;
  portfolioWeight: number; // weight of this fund in user's total portfolio
  topHoldings: UnderlyingSecurity[];
}

export interface PairwiseOverlap {
  fundA: string;
  fundB: string;
  overlapPercent: number; // 0 - 100%
  commonStockCount: number;
  commonStocks: {
    symbol: string;
    weightInA: number;
    weightInB: number;
    overlapContribution: number;
  }[];
}

export interface LookThroughExposure {
  symbol: string;
  companyName: string;
  sector: string;
  directHoldingValue: number;
  indirectFundValue: number;
  totalEffectiveValue: number;
  effectivePortfolioWeight: number; // % of user's total portfolio
  heldInFunds: string[]; // names of funds containing this stock
  isDirectlyHeld: boolean;
}

export interface OverlapAnalysisResult {
  hasFunds: boolean;
  totalFundsAnalyzed: number;
  pairwiseOverlaps: PairwiseOverlap[];
  topConsolidatedExposures: LookThroughExposure[];
  highestOverlapPair: PairwiseOverlap | null;
  overallPortfolioStockCount: number;
}

// Authentic underlying portfolios for top Indian Mutual Funds (Top 10 weights)
export const KNOWN_FUND_PORTFOLIOS: Record<string, UnderlyingSecurity[]> = {
  // Parag Parikh Flexi Cap Fund
  'PPFAS': [
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', weightInFund: 8.2, sector: 'Financials' },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', weightInFund: 6.5, sector: 'Financials' },
    { symbol: 'ITC', name: 'ITC Ltd.', weightInFund: 6.1, sector: 'Consumer FMCG' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', weightInFund: 5.9, sector: 'Financials' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', weightInFund: 5.2, sector: 'Information Technology' },
    { symbol: 'HCLTECH', name: 'HCL Technologies Ltd.', weightInFund: 4.8, sector: 'Information Technology' },
    { symbol: 'POWERGRID', name: 'Power Grid Corp.', weightInFund: 4.4, sector: 'Utilities' },
    { symbol: 'COALINDIA', name: 'Coal India Ltd.', weightInFund: 3.9, sector: 'Energy & Mining' },
    { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', weightInFund: 3.5, sector: 'Automotive' },
    { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', weightInFund: 3.1, sector: 'Financials' }
  ],

  // UTI Nifty 50 Index Fund / Large Cap Index
  'NIFTY50': [
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', weightInFund: 11.8, sector: 'Financials' },
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', weightInFund: 9.4, sector: 'Oil & Gas' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', weightInFund: 7.9, sector: 'Financials' },
    { symbol: 'INFY', name: 'Infosys Ltd.', weightInFund: 5.6, sector: 'Information Technology' },
    { symbol: 'ITC', name: 'ITC Ltd.', weightInFund: 4.3, sector: 'Consumer FMCG' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', weightInFund: 3.9, sector: 'Information Technology' },
    { symbol: 'LT', name: 'Larsen & Toubro Ltd.', weightInFund: 3.7, sector: 'Capital Goods' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', weightInFund: 3.5, sector: 'Telecommunications' },
    { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', weightInFund: 3.2, sector: 'Financials' },
    { symbol: 'SBIN', name: 'State Bank of India', weightInFund: 2.9, sector: 'Financials' }
  ],

  // Mirae Asset Large Cap / Bluechip Fund
  'MIRAE': [
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', weightInFund: 9.6, sector: 'Financials' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', weightInFund: 8.8, sector: 'Financials' },
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', weightInFund: 7.5, sector: 'Oil & Gas' },
    { symbol: 'INFY', name: 'Infosys Ltd.', weightInFund: 6.2, sector: 'Information Technology' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', weightInFund: 4.8, sector: 'Information Technology' },
    { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', weightInFund: 4.1, sector: 'Financials' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', weightInFund: 3.8, sector: 'Telecommunications' },
    { symbol: 'LTIM', name: 'LTIMindtree Ltd.', weightInFund: 3.2, sector: 'Information Technology' },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd.', weightInFund: 3.0, sector: 'Financials' },
    { symbol: 'LT', name: 'Larsen & Toubro Ltd.', weightInFund: 2.8, sector: 'Capital Goods' }
  ],

  // Quant Active / Flexi Cap Fund
  'QUANT': [
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', weightInFund: 9.1, sector: 'Oil & Gas' },
    { symbol: 'JIOFIN', name: 'Jio Financial Services', weightInFund: 6.8, sector: 'Financials' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', weightInFund: 6.2, sector: 'Financials' },
    { symbol: 'SAIL', name: 'Steel Authority of India', weightInFund: 5.4, sector: 'Metals' },
    { symbol: 'TATAPOWER', name: 'Tata Power Company Ltd.', weightInFund: 4.9, sector: 'Utilities' },
    { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd.', weightInFund: 4.3, sector: 'Infrastructure' },
    { symbol: 'SBIN', name: 'State Bank of India', weightInFund: 4.1, sector: 'Financials' },
    { symbol: 'LICHSGFIN', name: 'LIC Housing Finance Ltd.', weightInFund: 3.7, sector: 'Financials' },
    { symbol: 'GAIL', name: 'GAIL (India) Ltd.', weightInFund: 3.5, sector: 'Energy & Gas' },
    { symbol: 'ITC', name: 'ITC Ltd.', weightInFund: 3.2, sector: 'Consumer FMCG' }
  ]
};

/**
 * Returns mapped underlying securities for a given holding
 */
export function getFundUnderlyingHoldings(holding: Holding): UnderlyingSecurity[] {
  const sym = (holding.symbol || '').toUpperCase();
  const name = (holding.name || '').toUpperCase();

  if (sym.includes('PPFAS') || name.includes('PARAG PARIKH')) {
    return KNOWN_FUND_PORTFOLIOS['PPFAS'];
  }
  if (sym.includes('NIFTY') || name.includes('INDEX') || sym.includes('UTI') || sym.includes('NIFTYBEES')) {
    return KNOWN_FUND_PORTFOLIOS['NIFTY50'];
  }
  if (sym.includes('MIRAE') || name.includes('BLUECHIP') || name.includes('LARGE CAP')) {
    return KNOWN_FUND_PORTFOLIOS['MIRAE'];
  }
  if (sym.includes('QUANT') || name.includes('QUANT')) {
    return KNOWN_FUND_PORTFOLIOS['QUANT'];
  }

  // Fallback representative portfolio for other equity mutual funds
  return KNOWN_FUND_PORTFOLIOS['NIFTY50'];
}

/**
 * Computes Pairwise Portfolio Overlap:
 * Overlap % = 2 * sum(min(w_A, w_B)) / (sum(w_A) + sum(w_B)) * 100
 */
export function computePairwiseOverlap(
  fundA: { name: string; holdings: UnderlyingSecurity[] },
  fundB: { name: string; holdings: UnderlyingSecurity[] }
): PairwiseOverlap {
  const mapB = new Map<string, UnderlyingSecurity>();
  fundB.holdings.forEach(h => mapB.set(h.symbol, h));

  const commonStocks: PairwiseOverlap['commonStocks'] = [];
  let minSum = 0;

  fundA.holdings.forEach(itemA => {
    const itemB = mapB.get(itemA.symbol);
    if (itemB) {
      const overlapWeight = Math.min(itemA.weightInFund, itemB.weightInFund);
      minSum += overlapWeight;
      commonStocks.push({
        symbol: itemA.symbol,
        weightInA: itemA.weightInFund,
        weightInB: itemB.weightInFund,
        overlapContribution: overlapWeight
      });
    }
  });

  const sumA = fundA.holdings.reduce((s, h) => s + h.weightInFund, 0);
  const sumB = fundB.holdings.reduce((s, h) => s + h.weightInFund, 0);
  const totalSum = sumA + sumB;

  const overlapPercent = totalSum > 0 ? (2 * minSum / totalSum) * 100 : 0;

  return {
    fundA: fundA.name,
    fundB: fundB.name,
    overlapPercent: Number(overlapPercent.toFixed(1)),
    commonStockCount: commonStocks.length,
    commonStocks: commonStocks.sort((a, b) => b.overlapContribution - a.overlapContribution)
  };
}

/**
 * Computes Look-Through Consolidated Stock Exposures across all direct equities and mutual funds
 */
export function computeLookThroughOverlap(holdings: Holding[]): OverlapAnalysisResult {
  const totalNetWorth = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  if (totalNetWorth === 0 || holdings.length === 0) {
    return {
      hasFunds: false,
      totalFundsAnalyzed: 0,
      pairwiseOverlaps: [],
      topConsolidatedExposures: [],
      highestOverlapPair: null,
      overallPortfolioStockCount: 0
    };
  }

  // Identify mutual funds and direct equities
  const mfHoldings = holdings.filter(
    h => h.assetClass === 'mutual_fund' || (h.assetClass === 'etf' && !h.symbol.includes('GOLDBEES'))
  );
  const directEquities = holdings.filter(h => h.assetClass === 'equity');

  const fundProfiles = mfHoldings.map(mf => ({
    fundHoldingId: mf.id,
    fundName: mf.name,
    fundSymbol: mf.symbol,
    fundValue: mf.currentValue,
    portfolioWeight: (mf.currentValue / totalNetWorth) * 100,
    topHoldings: getFundUnderlyingHoldings(mf)
  }));

  // Calculate Pairwise Overlaps between all mutual fund pairs
  const pairwiseOverlaps: PairwiseOverlap[] = [];
  for (let i = 0; i < fundProfiles.length; i++) {
    for (let j = i + 1; j < fundProfiles.length; j++) {
      const overlap = computePairwiseOverlap(
        { name: fundProfiles[i].fundName, holdings: fundProfiles[i].topHoldings },
        { name: fundProfiles[j].fundName, holdings: fundProfiles[j].topHoldings }
      );
      pairwiseOverlaps.push(overlap);
    }
  }

  pairwiseOverlaps.sort((a, b) => b.overlapPercent - a.overlapPercent);

  // Look-through aggregate stock exposures
  const exposureMap = new Map<string, LookThroughExposure>();

  // 1. Add direct equity holdings
  directEquities.forEach(eq => {
    exposureMap.set(eq.symbol, {
      symbol: eq.symbol,
      companyName: eq.name,
      sector: eq.sector || 'Equities',
      directHoldingValue: eq.currentValue,
      indirectFundValue: 0,
      totalEffectiveValue: eq.currentValue,
      effectivePortfolioWeight: (eq.currentValue / totalNetWorth) * 100,
      heldInFunds: [],
      isDirectlyHeld: true
    });
  });

  // 2. Add indirect exposures through mutual funds
  fundProfiles.forEach(fund => {
    fund.topHoldings.forEach(stock => {
      const indirectValue = fund.fundValue * (stock.weightInFund / 100);
      const existing = exposureMap.get(stock.symbol);

      if (existing) {
        existing.indirectFundValue += indirectValue;
        existing.totalEffectiveValue += indirectValue;
        existing.effectivePortfolioWeight = (existing.totalEffectiveValue / totalNetWorth) * 100;
        if (!existing.heldInFunds.includes(fund.fundName)) {
          existing.heldInFunds.push(fund.fundName);
        }
      } else {
        exposureMap.set(stock.symbol, {
          symbol: stock.symbol,
          companyName: stock.name,
          sector: stock.sector,
          directHoldingValue: 0,
          indirectFundValue: indirectValue,
          totalEffectiveValue: indirectValue,
          effectivePortfolioWeight: (indirectValue / totalNetWorth) * 100,
          heldInFunds: [fund.fundName],
          isDirectlyHeld: false
        });
      }
    });
  });

  const consolidatedList = Array.from(exposureMap.values()).sort(
    (a, b) => b.totalEffectiveValue - a.totalEffectiveValue
  );

  return {
    hasFunds: mfHoldings.length > 0,
    totalFundsAnalyzed: mfHoldings.length,
    pairwiseOverlaps,
    topConsolidatedExposures: consolidatedList,
    highestOverlapPair: pairwiseOverlaps.length > 0 ? pairwiseOverlaps[0] : null,
    overallPortfolioStockCount: consolidatedList.length
  };
}
