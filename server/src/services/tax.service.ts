import type { TaxCalculation, TaxBracket, TaxStatus } from '../types/index.js';

// Israel 2026 tax brackets for individuals (approximate - should be updated from official source)
const INCOME_TAX_BRACKETS = [
  { from: 0, to: 84120, rate: 0.10 },
  { from: 84120, to: 120720, rate: 0.14 },
  { from: 120720, to: 193800, rate: 0.20 },
  { from: 193800, to: 269280, rate: 0.31 },
  { from: 269280, to: 560280, rate: 0.35 },
  { from: 560280, to: 721560, rate: 0.47 },
  { from: 721560, to: Infinity, rate: 0.50 },
];

// National Insurance rates for self-employed (2026 approximate)
const NII_BRACKETS = {
  self_employed: [
    { from: 0, to: 7522, rate: 0.0558 },      // Reduced rate
    { from: 7522, to: 49030, rate: 0.1783 },   // Full rate
  ],
  employee: [
    { from: 0, to: 7522, rate: 0.004 },
    { from: 7522, to: 49030, rate: 0.07 },
  ],
};

// Health tax rates for self-employed
const HEALTH_TAX_BRACKETS = {
  self_employed: [
    { from: 0, to: 7522, rate: 0.0312 },
    { from: 7522, to: 49030, rate: 0.05 },
  ],
  employee: [
    { from: 0, to: 7522, rate: 0.0312 },
    { from: 7522, to: 49030, rate: 0.05 },
  ],
};

const VAT_RATE = 0.18; // 18% VAT in Israel

function calculateBracketTax(annualIncome: number, brackets: Array<{ from: number; to: number; rate: number }>): { total: number; details: TaxBracket[] } {
  let remaining = annualIncome;
  let total = 0;
  const details: TaxBracket[] = [];

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxableInBracket = Math.min(remaining, bracket.to - bracket.from);
    const taxAmount = taxableInBracket * bracket.rate;
    total += taxAmount;
    details.push({
      from: bracket.from,
      to: Math.min(bracket.to, annualIncome),
      rate: bracket.rate,
      taxAmount,
    });
    remaining -= taxableInBracket;
  }

  return { total, details };
}

function calculateMonthlyNII(monthlyIncome: number, status: TaxStatus): number {
  const brackets = status === 'self_employed' ? NII_BRACKETS.self_employed : NII_BRACKETS.employee;
  let total = 0;
  let remaining = monthlyIncome;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.to - bracket.from);
    total += taxable * bracket.rate;
    remaining -= taxable;
  }

  return total;
}

function calculateMonthlyHealthTax(monthlyIncome: number, status: TaxStatus): number {
  const brackets = status === 'self_employed' ? HEALTH_TAX_BRACKETS.self_employed : HEALTH_TAX_BRACKETS.employee;
  let total = 0;
  let remaining = monthlyIncome;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.to - bracket.from);
    total += taxable * bracket.rate;
    remaining -= taxable;
  }

  return total;
}

export function calculateTax(grossMonthlyIncome: number, taxStatus: TaxStatus): TaxCalculation {
  const annualIncome = grossMonthlyIncome * 12;
  const { total: annualTax, details: brackets } = calculateBracketTax(annualIncome, INCOME_TAX_BRACKETS);
  const monthlyIncomeTax = annualTax / 12;

  const nationalInsurance = calculateMonthlyNII(grossMonthlyIncome, taxStatus);
  const healthTax = calculateMonthlyHealthTax(grossMonthlyIncome, taxStatus);

  const vat = taxStatus === 'self_employed' ? grossMonthlyIncome * VAT_RATE : 0;

  const totalDeductions = monthlyIncomeTax + nationalInsurance + healthTax;
  const netIncome = grossMonthlyIncome - totalDeductions;
  const effectiveTaxRate = grossMonthlyIncome > 0 ? (totalDeductions / grossMonthlyIncome) * 100 : 0;

  return {
    grossIncome: grossMonthlyIncome,
    incomeTax: Math.round(monthlyIncomeTax),
    nationalInsurance: Math.round(nationalInsurance),
    healthTax: Math.round(healthTax),
    vat: Math.round(vat),
    totalDeductions: Math.round(totalDeductions),
    netIncome: Math.round(netIncome),
    effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
    brackets,
  };
}
