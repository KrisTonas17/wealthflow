// 2026 Federal Tax Brackets (projected, based on IRS inflation adjustments)
export const FEDERAL_BRACKETS_SINGLE_2026 = [
  { min: 0, max: 11925, rate: 0.10 },
  { min: 11925, max: 48475, rate: 0.12 },
  { min: 48475, max: 103350, rate: 0.22 },
  { min: 103350, max: 197300, rate: 0.24 },
  { min: 197300, max: 250525, rate: 0.32 },
  { min: 250525, max: 626350, rate: 0.35 },
  { min: 626350, max: Infinity, rate: 0.37 },
];

export const FEDERAL_BRACKETS_MARRIED_2026 = [
  { min: 0, max: 23850, rate: 0.10 },
  { min: 23850, max: 96950, rate: 0.12 },
  { min: 96950, max: 206700, rate: 0.22 },
  { min: 206700, max: 394600, rate: 0.24 },
  { min: 394600, max: 501050, rate: 0.32 },
  { min: 501050, max: 751600, rate: 0.35 },
  { min: 751600, max: Infinity, rate: 0.37 },
];

// 2026 Standard Deductions
export const STANDARD_DEDUCTION_SINGLE = 15000;
export const STANDARD_DEDUCTION_MARRIED = 30000;

// FICA
export const SOCIAL_SECURITY_RATE = 0.062;
export const SOCIAL_SECURITY_WAGE_BASE = 176100;
export const MEDICARE_RATE = 0.0145;
export const ADDITIONAL_MEDICARE_RATE = 0.009;
export const ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = 200000;
export const ADDITIONAL_MEDICARE_THRESHOLD_MARRIED = 250000;

