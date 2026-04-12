import type {
  Policy,
  Commission,
  TaxStatus,
  ProductType,
  HistoricalCommission,
  AccumulationBalance,
  AdvanceBalance,
  PredictionBreakdown,
  SalaryPrediction,
  DealCommissionPrediction,
  ConfidenceLevel,
  CommissionSourceType,
} from '../types/index.js';
import { calculateTax } from './tax.service.js';

// ---------- Commission rate defaults per product type ----------

const DEFAULT_COMMISSION_RATES: Record<ProductType, {
  oneTimePct: number;
  nifraimPct: number;
  accumulationPct: number;
  managementFeePct: number;
  collectionFeePct: number;
}> = {
  life_insurance:     { oneTimePct: 40, nifraimPct: 10, accumulationPct: 0, managementFeePct: 0, collectionFeePct: 0.5 },
  managers_insurance: { oneTimePct: 25, nifraimPct: 8, accumulationPct: 0.2, managementFeePct: 0.15, collectionFeePct: 0.3 },
  pension:            { oneTimePct: 0, nifraimPct: 0, accumulationPct: 0.25, managementFeePct: 0.12, collectionFeePct: 0.3 },
  provident_fund:     { oneTimePct: 0, nifraimPct: 0, accumulationPct: 0.2, managementFeePct: 0.1, collectionFeePct: 0 },
  education_fund:     { oneTimePct: 0, nifraimPct: 0, accumulationPct: 0.15, managementFeePct: 0.08, collectionFeePct: 0 },
  health:             { oneTimePct: 30, nifraimPct: 12, accumulationPct: 0, managementFeePct: 0, collectionFeePct: 0.4 },
  general:            { oneTimePct: 20, nifraimPct: 8, accumulationPct: 0, managementFeePct: 0, collectionFeePct: 0.3 },
};

const MIN_HISTORY_MONTHS = 3;
const MAX_HISTORY_MONTHS = 6;

// ---------- Internal helpers ----------

function getMonthsBack(period: string, count: number): string[] {
  const [year, month] = period.split('-').map(Number);
  const months: string[] = [];

  for (let i = 1; i <= count; i++) {
    const d = new Date(year, month - 1 - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
  }

  return months;
}

function weightedAverage(values: number[]): number {
  if (values.length === 0) return 0;

  // More recent months get higher weight
  const weights = values.map((_, i) => i + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weighted = values.reduce((sum, val, i) => sum + val * weights[i], 0);

  return weighted / totalWeight;
}

function calculateGrowthRate(values: number[]): number {
  if (values.length < 2) return 0;

  const rates: number[] = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) {
      rates.push((values[i] - values[i - 1]) / values[i - 1]);
    }
  }

  return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
}

function determineConfidence(dataPoints: number, hasAccumulation: boolean): ConfidenceLevel {
  if (dataPoints >= MAX_HISTORY_MONTHS && hasAccumulation) return 'high';
  if (dataPoints >= MIN_HISTORY_MONTHS) return 'medium';
  return 'low';
}

function groupByType(
  history: HistoricalCommission[],
): Record<CommissionSourceType, number[]> {
  const grouped: Record<CommissionSourceType, number[]> = {
    nifraim: [],
    accumulation: [],
    management_fee: [],
    collection_fee: [],
    advance: [],
  };

  // Sort by period ascending so index 0 = oldest
  const sorted = [...history].sort((a, b) => a.period.localeCompare(b.period));

  for (const entry of sorted) {
    grouped[entry.type].push(entry.amount);
  }

  return grouped;
}

// ---------- Public API ----------

/**
 * Predict monthly salary for an agent in a given period.
 *
 * @param agentId - the agent identifier
 * @param period - target month as YYYY-MM
 * @param taxStatus - agent tax status for deduction calculation
 * @param activePolicies - currently active policies for the agent
 * @param historicalCommissions - past commission records (last 3-6 months)
 * @param accumulationBalances - AUM balances per product/company
 * @param advanceBalance - outstanding advance balance to deduct
 */
