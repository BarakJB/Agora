export type ProductType = 'life_insurance' | 'managers_insurance' | 'pension' | 'provident_fund' | 'education_fund' | 'health' | 'general';
export type PremiumFrequency = 'monthly' | 'quarterly' | 'annual' | 'one_time';
export type TaxStatus = 'self_employed' | 'employee' | 'individual' | 'corporation';
export type PolicyStatus = 'active' | 'cancelled' | 'pending' | 'suspended';
export interface Agent {
    id: string;
    agentId: string;
    agencyId: string;
    name: string;
    email: string;
    phone: string;
    licenseNumber: string;
    taxId: string;
    taxStatus: TaxStatus;
    niiRate: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}
export interface Policy {
    id: string;
    agentId: string;
    policyId: string;
    productType: ProductType;
    clientName: string;
    clientId: string;
    startDate: string;
    cancelDate: string | null;
    premiumAmount: number;
    premiumFrequency: PremiumFrequency;
    commissionPct: number;
    recurringPct: number;
    volumePct: number;
    contractId: string | null;
    insuranceCompany: string;
    status: PolicyStatus;
    createdAt: string;
    updatedAt: string;
}
export interface Commission {
    id: string;
    policyId: string;
    agentId: string;
    type: 'one_time' | 'recurring' | 'volume' | 'bonus';
    amount: number;
    rate: number;
    premiumBase: number;
    period: string;
    paymentDate: string;
    status: 'pending' | 'paid' | 'clawback';
    insuranceCompany: string;
    createdAt: string;
}
export interface TaxCalculation {
    grossIncome: number;
    incomeTax: number;
    nationalInsurance: number;
    healthTax: number;
    vat: number;
    totalDeductions: number;
    netIncome: number;
    effectiveTaxRate: number;
    brackets: TaxBracket[];
}
export interface TaxBracket {
    from: number;
    to: number;
    rate: number;
    taxAmount: number;
}
export interface SalarySummary {
    period: string;
    oneTimeCommissions: number;
    recurringCommissions: number;
    volumeCommissions: number;
    bonuses: number;
    grossTotal: number;
    tax: TaxCalculation;
    netTotal: number;
    policyCount: number;
    newPolicies: number;
    conversionRate: number;
}
export type CommissionSourceType = 'nifraim' | 'accumulation' | 'management_fee' | 'collection_fee' | 'advance';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export interface HistoricalCommission {
    period: string;
    type: CommissionSourceType;
    amount: number;
}
export interface AccumulationBalance {
    agentId: string;
    productType: ProductType;
    insuranceCompany: string;
    closingBalance: number;
    period: string;
    managementFeeRate: number;
    commissionRate: number;
}
export interface AdvanceBalance {
    agentId: string;
    totalAdvanced: number;
    totalRecouped: number;
    remainingBalance: number;
    monthlyDeduction: number;
}
export interface PredictionBreakdown {
    nifraim: number;
    accumulation: number;
    managementFees: number;
    collectionFees: number;
    oneTimeCommissions: number;
    advanceDeduction: number;
}
export interface SalaryPrediction {
    agentId: string;
    period: string;
    breakdown: PredictionBreakdown;
    grossPrediction: number;
    tax: TaxCalculation;
    netPrediction: number;
    confidence: ConfidenceLevel;
    dataPointsUsed: number;
    assumptions: string[];
}
export interface DealCommissionPrediction {
    dealType: ProductType;
    premiumAmount: number;
    insuranceCompany: string;
    expectedOneTime: number;
    expectedMonthlyRecurring: number;
    expectedAnnualTotal: number;
    monthlyImpact: {
        grossIncrease: number;
        netIncrease: number;
    };
}
export interface UploadRecord {
    id: string;
    fileName: string;
    insuranceCompany: string;
    uploadDate: string;
    recordCount: number;
    status: 'processing' | 'completed' | 'error';
    errorMessage?: string;
}
export interface ApiResponse<T> {
    data: T;
    error: string | null;
    meta: Record<string, unknown> | null;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
//# sourceMappingURL=index.d.ts.map