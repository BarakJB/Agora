import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database.js';
import type { Agent, Policy, Commission, UploadRecord } from '../types/index.js';

// No-op in production; overridden by vi.mock in tests
export function _resetMockData(): void { /* no-op */ }

// Row-to-entity mappers (snake_case DB → camelCase TS)

function toAgent(row: RowDataPacket): Agent {
  return {
    id: row.id,
    agentId: row.agent_id,
    agencyId: row.agency_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    licenseNumber: row.license_number,
    taxId: row.tax_id,
    taxStatus: row.tax_status,
    niiRate: Number(row.nii_rate),
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    deletedAt: row.deleted_at?.toISOString?.() ?? row.deleted_at ?? null,
  };
}

function toPolicy(row: RowDataPacket): Policy {
  return {
    id: row.id,
    agentId: row.agent_id,
    policyId: row.policy_number,
    productType: row.product_type,
    clientName: row.client_name,
    clientId: row.client_id_number,
    startDate: row.start_date instanceof Date
      ? row.start_date.toISOString().split('T')[0]
      : row.start_date,
    cancelDate: row.cancel_date instanceof Date
      ? row.cancel_date.toISOString().split('T')[0]
      : row.cancel_date ?? null,
    premiumAmount: Number(row.premium_amount),
    premiumFrequency: row.premium_frequency,
    commissionPct: Number(row.commission_pct),
    recurringPct: Number(row.recurring_pct),
    volumePct: Number(row.volume_pct),
    contractId: row.contract_id ?? null,
    insuranceCompany: row.insurance_company_name,
    status: row.status,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

function toCommission(row: RowDataPacket): Commission {
  return {
    id: row.id,
    policyId: row.policy_id,
    agentId: row.agent_id,
    type: row.type,
    amount: Number(row.amount),
    rate: Number(row.rate),
    premiumBase: Number(row.premium_base),
    period: row.period,
    paymentDate: row.payment_date instanceof Date
      ? row.payment_date.toISOString().split('T')[0]
      : row.payment_date,
    status: row.status,
    insuranceCompany: row.insurance_company_name,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

function toUpload(row: RowDataPacket): UploadRecord {
  return {
    id: row.id,
    fileName: row.file_name,
    insuranceCompany: row.insurance_company_name,
    uploadDate: row.upload_date instanceof Date
      ? row.upload_date.toISOString().split('T')[0]
      : row.upload_date,
    recordCount: Number(row.record_count),
    status: row.status,
    errorMessage: row.error_message ?? undefined,
  };
}

// ============ Agents ============

export async function getAllAgents(): Promise<Agent[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, agent_id, agency_id, name, email, phone, license_number, tax_id, tax_status, nii_rate, created_at, updated_at, deleted_at FROM agents WHERE deleted_at IS NULL',
  );
  return rows.map(toAgent);
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, agent_id, agency_id, name, email, phone, license_number, tax_id, tax_status, nii_rate, created_at, updated_at, deleted_at FROM agents WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  return rows.length > 0 ? toAgent(rows[0]) : null;
}

// ============ Policies ============

const POLICY_SELECT = `
  SELECT p.id, p.agent_id, p.policy_number, p.product_type,
         c.name AS client_name, c.id_number AS client_id_number,
         p.start_date, p.cancel_date, p.premium_amount, p.premium_frequency,
         p.commission_pct, p.recurring_pct, p.volume_pct,
         p.contract_id, ic.name AS insurance_company_name,
         p.status, p.created_at, p.updated_at
  FROM policies p
  JOIN clients c ON c.id = p.client_id
  JOIN insurance_companies ic ON ic.id = p.insurance_company_id
`;

export async function getPolicies(filters: {
  type?: string;
  company?: string;
  page: number;
  limit: number;
}): Promise<{ data: Policy[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.type) {
    conditions.push('p.product_type = ?');
    params.push(filters.type);
  }
  if (filters.company) {
    conditions.push('ic.name = ?');
    params.push(filters.company);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM policies p JOIN insurance_companies ic ON ic.id = p.insurance_company_id ${where}`,
    params,
  );
  const total = countRows[0].total as number;

  const offset = (filters.page - 1) * filters.limit;
  const [rows] = await pool.query<RowDataPacket[]>(
    `${POLICY_SELECT} ${where} ORDER BY p.start_date DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, offset],
  );

  return { data: rows.map(toPolicy), total };
}

export async function getPolicyById(id: string): Promise<Policy | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${POLICY_SELECT} WHERE p.id = ?`,
    [id],
  );
  return rows.length > 0 ? toPolicy(rows[0]) : null;
}

export async function getPolicyStats(): Promise<{
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  byType: Record<string, number>;
  byCompany: Record<string, number>;
}> {
  const [totalRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS active, SUM(premium_amount) AS premium FROM policies',
    ['active'],
  );

  const [typeRows] = await pool.query<RowDataPacket[]>(
    'SELECT product_type, SUM(premium_amount) AS total FROM policies GROUP BY product_type',
  );

  const [companyRows] = await pool.query<RowDataPacket[]>(
    'SELECT ic.name, SUM(p.premium_amount) AS total FROM policies p JOIN insurance_companies ic ON ic.id = p.insurance_company_id GROUP BY ic.name',
  );

  const byType: Record<string, number> = {};
  for (const row of typeRows) {
    byType[row.product_type] = Number(row.total);
  }

  const byCompany: Record<string, number> = {};
  for (const row of companyRows) {
    byCompany[row.name] = Number(row.total);
  }

  return {
    totalPolicies: totalRows[0].total as number,
    activePolicies: totalRows[0].active as number,
    totalPremium: Number(totalRows[0].premium),
    byType,
    byCompany,
  };
}

export async function countPolicies(): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM policies',
  );
  return rows[0].total as number;
}

export async function countNewPolicies(period: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM policies WHERE DATE_FORMAT(start_date, ?) = ?',
    ['%Y-%m', period],
  );
  return rows[0].total as number;
}

// ============ Commissions ============

const COMMISSION_SELECT = `
  SELECT cm.id, cm.policy_id, cm.agent_id, cm.type, cm.amount, cm.rate,
         cm.premium_base, cm.period, cm.payment_date, cm.status,
         ic.name AS insurance_company_name, cm.created_at
  FROM commissions cm
  JOIN insurance_companies ic ON ic.id = cm.insurance_company_id
`;

export async function getCommissions(filters: {
  period?: string;
  type?: string;
  page: number;
  limit: number;
}): Promise<{ data: Commission[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.period) {
    conditions.push('cm.period = ?');
    params.push(filters.period);
  }
  if (filters.type) {
    conditions.push('cm.type = ?');
    params.push(filters.type);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM commissions cm ${where}`,
    params,
  );
  const total = countRows[0].total as number;

  const offset = (filters.page - 1) * filters.limit;
  const [rows] = await pool.query<RowDataPacket[]>(
    `${COMMISSION_SELECT} ${where} ORDER BY cm.created_at DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, offset],
  );

  return { data: rows.map(toCommission), total };
}

export async function getCommissionsByPeriod(period: string): Promise<Commission[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${COMMISSION_SELECT} WHERE cm.period = ?`,
    [period],
  );
  return rows.map(toCommission);
}