export function predictMonthlySalary(
  agentId: string,
  period: string,
  taxStatus: TaxStatus,
  activePolicies: Policy[],
  historicalCommissions: HistoricalCommission[],
  accumulationBalances: AccumulationBalance[],
  advanceBalance: AdvanceBalance | null,
): SalaryPrediction {
  const assumptions: string[] = [];
  const relevantPeriods = getMonthsBack(period, MAX_HISTORY_MONTHS);
  const relevantHistory = historicalCommissions.filter((h) =>
    relevantPeriods.includes(h.period),
  );

  const grouped = groupByType(relevantHistory);

  // --- Nifraim (recurring on collected premiums) ---
  let nifraimPrediction: number;
  if (grouped.nifraim.length >= MIN_HISTORY_MONTHS) {
    nifraimPrediction = weightedAverage(grouped.nifraim);
    assumptions.push(`נפרעים מבוסס על ממוצע משוקלל של ${grouped.nifraim.length} חודשים`);
  } else {
    // Fallback: calculate from active policies
    nifraimPrediction = activePolicies
      .filter((p) => p.status === 'active' && p.recurringPct > 0)
      .reduce((sum, p) => sum + p.premiumAmount * (p.recurringPct / 100), 0);
    assumptions.push('נפרעים מחושבים מפוליסות פעילות (אין מספיק היסטוריה)');
  }

  // --- Accumulation (AUM-based) ---
  let accumulationPrediction = 0;
  if (accumulationBalances.length > 0) {
    const growthRate = calculateGrowthRate(
      grouped.accumulation.length >= 2 ? grouped.accumulation : [0],
    );

    accumulationPrediction = accumulationBalances.reduce((sum, bal) => {
      const projectedBalance = bal.closingBalance * (1 + growthRate);
      return sum + projectedBalance * (bal.commissionRate / 100);
    }, 0);
    assumptions.push(`צבירה מבוססת על ${accumulationBalances.length} מוצרים, קצב גדילה ${(growthRate * 100).toFixed(1)}%`);
  }

  // --- Management fees ---
  let managementFeesPrediction = 0;
  if (accumulationBalances.length > 0) {
    managementFeesPrediction = accumulationBalances.reduce(
      (sum, bal) => sum + bal.closingBalance * (bal.managementFeeRate / 100),
      0,
    );
    assumptions.push('דמי ניהול מחושבים מיתרות סגירה נוכחיות');
  } else if (grouped.management_fee.length >= MIN_HISTORY_MONTHS) {
    managementFeesPrediction = weightedAverage(grouped.management_fee);
    assumptions.push('דמי ניהול מבוססים על ממוצע היסטורי');
  }

  // --- Collection fees ---
  let collectionFeesPrediction: number;
  if (grouped.collection_fee.length >= MIN_HISTORY_MONTHS) {
    collectionFeesPrediction = weightedAverage(grouped.collection_fee);
    assumptions.push(`דמי גביה מבוססים על ממוצע של ${grouped.collection_fee.length} חודשים`);
  } else {
    collectionFeesPrediction = activePolicies
      .filter((p) => p.status === 'active')
      .reduce((sum, p) => {
        const rates = DEFAULT_COMMISSION_RATES[p.productType];
        return sum + p.premiumAmount * (rates.collectionFeePct / 100);
      }, 0);
    assumptions.push('דמי גביה מחושבים מפוליסות פעילות עם שיעורי ברירת מחדל');
  }

  // --- One-time commissions (new policies expected) ---
  // Estimate from recent trend
  const recentOneTime = historicalCommissions
    .filter((h) => h.type === 'nifraim' && relevantPeriods.slice(0, 3).includes(h.period))
    .length; // Use as proxy for deal flow

  let oneTimePrediction = 0;
  const recentPeriods = getMonthsBack(period, MIN_HISTORY_MONTHS);
  const recentNewPolicies = activePolicies.filter((p) =>
    recentPeriods.some((rp) => p.startDate.startsWith(rp)),
  );

  if (recentNewPolicies.length > 0) {
    const avgOneTime =
      recentNewPolicies.reduce(
        (sum, p) => sum + p.premiumAmount * (p.commissionPct / 100),
        0,
      ) / MIN_HISTORY_MONTHS;
    oneTimePrediction = avgOneTime;
    assumptions.push(`עמלות חד-פעמיות מבוססות על ממוצע ${recentNewPolicies.length} עסקאות אחרונות`);
  }

  // --- Advance deduction ---
  const advanceDeduction = advanceBalance?.monthlyDeduction ?? 0;
  if (advanceDeduction > 0) {
    assumptions.push(`ניכוי מקדמות חודשי: ₪${advanceDeduction.toLocaleString()}`);
  }

  // --- Assemble ---
  const breakdown: PredictionBreakdown = {
    nifraim: Math.round(nifraimPrediction),
    accumulation: Math.round(accumulationPrediction),
    managementFees: Math.round(managementFeesPrediction),
    collectionFees: Math.round(collectionFeesPrediction),
    oneTimeCommissions: Math.round(oneTimePrediction),
    advanceDeduction: Math.round(advanceDeduction),
  };

  const grossPrediction =
    breakdown.nifraim +
    breakdown.accumulation +
    breakdown.managementFees +
    breakdown.collectionFees +
    breakdown.oneTimeCommissions -
    breakdown.advanceDeduction;

  const tax = calculateTax(Math.max(grossPrediction, 0), taxStatus);

  const dataPointsUsed = relevantHistory.length + accumulationBalances.length;
  const confidence = determineConfidence(
    relevantHistory.length,
    accumulationBalances.length > 0,
  );

  return {
    agentId,
    period,
    breakdown,
    grossPrediction: Math.round(grossPrediction),
    tax,
    netPrediction: Math.round(tax.netIncome),
    confidence,
    dataPointsUsed,
    assumptions,
  };
}

