// KoshQ Financial Calculator Suite — 15+ Indian Financial Models

export interface CalculatorScheduleItem {
  year: number;
  invested: number;
  interestEarned: number;
  closingBalance: number;
}

// 1. SIP Calculator
export function calculateSIP(monthlyInvestment: number, expectedReturnRate: number, tenureYears: number) {
  const months = tenureYears * 12;
  const monthlyRate = expectedReturnRate / 12 / 100;
  
  // Future Value of SIP: P * [((1 + i)^n - 1) / i] * (1 + i)
  const futureValue = monthlyInvestment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
  const totalInvested = monthlyInvestment * months;
  const totalGains = futureValue - totalInvested;

  const schedule: CalculatorScheduleItem[] = [];
  let currentBalance = 0;
  let cumulativeInvested = 0;

  for (let y = 1; y <= tenureYears; y++) {
    for (let m = 1; m <= 12; m++) {
      cumulativeInvested += monthlyInvestment;
      currentBalance = (currentBalance + monthlyInvestment) * (1 + monthlyRate);
    }
    schedule.push({
      year: y,
      invested: cumulativeInvested,
      interestEarned: currentBalance - cumulativeInvested,
      closingBalance: currentBalance
    });
  }

  return { totalInvested, totalGains, futureValue, schedule };
}

// 2. Step-Up SIP Calculator
export function calculateStepUpSIP(initialMonthly: number, stepUpPercent: number, expectedReturnRate: number, tenureYears: number) {
  const monthlyRate = expectedReturnRate / 12 / 100;
  let totalInvested = 0;
  let futureValue = 0;
  let currentMonthly = initialMonthly;
  const schedule: CalculatorScheduleItem[] = [];

  for (let y = 1; y <= tenureYears; y++) {
    for (let m = 1; m <= 12; m++) {
      totalInvested += currentMonthly;
      futureValue = (futureValue + currentMonthly) * (1 + monthlyRate);
    }
    schedule.push({
      year: y,
      invested: totalInvested,
      interestEarned: futureValue - totalInvested,
      closingBalance: futureValue
    });
    // Step up monthly investment each year
    currentMonthly += (currentMonthly * stepUpPercent) / 100;
  }

  return { totalInvested, totalGains: futureValue - totalInvested, futureValue, schedule };
}

// 3. Lumpsum Calculator
export function calculateLumpsum(principal: number, expectedReturnRate: number, tenureYears: number) {
  const rate = expectedReturnRate / 100;
  const futureValue = principal * Math.pow(1 + rate, tenureYears);
  const totalGains = futureValue - principal;

  const schedule: CalculatorScheduleItem[] = [];
  let currentBal = principal;
  for (let y = 1; y <= tenureYears; y++) {
    currentBal = currentBal * (1 + rate);
    schedule.push({
      year: y,
      invested: principal,
      interestEarned: currentBal - principal,
      closingBalance: currentBal
    });
  }

  return { totalInvested: principal, totalGains, futureValue, schedule };
}

// 4. SWP Calculator (Systematic Withdrawal Plan)
export function calculateSWP(initialCorpus: number, monthlyWithdrawal: number, annualReturnRate: number, tenureYears: number) {
  const monthlyRate = annualReturnRate / 12 / 100;
  let balance = initialCorpus;
  let totalWithdrawn = 0;
  const schedule: { month: number; year: number; withdrawn: number; remainingBalance: number }[] = [];

  const totalMonths = tenureYears * 12;
  for (let m = 1; m <= totalMonths; m++) {
    balance = balance * (1 + monthlyRate);
    if (balance >= monthlyWithdrawal) {
      balance -= monthlyWithdrawal;
      totalWithdrawn += monthlyWithdrawal;
    } else {
      totalWithdrawn += balance;
      balance = 0;
      schedule.push({ month: m, year: Math.ceil(m / 12), withdrawn: totalWithdrawn, remainingBalance: 0 });
      break;
    }
    if (m % 12 === 0 || m === totalMonths) {
      schedule.push({ month: m, year: m / 12, withdrawn: totalWithdrawn, remainingBalance: balance });
    }
  }

  return { initialCorpus, totalWithdrawn, finalBalance: balance, schedule };
}