// State tax rates (2026 estimates)
export const STATE_TAXES: Record<string, { name: string; rate: number | 'graduated'; brackets?: { min: number; max: number; rate: number }[]; noIncomeTax?: boolean }> = {
  AL: { name: 'Alabama', rate: 'graduated', brackets: [{ min: 0, max: 500, rate: 0.02 }, { min: 500, max: 3000, rate: 0.04 }, { min: 3000, max: Infinity, rate: 0.05 }] },
  AK: { name: 'Alaska', rate: 0, noIncomeTax: true },
  AZ: { name: 'Arizona', rate: 0.025 },
  AR: { name: 'Arkansas', rate: 'graduated', brackets: [{ min: 0, max: 4999, rate: 0.02 }, { min: 5000, max: 9999, rate: 0.04 }, { min: 10000, max: Infinity, rate: 0.047 }] },
  CA: { name: 'California', rate: 'graduated', brackets: [{ min: 0, max: 10756, rate: 0.01 }, { min: 10756, max: 25499, rate: 0.02 }, { min: 25499, max: 40245, rate: 0.04 }, { min: 40245, max: 55866, rate: 0.06 }, { min: 55866, max: 70606, rate: 0.08 }, { min: 70606, max: 360659, rate: 0.093 }, { min: 360659, max: 432787, rate: 0.103 }, { min: 432787, max: 721314, rate: 0.113 }, { min: 721314, max: 1000000, rate: 0.123 }, { min: 1000000, max: Infinity, rate: 0.133 }] },
  CO: { name: 'Colorado', rate: 0.044 },
  CT: { name: 'Connecticut', rate: 'graduated', brackets: [{ min: 0, max: 10000, rate: 0.03 }, { min: 10000, max: 50000, rate: 0.05 }, { min: 50000, max: 100000, rate: 0.055 }, { min: 100000, max: 200000, rate: 0.06 }, { min: 200000, max: 250000, rate: 0.065 }, { min: 250000, max: 500000, rate: 0.069 }, { min: 500000, max: Infinity, rate: 0.0699 }] },
  DE: { name: 'Delaware', rate: 'graduated', brackets: [{ min: 0, max: 2000, rate: 0 }, { min: 2000, max: 5000, rate: 0.022 }, { min: 5000, max: 10000, rate: 0.039 }, { min: 10000, max: 20000, rate: 0.048 }, { min: 20000, max: 25000, rate: 0.052 }, { min: 25000, max: 60000, rate: 0.0555 }, { min: 60000, max: Infinity, rate: 0.066 }] },
  FL: { name: 'Florida', rate: 0, noIncomeTax: true },
  GA: { name: 'Georgia', rate: 0.0549 },
  HI: { name: 'Hawaii', rate: 'graduated', brackets: [{ min: 0, max: 2400, rate: 0.014 }, { min: 2400, max: 4800, rate: 0.032 }, { min: 4800, max: 9600, rate: 0.055 }, { min: 9600, max: 14400, rate: 0.064 }, { min: 14400, max: 19200, rate: 0.068 }, { min: 19200, max: 24000, rate: 0.072 }, { min: 24000, max: 36000, rate: 0.076 }, { min: 36000, max: 48000, rate: 0.079 }, { min: 48000, max: 150000, rate: 0.0825 }, { min: 150000, max: 175000, rate: 0.09 }, { min: 175000, max: 200000, rate: 0.10 }, { min: 200000, max: Infinity, rate: 0.11 }] },
  ID: { name: 'Idaho', rate: 0.058 },
  IL: { name: 'Illinois', rate: 0.0495 },
  IN: { name: 'Indiana', rate: 0.0305 },
  IA: { name: 'Iowa', rate: 0.06 },
  KS: { name: 'Kansas', rate: 'graduated', brackets: [{ min: 0, max: 15000, rate: 0.031 }, { min: 15000, max: 30000, rate: 0.0525 }, { min: 30000, max: Infinity, rate: 0.057 }] },
  KY: { name: 'Kentucky', rate: 0.04 },
  LA: { name: 'Louisiana', rate: 'graduated', brackets: [{ min: 0, max: 12500, rate: 0.0185 }, { min: 12500, max: 50000, rate: 0.035 }, { min: 50000, max: Infinity, rate: 0.0425 }] },
  ME: { name: 'Maine', rate: 'graduated', brackets: [{ min: 0, max: 24500, rate: 0.058 }, { min: 24500, max: 58050, rate: 0.0675 }, { min: 58050, max: Infinity, rate: 0.0715 }] },
  MD: { name: 'Maryland', rate: 'graduated', brackets: [{ min: 0, max: 1000, rate: 0.02 }, { min: 1000, max: 2000, rate: 0.03 }, { min: 2000, max: 3000, rate: 0.04 }, { min: 3000, max: 100000, rate: 0.0475 }, { min: 100000, max: 125000, rate: 0.05 }, { min: 125000, max: 150000, rate: 0.0525 }, { min: 150000, max: 250000, rate: 0.055 }, { min: 250000, max: Infinity, rate: 0.0575 }] },
  MA: { name: 'Massachusetts', rate: 0.05 },
  MI: { name: 'Michigan', rate: 0.0425 },
  MN: { name: 'Minnesota', rate: 'graduated', brackets: [{ min: 0, max: 31690, rate: 0.0535 }, { min: 31690, max: 104090, rate: 0.068 }, { min: 104090, max: 193240, rate: 0.0785 }, { min: 193240, max: Infinity, rate: 0.0985 }] },
  MS: { name: 'Mississippi', rate: 0.047 },
  MO: { name: 'Missouri', rate: 'graduated', brackets: [{ min: 0, max: 1207, rate: 0.015 }, { min: 1207, max: 2414, rate: 0.02 }, { min: 2414, max: 3621, rate: 0.025 }, { min: 3621, max: 4828, rate: 0.03 }, { min: 4828, max: 6035, rate: 0.035 }, { min: 6035, max: 7242, rate: 0.04 }, { min: 7242, max: 8449, rate: 0.045 }, { min: 8449, max: Infinity, rate: 0.048 }] },
  MT: { name: 'Montana', rate: 'graduated', brackets: [{ min: 0, max: 20500, rate: 0.047 }, { min: 20500, max: Infinity, rate: 0.059 }] },
  NE: { name: 'Nebraska', rate: 'graduated', brackets: [{ min: 0, max: 3700, rate: 0.0246 }, { min: 3700, max: 22170, rate: 0.0351 }, { min: 22170, max: 35730, rate: 0.0501 }, { min: 35730, max: Infinity, rate: 0.0664 }] },
  NV: { name: 'Nevada', rate: 0, noIncomeTax: true },
  NH: { name: 'New Hampshire', rate: 0, noIncomeTax: true },
  NJ: { name: 'New Jersey', rate: 'graduated', brackets: [{ min: 0, max: 20000, rate: 0.014 }, { min: 20000, max: 35000, rate: 0.0175 }, { min: 35000, max: 40000, rate: 0.035 }, { min: 40000, max: 75000, rate: 0.05525 }, { min: 75000, max: 500000, rate: 0.0637 }, { min: 500000, max: 1000000, rate: 0.0897 }, { min: 1000000, max: Infinity, rate: 0.1075 }] },
  NM: { name: 'New Mexico', rate: 'graduated', brackets: [{ min: 0, max: 5500, rate: 0.017 }, { min: 5500, max: 11000, rate: 0.032 }, { min: 11000, max: 16000, rate: 0.047 }, { min: 16000, max: 210000, rate: 0.049 }, { min: 210000, max: Infinity, rate: 0.059 }] },
  NY: { name: 'New York', rate: 'graduated', brackets: [{ min: 0, max: 17150, rate: 0.04 }, { min: 17150, max: 23600, rate: 0.045 }, { min: 23600, max: 27900, rate: 0.0525 }, { min: 27900, max: 161550, rate: 0.0585 }, { min: 161550, max: 323200, rate: 0.0625 }, { min: 323200, max: 2155350, rate: 0.0685 }, { min: 2155350, max: 5000000, rate: 0.0965 }, { min: 5000000, max: 25000000, rate: 0.103 }, { min: 25000000, max: Infinity, rate: 0.109 }] },
  NC: { name: 'North Carolina', rate: 0.045 },
  ND: { name: 'North Dakota', rate: 'graduated', brackets: [{ min: 0, max: 44725, rate: 0.011 }, { min: 44725, max: 225975, rate: 0.0204 }, { min: 225975, max: Infinity, rate: 0.0264 }] },
  OH: { name: 'Ohio', rate: 'graduated', brackets: [{ min: 0, max: 26050, rate: 0 }, { min: 26050, max: 100000, rate: 0.0275 }, { min: 100000, max: Infinity, rate: 0.035 }] },
  OK: { name: 'Oklahoma', rate: 'graduated', brackets: [{ min: 0, max: 1000, rate: 0.0025 }, { min: 1000, max: 2500, rate: 0.0075 }, { min: 2500, max: 3750, rate: 0.0175 }, { min: 3750, max: 4900, rate: 0.0275 }, { min: 4900, max: 7200, rate: 0.0375 }, { min: 7200, max: Infinity, rate: 0.0475 }] },
  OR: { name: 'Oregon', rate: 'graduated', brackets: [{ min: 0, max: 10000, rate: 0.0475 }, { min: 10000, max: 25000, rate: 0.0675 }, { min: 25000, max: 125000, rate: 0.0875 }, { min: 125000, max: Infinity, rate: 0.099 }] },
  PA: { name: 'Pennsylvania', rate: 0.0307 },
  RI: { name: 'Rhode Island', rate: 'graduated', brackets: [{ min: 0, max: 77450, rate: 0.0375 }, { min: 77450, max: 176050, rate: 0.0475 }, { min: 176050, max: Infinity, rate: 0.0599 }] },
  SC: { name: 'South Carolina', rate: 'graduated', brackets: [{ min: 0, max: 3460, rate: 0 }, { min: 3460, max: 17330, rate: 0.03 }, { min: 17330, max: Infinity, rate: 0.064 }] },
  SD: { name: 'South Dakota', rate: 0, noIncomeTax: true },
  TN: { name: 'Tennessee', rate: 0, noIncomeTax: true },
  TX: { name: 'Texas', rate: 0, noIncomeTax: true },
  UT: { name: 'Utah', rate: 0.0455 },
  VT: { name: 'Vermont', rate: 'graduated', brackets: [{ min: 0, max: 45400, rate: 0.0335 }, { min: 45400, max: 110050, rate: 0.066 }, { min: 110050, max: 229550, rate: 0.076 }, { min: 229550, max: Infinity, rate: 0.0875 }] },
  VA: { name: 'Virginia', rate: 'graduated', brackets: [{ min: 0, max: 3000, rate: 0.02 }, { min: 3000, max: 5000, rate: 0.03 }, { min: 5000, max: 17000, rate: 0.05 }, { min: 17000, max: Infinity, rate: 0.0575 }] },
  WA: { name: 'Washington', rate: 0, noIncomeTax: true },
  WV: { name: 'West Virginia', rate: 'graduated', brackets: [{ min: 0, max: 10000, rate: 0.0236 }, { min: 10000, max: 25000, rate: 0.032 }, { min: 25000, max: 40000, rate: 0.0454 }, { min: 40000, max: 60000, rate: 0.0512 }, { min: 60000, max: Infinity, rate: 0.0512 }] },
  WI: { name: 'Wisconsin', rate: 'graduated', brackets: [{ min: 0, max: 14320, rate: 0.035 }, { min: 14320, max: 28640, rate: 0.044 }, { min: 28640, max: 315310, rate: 0.053 }, { min: 315310, max: Infinity, rate: 0.0765 }] },
  WY: { name: 'Wyoming', rate: 0, noIncomeTax: true },
  DC: { name: 'Washington D.C.', rate: 'graduated', brackets: [{ min: 0, max: 10000, rate: 0.04 }, { min: 10000, max: 40000, rate: 0.06 }, { min: 40000, max: 60000, rate: 0.065 }, { min: 60000, max: 350000, rate: 0.085 }, { min: 350000, max: 1000000, rate: 0.0925 }, { min: 1000000, max: Infinity, rate: 0.1075 }] },
};

