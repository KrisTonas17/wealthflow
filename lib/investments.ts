export interface InvestmentAccount {
  id: string;
  type: 'investment' | 'savings' | 'home' | 'crypto' | 'cash' | 'other';
  name: string;
  startingBalance: number;
  monthlyContribution: number;
  annualReturn: number; // percentage
  // Home-specific
  mortgageRate?: number;
  homeValue?: number;
  loanAmount?: number;
  loanTermYears?: number;
  yearsPaid?: number;
  // Display
  color: string;
  enabled: boolean;
}

export interface ProjectionPoint {
  month: number;
  year: number;
  label: string;
  total: number;
  byAccount: Record<string, number>;
}

export function calculateMortgagePayment(principal: number, annualRate: number, termYears: number): number {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function calculateHomeEquity(
  homeValue: number,
  loanAmount: number,
  mortgageRate: number,
  loanTermYears: number,
  yearsPaid: number,
  monthsAhead: number,
  appreciationRate: number = 4.0
): number {
  // Current equity
  const r = mortgageRate / 100 / 12;
  const n = loanTermYears * 12;
  const paid = yearsPaid * 12;
  
  let remainingBalance = loanAmount;
  if (r > 0) {
    remainingBalance = loanAmount * (Math.pow(1 + r, n) - Math.pow(1 + r, paid)) / (Math.pow(1 + r, n) - 1);
  } else {
    remainingBalance = loanAmount * (1 - paid / n);
  }
  
  // Future equity after monthsAhead
  let futureBalance = remainingBalance;
  const monthlyPayment = calculateMortgagePayment(loanAmount, mortgageRate, loanTermYears);
  
  for (let m = 0; m < monthsAhead; m++) {
    const interest = futureBalance * r;
    const principal = monthlyPayment - interest;
    futureBalance = Math.max(0, futureBalance - principal);
  }
  
  const futureHomeValue = homeValue * Math.pow(1 + appreciationRate / 100 / 12, monthsAhead);
  return futureHomeValue - futureBalance;
}

export function projectInvestments(
  accounts: InvestmentAccount[],
  months: number
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  
  // Initialize balances
  const balances: Record<string, number> = {};
  accounts.forEach(acc => {
    if (acc.enabled) balances[acc.id] = acc.startingBalance;
  });

  for (let m = 0; m <= months; m++) {
    const year = Math.floor(m / 12);
    const monthInYear = m % 12;
    const label = m === 0 ? 'Now' : year === 0 ? `Mo ${m}` : monthInYear === 0 ? `Yr ${year}` : '';
    
    const byAccount: Record<string, number> = {};
    let total = 0;
    
    accounts.forEach(acc => {
      if (!acc.enabled) return;
      
      if (acc.type === 'home') {
        const equity = calculateHomeEquity(
          acc.homeValue || acc.startingBalance,
          acc.loanAmount || 0,
          acc.mortgageRate || 3,
          acc.loanTermYears || 30,
          acc.yearsPaid || 0,
          m
        );
        byAccount[acc.id] = Math.max(0, equity);
        total += Math.max(0, equity);
      } else if (acc.type === 'cash') {
        balances[acc.id] = (balances[acc.id] || acc.startingBalance) + (m > 0 ? acc.monthlyContribution : 0);
        byAccount[acc.id] = balances[acc.id];
        total += balances[acc.id];
      } else {
        if (m > 0) {
          const monthlyReturn = acc.annualReturn / 100 / 12;
          balances[acc.id] = (balances[acc.id] || acc.startingBalance) * (1 + monthlyReturn) + acc.monthlyContribution;
        }
        byAccount[acc.id] = balances[acc.id] || acc.startingBalance;
        total += balances[acc.id] || acc.startingBalance;
      }
    });
    
    if (label || m === months) {
      points.push({ month: m, year, label, total, byAccount });
    }
    
    // Always push at specific milestones
    if ([1, 3, 6, 12, 24, 36, 60, 84, 120, 180, 240, 300, 360].includes(m)) {
      const existing = points.find(p => p.month === m);
      if (!existing) {
        points.push({ month: m, year, label: m % 12 === 0 ? `Yr ${year}` : `Mo ${m}`, total, byAccount });
      }
    }
  }
  
  // Ensure we always have start and end
  const startExists = points.find(p => p.month === 0);
  if (!startExists) points.unshift({ month: 0, year: 0, label: 'Now', total: Object.values(balances).reduce((a, b) => a + b, 0), byAccount: { ...balances } });
  
  return points.sort((a, b) => a.month - b.month);
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