export async function getCommissionsByCompany(): Promise<{ company: string; total: number }[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ic.name AS company, ROUND(SUM(cm.amount)) AS total
     FROM commissions cm
     JOIN insurance_companies ic ON ic.id = cm.insurance_company_id
     GROUP BY ic.name
     ORDER BY total DESC`,
  );
  return rows.map((r) => ({ company: r.company as string, total: Number(r.total) }));
}

// ============ Uploads ============

const UPLOAD_SELECT = `
  SELECT u.id, u.file_name, ic.name AS insurance_company_name,
         u.upload_date, u.record_count, u.status, u.error_message
  FROM uploads u
  LEFT JOIN insurance_companies ic ON ic.id = u.insurance_company_id
`;

export async function getUploads(filters: {
  page: number;
  limit: number;
}): Promise<{ data: UploadRecord[]; total: number }> {
  const [countRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM uploads',
  );
  const total = countRows[0].total as number;

  const offset = (filters.page - 1) * filters.limit;
  const [rows] = await pool.query<RowDataPacket[]>(
    `${UPLOAD_SELECT} ORDER BY u.upload_date DESC LIMIT ? OFFSET ?`,
    [filters.limit, offset],
  );

  return { data: rows.map(toUpload), total };
}

export async function getUploadById(id: string): Promise<UploadRecord | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${UPLOAD_SELECT} WHERE u.id = ?`,
    [id],
  );
  return rows.length > 0 ? toUpload(rows[0]) : null;
}

// ============ Agent Writes ============

export async function findAgentDuplicate(agentId: string, email: string, licenseNumber: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM agents WHERE deleted_at IS NULL AND (agent_id = ? OR email = ? OR license_number = ?) LIMIT 1',
    [agentId, email, licenseNumber],
  );
  return rows.length > 0;
}

