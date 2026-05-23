import type { SalesTransaction } from '../services/api';

export type ContractStatus = 'covered' | 'uncovered';

export interface SalesTransactionWithContract extends SalesTransaction {
  contractStatus: ContractStatus;
  agreedRate?: number | null;
  agreedCommissionType?: string | null;
}

export interface ContractCoverageSummary {
  coveredCount: number;
  uncoveredCount: number;
  coveredAmount: number;
  uncoveredAmount: number;
}

export interface ContractCoverageResponse {
  summary: ContractCoverageSummary;
  transactions?: SalesTransactionWithContract[];
}