function calculateGraduatedTax(income: number, brackets: { min: number; max: number; rate: number }[]): number {
  let tax = 0;
  for (const bracket of brackets) {
    if (income <= bracket.min) break;
    const taxable = Math.min(income, bracket.max) - bracket.min;
    tax += taxable * bracket.rate;
  }
  return tax;
}

export function calculateFederalTax(grossIncome: number, filingStatus: 'single' | 'married'): {
  federalTax: number;
  effectiveRate: number;
  marginalRate: number;
  taxableIncome: number;
} {
  const deduction = filingStatus === 'married' ? STANDARD_DEDUCTION_MARRIED : STANDARD_DEDUCTION_SINGLE;
  const brackets = filingStatus === 'married' ? FEDERAL_BRACKETS_MARRIED_2026 : FEDERAL_BRACKETS_SINGLE_2026;
  const taxableIncome = Math.max(0, grossIncome - deduction);
  const federalTax = calculateGraduatedTax(taxableIncome, brackets);
  const effectiveRate = grossIncome > 0 ? federalTax / grossIncome : 0;
  
  // Find marginal rate
  let marginalRate = 0;
  for (const bracket of brackets) {
    if (taxableIncome > bracket.min) marginalRate = bracket.rate;
  }

  return { federalTax, effectiveRate, marginalRate, taxableIncome };
}

