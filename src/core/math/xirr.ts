// Pure TypeScript Newton-Raphson XIRR & Financial Math Engine

export interface CashFlow {
  amount: number; // Negative for investments, positive for returns/current value
  date: Date;
}

/**
 * Calculates XIRR (Extended Internal Rate of Return) for irregular dates and cash flows
 * Uses Newton-Raphson with fallback to bisection solver
 */
export function calculateXIRR(cashFlows: CashFlow[], guess = 0.1): number {
  if (cashFlows.length < 2) return 0;

  // Verify at least one positive and one negative cashflow exists
  let hasPositive = false;
  let hasNegative = false;
  for (const cf of cashFlows) {
    if (cf.amount > 0) hasPositive = true;
    if (cf.amount < 0) hasNegative = true;
  }
  if (!hasPositive || !hasNegative) return 0;

  const startDate = cashFlows[0].date.getTime();
  const yearFractions = cashFlows.map(cf => (cf.date.getTime() - startDate) / (1000 * 60 * 60 * 24 * 365.25));

  let rate = guess;
  const maxIterations = 100;
  const tolerance = 1e-6;

  for (let i = 0; i < maxIterations; i++) {
    let fValue = 0;
    let fDerivative = 0;

    for (let j = 0; j < cashFlows.length; j++) {
      const yf = yearFractions[j];
      const amount = cashFlows[j].amount;
      const denom = Math.pow(1 + rate, yf);

      fValue += amount / denom;
      fDerivative -= (yf * amount) / (denom * (1 + rate));
    }

    if (Math.abs(fDerivative) < 1e-12) break;

    const nextRate = rate - fValue / fDerivative;

    if (Math.abs(nextRate - rate) < tolerance) {
      return nextRate * 100; // Return as percentage (e.g. 15.4%)
    }

    // Guard against runaway diverging rates
    if (isNaN(nextRate) || nextRate <= -1 || nextRate > 10) {
      rate = guess / 2;
      break;
    }

    rate = nextRate;
  }

  // If Newton-Raphson diverges, perform bisection between -0.99 and 5.0
  let low = -0.99;
  let high = 5.0;
  for (let iter = 0; iter < 60; iter++) {
    const mid = (low + high) / 2;
    let npv = 0;
    for (let j = 0; j < cashFlows.length; j++) {
      npv += cashFlows[j].amount / Math.pow(1 + mid, yearFractions[j]);
    }

    if (Math.abs(npv) < tolerance) {
      return mid * 100;
    }

    if (npv > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return rate * 100;
}

/**
 * Calculates CAGR (Compound Annual Growth Rate)
 */
export function calculateCAGR(beginValue: number, endValue: number, years: number): number {
  if (beginValue <= 0 || endValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / beginValue, 1 / years) - 1) * 100;
}

/**
 * Indian Number Formatting (₹ Lakhs & Crores)
 */
export function formatINR(value: number, options: { compact?: boolean; showDecimals?: boolean } = {}): string {
  if (isNaN(value)) return '₹0';
  const isNegative = value < 0;
  const absVal = Math.abs(value);

  if (options.compact) {
    if (absVal >= 10000000) {
      return `${isNegative ? '-' : ''}₹${(absVal / 10000000).toFixed(2)} Cr`;
    }
    if (absVal >= 100000) {
      return `${isNegative ? '-' : ''}₹${(absVal / 100000).toFixed(2)} L`;
    }
    if (absVal >= 1000) {
      return `${isNegative ? '-' : ''}₹${(absVal / 1000).toFixed(1)} K`;
    }
  }

  const parts = absVal.toFixed(options.showDecimals ? 2 : 0).split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const result = `${isNegative ? '-' : ''}₹${formattedInt}${parts[1] ? '.' + parts[1] : ''}`;
  return result;
}

/**
 * Percentage Formatter
 */
export function formatPercent(value: number, includeSign = false): string {
  if (isNaN(value)) return '0.00%';
  const prefix = includeSign && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}
