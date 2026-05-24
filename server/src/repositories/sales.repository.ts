import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database.js';

// Only these report types represent individual policy-level records.
// branch_distribution / agent_data / product_distribution are aggregate summaries
// of the same data — including them causes double-counting.
const POLICY_REPORT_TYPES = `('nifraim','hekef','accumulation_nifraim','accumulation_hekef')`;

export type SalesPortfolioType = 'personal' | 'partners' | 'unknown';
export type PortfolioFilter = 'personal' | 'partners' | 'all';

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
  portfolioType?: SalesPortfolioType;
}

export interface SalesTransaction {
  id: string;
  agentId: string;
  insuranceCompany: string;
  portfolioType: SalesPortfolioType;
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

function toSalesTransaction(row: RowDataPacket): SalesTransaction {
  return {
    id: row.id,
    agentId: row.agent_id,
    insuranceCompany: row.insurance_company,
    portfolioType: (row.portfolio_type as SalesPortfolioType) ?? 'unknown',
    reportType: row.report_type,
    processingMonth: row.processing_month,
    productionMonth: row.production_month ?? null,
    insuredName: row.insured_name ?? null,
    insuredId: row.insured_id ?? null,
    employerName: row.employer_name ?? null,
    employerId: row.employer_id ?? null,
    policyNumber: row.policy_number ?? null,
    branch: row.branch ?? null,
    subBranch: row.sub_branch ?? null,
    productName: row.product_name ?? null,
    fundType: row.fund_type ?? null,
    planType: row.plan_type ?? null,
    premium: row.premium != null ? Number(row.premium) : null,
    commissionAmount: Number(row.commission_amount),
    commissionRate: row.commission_rate != null ? Number(row.commission_rate) : null,
    collectionFee: row.collection_fee != null ? Number(row.collection_fee) : null,
    advanceAmount: row.advance_amount != null ? Number(row.advance_amount) : null,
    advanceBalance: row.advance_balance != null ? Number(row.advance_balance) : null,
    paymentAmount: row.payment_amount != null ? Number(row.payment_amount) : null,
    amountBeforeVat: row.amount_before_vat != null ? Number(row.amount_before_vat) : null,
    amountWithVat: row.amount_with_vat != null ? Number(row.amount_with_vat) : null,
    accumulationBalance: row.accumulation_balance != null ? Number(row.accumulation_balance) : null,
    managementFeePct: row.management_fee_pct != null ? Number(row.management_fee_pct) : null,
    managementFeeAmount: row.management_fee_amount != null ? Number(row.management_fee_amount) : null,
    transactionType: row.transaction_type ?? null,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

/**
 * Batch-insert sales transactions for an agent.
 * Returns the number of rows inserted.
 */
export async function insertSalesTransactions(
  agentId: string,
  insuranceCompany: string,
  records: SalesTransactionInput[],
): Promise<number> {
  if (records.length === 0) return 0;

  // Delete existing records for same agent + company + month + report_type to prevent duplicates
  const monthsAndTypes = new Set<string>();
  for (const r of records) {
    if (r.processingMonth && r.reportType) {
      monthsAndTypes.add(`${r.processingMonth}|${r.reportType}`);
    }
  }

  for (const key of monthsAndTypes) {
    const [month, reportType] = key.split('|');
    await pool.query(
      `DELETE FROM sales_transactions
       WHERE agent_id = ? AND insurance_company = ? AND processing_month = ? AND report_type = ?`,
      [agentId, insuranceCompany, month, reportType],
    );
  }

  // Build batch INSERT with chunks of 500 to avoid packet size limits
  const CHUNK_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const { v4: uuid } = await import('uuid');

    const placeholders: string[] = [];
    const values: unknown[] = [];

    for (const r of chunk) {
      placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      values.push(
        uuid(),
        agentId,
        insuranceCompany,
        r.portfolioType ?? 'unknown',
        r.reportType,
        r.processingMonth,
        r.productionMonth ?? null,
        r.insuredName ?? null,
        r.insuredId ?? null,
        r.employerName ?? null,
        r.employerId ?? null,
        r.policyNumber ?? null,
        r.branch ?? null,
        r.subBranch ?? null,
        r.productName ?? null,
        r.fundType ?? null,
        r.planType ?? null,
        r.premium ?? null,
        r.commissionAmount,
        r.commissionRate ?? null,
        r.collectionFee ?? null,
        r.advanceAmount ?? null,
        r.advanceBalance ?? null,
        r.paymentAmount ?? null,
        r.amountBeforeVat ?? null,
        r.amountWithVat ?? null,
        r.accumulationBalance ?? null,
        r.transactionType ?? null,
      );
    }

    const sql = `INSERT INTO sales_transactions
      (id, agent_id, insurance_company, portfolio_type, report_type, processing_month, production_month,
       insured_name, insured_id, employer_name, employer_id, policy_number, branch,
       sub_branch, product_name, fund_type, plan_type, premium, commission_amount,
       commission_rate, collection_fee, advance_amount, advance_balance, payment_amount,
       amount_before_vat, amount_with_vat, accumulation_balance, transaction_type)
      VALUES ${placeholders.join(', ')}`;

    const [result] = await pool.query<ResultSetHeader>(sql, values);
    inserted += result.affectedRows;
  }

  return inserted;
}

/**
 * Get sales transactions for an agent, optionally filtered by processing_month.
 */
export async function getSalesTransactions(
  agentId: string,
  month?: string,
  portfolioType: PortfolioFilter = 'all',
): Promise<SalesTransaction[]> {
  let sql = `SELECT id, agent_id, insurance_company, portfolio_type, report_type, processing_month,
                    production_month, insured_name, insured_id, employer_name, employer_id,
                    policy_number, branch, sub_branch, product_name, fund_type, plan_type,
                    premium, commission_amount, commission_rate, collection_fee,
                    advance_amount, advance_balance, payment_amount, amount_before_vat,
                    amount_with_vat, accumulation_balance, management_fee_pct,
                    management_fee_amount, transaction_type, created_at
             FROM sales_transactions
             WHERE agent_id = ?`;
  const params: unknown[] = [agentId];

  if (month) {
    sql += ' AND processing_month = ?';
    params.push(month);
  }

  if (portfolioType !== 'all') {
    sql += ' AND portfolio_type = ?';
    params.push(portfolioType);
  }

  sql += ' ORDER BY processing_month DESC, created_at DESC LIMIT 10000';

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows.map(toSalesTransaction);
}

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
export async function searchClients(
  agentId: string,
  search?: string,
  limit = 50,
  portfolioType: PortfolioFilter = 'all',
): Promise<ClientSummaryRow[]> {
  let sql = `
    SELECT insured_name,
           MAX(insured_id) AS insured_id,
           ROUND(SUM(commission_amount), 2) AS total_commission,
           COUNT(DISTINCT processing_month) AS months_active,
           COUNT(*) AS record_count,
           MAX(processing_month) AS last_month,
           (SELECT GROUP_CONCAT(DISTINCT t.insurance_company)
            FROM sales_transactions t
            WHERE t.agent_id = ?
              AND TRIM(REGEXP_REPLACE(t.insured_name, '[[:space:]]+', ' ')) = TRIM(REGEXP_REPLACE(s.insured_name, '[[:space:]]+', ' '))
              AND t.insurance_company IS NOT NULL
              AND t.insurance_company != '') AS insurance_companies,
           GROUP_CONCAT(DISTINCT CONCAT(branch, '/', COALESCE(product_name,''))) AS products
    FROM sales_transactions s
    WHERE s.agent_id = ?
      AND s.report_type IN ${POLICY_REPORT_TYPES}
      AND s.insured_name IS NOT NULL
      AND s.insured_name != ''`;
  const params: unknown[] = [agentId, agentId];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ' AND (s.insured_name LIKE ? OR s.insured_id LIKE ?)';
    params.push(term, term);
  }

  if (portfolioType !== 'all') {
    sql += ' AND s.portfolio_type = ?';
    params.push(portfolioType);
  }

  sql += ' GROUP BY s.insured_name ORDER BY last_month DESC, total_commission DESC LIMIT ?';
  params.push(limit);

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);

