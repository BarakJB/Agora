import type { ProductType, SalaryPrediction, DealCommissionPrediction } from '../types/index.js';
/**
 * Predict the salary impact of a new deal.
 * Looks up contract rates, builds timeline, and returns
 * expected one-time + recurring amounts.
 */
export declare function predictDealImpact(input: {
    agentId: string;
    dealType: ProductType;
    premiumAmount: number;
    insuranceCompany: string;
    startDate: string;
}): Promise<DealCommissionPrediction | null>;
/**
 * Predict the full monthly salary for an agent.
 *
 * Strategy:
 * 1. Get all active policies → calculate expected recurring
 * 2. Get actual commissions for trailing 3 months → detect trend
 * 3. Compare expected vs actual → determine confidence
 * 4. Apply tax calculation → net prediction
 */
export declare function predictMonthlySalary(agentId: string, targetPeriod: string): Promise<SalaryPrediction | null>;
//# sourceMappingURL=salary-prediction.service.d.ts.map