export async function createAgent(id: string, data: {
  agentId: string; agencyId: string; name: string; email: string;
  phone: string; licenseNumber: string; taxId: string; taxStatus: string; niiRate: number;
}): Promise<Agent> {
  await pool.query<ResultSetHeader>(
    `INSERT INTO agents (id, agent_id, agency_id, name, email, phone, license_number, tax_id, tax_status, nii_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.agentId, data.agencyId, data.name, data.email, data.phone, data.licenseNumber, data.taxId, data.taxStatus, data.niiRate],
  );
  return (await getAgentById(id))!;
}

export async function updateAgent(id: string, data: Record<string, unknown>): Promise<Agent | null> {
  const fieldMap: Record<string, string> = {
    agentId: 'agent_id', agencyId: 'agency_id', name: 'name', email: 'email',
    phone: 'phone', licenseNumber: 'license_number', taxId: 'tax_id',
    taxStatus: 'tax_status', niiRate: 'nii_rate',
  };

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(data)) {
    const col = fieldMap[key];
    if (col && value !== undefined) {
      sets.push(`${col} = ?`);
      params.push(value);
    }
  }

  if (sets.length === 0) return getAgentById(id);

  params.push(id);
  await pool.query<ResultSetHeader>(
    `UPDATE agents SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
    params,
  );
  return getAgentById(id);
}

export async function softDeleteAgent(id: string): Promise<Agent | null> {
  await pool.query<ResultSetHeader>(
    'UPDATE agents SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  // Return with deletedAt set
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, agent_id, agency_id, name, email, phone, license_number, tax_id, tax_status, nii_rate, created_at, updated_at, deleted_at FROM agents WHERE id = ?',
    [id],
  );
  return rows.length > 0 ? toAgent(rows[0]) : null;
}

// ============ Policy Writes ============

export async function createPolicy(id: string, data: {
  agentId: string; policyId: string; productType: string; clientName: string;
  clientId: string; startDate: string; premiumAmount: number;
  premiumFrequency: string; commissionPct: number; recurringPct: number;
  volumePct: number; contractId: string | null; insuranceCompany: string;
}): Promise<Policy | null> {
  // Resolve insurance company id by name
  const [icRows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM insurance_companies WHERE name = ? LIMIT 1',
    [data.insuranceCompany],
  );
  if (icRows.length === 0) return null;
  const insuranceCompanyId = icRows[0].id;

  // Resolve or create client
  const [clientRows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM clients WHERE agent_id = ? AND id_number = ? LIMIT 1',
    [data.agentId, data.clientId],
  );
  let clientDbId: string;
  if (clientRows.length > 0) {
    clientDbId = clientRows[0].id;
  } else {
    const { v4: uuid } = await import('uuid');
    clientDbId = uuid();
    await pool.query<ResultSetHeader>(
      'INSERT INTO clients (id, agent_id, name, id_number) VALUES (?, ?, ?, ?)',
      [clientDbId, data.agentId, data.clientName, data.clientId],
    );
  }

  await pool.query<ResultSetHeader>(
    `INSERT INTO policies (id, agent_id, client_id, insurance_company_id, contract_id, policy_number, product_type, start_date, premium_amount, premium_frequency, commission_pct, recurring_pct, volume_pct, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [id, data.agentId, clientDbId, insuranceCompanyId, data.contractId, data.policyId, data.productType, data.startDate, data.premiumAmount, data.premiumFrequency, data.commissionPct, data.recurringPct, data.volumePct],
  );
  return getPolicyById(id);
}

export async function updatePolicy(id: string, data: Record<string, unknown>): Promise<Policy | null> {
  const fieldMap: Record<string, string> = {
    status: 'status', cancelDate: 'cancel_date', premiumAmount: 'premium_amount',
    premiumFrequency: 'premium_frequency', commissionPct: 'commission_pct',
    recurringPct: 'recurring_pct', volumePct: 'volume_pct', contractId: 'contract_id',
  };

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(data)) {
    const col = fieldMap[key];
    if (col && value !== undefined) {
      sets.push(`${col} = ?`);
      params.push(value);
    }
  }

  if (sets.length === 0) return getPolicyById(id);

  params.push(id);
  await pool.query<ResultSetHeader>(
    `UPDATE policies SET ${sets.join(', ')} WHERE id = ?`,
    params,
  );
  return getPolicyById(id);
}

export async function getPolicyStatusById(id: string): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT status FROM policies WHERE id = ? LIMIT 1',
    [id],
  );
  return rows.length > 0 ? (rows[0].status as string) : null;
}

// ============ Commission Writes ============

export async function getCommissionById(id: string): Promise<Commission | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${COMMISSION_SELECT} WHERE cm.id = ?`,
    [id],
  );
  return rows.length > 0 ? toCommission(rows[0]) : null;
}

