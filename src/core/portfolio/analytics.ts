// Portfolio Analytics & Concentration Engine (Pure Math, Non-Intermediary)

export interface AssetAllocationItem {
  assetClass: 'equity' | 'mutual_fund' | 'etf' | 'bond' | 'gold' | 'govt_scheme' | 'cash';
  name: string;
  value: number;
  weight: number; // in percentage (0 - 100)
  color: string;
}

export interface SectorExposureItem {
  sector: string;
  value: number;
  weight: number;
}

export interface ConcentrationMetrics {
  hhiScore: number;
  hhiClassification: 'Well Diversified' | 'Moderate Concentration' | 'High Concentration';
  top3Concentration: number;
  top5Concentration: number;
  top10Concentration: number;
  totalHoldingsCount: number;
}

/**
 * Calculates Herfindahl-Hirschman Index (HHI) and concentration percentages
 * Objective mathematical measure of portfolio concentration
 */
export function calculateConcentration(holdings: { name: string; currentValue: number }[]): ConcentrationMetrics {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  if (totalValue === 0 || holdings.length === 0) {
    return {
      hhiScore: 0,
      hhiClassification: 'Well Diversified',
      top3Concentration: 0,
      top5Concentration: 0,
      top10Concentration: 0,
      totalHoldingsCount: 0
    };
  }

  // Calculate weights (0 - 100)
  const sorted = [...holdings]
    .map(h => (h.currentValue / totalValue) * 100)
    .sort((a, b) => b - a);

  // HHI is sum of squares of weights
  const hhiScore = sorted.reduce((sum, w) => sum + Math.pow(w, 2), 0);

  let hhiClassification: 'Well Diversified' | 'Moderate Concentration' | 'High Concentration' = 'Well Diversified';
  if (hhiScore > 2500) {
    hhiClassification = 'High Concentration';
  } else if (hhiScore >= 1500) {
    hhiClassification = 'Moderate Concentration';
  }

  const top3Concentration = sorted.slice(0, 3).reduce((sum, w) => sum + w, 0);
  const top5Concentration = sorted.slice(0, 5).reduce((sum, w) => sum + w, 0);
  const top10Concentration = sorted.slice(0, 10).reduce((sum, w) => sum + w, 0);

  return {
    hhiScore: Math.round(hhiScore),
    hhiClassification,
    top3Concentration,
    top5Concentration,
    top10Concentration,
    totalHoldingsCount: holdings.length
  };
}

/**
 * Computes Sector Overlap and Exposure
 */
export function calculateSectorExposure(items: { sector: string; currentValue: number }[]): SectorExposureItem[] {
  const totalValue = items.reduce((sum, i) => sum + i.currentValue, 0);
  if (totalValue === 0) return [];

  const sectorMap = new Map<string, number>();
  for (const item of items) {
    const current = sectorMap.get(item.sector) || 0;
    sectorMap.set(item.sector, current + item.currentValue);
  }

  return Array.from(sectorMap.entries())
    .map(([sector, value]) => ({
      sector,
      value,
      weight: (value / totalValue) * 100
    }))
    .sort((a, b) => b.weight - a.weight);
}