/**
 * Predict commission impact for a potential new deal.
 *
 * @param dealType - product type of the deal
 * @param premiumAmount - monthly premium in ILS
 * @param productType - same as dealType (kept for clarity at call site)
 * @param insuranceCompany - the insurance company name
 * @param agentTaxStatus - for net impact calculation
 * @param currentGrossMonthly - agent's current gross monthly (for delta)
 * @param overrideRates - optional custom commission rates
 */
export function predictCommissionForDeal(
  dealType: ProductType,
  premiumAmount: number,
  insuranceCompany: string,
  agentTaxStatus: TaxStatus,
  currentGrossMonthly: number,
  overrideRates?: Partial<{
    oneTimePct: number;
    nifraimPct: number;
    accumulationPct: number;
    managementFeePct: number;
  }>,
): DealCommissionPrediction {
  const defaults = DEFAULT_COMMISSION_RATES[dealType];
  const rates = {
    oneTimePct: overrideRates?.oneTimePct ?? defaults.oneTimePct,
    nifraimPct: overrideRates?.nifraimPct ?? defaults.nifraimPct,
    accumulationPct: overrideRates?.accumulationPct ?? defaults.accumulationPct,
    managementFeePct: overrideRates?.managementFeePct ?? defaults.managementFeePct,
  };

  const annualPremium = premiumAmount * 12;

  // One-time commission: % of annual premium
  const expectedOneTime = Math.round(annualPremium * (rates.oneTimePct / 100));

  // Monthly recurring (nifraim): % of each monthly premium
  const expectedMonthlyRecurring = Math.round(premiumAmount * (rates.nifraimPct / 100));

  // Annual total: one-time + 12 months of recurring + accumulation-based estimate
  const annualAccumulation = Math.round(annualPremium * (rates.accumulationPct / 100));
  const annualManagementFee = Math.round(annualPremium * (rates.managementFeePct / 100));
  const expectedAnnualTotal =
    expectedOneTime +
    expectedMonthlyRecurring * 12 +
    annualAccumulation +
    annualManagementFee;

  // Impact on monthly salary (first month includes one-time)
  const monthlyGrossIncrease = expectedMonthlyRecurring;
  const newGross = currentGrossMonthly + monthlyGrossIncrease;
  const currentTax = calculateTax(currentGrossMonthly, agentTaxStatus);
  const newTax = calculateTax(newGross, agentTaxStatus);
  const netIncrease = newTax.netIncome - currentTax.netIncome;

  return {
    dealType,
    premiumAmount,
    insuranceCompany,
    expectedOneTime,
    expectedMonthlyRecurring,
    expectedAnnualTotal,
    monthlyImpact: {
      grossIncrease: monthlyGrossIncrease,
      netIncrease: Math.round(netIncrease),
    },
  };
}