export function calculateFICA(grossIncome: number, filingStatus: 'single' | 'married'): {
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  total: number;
} {
  const socialSecurity = Math.min(grossIncome, SOCIAL_SECURITY_WAGE_BASE) * SOCIAL_SECURITY_RATE;
  const medicare = grossIncome * MEDICARE_RATE;
  const threshold = filingStatus === 'married' ? ADDITIONAL_MEDICARE_THRESHOLD_MARRIED : ADDITIONAL_MEDICARE_THRESHOLD_SINGLE;
  const additionalMedicare = Math.max(0, grossIncome - threshold) * ADDITIONAL_MEDICARE_RATE;
  return { socialSecurity, medicare, additionalMedicare, total: socialSecurity + medicare + additionalMedicare };
}

export function calculateStateTax(grossIncome: number, stateCode: string): number {
  const state = STATE_TAXES[stateCode];
  if (!state || state.noIncomeTax || state.rate === 0) return 0;
  if (typeof state.rate === 'number') return grossIncome * state.rate;
  if (state.brackets) return calculateGraduatedTax(grossIncome, state.brackets);
  return 0;
}

export function calculateBonusTax(bonusAmount: number, regularIncome: number, filingStatus: 'single' | 'married', stateCode: string): {
  federalSupplemental: number;
  stateTax: number;
  fica: number;
  totalTax: number;
  netBonus: number;
} {
  // Federal supplemental rate for bonuses
  const federalSupplemental = bonusAmount <= 1000000 ? bonusAmount * 0.22 : 
    (1000000 * 0.22) + ((bonusAmount - 1000000) * 0.37);
  
  const stateTax = calculateStateTax(bonusAmount, stateCode);
  const fica = calculateFICA(Math.min(bonusAmount, Math.max(0, SOCIAL_SECURITY_WAGE_BASE - regularIncome)), filingStatus).socialSecurity +
    bonusAmount * MEDICARE_RATE;
  const totalTax = federalSupplemental + stateTax + fica;
  
  return { federalSupplemental, stateTax, fica, totalTax, netBonus: bonusAmount - totalTax };
}

export interface TaxResult {
  grossAnnual: number;
  federalTax: number;
  ficaTotal: number;
  stateTax: number;
  totalTax: number;
  netAnnual: number;
  netMonthly: number;
  effectiveFederalRate: number;
  marginalRate: number;
  stateEffectiveRate: number;
}

export function calculateFullTaxes(
  grossAnnual: number,
  filingStatus: 'single' | 'married',
  stateCode: string
): TaxResult {
  const { federalTax, effectiveRate, marginalRate } = calculateFederalTax(grossAnnual, filingStatus);
  const fica = calculateFICA(grossAnnual, filingStatus);
  const stateTax = calculateStateTax(grossAnnual, stateCode);
  const totalTax = federalTax + fica.total + stateTax;
  const netAnnual = grossAnnual - totalTax;
  
  return {
    grossAnnual,
    federalTax,
    ficaTotal: fica.total,
    stateTax,
    totalTax,
    netAnnual,
    netMonthly: netAnnual / 12,
    effectiveFederalRate: effectiveRate,
    marginalRate,
    stateEffectiveRate: grossAnnual > 0 ? stateTax / grossAnnual : 0,
  };
}
