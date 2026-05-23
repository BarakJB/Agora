export interface CrossSellOpportunity {
  insuredName: string;
  insuredId: string;
  currentBranches: string[];
  missingBranches: string[];
  totalCommission: number;
  monthsActive: number;
  potentialScore: number;
}

export interface DormantClient {
  insuredName: string;
  insuredId: string;
  lastMonth: string;
  monthsSince: number;
  historicalTotal: number;
  branches: string[];
}

export interface UntappedBranch {
  branch: string;
  currentPct: number;
  opportunityClients: number;
  sampleClients: string[];
}

export interface EmployerCluster {
  employerName: string;
  employerId: string;
  employeeCount: number;
  branchesCovered: string[];
  totalCommission: number;
  avgPerEmployee: number;
}

export interface AgentBranchMix {
  branch: string;
  pct: number;
}

export interface SalesPotentialData {
  crossSell: CrossSellOpportunity[];
  dormant: DormantClient[];
  untappedBranches: UntappedBranch[];
  employerClusters: EmployerCluster[];
  meta: {
    latestMonth: string;
    totalClients: number;
    agentBranchMix: AgentBranchMix[];
  };
}

export interface SalesPotentialResponse {
  data: SalesPotentialData | null;
  error: string | null;
  meta: Record<string, unknown> | null;
}