export async function createCommission(id: string, data: {
  policyId: string; agentId: string; type: string; amount: number;
  rate: number; premiumBase: number; period: string; paymentDate: string;
  insuranceCompany: string;
}): Promise<Commission | null> {
  // Resolve insurance company id by name
  const [icRows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM insurance_companies WHERE name = ? LIMIT 1',
    [data.insuranceCompany],
  );
  if (icRows.length === 0) return null;
  const insuranceCompanyId = icRows[0].id;

  await pool.query<ResultSetHeader>(
    `INSERT INTO commissions (id, policy_id, agent_id, insurance_company_id, type, amount, rate, premium_base, period, payment_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [id, data.policyId, data.agentId, insuranceCompanyId, data.type, data.amount, data.rate, data.premiumBase, data.period, data.paymentDate],
  );
  return getCommissionById(id);
}

export async function updateCommission(id: string, data: Record<string, unknown>): Promise<Commission | null> {
  const fieldMap: Record<string, string> = {
    amount: 'amount', rate: 'rate', status: 'status', paymentDate: 'payment_date',
  };

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(data)) {
    const col = fieldMap[key];
    if (col && value !== undefined) {
      sets.push(`${col} = ?`);
      params.push(value);
    }
  }

  if (sets.length === 0) return getCommissionById(id);

  params.push(id);
  await pool.query<ResultSetHeader>(
    `UPDATE commissions SET ${sets.join(', ')} WHERE id = ?`,
    params,
  );
  return getCommissionById(id);
}

export async function getCommissionStatusById(id: string): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT status FROM commissions WHERE id = ? LIMIT 1',
    [id],
  );
  return rows.length > 0 ? (rows[0].status as string) : null;
}

// ============ Upload Writes ============

export async function createUpload(id: string, data: {
  agentId: string; insuranceCompany: string; fileName: string;
  recordCount: number; status: 'processing' | 'completed' | 'error';
  errorMessage?: string;
}): Promise<UploadRecord | null> {
  // Resolve insurance company id by name
  const [icRows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM insurance_companies WHERE name = ? LIMIT 1',
    [data.insuranceCompany],
  );
  const insuranceCompanyId = icRows.length > 0 ? icRows[0].id : null;

  await pool.query<ResultSetHeader>(
    `INSERT INTO uploads (id, agent_id, insurance_company_id, file_name, record_count, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.agentId, insuranceCompanyId, data.fileName, data.recordCount, data.status, data.errorMessage ?? null],
  );
  return getUploadById(id);
}

export async function createCommissionBatch(rows: Array<{
  id: string; policyId: string; agentId: string; insuranceCompanyId: string;
  type: string; amount: number; rate: number; premiumBase: number;
  period: string; paymentDate: string;
}>): Promise<void> {
  if (rows.length === 0) return;
  const values = rows.map((r) => [r.id, r.policyId, r.agentId, r.insuranceCompanyId, r.type, r.amount, r.rate, r.premiumBase, r.period, r.paymentDate, 'pending']);
  await pool.query<ResultSetHeader>(
    `INSERT INTO commissions (id, policy_id, agent_id, insurance_company_id, type, amount, rate, premium_base, period, payment_date, status)
     VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
    values.flat(),
  );
}

// ============ Auth ============

export async function findAgentByEmail(email: string): Promise<{ id: string; email: string; name: string; passwordHash: string | null } | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, email, name, password_hash FROM agents WHERE email = ? AND deleted_at IS NULL LIMIT 1',
    [email],
  );
  if (rows.length === 0) return null;
  return { id: rows[0].id, email: rows[0].email, name: rows[0].name, passwordHash: rows[0].password_hash };
}

export async function createAgentWithPassword(id: string, data: {
  agentId: string; agencyId: string; name: string; email: string;
  phone: string; licenseNumber: string; taxId: string; taxStatus: string;
  niiRate: number; passwordHash: string;
}): Promise<Agent> {
  await pool.query<ResultSetHeader>(
    `INSERT INTO agents (id, agent_id, agency_id, name, email, phone, license_number, tax_id, tax_status, nii_rate, password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.agentId, data.agencyId, data.name, data.email, data.phone, data.licenseNumber, data.taxId, data.taxStatus, data.niiRate, data.passwordHash],
  );
  return (await getAgentById(id))!;
}

export async function resolveInsuranceCompanyId(name: string): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM insurance_companies WHERE name = ? LIMIT 1',
    [name],
  );
  return rows.length > 0 ? (rows[0].id as string) : null;
}

