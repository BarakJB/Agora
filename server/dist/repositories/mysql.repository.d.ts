import type { Agent, Policy, Commission, UploadRecord } from '../types/index.js';
export declare function _resetMockData(): void;
export declare function getAllAgents(): Promise<Agent[]>;
export declare function getAgentById(id: string): Promise<Agent | null>;
export declare function getPolicies(filters: {
    type?: string;
    company?: string;
    page: number;
    limit: number;
}): Promise<{
    data: Policy[];
    total: number;
}>;
export declare function getPolicyById(id: string): Promise<Policy | null>;
export declare function getPolicyStats(): Promise<{
    totalPolicies: number;
    activePolicies: number;
    totalPremium: number;
    byType: Record<string, number>;
    byCompany: Record<string, number>;
}>;
export declare function countPolicies(): Promise<number>;
export declare function countNewPolicies(period: string): Promise<number>;
export declare function getCommissions(filters: {
    period?: string;
    type?: string;
    page: number;
    limit: number;
}): Promise<{
    data: Commission[];
    total: number;
}>;
export declare function getCommissionsByPeriod(period: string): Promise<Commission[]>;
export declare function getCommissionsByCompany(): Promise<{
    company: string;
    total: number;
}[]>;
export declare function getUploads(filters: {
    page: number;
    limit: number;
}): Promise<{
    data: UploadRecord[];
    total: number;
}>;
export declare function getUploadById(id: string): Promise<UploadRecord | null>;
export declare function findAgentDuplicate(agentId: string, email: string, licenseNumber: string, phone: string, taxId: string): Promise<{
    isDuplicate: boolean;
    field: string | null;
}>;
export declare function createAgent(id: string, data: {
    agentId: string;
    agencyId: string;
    name: string;
    email: string;
    phone: string;
    licenseNumber: string;
    taxId: string;
    taxStatus: string;
    niiRate: number;
}): Promise<Agent>;
export declare function updateAgent(id: string, data: Record<string, unknown>): Promise<Agent | null>;
export declare function softDeleteAgent(id: string): Promise<Agent | null>;
export declare function createPolicy(id: string, data: {
    agentId: string;
    policyId: string;
    productType: string;
    clientName: string;
    clientId: string;
    startDate: string;
    premiumAmount: number;
    premiumFrequency: string;
    commissionPct: number;
    recurringPct: number;
    volumePct: number;
    contractId: string | null;
    insuranceCompany: string;
}): Promise<Policy | null>;
export declare function updatePolicy(id: string, data: Record<string, unknown>): Promise<Policy | null>;
export declare function getPolicyStatusById(id: string): Promise<string | null>;
export declare function getCommissionById(id: string): Promise<Commission | null>;
export declare function createCommission(id: string, data: {
    policyId: string;
    agentId: string;
    type: string;
    amount: number;
    rate: number;
    premiumBase: number;
    period: string;
    paymentDate: string;
    insuranceCompany: string;
}): Promise<Commission | null>;
export declare function updateCommission(id: string, data: Record<string, unknown>): Promise<Commission | null>;
export declare function getCommissionStatusById(id: string): Promise<string | null>;
export declare function createUpload(id: string, data: {
    agentId: string;
    insuranceCompany: string;
    fileName: string;
    recordCount: number;
    status: 'processing' | 'completed' | 'error';
    errorMessage?: string;
}): Promise<UploadRecord | null>;
export declare function createCommissionBatch(rows: Array<{
    id: string;
    policyId: string;
    agentId: string;
    insuranceCompanyId: string;
    type: string;
    amount: number;
    rate: number;
    premiumBase: number;
    period: string;
    paymentDate: string;
}>): Promise<void>;
export declare function findAgentByEmail(email: string): Promise<{
    id: string;
    email: string;
    name: string;
    passwordHash: string | null;
} | null>;
export declare function createAgentWithPassword(id: string, data: {
    agentId: string;
    agencyId: string;
    name: string;
    email: string;
    phone: string;
    licenseNumber: string;
    taxId: string;
    taxStatus: string;
    niiRate: number;
    passwordHash: string;
}): Promise<Agent>;
export declare function resolveInsuranceCompanyId(name: string): Promise<string | null>;
export declare function getContractForDeal(agentId: string, insuranceCompany: string, productType: string, asOfDate: string): Promise<{
    commissionPct: number;
    recurringPct: number;
    volumePct: number;
} | null>;
export declare function getActivePoliciesForAgent(agentId: string): Promise<Policy[]>;
export declare function getCommissionsForPeriodRange(agentId: string, fromPeriod: string, toPeriod: string): Promise<Commission[]>;
export declare function getAgentPolicyCountByType(agentId: string, productType: string): Promise<number>;
export interface CommissionReportRecord {
    id: string;
    uploadId: string;
    agentId: string;
    insuranceCompanyId: string | null;
    reportType: string;
    period: string | null;
    recordCount: number;
    skippedRows: number;
    errorCount: number;
    totalCommission: number;
    totalPremium: number;
    sheetName: string | null;
    status: string;
    createdAt: string;
}
export declare function createCommissionReport(data: {
    id: string;
    uploadId: string;
    agentId: string;
    insuranceCompanyId: string | null;
    reportType: string;
    period: string | null;
    recordCount: number;
    skippedRows: number;
    errorCount: number;
    totalCommission: number;
    totalPremium: number;
    sheetName: string | null;
    errorDetails: unknown[] | null;
}): Promise<void>;
export declare function getCommissionReportsByUpload(uploadId: string): Promise<CommissionReportRecord[]>;
export interface CommissionRuleRecord {
    id: string;
    insuranceCompanyId: string;
    productType: string;
    ruleType: string;
    delayMonths: number | null;
    delayBusinessDays: number | null;
    ratePct: number | null;
    description: string | null;
    isActive: boolean;
}
export declare function getCommissionRules(insuranceCompanyId: string, productType?: string): Promise<CommissionRuleRecord[]>;
export interface AgentCompanyNumber {
    id: string;
    agentId: string;
    insuranceCompanyId: string;
    insuranceCompanyName: string;
    companyAgentNumber: string;
    createdAt: string;
    updatedAt: string;
}
/**
 * Save or update the agent number for a specific agent at a specific company.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE for idempotency.
 */
