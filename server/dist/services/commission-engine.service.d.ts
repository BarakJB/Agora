import type { ProductType, Policy } from '../types/index.js';
export interface CommissionTimelineEvent {
    type: 'one_time' | 'management_fee' | 'niud' | 'bonus' | 'recurring';
    label: string;
    expectedDate: string;
    expectedPeriod: string;
    amount: number;
    isRecurring: boolean;
    recurringMonthlyAmount: number;
    confidence: 'high' | 'medium' | 'low';
}
export interface DealTimeline {
    dealType: ProductType;
    insuranceCompany: string;
    premiumAmount: number;
    events: CommissionTimelineEvent[];
    totalFirstYear: number;
    monthlyRecurring: number;
}
interface CommissionRates {
    commissionPct: number;
    recurringPct: number;
    volumePct: number;
}
export declare function isPensionLikeProduct(productType: ProductType): boolean;
export declare function calculateOneTimeAmount(premiumAmount: number, commissionPct: number): number;
export declare function calculateRecurringAmount(premiumAmount: number, recurringPct: number): number;
/**
 * Generate a full commission timeline for a new deal.
 * Applies the correct business rules based on product type.
 */
export declare function buildDealTimeline(dealType: ProductType, startDate: string, premiumAmount: number, insuranceCompany: string, rates: CommissionRates): DealTimeline;
/**
 * Calculate the salary impact of a deal in a given target month.
 * Looks at the timeline and sums up all events that fall in or before
 * the target period.
 */
export declare function calculateDealImpactForPeriod(timeline: DealTimeline, targetPeriod: string): {
    oneTime: number;
    recurring: number;
    total: number;
};
/**
 * Calculate expected monthly income from all active policies for a given period.
 */
export declare function calculateExpectedMonthlyFromPolicies(policies: Policy[], targetPeriod: string): {
    totalRecurring: number;
    totalOneTime: number;
    byCompany: Record<string, number>;
};
export {};
//# sourceMappingURL=commission-engine.service.d.ts.map