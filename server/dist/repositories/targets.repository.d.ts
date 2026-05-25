export type TargetMetric = 'total' | 'nifraim' | 'hekef' | 'accumulation';
export type TargetPeriod = 'monthly' | 'yearly';
export interface AgentTarget {
    id: string;
    metric: TargetMetric;
    period: TargetPeriod;
    targetAmount: number;
}
export declare function getTargets(agentId: string): Promise<AgentTarget[]>;
export declare function upsertTarget(agentId: string, data: {
    metric: TargetMetric;
    period: TargetPeriod;
    targetAmount: number;
}): Promise<void>;
export declare function deleteTarget(agentId: string, metric: TargetMetric, period: TargetPeriod): Promise<void>;
//# sourceMappingURL=targets.repository.d.ts.map