// ============ Contracts (for prediction engine) ============

export async function getContractForDeal(
  agentId: string,
  insuranceCompany: string,
  productType: string,
  asOfDate: string,
): Promise<{
  commissionPct: number;
  recurringPct: number;
  volumePct: number;
} | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.commission_pct, c.recurring_pct, c.volume_pct
     FROM contracts c
     JOIN insurance_companies ic ON ic.id = c.insurance_company_id
     WHERE c.agent_id = ? AND ic.name = ? AND c.product_type = ?
       AND c.effective_from <= ? AND (c.effective_to IS NULL OR c.effective_to >= ?)
     ORDER BY c.effective_from DESC
     LIMIT 1`,
    [agentId, insuranceCompany, productType, asOfDate, asOfDate],
  );
  if (rows.length === 0) return null;
  return {
    commissionPct: Number(rows[0].commission_pct),
    recurringPct: Number(rows[0].recurring_pct),
    volumePct: Number(rows[0].volume_pct),
  };
}

export async function getActivePoliciesForAgent(agentId: string): Promise<Policy[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${POLICY_SELECT} WHERE p.agent_id = ? AND p.status = 'active' ORDER BY p.start_date DESC LIMIT 5000`,
    [agentId],
  );
  return rows.map(toPolicy);
}

export async function getCommissionsForPeriodRange(
  agentId: string,
  fromPeriod: string,
  toPeriod: string,
): Promise<Commission[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${COMMISSION_SELECT} WHERE cm.agent_id = ? AND cm.period >= ? AND cm.period <= ? ORDER BY cm.period ASC LIMIT 10000`,
    [agentId, fromPeriod, toPeriod],
  );
  return rows.map(toCommission);
}

export async function getAgentPolicyCountByType(
  agentId: string,
  productType: string,
): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM policies WHERE agent_id = ? AND product_type = ? AND status = 'active'",
    [agentId, productType],
  );
  return rows[0].total as number;
}

// ============ Commission Reports ============

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

export async function createCommissionReport(data: {
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
}): Promise<void> {
  await pool.query<ResultSetHeader>(
    `INSERT INTO commission_reports
      (id, upload_id, agent_id, insurance_company_id, report_type, period,
       record_count, skipped_rows, error_count, total_commission, total_premium,
       sheet_name, error_details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id, data.uploadId, data.agentId, data.insuranceCompanyId,
      data.reportType, data.period, data.recordCount, data.skippedRows,
      data.errorCount, data.totalCommission, data.totalPremium,
      data.sheetName, data.errorDetails ? JSON.stringify(data.errorDetails) : null,
    ],
  );
}

export async function getCommissionReportsByUpload(uploadId: string): Promise<CommissionReportRecord[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, upload_id, agent_id, insurance_company_id, report_type, period,
            record_count, skipped_rows, error_count, total_commission, total_premium,
            sheet_name, status, created_at
     FROM commission_reports
     WHERE upload_id = ?
     ORDER BY created_at ASC`,
    [uploadId],
  );
  return rows.map((r) => ({
    id: r.id,
    uploadId: r.upload_id,
    agentId: r.agent_id,
    insuranceCompanyId: r.insurance_company_id,
    reportType: r.report_type,
    period: r.period,
    recordCount: r.record_count,
    skippedRows: r.skipped_rows,
    errorCount: r.error_count,
    totalCommission: Number(r.total_commission),
    totalPremium: Number(r.total_premium),
    sheetName: r.sheet_name,
    status: r.status,
    createdAt: r.created_at?.toISOString?.() ?? r.created_at,
  }));
}

// ============ Commission Rules ============

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

export async function getCommissionRules(
  insuranceCompanyId: string,
  productType?: string,
): Promise<CommissionRuleRecord[]> {
  let sql = `SELECT id, insurance_company_id, product_type, rule_type,
                    delay_months, delay_business_days, rate_pct, description, is_active
             FROM commission_rules
             WHERE insurance_company_id = ? AND is_active = 1`;
  const params: unknown[] = [insuranceCompanyId];

  if (productType) {
    sql += ' AND product_type = ?';
    params.push(productType);
  }

  sql += ' ORDER BY product_type, rule_type';

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows.map((r) => ({
    id: r.id,
    insuranceCompanyId: r.insurance_company_id,
    productType: r.product_type,
    ruleType: r.rule_type,
    delayMonths: r.delay_months,
    delayBusinessDays: r.delay_business_days,
    ratePct: r.rate_pct != null ? Number(r.rate_pct) : null,
    description: r.description,
    isActive: Boolean(r.is_active),
  }));
}
