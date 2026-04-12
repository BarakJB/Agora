/**
 * API client — typed fetch wrapper for PayAgent backend.
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
  const token = localStorage.getItem('payagent-token');

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

// ─── Agents ──────────────────────────────────────────────────
export interface Agent {
  id: string;
  agentId: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  taxStatus: string;
}

export function getAgents() {
  return request<Agent[]>('/agents');
}

export function getAgent(id: string) {
  return request<Agent>(`/agents/${id}`);
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

export function getSalesTransactions(month?: string) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  return request<SalesTransaction[]>(`/sales${qs}`);
}

export function getSalesSummary() {
  return request<MonthlySalarySummary[]>('/sales/summary');
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

export function getPortfolioAnalysis() {
  return request<PortfolioAnalysis>('/sales/portfolio');
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

export function searchClients(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<ClientSummary[]>(`/sales/clients${qs}`);
}

export function getClientTransactions(clientId: string) {
  return request<ClientTransaction[]>(`/sales/client/${encodeURIComponent(clientId)}`);
}

// ─── Health ──────────────────────────────────────────────────
export function healthCheck() {
  return request<{ status: string; timestamp: string }>('/../health');
}

export { ApiError };