// 5. PPF Calculator (Public Provident Fund — 7.1% p.a., 15 Years)
export function calculatePPF(annualDeposit: number, tenureYears = 15, interestRate = 7.1) {
  const clampedDeposit = Math.min(annualDeposit, 150000); // Section 80C cap
  let balance = 0;
  let totalInvested = 0;
  const schedule: CalculatorScheduleItem[] = [];

  for (let y = 1; y <= tenureYears; y++) {
    totalInvested += clampedDeposit;
    // Deposited before 5th of April, earns full year interest
    const interest = (balance + clampedDeposit) * (interestRate / 100);
    balance = balance + clampedDeposit + interest;
    schedule.push({
      year: y,
      invested: totalInvested,
      interestEarned: balance - totalInvested,
      closingBalance: balance
    });
  }

  return { totalInvested, totalGains: balance - totalInvested, futureValue: balance, schedule };
}

// 6. EPF Calculator (Employee Provident Fund — 8.25% p.a.)
export function calculateEPF(monthlyBasicPlusDA: number, currentAge = 25, retirementAge = 58, annualSalaryHike = 5, interestRate = 8.25) {
  const tenureYears = retirementAge - currentAge;
  let employeeCorpus = 0;
  let employerCorpus = 0; // 3.67% goes to EPF, 8.33% goes to EPS
  let salary = monthlyBasicPlusDA;
  let totalEmployeeContrib = 0;
  let totalEmployerContrib = 0;

  for (let y = 1; y <= tenureYears; y++) {
    const annualEmployeeContrib = salary * 0.12 * 12;
    const annualEmployerEPFContrib = salary * 0.0367 * 12;

    totalEmployeeContrib += annualEmployeeContrib;
    totalEmployerContrib += annualEmployerEPFContrib;

    employeeCorpus = (employeeCorpus + annualEmployeeContrib) * (1 + interestRate / 100);
    employerCorpus = (employerCorpus + annualEmployerEPFContrib) * (1 + interestRate / 100);

    salary += (salary * annualSalaryHike) / 100;
  }

  const totalCorpus = employeeCorpus + employerCorpus;
  const totalContributed = totalEmployeeContrib + totalEmployerContrib;

  return {
    totalContributed,
    totalInterest: totalCorpus - totalContributed,
    totalCorpus,
    employeeCorpus,
    employerCorpus
  };
}

// 7. NPS Calculator (National Pension System)
export function calculateNPS(monthlyContrib: number, currentAge = 28, retirementAge = 60, expectedReturn = 10, annuitySharePercent = 40, expectedAnnuityRate = 6) {
  const tenureYears = retirementAge - currentAge;
  const months = tenureYears * 12;
  const monthlyRate = expectedReturn / 12 / 100;

  const totalCorpus = monthlyContrib * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
  const totalInvested = monthlyContrib * months;

  const annuityCorpus = (totalCorpus * annuitySharePercent) / 100;
  const lumpsumAmount = totalCorpus - annuityCorpus; // Tax-free up to 60%
  const estimatedMonthlyPension = (annuityCorpus * (expectedAnnuityRate / 100)) / 12;

  return { totalInvested, totalCorpus, lumpsumAmount, annuityCorpus, estimatedMonthlyPension };
}

// 8. Fixed Deposit (FD) Calculator
export function calculateFD(principal: number, annualRate: number, tenureYears: number, compoundingFrequency = 4) {
  // Frequency: 4 = Quarterly, 12 = Monthly, 1 = Annual
  const rate = annualRate / 100;
  const futureValue = principal * Math.pow(1 + rate / compoundingFrequency, compoundingFrequency * tenureYears);
  return { principal, totalInterest: futureValue - principal, maturityAmount: futureValue };
}