  return rows.map((r) => {
    const totalCommission = Number(r.total_commission);
    const monthsActive = Number(r.months_active) || 1;
    return {
      insuredId: (r.insured_id as string) || (r.insured_name as string),
      insuredName: r.insured_name as string,
      totalCommission,
      monthlyAverage: Math.round((totalCommission / monthsActive) * 100) / 100,
      monthsActive,
      recordCount: Number(r.record_count),
      lastMonth: r.last_month as string,
      insuranceCompanies: r.insurance_companies ? (r.insurance_companies as string).split(',') : [],
      products: r.products ? [...new Set((r.products as string).split(',').map((p: string) => p.split('/')[0]).filter(Boolean))] : [],
    };
  });
}

/**
 * Get all transactions for a specific client (by insured_id) belonging to an agent.
 */
export async function getClientTransactions(
  agentId: string,
  clientId: string,
): Promise<ClientTransactionRow[]> {
  // Search by insured_id first, fallback to insured_name
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, processing_month, branch, product_name, premium,
            commission_amount, insurance_company, policy_number, report_type,
            insured_id, insured_name
     FROM sales_transactions
     WHERE agent_id = ? AND (insured_id = ? OR insured_name = ?)
     ORDER BY processing_month DESC, created_at DESC`,
    [agentId, clientId, clientId],
  );

  return rows.map((r) => ({
    id: r.id as string,
    processingMonth: r.processing_month as string,
    branch: r.branch ?? null,
    productName: r.product_name ?? null,
    premium: r.premium != null ? Number(r.premium) : null,
    commissionAmount: Number(r.commission_amount),
    insuranceCompany: r.insurance_company as string,
    policyNumber: r.policy_number ?? null,
    reportType: r.report_type as string,
  }));
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

export async function getPortfolioAnalysis(
  agentId: string,
  portfolioType: PortfolioFilter = 'all',
): Promise<PortfolioAnalysis> {
  const portfolioFilter = portfolioType !== 'all' ? ` AND portfolio_type = '${portfolioType}'` : '';

  const [overviewRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(DISTINCT insured_name) FROM sales_transactions WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES} AND insured_name IS NOT NULL AND insured_name != ''${portfolioFilter}) AS total_clients,
       ROUND(SUM(commission_amount), 2) AS total_commission,
       COUNT(DISTINCT processing_month) AS months_tracked
     FROM sales_transactions
     WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES}${portfolioFilter}`,
    [agentId, agentId],
  );

  const totalClients = Number(overviewRows[0]?.total_clients) || 0;
  const totalCommission = Number(overviewRows[0]?.total_commission) || 0;
  const monthsTracked = Number(overviewRows[0]?.months_tracked) || 1;
  const monthlyAverage = Math.round(totalCommission / monthsTracked);
  const avgCommissionPerClient = totalClients > 0 ? Math.round(totalCommission / totalClients) : 0;

  const [branchRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(branch, 'אחר') AS branch,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(DISTINCT insured_name) AS clients
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND insured_name IS NOT NULL AND insured_name != ''${portfolioFilter}
     GROUP BY COALESCE(branch, 'אחר')
     ORDER BY total DESC`,
    [agentId],
  );

  const byBranch: PortfolioBranch[] = branchRows.map((r) => ({
    branch: r.branch as string,
    total: Number(r.total),
    clients: Number(r.clients),
    pct: totalCommission > 0 ? Math.round((Number(r.total) / totalCommission) * 100) : 0,
  }));

  const [topRows] = await pool.query<RowDataPacket[]>(
    `SELECT insured_name AS name,
            MAX(insured_id) AS id,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(DISTINCT processing_month) AS months,
            GROUP_CONCAT(DISTINCT branch) AS branches,
            GROUP_CONCAT(DISTINCT CASE WHEN insurance_company IS NOT NULL AND insurance_company != '' THEN insurance_company END) AS insurance_companies
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND insured_name IS NOT NULL AND insured_name != ''${portfolioFilter}
     GROUP BY insured_name
     ORDER BY total DESC
     LIMIT 20`,
    [agentId],
  );

  const [trendRows] = await pool.query<RowDataPacket[]>(
    `SELECT insured_name,
            processing_month,
            ROUND(SUM(commission_amount), 2) AS month_total
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND insured_name IS NOT NULL AND insured_name != ''${portfolioFilter}
     GROUP BY insured_name, processing_month
     ORDER BY insured_name, processing_month DESC`,
    [agentId],
  );

  const trendMap = new Map<string, number[]>();
  for (const r of trendRows) {
    const name = r.insured_name as string;
    const arr = trendMap.get(name) || [];
    if (arr.length < 2) arr.push(Number(r.month_total));
    trendMap.set(name, arr);
  }

  const topClients: PortfolioTopClient[] = topRows.map((r) => {
    const months = Number(r.months) || 1;
    const total = Number(r.total);
    const trendArr = trendMap.get(r.name as string) || [];
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (trendArr.length >= 2) {
      if (trendArr[0] > trendArr[1] * 1.1) trend = 'up';
      else if (trendArr[0] < trendArr[1] * 0.9) trend = 'down';
    }
    return {
      name: r.name as string,
      id: (r.id as string) || '',
      total,
      monthlyAvg: Math.round(total / months),
      months,
      branches: r.branches ? (r.branches as string).split(',').filter(Boolean) : [],
      insuranceCompanies: r.insurance_companies ? (r.insurance_companies as string).split(',').filter(Boolean) : [],
      trend,
    };
  });

  const [monthlyRows] = await pool.query<RowDataPacket[]>(
    `SELECT processing_month AS month,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(DISTINCT CASE WHEN insured_name IS NOT NULL AND insured_name != '' THEN insured_name END) AS clients
     FROM sales_transactions
     WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES}${portfolioFilter}
     GROUP BY processing_month
     ORDER BY processing_month ASC`,
    [agentId],
  );

  const monthlyTrend: PortfolioMonthlyTrend[] = monthlyRows.map((r) => ({
    month: r.month as string,
    total: Number(r.total),
    clients: Number(r.clients),
  }));

  const [allTotalsRows] = await pool.query<RowDataPacket[]>(
    `SELECT ROUND(SUM(commission_amount), 2) AS total
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND insured_name IS NOT NULL AND insured_name != ''${portfolioFilter}
     GROUP BY insured_name
     ORDER BY total DESC`,
    [agentId],
  );

  const allTotals = allTotalsRows.map((r) => Number(r.total));
  const grandTotal = allTotals.reduce((s, v) => s + v, 0);

  function topPct(n: number): number {
    if (grandTotal === 0) return 0;
    const sum = allTotals.slice(0, n).reduce((s, v) => s + v, 0);
    return Math.round((sum / grandTotal) * 1000) / 10;
  }

  const concentration = {
    top5Pct: topPct(5),
    top10Pct: topPct(10),
    top20Pct: topPct(20),
  };

  const atRisk: PortfolioAtRisk[] = [];
  for (const [name, arr] of trendMap) {
    if (arr.length >= 2 && arr[1] > 0) {
      const dropPct = Math.round(((arr[1] - arr[0]) / arr[1]) * 100);
      if (dropPct >= 20) {
        const clientTrend = trendRows.find((r) => r.insured_name === name);
        atRisk.push({
          name,
          id: '',
          lastAmount: arr[0],
          prevAmount: arr[1],
          dropPct,
          lastMonth: clientTrend ? (clientTrend.processing_month as string) : '',
        });
      }
    }
  }

  if (atRisk.length > 0) {
    const namesForId = atRisk.map((c) => c.name);
    const [idRows] = await pool.query<RowDataPacket[]>(
      `SELECT insured_name, MAX(insured_id) AS insured_id
       FROM sales_transactions
       WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES} AND insured_name IN (${namesForId.map(() => '?').join(',')})${portfolioFilter}
       GROUP BY insured_name`,
      [agentId, ...namesForId],
    );
    const idMap = new Map(idRows.map((r) => [r.insured_name as string, (r.insured_id as string) || '']));
    for (const c of atRisk) {
      c.id = idMap.get(c.name) || '';
    }
  }

  atRisk.sort((a, b) => b.dropPct - a.dropPct);
  atRisk.splice(20);

  const latestMonth = monthlyTrend.length > 0 ? monthlyTrend[monthlyTrend.length - 1].month : null;

  let newClients: PortfolioNewClient[] = [];
  if (latestMonth) {
    const [newRows] = await pool.query<RowDataPacket[]>(
      `SELECT insured_name AS name,
              MAX(insured_id) AS id,
              MIN(processing_month) AS first_month,
              ROUND(SUM(commission_amount), 2) AS total
       FROM sales_transactions
       WHERE agent_id = ?
         AND report_type IN ${POLICY_REPORT_TYPES}
         AND insured_name IS NOT NULL AND insured_name != ''${portfolioFilter}
       GROUP BY insured_name
       HAVING MIN(processing_month) = ?
       ORDER BY total DESC
       LIMIT 20`,
      [agentId, latestMonth],
    );

    newClients = newRows.map((r) => ({
      name: r.name as string,
      id: (r.id as string) || '',
      firstMonth: r.first_month as string,
      total: Number(r.total),
    }));
  }

  return {
    overview: {
      totalClients,
      totalCommission,
      monthlyAverage,
      monthsTracked,
      avgCommissionPerClient,
    },
    byBranch,
    topClients,
    monthlyTrend,
    concentration,
    atRisk,
    newClients,
  };
}

// ─── Contract Coverage ──────────────────────────────────────

export type ContractStatus = 'covered' | 'uncovered';

export interface SalesTransactionWithContract extends SalesTransaction {
  contractStatus: ContractStatus;
  agreedRate: number | null;
  agreedCommissionType: string | null;
}

export interface ContractCoverageSummary {
  coveredCount: number;
  uncoveredCount: number;
  coveredAmount: number;
  uncoveredAmount: number;
}

function toSalesTransactionWithContract(row: RowDataPacket): SalesTransactionWithContract {
  return {
    ...toSalesTransaction(row),
    contractStatus: row.aar_id != null ? 'covered' : 'uncovered',
    agreedRate: row.aar_rate != null ? Number(row.aar_rate) : null,
    agreedCommissionType: row.aar_commission_type ?? null,
  };
}

/**
 * Sales transactions enriched with agreement-rate coverage status.
 * "covered" = agent has an uploaded agreement rate for this company + branch.
 * Pagination: limit/offset apply to the filtered result set.
 */
export async function getSalesWithContractStatus(
  agentId: string,
  opts: { month?: string; limit?: number; offset?: number; portfolioType?: PortfolioFilter } = {},
): Promise<SalesTransactionWithContract[]> {
  const { month, limit = 500, offset = 0, portfolioType = 'all' } = opts;

  const params: unknown[] = [agentId];
  let extraFilters = '';
  if (month) {
    extraFilters += ' AND s.processing_month = ?';
    params.push(month);
  }
  if (portfolioType !== 'all') {
    extraFilters += ' AND s.portfolio_type = ?';
    params.push(portfolioType);
  }

  params.push(limit, offset);

  const sql = `
    SELECT
      s.id, s.agent_id, s.insurance_company, s.portfolio_type, s.report_type,
      s.processing_month, s.production_month,
      s.insured_name, s.insured_id, s.employer_name, s.employer_id,
      s.policy_number, s.branch, s.sub_branch, s.product_name,
      s.fund_type, s.plan_type, s.premium, s.commission_amount,
      s.commission_rate, s.collection_fee, s.advance_amount,
      s.advance_balance, s.payment_amount, s.amount_before_vat,
      s.amount_with_vat, s.accumulation_balance, s.management_fee_pct,
      s.management_fee_amount, s.transaction_type, s.created_at,
      aar.id        AS aar_id,
      aar.rate      AS aar_rate,
      aar.commission_type AS aar_commission_type
    FROM sales_transactions s
    LEFT JOIN agent_agreement_rates aar
      ON  aar.agent_id = s.agent_id
      AND aar.company  = s.insurance_company
      AND aar.product  = s.branch
    WHERE s.agent_id = ?${extraFilters}
    ORDER BY s.processing_month DESC, s.created_at DESC
    LIMIT ? OFFSET ?`;

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows.map(toSalesTransactionWithContract);
}

/**
 * Aggregated coverage summary for the agent, optionally scoped to a month.
 */
export async function getContractCoverageSummary(
  agentId: string,
  opts: { month?: string; portfolioType?: PortfolioFilter } = {},
): Promise<ContractCoverageSummary> {
  const { month, portfolioType = 'all' } = opts;
  const params: unknown[] = [agentId];
  let extraFilters = '';
  if (month) {
    extraFilters += ' AND s.processing_month = ?';
    params.push(month);
  }
  if (portfolioType !== 'all') {
    extraFilters += ' AND s.portfolio_type = ?';
    params.push(portfolioType);
  }

  const sql = `
    SELECT
      COUNT(CASE WHEN aar.id IS NOT NULL THEN 1 END)                             AS covered_count,
      COUNT(CASE WHEN aar.id IS NULL     THEN 1 END)                             AS uncovered_count,
      COALESCE(SUM(CASE WHEN aar.id IS NOT NULL THEN s.commission_amount END), 0) AS covered_amount,
      COALESCE(SUM(CASE WHEN aar.id IS NULL     THEN s.commission_amount END), 0) AS uncovered_amount
    FROM sales_transactions s
    LEFT JOIN agent_agreement_rates aar
      ON  aar.agent_id = s.agent_id
      AND aar.company  = s.insurance_company
      AND aar.product  = s.branch
    WHERE s.agent_id = ?${extraFilters}`;

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  const r = rows[0];
  return {
    coveredCount: Number(r?.covered_count) || 0,
    uncoveredCount: Number(r?.uncovered_count) || 0,
    coveredAmount: Number(r?.covered_amount) || 0,
    uncoveredAmount: Number(r?.uncovered_amount) || 0,
  };
}

export async function assignInsuranceCompany(
  agentId: string,
  insuredId: string,
  policyNumber: string,
  insuranceCompany: string,
): Promise<{ updated: number }> {
  if (!insuredId && !policyNumber) {
    throw new Error('at least one of insuredId or policyNumber is required');
  }

  let sql: string;
  const params: unknown[] = [insuranceCompany, agentId];

  if (insuredId && policyNumber) {
    sql = `UPDATE sales_transactions
           SET insurance_company = ?
           WHERE agent_id = ?
             AND (insurance_company IS NULL OR insurance_company = '')
             AND insured_id = ?
             AND policy_number = ?`;
    params.push(insuredId, policyNumber);
  } else if (insuredId) {
    sql = `UPDATE sales_transactions
           SET insurance_company = ?
           WHERE agent_id = ?
             AND (insurance_company IS NULL OR insurance_company = '')
             AND insured_id = ?`;
    params.push(insuredId);
  } else {
    sql = `UPDATE sales_transactions
           SET insurance_company = ?
           WHERE agent_id = ?
             AND (insurance_company IS NULL OR insurance_company = '')
             AND policy_number = ?`;
    params.push(policyNumber);
  }

  const [result] = await pool.query<ResultSetHeader>(sql, params);
  return { updated: result.affectedRows };
}

export async function getActivePortfolioTypes(
  agentId: string,
): Promise<Array<'personal' | 'partners'>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT portfolio_type
     FROM sales_transactions
     WHERE agent_id = ? AND portfolio_type IN ('personal', 'partners')`,
    [agentId],
  );
  return rows.map((r) => r.portfolio_type as 'personal' | 'partners');
}

