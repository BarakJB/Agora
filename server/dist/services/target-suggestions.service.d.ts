import type { TargetMetric, TargetPeriod } from '../repositories/targets.repository.js';
export interface TargetSuggestion {
    metric: TargetMetric;
    period: TargetPeriod;
    suggestedAmount: number;
    basedOn: string;
}
export declare function getSuggestedTargets(agentId: string): Promise<TargetSuggestion[]>;
//# sourceMappingURL=target-suggestions.service.d.ts.map