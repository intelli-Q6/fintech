// Performance Attribution & Return Contribution Engine
// Calculates exact mathematical contribution of each asset class, sector, and holding to overall portfolio gain

import { Holding } from '../../data/types';

export interface HoldingAttribution {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  sector: string;
  weight: number; // % of total portfolio
  returnPercent: number; // unrealized gain %
  absoluteGain: number; // in INR
  contributionPercent: number; // Weight * Return% / 100 (in percentage points)
  relativeShareOfGain: number; // (absoluteGain / totalPortfolioGain) * 100
}

export interface SectorAttribution {
  sector: string;
  totalValue: number;
  weight: number; // % of total portfolio
  totalGain: number;
  returnPercent: number;
  contributionPercent: number; // contribution to total portfolio return
}

export interface AssetClassAttribution {
  assetClass: string;
  totalValue: number;
  weight: number;
  totalGain: number;
  returnPercent: number;
  contributionPercent: number;
}

export interface PortfolioAttributionReport {
  totalNetWorth: number;
  totalInvested: number;
  totalGain: number;
  overallReturnPercent: number;
  holdingAttributions: HoldingAttribution[];
  topContributors: HoldingAttribution[];
  topDetractors: HoldingAttribution[];
  sectorAttributions: SectorAttribution[];
  assetClassAttributions: AssetClassAttribution[];
}

export function computePerformanceAttribution(holdings: Holding[]): PortfolioAttributionReport {
  const totalNetWorth = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalInvested = holdings.reduce((s, h) => s + h.investedAmount, 0);
  const totalGain = totalNetWorth - totalInvested;
  const overallReturnPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  if (totalNetWorth === 0 || holdings.length === 0) {
    return {
      totalNetWorth: 0,
      totalInvested: 0,
      totalGain: 0,
      overallReturnPercent: 0,
      holdingAttributions: [],
      topContributors: [],
      topDetractors: [],
      sectorAttributions: [],
      assetClassAttributions: []
    };
  }

  // 1. Holding-Level Attributions
  const holdingAttributions: HoldingAttribution[] = holdings.map(h => {
    const weight = (h.currentValue / totalNetWorth) * 100;
    const returnPercent = h.unrealizedGainPercent;
    // Contribution in percentage points = (Gain of holding / Total Portfolio Invested) * 100
    const contributionPercent = totalInvested > 0 ? (h.unrealizedGain / totalInvested) * 100 : 0;
    const relativeShareOfGain = totalGain !== 0 ? (h.unrealizedGain / totalGain) * 100 : 0;

    return {
      id: h.id,
      symbol: h.symbol,
      name: h.name,
      assetClass: h.assetClass,
      sector: h.sector || 'General',
      weight: Number(weight.toFixed(2)),
      returnPercent: Number(returnPercent.toFixed(2)),
      absoluteGain: h.unrealizedGain,
      contributionPercent: Number(contributionPercent.toFixed(2)),
      relativeShareOfGain: Number(relativeShareOfGain.toFixed(2))
    };
  });

  // Sort by absolute gain descending
  const sortedByGain = [...holdingAttributions].sort((a, b) => b.absoluteGain - a.absoluteGain);
  const topContributors = sortedByGain.filter(h => h.absoluteGain > 0).slice(0, 5);
  const topDetractors = [...sortedByGain].reverse().filter(h => h.absoluteGain < 0).slice(0, 5);

  // 2. Sector Attributions
  const sectorMap = new Map<string, { totalValue: number; totalInvested: number; totalGain: number }>();
  holdings.forEach(h => {
    const sec = h.sector || 'Unclassified';
    const cur = sectorMap.get(sec) || { totalValue: 0, totalInvested: 0, totalGain: 0 };
    cur.totalValue += h.currentValue;
    cur.totalInvested += h.investedAmount;
    cur.totalGain += h.unrealizedGain;
    sectorMap.set(sec, cur);
  });

  const sectorAttributions: SectorAttribution[] = Array.from(sectorMap.entries()).map(([sector, data]) => {
    const weight = (data.totalValue / totalNetWorth) * 100;
    const returnPercent = data.totalInvested > 0 ? (data.totalGain / data.totalInvested) * 100 : 0;
    const contributionPercent = totalInvested > 0 ? (data.totalGain / totalInvested) * 100 : 0;
    return {
      sector,
      totalValue: data.totalValue,
      weight: Number(weight.toFixed(2)),
      totalGain: data.totalGain,
      returnPercent: Number(returnPercent.toFixed(2)),
      contributionPercent: Number(contributionPercent.toFixed(2))
    };
  }).sort((a, b) => b.totalGain - a.totalGain);

  // 3. Asset Class Attributions
  const classMap = new Map<string, { totalValue: number; totalInvested: number; totalGain: number }>();
  holdings.forEach(h => {
    const cls = h.assetClass;
    const cur = classMap.get(cls) || { totalValue: 0, totalInvested: 0, totalGain: 0 };
    cur.totalValue += h.currentValue;
    cur.totalInvested += h.investedAmount;
    cur.totalGain += h.unrealizedGain;
    classMap.set(cls, cur);
  });

  const assetClassAttributions: AssetClassAttribution[] = Array.from(classMap.entries()).map(([assetClass, data]) => {
    const weight = (data.totalValue / totalNetWorth) * 100;
    const returnPercent = data.totalInvested > 0 ? (data.totalGain / data.totalInvested) * 100 : 0;
    const contributionPercent = totalInvested > 0 ? (data.totalGain / totalInvested) * 100 : 0;
    return {
      assetClass,
      totalValue: data.totalValue,
      weight: Number(weight.toFixed(2)),
      totalGain: data.totalGain,
      returnPercent: Number(returnPercent.toFixed(2)),
      contributionPercent: Number(contributionPercent.toFixed(2))
    };
  }).sort((a, b) => b.totalValue - a.totalValue);

  return {
    totalNetWorth,
    totalInvested,
    totalGain,
    overallReturnPercent: Number(overallReturnPercent.toFixed(2)),
    holdingAttributions: sortedByGain,
    topContributors,
    topDetractors,
    sectorAttributions,
    assetClassAttributions
  };
}
