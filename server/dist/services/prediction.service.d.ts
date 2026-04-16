import type { Policy, TaxStatus, ProductType, HistoricalCommission, AccumulationBalance, AdvanceBalance, SalaryPrediction, DealCommissionPrediction } from '../types/index.js';
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
export declare function predictMonthlySalary(agentId: string, period: string, taxStatus: TaxStatus, activePolicies: Policy[], historicalCommissions: HistoricalCommission[], accumulationBalances: AccumulationBalance[], advanceBalance: AdvanceBalance | null): SalaryPrediction;
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
export declare function predictCommissionForDeal(dealType: ProductType, premiumAmount: number, insuranceCompany: string, agentTaxStatus: TaxStatus, currentGrossMonthly: number, overrideRates?: Partial<{
    oneTimePct: number;
    nifraimPct: number;
    accumulationPct: number;
    managementFeePct: number;
}>): DealCommissionPrediction;
//# sourceMappingURL=prediction.service.d.ts.map