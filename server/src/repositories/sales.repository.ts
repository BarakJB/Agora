import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database.js';

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

function toSalesTransaction(row: RowDataPacket): SalesTransaction {
  return {
    id: row.id,
    agentId: row.agent_id,
    insuranceCompany: row.insurance_company,
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
      placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      values.push(
        uuid(),
        agentId,
        insuranceCompany,
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
      (id, agent_id, insurance_company, report_type, processing_month, production_month,
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
): Promise<SalesTransaction[]> {
  let sql = `SELECT id, agent_id, insurance_company, report_type, processing_month,
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
): Promise<ClientSummaryRow[]> {
  // Calculate per-client: latest month commission, monthly average, and total
  // Each policy (by policy_number or by row) counted once per month
  let sql = `
    SELECT insured_name,
           MAX(insured_id) AS insured_id,
           ROUND(SUM(commission_amount), 2) AS total_commission,
           COUNT(DISTINCT processing_month) AS months_active,
           COUNT(*) AS record_count,
           MAX(processing_month) AS last_month,
           GROUP_CONCAT(DISTINCT insurance_company) AS insurance_companies,
           GROUP_CONCAT(DISTINCT CONCAT(branch, '/', COALESCE(product_name,''))) AS products
    FROM sales_transactions
    WHERE agent_id = ?
      AND insured_name IS NOT NULL
      AND insured_name != ''`;
  const params: unknown[] = [agentId];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ' AND (insured_name LIKE ? OR insured_id LIKE ?)';
    params.push(term, term);
  }

  sql += ' GROUP BY insured_name ORDER BY last_month DESC, total_commission DESC LIMIT ?';
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

export async function getPortfolioAnalysis(agentId: string): Promise<PortfolioAnalysis> {
  // 1. Overview — total commission from ALL records (including branch_distribution without names)
  const [overviewRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(DISTINCT insured_name) FROM sales_transactions WHERE agent_id = ? AND insured_name IS NOT NULL AND insured_name != '') AS total_clients,
       ROUND(SUM(commission_amount), 2) AS total_commission,
       COUNT(DISTINCT processing_month) AS months_tracked
     FROM sales_transactions
     WHERE agent_id = ?`,
    [agentId, agentId],
  );

  const totalClients = Number(overviewRows[0]?.total_clients) || 0;
  const totalCommission = Number(overviewRows[0]?.total_commission) || 0;
  const monthsTracked = Number(overviewRows[0]?.months_tracked) || 1;
  const monthlyAverage = Math.round(totalCommission / monthsTracked);
  const avgCommissionPerClient = totalClients > 0 ? Math.round(totalCommission / totalClients) : 0;

  // 2. By branch
  const [branchRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(branch, 'אחר') AS branch,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(DISTINCT insured_name) AS clients
     FROM sales_transactions
     WHERE agent_id = ?
       AND insured_name IS NOT NULL AND insured_name != ''
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

  // 3. Top clients
  const [topRows] = await pool.query<RowDataPacket[]>(
    `SELECT insured_name AS name,
            MAX(insured_id) AS id,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(DISTINCT processing_month) AS months,
            GROUP_CONCAT(DISTINCT branch) AS branches
     FROM sales_transactions
     WHERE agent_id = ?
       AND insured_name IS NOT NULL AND insured_name != ''
     GROUP BY insured_name
     ORDER BY total DESC
     LIMIT 20`,
    [agentId],
  );

  // For trend calculation, get last two months per client
  const [trendRows] = await pool.query<RowDataPacket[]>(
    `SELECT insured_name,
            processing_month,
            ROUND(SUM(commission_amount), 2) AS month_total
     FROM sales_transactions
     WHERE agent_id = ?
       AND insured_name IS NOT NULL AND insured_name != ''
     GROUP BY insured_name, processing_month
     ORDER BY insured_name, processing_month DESC`,
    [agentId],
  );

  // Build trend map: client -> [latest, previous]
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
      trend,
    };
  });

  // 4. Monthly trend — ALL records (including branch_distribution without names)
  const [monthlyRows] = await pool.query<RowDataPacket[]>(
    `SELECT processing_month AS month,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(DISTINCT CASE WHEN insured_name IS NOT NULL AND insured_name != '' THEN insured_name END) AS clients
     FROM sales_transactions
     WHERE agent_id = ?
     GROUP BY processing_month
     ORDER BY processing_month ASC`,
    [agentId],
  );

  const monthlyTrend: PortfolioMonthlyTrend[] = monthlyRows.map((r) => ({
    month: r.month as string,
    total: Number(r.total),
    clients: Number(r.clients),
  }));

  // 5. Concentration (from topClients sorted by total desc)
  const allClientTotals = topRows.map((r) => Number(r.total));
  // We need all clients for concentration, not just top 20
  const [allTotalsRows] = await pool.query<RowDataPacket[]>(
    `SELECT ROUND(SUM(commission_amount), 2) AS total
     FROM sales_transactions
     WHERE agent_id = ?
       AND insured_name IS NOT NULL AND insured_name != ''
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

  // 6. At risk — clients whose latest month < previous month by 20%+
  const atRisk: PortfolioAtRisk[] = [];
  for (const [name, arr] of trendMap) {
    if (arr.length >= 2 && arr[1] > 0) {
      const dropPct = Math.round(((arr[1] - arr[0]) / arr[1]) * 100);
      if (dropPct >= 20) {
        // Find lastMonth for this client
        const clientTrend = trendRows.find((r) => r.insured_name === name);
        atRisk.push({
          name,
          id: '', // will be filled below
          lastAmount: arr[0],
          prevAmount: arr[1],
          dropPct,
          lastMonth: clientTrend ? (clientTrend.processing_month as string) : '',
        });
      }
    }
  }

  // Fill IDs for at-risk clients
  if (atRisk.length > 0) {
    const namesForId = atRisk.map((c) => c.name);
    const [idRows] = await pool.query<RowDataPacket[]>(
      `SELECT insured_name, MAX(insured_id) AS insured_id
       FROM sales_transactions
       WHERE agent_id = ? AND insured_name IN (${namesForId.map(() => '?').join(',')})
       GROUP BY insured_name`,
      [agentId, ...namesForId],
    );
    const idMap = new Map(idRows.map((r) => [r.insured_name as string, (r.insured_id as string) || '']));
    for (const c of atRisk) {
      c.id = idMap.get(c.name) || '';
    }
  }

  // Sort at risk by drop pct desc, limit 20
  atRisk.sort((a, b) => b.dropPct - a.dropPct);
  atRisk.splice(20);

  // 7. New clients — first appeared in the latest month
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
         AND insured_name IS NOT NULL AND insured_name != ''
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

export async function getMonthlySalarySummary(
  agentId: string,
): Promise<MonthlySalarySummary[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT processing_month AS month,
            ROUND(SUM(commission_amount), 2) AS total_commission,
            COUNT(*) AS record_count
     FROM sales_transactions
     WHERE agent_id = ?
     GROUP BY processing_month
     ORDER BY processing_month DESC`,
    [agentId],
  );

  return rows.map((r) => ({
    month: r.month as string,
    totalCommission: Number(r.total_commission),
    recordCount: Number(r.record_count),
  }));
}
