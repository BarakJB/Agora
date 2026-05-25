import type { TargetMetric, TargetPeriod } from '../repositories/targets.repository.js';
export interface TargetProgress {
    metric: TargetMetric;
    period: TargetPeriod;
    targetAmount: number;
    currentAmount: number;
    progressPct: number;
}
export declare function getCurrentProgress(agentId: string, month?: string): Promise<TargetProgress[]>;
//# sourceMappingURL=target-progress.service.d.ts.map