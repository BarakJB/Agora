import type { PortfolioFilter } from './sales.repository.js';
export type CrossSellOpportunity = {
    insuredName: string;
    insuredId: string;
    currentBranches: string[];
    missingBranches: string[];
    totalCommission: number;
    monthsActive: number;
    potentialScore: number;
};
export type DormantClient = {
    insuredName: string;
    insuredId: string;
    lastMonth: string;
    monthsSince: number;
    historicalTotal: number;
    branches: string[];
};
export type UntappedBranch = {
    branch: string;
    currentPct: number;
    opportunityClients: number;
    sampleClients: string[];
};
export type EmployerCluster = {
    employerName: string;
    employerId: string | null;
    employeeCount: number;
    branchesCovered: number;
    totalCommission: number;
    avgPerEmployee: number;
};
export type SalesPotentialResponse = {
    crossSell: CrossSellOpportunity[];
    dormant: DormantClient[];
    untappedBranches: UntappedBranch[];
    employerClusters: EmployerCluster[];
    meta: {
        latestMonth: string;
        totalClients: number;
        agentBranchMix: {
            branch: string;
            pct: number;
        }[];
    };
};
export declare function getSalesPotential(agentId: string, portfolioType?: PortfolioFilter): Promise<SalesPotentialResponse>;
//# sourceMappingURL=potential.repository.d.ts.map