// ============ Enums ============

export type ProductType =
  | 'life_insurance'
  | 'managers_insurance'
  | 'pension'
  | 'provident_fund'
  | 'education_fund'
  | 'health'
  | 'general';

export type PremiumFrequency = 'monthly' | 'quarterly' | 'annual' | 'one_time';

export type TaxStatus = 'self_employed' | 'employee' | 'individual' | 'corporation';

export type PolicyStatus = 'active' | 'cancelled' | 'pending' | 'suspended';

// ============ Core Entities ============

export interface Agent {
  id: string;
  agentId: string;          // 9-digit ID or license number
  agencyId: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  taxId: string;
  taxStatus: TaxStatus;
  niiRate: number;           // National Insurance rate %
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Policy {
  id: string;
  agentId: string;
  policyId: string;          // Insurance company policy ID
  productType: ProductType;
  clientName: string;
  clientId: string;
  startDate: string;         // YYYY-MM-DD
  cancelDate: string | null;
  premiumAmount: number;     // In ILS
  premiumFrequency: PremiumFrequency;
  commissionPct: number;     // One-time commission %
  recurringPct: number;      // Recurring commission %
  volumePct: number;         // Volume-based commission %
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
  period: string;            // YYYY-MM
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

// ============ Upload ============

export interface UploadRecord {
  id: string;
  fileName: string;
  insuranceCompany: string;
  uploadDate: string;
  recordCount: number;
  status: 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

// ============ API Response ============

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
