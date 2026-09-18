// Historical Crisis Replay & Sovereign Portfolio Stress Testing Engine

import { Holding } from '../../data/types';

export interface CrisisScenario {
  id: string;
  name: string;
  period: string;
  durationMonths: number;
  recoveryMonths: number;
  description: string;
  assetDrawdowns: {
    equityLargeCap: number; // e.g. -55
    equityMidSmall: number; // e.g. -68
    mutualFunds: number;
    gold: number;          // e.g. +28
    bonds: number;         // e.g. +9
    cash: number;          // e.g. 0
  };
  keyMacroTriggers: string[];
}

export interface StressedPortfolioOutcome {
  scenario: CrisisScenario;
  originalNetWorth: number;
  troughNetWorth: number;
  totalDrawdownAmount: number;
  totalDrawdownPercent: number;
  liquidCashBuffer: number;
  estimatedMonthlyExpenses: number;
  liquidSurvivalRunwayMonths: number;
  assetClassLossBreakdown: {
    assetClass: string;
    preValue: number;
    postValue: number;
    lossAmount: number;
    lossPercent: number;
  }[];
  trajectoryPoints: {
    month: string;
    portfolioValue: number;
    isTrough?: boolean;
  }[];
}

export const CRISIS_SCENARIOS: CrisisScenario[] = [
  {
    id: 'covid_2020',
    name: 'March 2020 COVID-19 Flash Crash',
    period: 'Feb 2020 – Apr 2020',
    durationMonths: 2,
    recoveryMonths: 7,
    description: 'Unprecedented pandemic lockdowns triggered global margin liquidation. Nifty 50 crashed 38% in 22 trading sessions before central bank liquidity sparked a swift V-shaped recovery.',
    assetDrawdowns: {
      equityLargeCap: -38.2,
      equityMidSmall: -44.5,
      mutualFunds: -36.0,
      gold: +12.4,
      bonds: +3.2,
      cash: 0
    },
    keyMacroTriggers: [
      'Nifty 50 crashed from 12,200 to 7,511 in 1 month',
      'Global equities witnessed extreme volatility circuit breakers',
      'RBI slashed repo rate by 75 bps and announced ₹3.74 Lakh Cr liquidity',
      'Gold appreciated as institutional dollar flight-to-safety asset'
    ]
  },
  {
    id: 'gfc_2008',
    name: '2008 Global Financial Crisis (Lehman Shock)',
    period: 'Jan 2008 – Mar 2009',
    durationMonths: 14,
    recoveryMonths: 24,
    description: 'Subprime mortgage collapse in the US froze interbank lending worldwide. Foreign institutional investors pulled unprecedented capital from Indian markets, causing a protracted 14-month drawdown.',
    assetDrawdowns: {
      equityLargeCap: -55.4,
      equityMidSmall: -69.2,
      mutualFunds: -52.0,
      gold: +28.5,
      bonds: +9.4,
      cash: 0
    },
    keyMacroTriggers: [
      'Sensex fell from 21,000 to 8,160 over 14 grueling months',
      'FII net outflows exceeded $13 Billion from Indian equities',
      'RBI eased CRR aggressively; G-Sec 10Y yields rallied down 180 bps',
      'Gold emerged as sovereign crisis ballast with positive 28% return'
    ]
  },
  {
    id: 'rate_hikes_2022',
    name: '2022 Global Inflation & Rate Shock',
    period: 'Oct 2021 – Jun 2022',
    durationMonths: 9,
    recoveryMonths: 14,
    description: 'Post-pandemic supply chain bottlenecks and Russia-Ukraine war drove Brent Crude to $130/bbl. US Fed and RBI enacted aggressive 500bps rate hikes, suppressing long-duration bond and tech valuations.',
    assetDrawdowns: {
      equityLargeCap: -16.8,
      equityMidSmall: -23.5,
      mutualFunds: -18.0,
      gold: +14.2,
      bonds: -7.5,
      cash: 0
    },
    keyMacroTriggers: [
      'RBI hiked repo rate from 4.00% to 6.50% in quick succession',
      'Brent crude spiked to $139/bbl; USD/INR breached ₹83 mark',
      'Long-term debt funds suffered marked-to-market bond duration losses',
      'IT sector de-rated 30% from peak amid discretionary spend cuts'
    ]
  },
  {
    id: 'taper_tantrum_2013',
    name: '2013 "Taper Tantrum" & Rupee Crisis',
    period: 'May 2013 – Sep 2013',
    durationMonths: 5,
    recoveryMonths: 12,
    description: 'Fed Chairman Ben Bernanke hinted at slowing QE bond purchases. Capital fled emerging markets, India was tagged among the "Fragile Five", and USD/INR plunged from ₹54 to ₹68.80.',
    assetDrawdowns: {
      equityLargeCap: -18.5,
      equityMidSmall: -32.0,
      mutualFunds: -21.0,
      gold: +22.0,
      bonds: -8.8,
      cash: 0
    },
    keyMacroTriggers: [
      'USD/INR collapsed 27% in 4 months as CAD reached 4.8% of GDP',
      '10-Year Indian G-Sec yield spiked overnight from 7.2% to 9.2%',
      'RBI raised Marginal Standing Facility rate by 200 bps to defend INR',
      'Gold prices in INR spiked due to rupee depreciation and import duty hikes'
    ]
  },
  {
    id: 'stagflation_shock',
    name: 'Geopolitical Energy & Stagflation Shock',
    period: 'Hypothetical High-Stress Simulation',
    durationMonths: 6,
    recoveryMonths: 18,
    description: 'Middle East geopolitical conflict disrupts Strait of Hormuz. Crude oil surges to $130/bbl, driving severe Indian Current Account Deficit pressures, retail inflation > 7.5%, and currency depreciation.',
    assetDrawdowns: {
      equityLargeCap: -21.0,
      equityMidSmall: -28.0,
      mutualFunds: -22.5,
      gold: +24.0,
      bonds: -5.0,
      cash: 0
    },
    keyMacroTriggers: [
      'Crude import bill surges 60%; OMC and paint stocks face margin collapse',
      'RBI forced to pause rate cuts and hike statutory liquidity requirements',
      'Gold surges as primary sovereign physical wealth shelter',
      'Liquid cash reserves provide vital stability while equities de-rate'
    ]
  }
];

