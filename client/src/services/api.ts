/**
 * API client — typed fetch wrapper for Agora backend.
 * Base URL comes from Vite proxy (/api → localhost:3001).
 */

const BASE = '/api/v1';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta: Record<string, unknown> | null;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public serverError: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('agora-token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(
      body.error || `HTTP ${res.status}`,
      res.status,
      body.error,
    );
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  agent: {
    id: string;
    name: string;
    email: string;
    phone: string;
    licenseNumber: string;
    licenseNumberPartners?: string | null;
    taxStatus: string;
  };
}

export function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  licenseNumber?: string;
}) {
  return request<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export const authApi = {
  forgotPassword(email: string) {
    return request<{ sent: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(payload: { email: string; otp: string; newPassword: string }) {
    return request<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ─── Agents ──────────────────────────────────────────────────
export interface Agent {
  id: string;
  agentId: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseNumberPartners?: string | null;
  taxStatus: string;
}

export interface UpdateAgentPayload {
  name?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseNumberPartners?: string | null;
  idNumber?: string | null;
}

export function getAgents() {
  return request<Agent[]>('/agents');
}

export function getAgent(id: string) {
  return request<Agent>(`/agents/${id}`);
}

export function updateAgent(id: string, payload: UpdateAgentPayload) {
  return request<Agent>(`/agents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ─── Policies ────────────────────────────────────────────────
export interface Policy {
  id: string;
  agentId: string;
  policyId: string;
  productType: string;
  clientName: string;
  clientId: string;
  startDate: string;
  cancelDate: string | null;
  premiumAmount: number;
  premiumFrequency: string;
  commissionPct: number;
  recurringPct: number;
  volumePct: number;
  contractId: string | null;
  insuranceCompany: string;
  status: 'active' | 'cancelled' | 'pending' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface PolicyStats {
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  byType: Record<string, number>;
  byCompany: Record<string, number>;
}

export function getPolicies(params?: { page?: number; limit?: number; type?: string; company?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.type) qs.set('type', params.type);
  if (params?.company) qs.set('company', params.company);
  const query = qs.toString();
  return request<Policy[]>(`/policies${query ? `?${query}` : ''}`);
}

export function getPolicyStats() {
  return request<PolicyStats>('/policies/stats/summary');
}

// ─── Commissions ─────────────────────────────────────────────
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
  status: string;
  insuranceCompany: string;
  createdAt: string;
}

export interface SalarySummary {
  period: string;
  oneTimeCommissions: number;
  recurringCommissions: number;
  volumeCommissions: number;
  bonuses: number;
  grossTotal: number;
  netTotal: number;
  policyCount: number;
  newPolicies: number;
  conversionRate: number;
}

export interface CarrierTotal {
  company: string;
  total: number;
}

export function getCommissions(params?: { page?: number; limit?: number; period?: string; type?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.period) qs.set('period', params.period);
  if (params?.type) qs.set('type', params.type);
  const query = qs.toString();
  return request<Commission[]>(`/commissions${query ? `?${query}` : ''}`);
}

export function getCommissionSummary(period?: string) {
  const qs = period ? `?period=${period}` : '';
  return request<SalarySummary>(`/commissions/summary${qs}`);
}

export function getCommissionsByCompany() {
  return request<CarrierTotal[]>('/commissions/by-company');
}

// ─── Uploads ─────────────────────────────────────────────────
export interface UploadRecord {
  id: string;
  fileName: string;
  insuranceCompany: string;
  uploadDate: string;
  recordCount: number;
  status: 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

export function getUploads(params?: { page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  return request<UploadRecord[]>(`/uploads${query ? `?${query}` : ''}`);
}

// ─── Sales Transactions ─────────────────────────────────────
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

export function saveSalesTransactions(records: SalesTransactionInput[], insuranceCompany: string) {
  return request<{ inserted: number }>('/sales', {
    method: 'POST',
    body: JSON.stringify({ records, insuranceCompany }),
  });
}

export function getSalesTransactions(month?: string, portfolioType?: string) {
  const qs = new URLSearchParams();
  if (month) qs.set('month', month);
  if (portfolioType && portfolioType !== 'all') qs.set('portfolioType', portfolioType);
  const query = qs.toString();
  return request<SalesTransaction[]>(`/sales${query ? `?${query}` : ''}`);
}

export function getSalesSummary(portfolioType?: string) {
  const qs = portfolioType && portfolioType !== 'all' ? `?portfolioType=${portfolioType}` : '';
  return request<MonthlySalarySummary[]>(`/sales/summary${qs}`);
}

// ─── Portfolio Analysis ─────────────────────────────────────
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
  insuranceCompanies: string[];
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

export function getPortfolioAnalysis(portfolioType?: string) {
  const qs = portfolioType && portfolioType !== 'all' ? `?portfolioType=${portfolioType}` : '';
  return request<PortfolioAnalysis>(`/sales/portfolio${qs}`);
}

// ─── Client Search ──────────────────────────────────────────
export interface ClientSummary {
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

export interface ClientTransaction {
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

export interface ClientsPage {
  items: ClientSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function searchClients(params: {
  search?: string;
  page?: number;
  pageSize?: number;
  portfolioType?: string;
}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.page && params.page !== 1) qs.set('page', String(params.page));
  if (params.pageSize && params.pageSize !== 50) qs.set('pageSize', String(params.pageSize));
  if (params.portfolioType && params.portfolioType !== 'all') qs.set('portfolioType', params.portfolioType);
  const query = qs.toString();
  return request<ClientsPage>(`/sales/clients${query ? `?${query}` : ''}`);
}

export function getClientTransactions(clientId: string, portfolioType?: string) {
  const qs = portfolioType && portfolioType !== 'all' ? `?portfolioType=${portfolioType}` : '';
  return request<ClientTransaction[]>(`/sales/client/${encodeURIComponent(clientId)}${qs}`);
}

// ─── Contract Coverage ──────────────────────────────────────
import type { ContractCoverageResponse } from '../types/contract-coverage';

export function getContractCoverageSummary(month?: string, portfolioType?: string) {
  const qs = new URLSearchParams();
  if (month) qs.set('month', month);
  if (portfolioType && portfolioType !== 'all') qs.set('portfolioType', portfolioType);
  const query = qs.toString();
  return request<ContractCoverageResponse>(`/sales/contract-coverage${query ? `?${query}` : ''}`);
}

export function getContractCoverageDetailed(month?: string, portfolioType?: string) {
  const qs = new URLSearchParams();
  qs.set('detailed', 'true');
  if (month) qs.set('month', month);
  if (portfolioType && portfolioType !== 'all') qs.set('portfolioType', portfolioType);
  return request<ContractCoverageResponse>(`/sales/contract-coverage?${qs.toString()}`);
}

// ─── Sales Potential ─────────────────────────────────────────
import type { SalesPotentialData } from '../types/potential';

export type InsuranceCompanyCode =
  | 'harel'
  | 'menora'
  | 'phoenix'
  | 'analyst'
  | 'migdal'
  | 'clal'
  | 'hachshara'
  | 'altshuler'
  | 'meitav'
  | 'psagot'
  | 'yashir';

// ─── Agent Numbers ───────────────────────────────────────────
export interface AgentNumber {
  insuranceCompanyId: string;
  insuranceCompanyName: string;
  companyAgentNumber: string;
  portfolioType: 'personal' | 'partners';
}

export function getAgentNumbers() {
  return request<AgentNumber[]>('/uploads/agent-numbers');
}

export function upsertAgentNumber(payload: {
  insuranceCompanyId: string;
  companyAgentNumber: string;
  portfolioType: 'personal' | 'partners';
}) {
  return request<{ upserted: boolean }>('/uploads/agent-numbers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteAgentNumber(payload: {
  insuranceCompanyId: string;
  portfolioType: 'personal' | 'partners';
}) {
  return request<{ deleted: boolean }>('/uploads/agent-numbers', {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
}

// ─── Annual Snapshot ─────────────────────────────────────────
export interface AnnualSnapshot {
  growthPct: number;
  newClientsLast3Months: number;
  totalActiveClients: number;
  retentionRate: number;
}

// ─── Health ──────────────────────────────────────────────────
export function healthCheck() {
  return request<{ status: string; timestamp: string }>('/../health');
}

// ─── Advisor ─────────────────────────────────────────────────
import type { ChatResponse, ConversationSummary, ConversationDetail } from '../types/advisor';

export const advisorApi = {
  chat(payload: { message: string; conversationId?: string }) {
    return request<ChatResponse>('/advisor/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listConversations() {
    return request<ConversationSummary[]>('/advisor/conversations');
  },

  getConversation(id: string) {
    return request<ConversationDetail>(`/advisor/conversations/${encodeURIComponent(id)}`);
  },

  deleteConversation(id: string) {
    return request<{ deleted: boolean }>(`/advisor/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

// ─── Sales Summary by Type ───────────────────────────────────
export interface SalesTypeBreakdown {
  nifraim: number;
  hekef: number;
  accumulation: number;
  total: number;
}

export interface SalesSummaryByTypeResponse {
  current: SalesTypeBreakdown;
  previous?: SalesTypeBreakdown;
  changePct?: {
    nifraim: number;
    hekef: number;
    accumulation: number;
    total: number;
  };
}

export interface CompanyProductRow {
  branch: string;
  product: string;
  nifraimAmount: number;
  hekefAmount: number;
  accumulationAmount: number;
  totalCommission: number;
  pctOfCompany: number;
}

export interface CompanyBreakdown {
  company: string;
  totalCommission: number;
  monthlyAverage: number;
  pctOfTotal: number;
  products: CompanyProductRow[];
}

export interface CompanyProductBreakdownResponse {
  companies: CompanyBreakdown[];
  grandTotal: number;
}

export interface RevenueForecastBreakdown {
  nifraim: number;
  hekef: number;
  accumulation: number;
}

export interface RevenueForecastResponse {
  predictedTotal: number;
  breakdown: RevenueForecastBreakdown;
  confidence: 'high' | 'medium' | 'low';
  basedOnMonths: number;
  assumptions: string[];
}

export interface PartnersSplitResponse {
  pct: number;
}

export const salesApi = {
  getSalesPotential(portfolioType?: string) {
    const qs = portfolioType && portfolioType !== 'all' ? `?portfolioType=${portfolioType}` : '';
    return request<SalesPotentialData>(`/sales/potential${qs}`);
  },

  assignCompany(payload: {
    insuredId?: string;
    policyNumber?: string;
    insuranceCompany: InsuranceCompanyCode;
  }) {
    return request<{ updated: number }>('/sales/assign-company', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getPortfolioTypes() {
    return request<{ types: Array<'personal' | 'partners'> }>('/sales/portfolio-types');
  },

  getSummaryByType(params: { month: string; portfolioType?: string; compareToPrevMonth?: boolean }) {
    const qs = new URLSearchParams();
    qs.set('month', params.month);
    if (params.portfolioType && params.portfolioType !== 'all') qs.set('portfolioType', params.portfolioType);
    if (params.compareToPrevMonth) qs.set('compareToPrevMonth', 'true');
    return request<SalesSummaryByTypeResponse>(`/sales/summary-by-type?${qs.toString()}`);
  },

  getCompanyProductBreakdown(params: { fromMonth?: string; toMonth?: string; portfolioType?: string }) {
    const qs = new URLSearchParams();
    if (params.fromMonth) qs.set('fromMonth', params.fromMonth);
    if (params.toMonth) qs.set('toMonth', params.toMonth);
    if (params.portfolioType && params.portfolioType !== 'all') qs.set('portfolioType', params.portfolioType);
    const query = qs.toString();
    return request<CompanyProductBreakdownResponse>(`/sales/company-product-breakdown${query ? `?${query}` : ''}`);
  },

  getRevenueForecast(params?: { portfolioType?: string }) {
    const qs = params?.portfolioType && params.portfolioType !== 'all' ? `?portfolioType=${params.portfolioType}` : '';
    return request<RevenueForecastResponse>(`/predictions/next-month${qs}`);
  },

  getMonthlySalarySummary(params?: { portfolioType?: string }) {
    const qs = params?.portfolioType && params.portfolioType !== 'all' ? `?portfolioType=${params.portfolioType}` : '';
    return request<MonthlySalarySummary[]>(`/sales/summary${qs}`);
  },

  getAnnualSnapshot(params?: { portfolioType?: string }) {
    const qs = params?.portfolioType && params.portfolioType !== 'all' ? `?portfolioType=${params.portfolioType}` : '';
    return request<AnnualSnapshot>(`/sales/annual-snapshot${qs}`);
  },
};

export const settingsApi = {
  getPartnersSplit() {
    return request<PartnersSplitResponse>('/settings/partners-split');
  },

  setPartnersSplit(pct: number) {
    return request<{ saved: boolean }>('/settings/partners-split', {
      method: 'PUT',
      body: JSON.stringify({ pct }),
    });
  },
};

// ─── Targets ─────────────────────────────────────────────────
import type { Target, TargetSuggestion, TargetProgress, TargetMetric, TargetPeriod } from '../types/targets';

export const targetsApi = {
  list() {
    return request<Target[]>('/targets');
  },

  upsert(payload: { metric: TargetMetric; period: TargetPeriod; targetAmount: number }) {
    return request<Target>('/targets', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete(metric: TargetMetric, period: TargetPeriod) {
    return request<{ deleted: boolean }>(`/targets/${metric}/${period}`, {
      method: 'DELETE',
    });
  },

  getSuggestions() {
    return request<TargetSuggestion[]>('/targets/suggestions');
  },

  getProgress(month?: string) {
    const qs = month ? `?month=${encodeURIComponent(month)}` : '';
    return request<TargetProgress[]>(`/targets/progress${qs}`);
  },
};

export { ApiError };