export declare function upsertAgentCompanyNumber(agentId: string, insuranceCompanyId: string, companyAgentNumber: string): Promise<void>;
/**
 * Get the registered agent number for a specific agent at a specific company.
 * Returns null if no mapping exists yet.
 */
export declare function getRegisteredAgentNumber(agentId: string, insuranceCompanyId: string): Promise<string | null>;
/**
 * Resolve which agent owns a given agent number at a specific company.
 * Used to validate that an uploaded file belongs to the authenticated agent.
 */
export declare function getAgentByCompanyNumber(insuranceCompanyId: string, companyAgentNumber: string): Promise<{
    agentId: string;
    taxId: string;
} | null>;
/**
 * Get all company numbers registered for a given agent.
 */
export declare function getAgentCompanyNumbers(agentId: string): Promise<AgentCompanyNumber[]>;
export interface AgentCommissionRate {
    id: string;
    agentId: string;
    insuranceCompanyId: string;
    insuranceCompanyName: string;
    productType: string;
    commissionType: 'נפרעים' | 'היקף';
    rate: number | null;
    isFixedAmount: boolean;
    isActive: boolean;
    updatedAt: string;
}
export declare function getAgentCommissionRates(agentId: string): Promise<AgentCommissionRate[]>;
export declare function upsertAgentCommissionRates(agentId: string, rates: Array<{
    insuranceCompanyId: string;
    productType: string;
    commissionType: 'נפרעים' | 'היקף';
    rate: number | null;
    isFixedAmount: boolean;
}>): Promise<void>;
//# sourceMappingURL=mysql.repository.d.ts.map