export function runCrisisSimulation(
  holdings: Holding[],
  scenarioId: string = 'covid_2020',
  monthlyExpenses: number = 65000
): StressedPortfolioOutcome {
  const scenario = CRISIS_SCENARIOS.find(s => s.id === scenarioId) || CRISIS_SCENARIOS[0];

  let originalNetWorth = 0;
  let troughNetWorth = 0;
  let liquidCashBuffer = 0;

  const classMap: Record<string, { pre: number; post: number }> = {
    equity: { pre: 0, post: 0 },
    mutual_fund: { pre: 0, post: 0 },
    gold: { pre: 0, post: 0 },
    bond: { pre: 0, post: 0 },
    cash: { pre: 0, post: 0 }
  };

  holdings.forEach(h => {
    const val = h.currentValue;
    originalNetWorth += val;

    let drawdownPct = 0;
    if (h.assetClass === 'equity') {
      const isMidSmall = h.marketCapCategory === 'Mid Cap' || h.marketCapCategory === 'Small Cap';
      drawdownPct = isMidSmall ? scenario.assetDrawdowns.equityMidSmall : scenario.assetDrawdowns.equityLargeCap;
      classMap.equity.pre += val;
      classMap.equity.post += val * (1 + drawdownPct / 100);
    } else if (h.assetClass === 'mutual_fund') {
      drawdownPct = scenario.assetDrawdowns.mutualFunds;
      classMap.mutual_fund.pre += val;
      classMap.mutual_fund.post += val * (1 + drawdownPct / 100);
    } else if (h.assetClass === 'gold') {
      drawdownPct = scenario.assetDrawdowns.gold;
      classMap.gold.pre += val;
      classMap.gold.post += val * (1 + drawdownPct / 100);
    } else if (h.assetClass === 'bond' || h.assetClass === 'govt_scheme') {
      drawdownPct = scenario.assetDrawdowns.bonds;
      classMap.bond.pre += val;
      classMap.bond.post += val * (1 + drawdownPct / 100);
    } else {
      drawdownPct = scenario.assetDrawdowns.cash;
      classMap.cash.pre += val;
      classMap.cash.post += val * (1 + drawdownPct / 100);
      liquidCashBuffer += val;
    }

    troughNetWorth += val * (1 + drawdownPct / 100);
  });

  const totalDrawdownAmount = originalNetWorth - troughNetWorth;
  const totalDrawdownPercent = originalNetWorth > 0 ? (totalDrawdownAmount / originalNetWorth) * 100 : 0;

  // Liquid survival runway: how many months living expenses are covered by cash buffer alone
  const liquidSurvivalRunwayMonths = monthlyExpenses > 0 ? Number((liquidCashBuffer / monthlyExpenses).toFixed(1)) : 0;

  // Asset class breakdown
  const assetClassLossBreakdown = Object.entries(classMap).map(([key, data]) => {
    const lossAmount = data.pre - data.post;
    const lossPercent = data.pre > 0 ? (lossAmount / data.pre) * 100 : 0;
    return {
      assetClass: key === 'mutual_fund' ? 'Mutual Funds' : key.charAt(0).toUpperCase() + key.slice(1),
      preValue: Math.round(data.pre),
      postValue: Math.round(data.post),
      lossAmount: Math.round(lossAmount),
      lossPercent: Number(lossPercent.toFixed(1))
    };
  });

  // 24-Month Trajectory Simulation
  const trajectoryPoints = [];
  const totalMonths = 24;
  const troughMonth = Math.min(scenario.durationMonths, 10);

  for (let m = 0; m <= totalMonths; m += 2) {
    let val = originalNetWorth;
    if (m <= troughMonth) {
      const dropRatio = m / troughMonth;
      val = originalNetWorth - totalDrawdownAmount * dropRatio;
    } else {
      const recoveryRatio = (m - troughMonth) / (totalMonths - troughMonth);
      // Modeled exponential recovery to 105% of initial value
      val = troughNetWorth + (originalNetWorth * 1.05 - troughNetWorth) * Math.pow(recoveryRatio, 0.85);
    }

    trajectoryPoints.push({
      month: m === 0 ? 'Start (M0)' : m === troughMonth ? `Trough (M${m})` : `M${m}`,
      portfolioValue: Math.round(val),
      isTrough: m === troughMonth
    });
  }

  return {
    scenario,
    originalNetWorth: Math.round(originalNetWorth),
    troughNetWorth: Math.round(troughNetWorth),
    totalDrawdownAmount: Math.round(totalDrawdownAmount),
    totalDrawdownPercent: Number(totalDrawdownPercent.toFixed(2)),
    liquidCashBuffer: Math.round(liquidCashBuffer),
    estimatedMonthlyExpenses: monthlyExpenses,
    liquidSurvivalRunwayMonths,
    assetClassLossBreakdown,
    trajectoryPoints
  };
}

export function simulateCrisisScenario(
  holdings: Holding[],
  scenario: CrisisScenario,
  monthlyExpenses: number = 60000
): StressedPortfolioOutcome {
  return runCrisisSimulation(holdings, scenario.id, monthlyExpenses);
}