// 9. Bond YTM & Duration Solver
export function calculateBondYTM(faceValue: number, currentMarketPrice: number, couponRate: number, yearsToMaturity: number) {
  const annualCoupon = faceValue * (couponRate / 100);
  
  // Approximate YTM formula
  // YTM ~ [ C + (F - P) / n ] / [ (F + P) / 2 ]
  const approxYTM = ((annualCoupon + (faceValue - currentMarketPrice) / yearsToMaturity) / ((faceValue + currentMarketPrice) / 2)) * 100;

  // Approximate Macaulay Duration
  const ytmDecimal = approxYTM / 100;
  let weightedCashFlows = 0;
  for (let t = 1; t <= yearsToMaturity; t++) {
    const cashFlow = t === yearsToMaturity ? annualCoupon + faceValue : annualCoupon;
    weightedCashFlows += (t * cashFlow) / Math.pow(1 + ytmDecimal, t);
  }
  const macaulayDuration = weightedCashFlows / currentMarketPrice;

  return { approxYTM, macaulayDuration, annualCoupon };
}

// 10. Retirement & FIRE Calculator
export function calculateFIRE(currentMonthlyExpense: number, currentAge = 30, fireAge = 45, lifeExpectancy = 85, inflationRate = 6, postRetireReturn = 8, safeWithdrawalRate = 3.5) {
  const yearsToRetire = fireAge - currentAge;
  const retireYears = lifeExpectancy - fireAge;
  
  // Inflation-adjusted monthly expense at retirement
  const expenseAtRetire = currentMonthlyExpense * Math.pow(1 + inflationRate / 100, yearsToRetire);
  const annualExpenseAtRetire = expenseAtRetire * 12;

  // FIRE Target based on Safe Withdrawal Rate (e.g. 28.5x annual expenses for 3.5% SWR)
  const fireCorpusTarget = annualExpenseAtRetire / (safeWithdrawalRate / 100);

  return {
    expenseAtRetire,
    annualExpenseAtRetire,
    fireCorpusTarget,
    yearsToRetire,
    retireYears
  };
}

// 11. Inflation Impact Calculator
export function calculateInflationImpact(currentCost: number, inflationRate = 6, years = 10) {
  const futureCost = currentCost * Math.pow(1 + inflationRate / 100, years);
  const purchasingPowerLoss = (1 - (currentCost / futureCost)) * 100;
  return { currentCost, futureCost, purchasingPowerLoss, multiplier: futureCost / currentCost };
}

// 12. Gratuity Calculator (Payment of Gratuity Act 1972)
export function calculateGratuity(lastDrawnBasicPlusDA: number, completedYearsOfService: number) {
  if (completedYearsOfService < 5) {
    return { eligible: false, gratuityAmount: 0, note: "Minimum 5 years continuous service required by law." };
  }
  // Formula: (15 * Last Drawn Basic+DA * Tenure) / 26
  const rawGratuity = (15 * lastDrawnBasicPlusDA * completedYearsOfService) / 26;
  const statutoryCap = 2000000; // ₹20 Lakh tax-exempt limit
  const payableGratuity = Math.min(rawGratuity, statutoryCap);

  return {
    eligible: true,
    rawGratuity,
    payableGratuity,
    isCapped: rawGratuity > statutoryCap
  };
}

// 13. Goal Target SIP Reverse Solver
export function calculateGoalSIP(targetAmount: number, tenureYears: number, expectedReturnRate = 12) {
  const months = tenureYears * 12;
  const monthlyRate = expectedReturnRate / 12 / 100;
  
  // Target = P * [((1 + i)^n - 1) / i] * (1 + i)
  // P = Target / [ ((1 + i)^n - 1) / i * (1 + i) ]
  const factor = ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
  const requiredMonthlySIP = targetAmount / factor;
  const totalInvested = requiredMonthlySIP * months;

  return {
    targetAmount,
    requiredMonthlySIP,
    totalInvested,
    expectedGains: targetAmount - totalInvested
  };
}
