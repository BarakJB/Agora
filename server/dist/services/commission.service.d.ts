import type { Policy, Commission, SalarySummary } from '../types/index.js';
export declare function calculateOneTimeCommission(policy: Policy): number;
export declare function calculateRecurringCommission(policy: Policy): number;
export declare function calculateVolumeCommission(policy: Policy, totalAnnualPremium: number): number;
export declare function generateCommissions(policy: Policy, period: string): Commission[];
export declare function calculateSalarySummary(commissions: Commission[], taxStatus: 'self_employed' | 'employee' | 'individual' | 'corporation', totalPolicies: number, newPoliciesCount: number): SalarySummary;
//# sourceMappingURL=commission.service.d.ts.map