export interface SalesTransactionInput {
    reportType: string;
    processingMonth: string;
    productionMonth?: string | null;
    insuredName?: string | null;
    insuredId?: string | null;
    employerName?: string | null;
    employerId?: string | null;
    policyNumber?: string | null;
    branch?: string | null;
    subBranch?: string | null;
    productName?: string | null;
    fundType?: string | null;
    planType?: string | null;
    premium?: number | null;
    commissionAmount: number;
    commissionRate?: number | null;
    collectionFee?: number | null;
    advanceAmount?: number | null;
    advanceBalance?: number | null;
    paymentAmount?: number | null;
    amountBeforeVat?: number | null;
    amountWithVat?: number | null;
    accumulationBalance?: number | null;
    managementFeePct?: number | null;
    managementFeeAmount?: number | null;
    transactionType?: string | null;
}
export interface SalesTransaction {
    id: string;
    agentId: string;
    insuranceCompany: string;
    reportType: string;
    processingMonth: string;
    productionMonth: string | null;
    insuredName: string | null;
    insuredId: string | null;
    employerName: string | null;
    employerId: string | null;
    policyNumber: string | null;
    branch: string | null;
    subBranch: string | null;
    productName: string | null;
    fundType: string | null;
    planType: string | null;
    premium: number | null;
    commissionAmount: number;
    commissionRate: number | null;
    collectionFee: number | null;
    advanceAmount: number | null;
    advanceBalance: number | null;
    paymentAmount: number | null;
    amountBeforeVat: number | null;
    amountWithVat: number | null;
    accumulationBalance: number | null;
    managementFeePct: number | null;
    managementFeeAmount: number | null;
    transactionType: string | null;
    createdAt: string;
}
export interface MonthlySalarySummary {
    month: string;
    totalCommission: number;
    recordCount: number;
}
/**
 * Batch-insert sales transactions for an agent.
 * Returns the number of rows inserted.
 */
export declare function insertSalesTransactions(agentId: string, insuranceCompany: string, records: SalesTransactionInput[]): Promise<number>;
/**
 * Get sales transactions for an agent, optionally filtered by processing_month.
 */
export declare function getSalesTransactions(agentId: string, month?: string): Promise<SalesTransaction[]>;
/**
 * Monthly salary summary for an agent: total commission and record count per month.
 */
export interface ClientSummaryRow {
    insuredId: string;
    insuredName: string;
    totalCommission: number;
    monthlyAverage: number;
    monthsActive: number;
    recordCount: number;
    lastMonth: string;
    insuranceCompanies: string[];
    products: string[];
}
export interface ClientTransactionRow {
    id: string;
    processingMonth: string;
    branch: string | null;
    productName: string | null;
    premium: number | null;
    commissionAmount: number;
    insuranceCompany: string;
    policyNumber: string | null;
    reportType: string;
}
/**
 * Search clients (unique insured_id + insured_name) for an agent.
 * Optionally filter by name or ID search term.
 */
export declare function searchClients(agentId: string, search?: string, limit?: number): Promise<ClientSummaryRow[]>;
/**
 * Get all transactions for a specific client (by insured_id) belonging to an agent.
 */
export declare function getClientTransactions(agentId: string, clientId: string): Promise<ClientTransactionRow[]>;
export interface PortfolioBranch {
    branch: string;
    total: number;
    clients: number;
    pct: number;
}
export interface PortfolioTopClient {
    name: string;
    id: string;
    total: number;
    monthlyAvg: number;
    months: number;
    branches: string[];
    trend: 'up' | 'down' | 'stable';
}
export interface PortfolioMonthlyTrend {
    month: string;
    total: number;
    clients: number;
}
export interface PortfolioAtRisk {
    name: string;
    id: string;
    lastAmount: number;
    prevAmount: number;
    dropPct: number;
    lastMonth: string;
}
export interface PortfolioNewClient {
    name: string;
    id: string;
    firstMonth: string;
    total: number;
}
export interface PortfolioAnalysis {
    overview: {
        totalClients: number;
        totalCommission: number;
        monthlyAverage: number;
        monthsTracked: number;
        avgCommissionPerClient: number;
    };
    byBranch: PortfolioBranch[];
    topClients: PortfolioTopClient[];
    monthlyTrend: PortfolioMonthlyTrend[];
    concentration: {
        top5Pct: number;
        top10Pct: number;
        top20Pct: number;
    };
    atRisk: PortfolioAtRisk[];
    newClients: PortfolioNewClient[];
}
export declare function getPortfolioAnalysis(agentId: string): Promise<PortfolioAnalysis>;
export declare function getMonthlySalarySummary(agentId: string): Promise<MonthlySalarySummary[]>;
//# sourceMappingURL=sales.repository.d.ts.map