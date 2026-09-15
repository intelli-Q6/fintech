// Sovereign Portfolio Rebalancing & Non-Taxable SIP Realignment Engine

import { Holding } from '../../data/types';

export type AllocationProfileId = 'aggressive' | 'balanced' | 'conservative' | 'all_weather' | 'custom';

export interface AllocationProfile {
  id: AllocationProfileId;
  name: string;
  description: string;
  targetWeights: {
    equity: number;      // in %
    debt: number;        // in %
    gold: number;        // in %
    cash: number;        // in %
  };
}

export const PRESET_ALLOCATION_PROFILES: AllocationProfile[] = [
  {
    id: 'aggressive',
    name: 'Aggressive Capital Compounder',
    description: 'Oriented toward long-term wealth compounding with high equity tolerance and low liquidity buffer.',
    targetWeights: { equity: 70, debt: 15, gold: 10, cash: 5 }
  },
  {
    id: 'balanced',
    name: 'Balanced Sovereign Workstation',
    description: 'Optimal risk-adjusted balance for Indian market cycles with solid debt coupon and gold crisis ballast.',
    targetWeights: { equity: 50, debt: 30, gold: 10, cash: 10 }
  },
  {
    id: 'conservative',
    name: 'Conservative Capital Preservation',
    description: 'Prioritizes capital protection, steady income generation, and minimal drawdown volatility.',
    targetWeights: { equity: 30, debt: 50, gold: 10, cash: 10 }
  },
  {
    id: 'all_weather',
    name: 'Harry Browne All-Weather Sovereign',
    description: 'Equal quad-split designed to survive prosperity, inflation, deflation, and recession equally.',
    targetWeights: { equity: 25, debt: 25, gold: 25, cash: 25 }
  }
];

export interface AssetClassRebalanceRow {
  assetClass: 'equity' | 'debt' | 'gold' | 'cash';
  label: string;
  currentValue: number;
  currentWeight: number; // in %
  targetWeight: number;  // in %
  weightDrift: number;   // currentWeight - targetWeight
  status: 'Overweight' | 'Underweight' | 'Balanced';
  // Strategy 1: Non-Taxable SIP Allocation
  sipAllocatedAmount: number;
  sipAllocatedPercent: number;
  // Strategy 2: Direct Rebalance Trades
  directTradeAction: 'BUY' | 'SELL' | 'HOLD';
  directTradeAmount: number;
}

export interface RebalanceAnalysisResult {
  totalPortfolioValue: number;
  profile: AllocationProfile;
  rows: AssetClassRebalanceRow[];
  totalAbsoluteDrift: number;
  isRebalanceRecommended: boolean;
  // Fresh Inflow Strategy
  monthlyInflow: number;
  totalSipAllocated: number;
  estimatedTaxDragDirect: number; // estimated LTCG/exit load if direct sell executed
}

export function computePortfolioRebalancing(
  holdings: Holding[],
  profile: AllocationProfile,
  monthlyInflow: number = 60000
): RebalanceAnalysisResult {
  let totalPortfolioValue = 0;
  const currentValues = {
    equity: 0,
    debt: 0,
    gold: 0,
    cash: 0
  };

  holdings.forEach(h => {
    totalPortfolioValue += h.currentValue;
    if (h.assetClass === 'equity' || h.assetClass === 'mutual_fund') {
      currentValues.equity += h.currentValue;
    } else if (h.assetClass === 'gold') {
      currentValues.gold += h.currentValue;
    } else if (h.assetClass === 'bond' || h.assetClass === 'govt_scheme') {
      currentValues.debt += h.currentValue;
    } else {
      currentValues.cash += h.currentValue;
    }
  });

  const keys: ('equity' | 'debt' | 'gold' | 'cash')[] = ['equity', 'debt', 'gold', 'cash'];
  const labels = {
    equity: 'Equities & Equity Mutual Funds',
    debt: 'Bonds, G-Secs & Govt Schemes',
    gold: 'Sovereign Gold Bonds & Physical Gold',
    cash: 'Liquid Reserves & Swept Cash'
  };

  // 1. Calculate Drift
  let totalAbsoluteDrift = 0;
  const underweightClasses: { key: 'equity' | 'debt' | 'gold' | 'cash'; shortfallINR: number }[] = [];

  const rows: AssetClassRebalanceRow[] = keys.map(k => {
    const curVal = currentValues[k];
    const curWeight = totalPortfolioValue > 0 ? (curVal / totalPortfolioValue) * 100 : 0;
    const tgtWeight = profile.targetWeights[k];
    const drift = curWeight - tgtWeight;
    totalAbsoluteDrift += Math.abs(drift);

    const targetINR = (totalPortfolioValue * tgtWeight) / 100;
    const diffINR = curVal - targetINR;

    let status: 'Overweight' | 'Underweight' | 'Balanced' = 'Balanced';
    if (drift > 2.0) status = 'Overweight';
    else if (drift < -2.0) status = 'Underweight';

    if (diffINR < 0) {
      underweightClasses.push({ key: k, shortfallINR: Math.abs(diffINR) });
    }

    // Direct trade:
    const directAction = diffINR > 5000 ? 'SELL' : diffINR < -5000 ? 'BUY' : 'HOLD';

    return {
      assetClass: k,
      label: labels[k],
      currentValue: Math.round(curVal),
      currentWeight: Number(curWeight.toFixed(1)),
      targetWeight: tgtWeight,
      weightDrift: Number(drift.toFixed(1)),
      status,
      sipAllocatedAmount: 0,
      sipAllocatedPercent: 0,
      directTradeAction: directAction,
      directTradeAmount: Math.round(Math.abs(diffINR))
    };
  });

  // 2. Non-Taxable SIP Realignment Algorithm
  // Direct incoming new cash strictly into underweight assets proportional to their shortfall
  const totalShortfall = underweightClasses.reduce((s, u) => s + u.shortfallINR, 0);
  if (totalShortfall > 0 && monthlyInflow > 0) {
    underweightClasses.forEach(u => {
      const proportion = u.shortfallINR / totalShortfall;
      const alloc = Math.round(monthlyInflow * proportion);
      const row = rows.find(r => r.assetClass === u.key);
      if (row) {
        row.sipAllocatedAmount = alloc;
        row.sipAllocatedPercent = Number(((alloc / monthlyInflow) * 100).toFixed(1));
      }
    });
  } else {
    // If portfolio is balanced, distribute according to target weights
    rows.forEach(r => {
      const alloc = Math.round((monthlyInflow * r.targetWeight) / 100);
      r.sipAllocatedAmount = alloc;
      r.sipAllocatedPercent = r.targetWeight;
    });
  }

  // Estimate potential tax drag of direct sell rebalance (assuming 25% of sell value is capital gain taxed @ 12.5%)
  const totalSellAmount = rows
    .filter(r => r.directTradeAction === 'SELL')
    .reduce((s, r) => s + r.directTradeAmount, 0);
  const estimatedTaxDragDirect = Math.round(totalSellAmount * 0.25 * 0.125);

  return {
    totalPortfolioValue: Math.round(totalPortfolioValue),
    profile,
    rows,
    totalAbsoluteDrift: Number(totalAbsoluteDrift.toFixed(1)),
    isRebalanceRecommended: totalAbsoluteDrift > 8.0,
    monthlyInflow,
    totalSipAllocated: monthlyInflow,
    estimatedTaxDragDirect
  };
}