// ─── Summary by Report Type ────────────────────────────────

export interface ReportTypeSummary {
  nifraim: number;
  hekef: number;
  accumulation: number;
  total: number;
}

export async function getSummaryByReportType(
  agentId: string,
  month: string,
  portfolioType?: PortfolioFilter,
  partnersSplitPct?: number,
): Promise<ReportTypeSummary> {
  const params: unknown[] = [agentId, month];
  let filter = '';
  if (portfolioType && portfolioType !== 'all') {
    filter = ' AND portfolio_type = ?';
    params.push(portfolioType);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT report_type, ROUND(SUM(commission_amount), 2) AS total
     FROM sales_transactions
     WHERE agent_id = ? AND processing_month = ?${filter}
     GROUP BY report_type`,
    params,
  );

  let nifraim = 0;
  let hekef = 0;
  let accumulation = 0;

  for (const r of rows) {
    const amount = Number(r.total);
    const rt = r.report_type as string;
    if (rt === 'nifraim') nifraim += amount;
    else if (rt === 'hekef') hekef += amount;
    else if (rt.startsWith('accumulation')) accumulation += amount;
  }

  if (partnersSplitPct !== undefined && portfolioType === 'all') {
    const splitFactor = partnersSplitPct / 100;
    const [partnerRows] = await pool.query<RowDataPacket[]>(
      `SELECT report_type, ROUND(SUM(commission_amount), 2) AS total
       FROM sales_transactions
       WHERE agent_id = ? AND processing_month = ? AND portfolio_type = 'partners'
       GROUP BY report_type`,
      [agentId, month],
    );

    let partnerNifraim = 0;
    let partnerHekef = 0;
    let partnerAccumulation = 0;
    for (const r of partnerRows) {
      const amount = Number(r.total);
      const rt = r.report_type as string;
      if (rt === 'nifraim') partnerNifraim += amount;
      else if (rt === 'hekef') partnerHekef += amount;
      else if (rt.startsWith('accumulation')) partnerAccumulation += amount;
    }

    nifraim = nifraim - partnerNifraim + partnerNifraim * splitFactor;
    hekef = hekef - partnerHekef + partnerHekef * splitFactor;
    accumulation = accumulation - partnerAccumulation + partnerAccumulation * splitFactor;
  }

  const total = Math.round((nifraim + hekef + accumulation) * 100) / 100;
  return {
    nifraim: Math.round(nifraim * 100) / 100,
    hekef: Math.round(hekef * 100) / 100,
    accumulation: Math.round(accumulation * 100) / 100,
    total,
  };
}

// ─── Company × Product Breakdown ───────────────────────────

export interface CompanyProductRow {
  company: string;
  branch: string;
  product: string;
  reportType: string;
  total: number;
  recordCount: number;
}

export interface ProductBreakdownItem {
  branch: string;
  product: string;
  totalCommission: number;
  pctOfCompany: number;
  nifraimAmount: number;
  hekefAmount: number;
  accumulationAmount: number;
}

export interface CompanyBreakdownItem {
  company: string;
  totalCommission: number;
  monthlyAverage: number;
  pctOfTotal: number;
  products: ProductBreakdownItem[];
}

export interface CompanyProductBreakdown {
  companies: CompanyBreakdownItem[];
  grandTotal: number;
}

export async function getCompanyProductBreakdown(
  agentId: string,
  options: { fromMonth?: string; toMonth?: string; portfolioType?: PortfolioFilter } = {},
): Promise<CompanyProductBreakdown> {
  const { fromMonth, toMonth, portfolioType } = options;
  const params: unknown[] = [agentId];
  const filters: string[] = [];

  if (fromMonth) {
    filters.push('processing_month >= ?');
    params.push(fromMonth);
  }
  if (toMonth) {
    filters.push('processing_month <= ?');
    params.push(toMonth);
  }
  if (portfolioType && portfolioType !== 'all') {
    filters.push('portfolio_type = ?');
    params.push(portfolioType);
  }

  const whereExtra = filters.length > 0 ? ' AND ' + filters.join(' AND ') : '';

  const [rawRows] = await pool.query<RowDataPacket[]>(
    `SELECT insurance_company AS company,
            COALESCE(branch, '—') AS branch,
            COALESCE(product_name, '—') AS product,
            report_type,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(*) AS record_count
     FROM sales_transactions
     WHERE agent_id = ?${whereExtra}
     GROUP BY insurance_company, branch, product_name, report_type
     ORDER BY insurance_company, branch, product_name`,
    params,
  );

  let distinctMonths = 1;
  if (fromMonth && toMonth) {
    const [fy, fm] = fromMonth.split('-').map(Number);
    const [ty, tm] = toMonth.split('-').map(Number);
    distinctMonths = Math.max(1, (ty - fy) * 12 + tm - fm + 1);
  } else {
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT processing_month) AS cnt
       FROM sales_transactions
       WHERE agent_id = ?${whereExtra}`,
      params,
    );
    distinctMonths = Math.max(1, Number(countRows[0]?.cnt) || 1);
  }

  type ProductKey = string;
  type CompanyKey = string;

  const companyMap = new Map<CompanyKey, Map<ProductKey, {
    branch: string;
    product: string;
    nifraim: number;
    hekef: number;
    accumulation: number;
    other: number;
  }>>();

  for (const r of rawRows) {
    const company = r.company as string;
    const branch = r.branch as string;
    const product = r.product as string;
    const reportType = r.report_type as string;
    const amount = Number(r.total);
    const key = `${branch}||${product}`;

    if (!companyMap.has(company)) companyMap.set(company, new Map());
    const products = companyMap.get(company)!;

    if (!products.has(key)) {
      products.set(key, { branch, product, nifraim: 0, hekef: 0, accumulation: 0, other: 0 });
    }
    const entry = products.get(key)!;

    if (reportType === 'nifraim') entry.nifraim += amount;
    else if (reportType === 'hekef') entry.hekef += amount;
    else if (reportType.startsWith('accumulation')) entry.accumulation += amount;
    else entry.other += amount;
  }

  const companies: CompanyBreakdownItem[] = [];
  let grandTotal = 0;

  for (const [company, productMap] of companyMap) {
    let companyTotal = 0;
    const products: ProductBreakdownItem[] = [];

    for (const entry of productMap.values()) {
      const productTotal = Math.round((entry.nifraim + entry.hekef + entry.accumulation + entry.other) * 100) / 100;
      companyTotal += productTotal;
      products.push({
        branch: entry.branch,
        product: entry.product,
        totalCommission: productTotal,
        pctOfCompany: 0,
        nifraimAmount: Math.round(entry.nifraim * 100) / 100,
        hekefAmount: Math.round(entry.hekef * 100) / 100,
        accumulationAmount: Math.round(entry.accumulation * 100) / 100,
      });
    }

    companyTotal = Math.round(companyTotal * 100) / 100;
    grandTotal += companyTotal;

    for (const p of products) {
      p.pctOfCompany = companyTotal > 0 ? Math.round((p.totalCommission / companyTotal) * 1000) / 10 : 0;
    }
    products.sort((a, b) => b.totalCommission - a.totalCommission);

    companies.push({
      company,
      totalCommission: companyTotal,
      monthlyAverage: Math.round((companyTotal / distinctMonths) * 100) / 100,
      pctOfTotal: 0,
      products,
    });
  }

  grandTotal = Math.round(grandTotal * 100) / 100;
  for (const c of companies) {
    c.pctOfTotal = grandTotal > 0 ? Math.round((c.totalCommission / grandTotal) * 1000) / 10 : 0;
  }
  companies.sort((a, b) => b.totalCommission - a.totalCommission);

  return { companies, grandTotal };
}

export async function getMonthlySalarySummary(
  agentId: string,
  portfolioType: PortfolioFilter = 'all',
): Promise<MonthlySalarySummary[]> {
  let sql = `SELECT processing_month AS month,
            ROUND(SUM(commission_amount), 2) AS total_commission,
            COUNT(*) AS record_count
     FROM sales_transactions
     WHERE agent_id = ?`;
  const params: unknown[] = [agentId];

  if (portfolioType !== 'all') {
    sql += ' AND portfolio_type = ?';
    params.push(portfolioType);
  }

  sql += ' GROUP BY processing_month ORDER BY processing_month DESC';

  const [rows] = await pool.query<RowDataPacket[]>(sql, params);

  return rows.map((r) => ({
    month: r.month as string,
    totalCommission: Number(r.total_commission),
    recordCount: Number(r.record_count),
  }));
}
