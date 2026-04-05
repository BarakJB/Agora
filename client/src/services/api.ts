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

// ─── Health ──────────────────────────────────────────────────
export function healthCheck() {
  return request<{ status: string; timestamp: string }>('/../health');
}

export { ApiError };
