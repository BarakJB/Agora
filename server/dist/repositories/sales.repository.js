"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertSalesTransactions = insertSalesTransactions;
exports.getSalesTransactions = getSalesTransactions;
exports.searchClients = searchClients;
exports.getClientTransactions = getClientTransactions;
exports.getPortfolioAnalysis = getPortfolioAnalysis;
exports.getSalesWithContractStatus = getSalesWithContractStatus;
exports.getContractCoverageSummary = getContractCoverageSummary;
exports.assignInsuranceCompany = assignInsuranceCompany;
exports.getActivePortfolioTypes = getActivePortfolioTypes;
exports.getSummaryByReportType = getSummaryByReportType;
exports.getCompanyProductBreakdown = getCompanyProductBreakdown;
exports.getAnnualSnapshot = getAnnualSnapshot;
exports.getMonthlySalarySummary = getMonthlySalarySummary;
const database_js_1 = __importDefault(require("../config/database.js"));
// Only these report types represent individual policy-level records.
// branch_distribution / agent_data / product_distribution are aggregate summaries
// of the same data — including them causes double-counting.
const POLICY_REPORT_TYPES = `('nifraim','hekef','accumulation_nifraim','accumulation_hekef')`;
function toSalesTransaction(row) {
    return {
        id: row.id,
        agentId: row.agent_id,
        insuranceCompany: row.insurance_company,
        portfolioType: row.portfolio_type ?? 'unknown',
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
async function insertSalesTransactions(agentId, insuranceCompany, records) {
    if (records.length === 0)
        return 0;
    // Delete existing records for same agent + company + month + report_type to prevent duplicates
    const monthsAndTypes = new Set();
    for (const r of records) {
        if (r.processingMonth && r.reportType) {
            monthsAndTypes.add(`${r.processingMonth}|${r.reportType}`);
        }
    }
    for (const key of monthsAndTypes) {
        const [month, reportType] = key.split('|');
        await database_js_1.default.query(`DELETE FROM sales_transactions
       WHERE agent_id = ? AND insurance_company = ? AND processing_month = ? AND report_type = ?`, [agentId, insuranceCompany, month, reportType]);
    }
    // Build batch INSERT with chunks of 500 to avoid packet size limits
    const CHUNK_SIZE = 500;
    let inserted = 0;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        const { v4: uuid } = await import('uuid');
        const placeholders = [];
        const values = [];
        for (const r of chunk) {
            placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            values.push(uuid(), agentId, insuranceCompany, r.portfolioType ?? 'unknown', r.reportType, r.processingMonth, r.productionMonth ?? null, r.insuredName ?? null, r.insuredId ?? null, r.employerName ?? null, r.employerId ?? null, r.policyNumber ?? null, r.branch ?? null, r.subBranch ?? null, r.productName ?? null, r.fundType ?? null, r.planType ?? null, r.premium ?? null, r.commissionAmount, r.commissionRate ?? null, r.collectionFee ?? null, r.advanceAmount ?? null, r.advanceBalance ?? null, r.paymentAmount ?? null, r.amountBeforeVat ?? null, r.amountWithVat ?? null, r.accumulationBalance ?? null, r.transactionType ?? null);
        }
        const sql = `INSERT INTO sales_transactions
      (id, agent_id, insurance_company, portfolio_type, report_type, processing_month, production_month,
       insured_name, insured_id, employer_name, employer_id, policy_number, branch,
       sub_branch, product_name, fund_type, plan_type, premium, commission_amount,
       commission_rate, collection_fee, advance_amount, advance_balance, payment_amount,
       amount_before_vat, amount_with_vat, accumulation_balance, transaction_type)
      VALUES ${placeholders.join(', ')}`;
        const [result] = await database_js_1.default.query(sql, values);
        inserted += result.affectedRows;
    }
    return inserted;
}
/**
 * Get sales transactions for an agent, optionally filtered by processing_month.
 */
async function getSalesTransactions(agentId, month, portfolioType = 'all') {
    let sql = `SELECT id, agent_id, insurance_company, portfolio_type, report_type, processing_month,
                    production_month, insured_name, insured_id, employer_name, employer_id,
                    policy_number, branch, sub_branch, product_name, fund_type, plan_type,
                    premium, commission_amount, commission_rate, collection_fee,
                    advance_amount, advance_balance, payment_amount, amount_before_vat,
                    amount_with_vat, accumulation_balance, management_fee_pct,
                    management_fee_amount, transaction_type, created_at
             FROM sales_transactions
             WHERE agent_id = ?`;
    const params = [agentId];
    if (month) {
        sql += ' AND processing_month = ?';
        params.push(month);
    }
    if (portfolioType !== 'all') {
        sql += ' AND portfolio_type = ?';
        params.push(portfolioType);
    }
    sql += ' ORDER BY processing_month DESC, created_at DESC LIMIT 10000';
    const [rows] = await database_js_1.default.query(sql, params);
    return rows.map(toSalesTransaction);
}
/**
 * Search clients (unique insured_id + insured_name) for an agent.
 * Optionally filter by name or ID search term.
 */
async function searchClients(agentId, search, limit = 50, offset = 0, portfolioType = 'all') {
    const baseWhere = `
    FROM sales_transactions s
    WHERE s.agent_id = ?
      AND s.report_type IN ${POLICY_REPORT_TYPES}
      AND s.insured_name IS NOT NULL
      AND s.insured_name != ''`;
    const filterParams = [];
    let filterClause = '';
    if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        filterClause += ' AND (s.insured_name LIKE ? OR s.insured_id LIKE ?)';
        filterParams.push(term, term);
    }
    if (portfolioType !== 'all') {
        filterClause += ' AND s.portfolio_type = ?';
        filterParams.push(portfolioType);
    }
    const itemsSql = `
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
    ${baseWhere}${filterClause}
    GROUP BY s.insured_name
    ORDER BY last_month DESC, total_commission DESC
    LIMIT ? OFFSET ?`;
    const countSql = `
    SELECT COUNT(DISTINCT s.insured_name) AS total
    ${baseWhere}${filterClause}`;
    const itemsParams = [agentId, agentId, ...filterParams, limit, offset];
    const countParams = [agentId, ...filterParams];
    const [[rows], [countRows]] = await Promise.all([
        database_js_1.default.query(itemsSql, itemsParams),
        database_js_1.default.query(countSql, countParams),
    ]);
    const total = Number(countRows[0]?.total ?? 0);
    const items = rows.map((r) => {
        const totalCommission = Number(r.total_commission);
        const monthsActive = Number(r.months_active) || 1;
        return {
            insuredId: r.insured_id || r.insured_name,
            insuredName: r.insured_name,
            totalCommission,
            monthlyAverage: Math.round((totalCommission / monthsActive) * 100) / 100,
            monthsActive,
            recordCount: Number(r.record_count),
            lastMonth: r.last_month,
            insuranceCompanies: r.insurance_companies ? r.insurance_companies.split(',') : [],
            products: r.products ? [...new Set(r.products.split(',').map((p) => p.split('/')[0]).filter(Boolean))] : [],
        };
    });
    return { items, total };
}
/**
 * Get all transactions for a specific client (by insured_id) belonging to an agent.
 */
async function getClientTransactions(agentId, clientId) {
    // Search by insured_id first, fallback to insured_name
    const [rows] = await database_js_1.default.query(`SELECT id, processing_month, branch, product_name, premium,
            commission_amount, insurance_company, policy_number, report_type,
            insured_id, insured_name
     FROM sales_transactions
     WHERE agent_id = ? AND (insured_id = ? OR insured_name = ?)
     ORDER BY processing_month DESC, created_at DESC`, [agentId, clientId, clientId]);
    return rows.map((r) => ({
        id: r.id,
        processingMonth: r.processing_month,
        branch: r.branch ?? null,
        productName: r.product_name ?? null,
        premium: r.premium != null ? Number(r.premium) : null,
        commissionAmount: Number(r.commission_amount),
        insuranceCompany: r.insurance_company,
        policyNumber: r.policy_number ?? null,
        reportType: r.report_type,
    }));
}
async function getPortfolioAnalysis(agentId, portfolioType = 'all') {
    const portfolioFilter = portfolioType !== 'all' ? ` AND portfolio_type = '${portfolioType}'` : '';
    const [overviewRows] = await database_js_1.default.query(`SELECT
       (SELECT COUNT(DISTINCT insured_name) FROM sales_transactions WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES} AND insured_name IS NOT NULL AND insured_name != ''${portfolioFilter}) AS total_clients,
       ROUND(SUM(commission_amount), 2) AS total_commission,
       COUNT(DISTINCT processing_month) AS months_tracked
     FROM sales_transactions
     WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES}${portfolioFilter}`, [agentId, agentId]);
    const totalClients = Number(overviewRows[0]?.total_clients) || 0;
    const totalCommission = Number(overviewRows[0]?.total_commission) || 0;
    const monthsTracked = Number(overviewRows[0]?.months_tracked) || 1;
    const monthlyAverage = Math.round(totalCommission / monthsTracked);
    const avgCommissionPerClient = totalClients > 0 ? Math.round(totalCommission / totalClients) : 0;
    const [branchRows] = await database_js_1.default.query(`SELECT COALESCE(branch, 'אחר') AS branch,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(DISTINCT insured_name) AS clients
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND insured_name IS NOT NULL AND insured_name != ''${portfolioFilter}
     GROUP BY COALESCE(branch, 'אחר')
     ORDER BY total DESC`, [agentId]);
    const byBranch = branchRows.map((r) => ({
        branch: r.branch,
        total: Number(r.total),
        clients: Number(r.clients),
        pct: totalCommission > 0 ? Math.round((Number(r.total) / totalCommission) * 100) : 0,
    }));
    const [topRows] = await database_js_1.default.query(`SELECT insured_name AS name,
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
     LIMIT 20`, [agentId]);
    const [trendRows] = await database_js_1.default.query(`SELECT insured_name,
            processing_month,
            ROUND(SUM(commission_amount), 2) AS month_total
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND insured_name IS NOT NULL AND insured_name != ''${portfolioFilter}
     GROUP BY insured_name, processing_month
     ORDER BY insured_name, processing_month DESC`, [agentId]);
    const trendMap = new Map();
    for (const r of trendRows) {
        const name = r.insured_name;
        const arr = trendMap.get(name) || [];
        if (arr.length < 2)
            arr.push(Number(r.month_total));
        trendMap.set(name, arr);
    }
    const topClients = topRows.map((r) => {
        const months = Number(r.months) || 1;
        const total = Number(r.total);
        const trendArr = trendMap.get(r.name) || [];
        let trend = 'stable';
        if (trendArr.length >= 2) {
            if (trendArr[0] > trendArr[1] * 1.1)
                trend = 'up';
            else if (trendArr[0] < trendArr[1] * 0.9)
                trend = 'down';
        }
        return {
            name: r.name,
            id: r.id || '',
            total,
            monthlyAvg: Math.round(total / months),
            months,
            branches: r.branches ? r.branches.split(',').filter(Boolean) : [],
            insuranceCompanies: r.insurance_companies ? r.insurance_companies.split(',').filter(Boolean) : [],
            trend,
        };
    });
    const [monthlyRows] = await database_js_1.default.query(`SELECT processing_month AS month,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(DISTINCT CASE WHEN insured_name IS NOT NULL AND insured_name != '' THEN insured_name END) AS clients
     FROM sales_transactions
     WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES}${portfolioFilter}
     GROUP BY processing_month
     ORDER BY processing_month ASC`, [agentId]);
    const monthlyTrend = monthlyRows.map((r) => ({
        month: r.month,
        total: Number(r.total),
        clients: Number(r.clients),
    }));
    const [allTotalsRows] = await database_js_1.default.query(`SELECT ROUND(SUM(commission_amount), 2) AS total
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND insured_name IS NOT NULL AND insured_name != ''${portfolioFilter}
     GROUP BY insured_name
     ORDER BY total DESC`, [agentId]);
    const allTotals = allTotalsRows.map((r) => Number(r.total));
    const grandTotal = allTotals.reduce((s, v) => s + v, 0);
    function topPct(n) {
        if (grandTotal === 0)
            return 0;
        const sum = allTotals.slice(0, n).reduce((s, v) => s + v, 0);
        return Math.round((sum / grandTotal) * 1000) / 10;
    }
    const concentration = {
        top5Pct: topPct(5),
        top10Pct: topPct(10),
        top20Pct: topPct(20),
    };
    const atRisk = [];
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
                    lastMonth: clientTrend ? clientTrend.processing_month : '',
                });
            }
        }
    }
    if (atRisk.length > 0) {
        const namesForId = atRisk.map((c) => c.name);
        const [idRows] = await database_js_1.default.query(`SELECT insured_name, MAX(insured_id) AS insured_id
       FROM sales_transactions
       WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES} AND insured_name IN (${namesForId.map(() => '?').join(',')})${portfolioFilter}
       GROUP BY insured_name`, [agentId, ...namesForId]);
        const idMap = new Map(idRows.map((r) => [r.insured_name, r.insured_id || '']));
        for (const c of atRisk) {
            c.id = idMap.get(c.name) || '';
        }
    }
    atRisk.sort((a, b) => b.dropPct - a.dropPct);
    atRisk.splice(20);
    const latestMonth = monthlyTrend.length > 0 ? monthlyTrend[monthlyTrend.length - 1].month : null;
    let newClients = [];
    if (latestMonth) {
        const [newRows] = await database_js_1.default.query(`SELECT insured_name AS name,
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
       LIMIT 20`, [agentId, latestMonth]);
        newClients = newRows.map((r) => ({
            name: r.name,
            id: r.id || '',
            firstMonth: r.first_month,
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
function toSalesTransactionWithContract(row) {
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
async function getSalesWithContractStatus(agentId, opts = {}) {
    const { month, limit = 500, offset = 0, portfolioType = 'all' } = opts;
    const params = [agentId];
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
    const [rows] = await database_js_1.default.query(sql, params);
    return rows.map(toSalesTransactionWithContract);
}
/**
 * Aggregated coverage summary for the agent, optionally scoped to a month.
 */
async function getContractCoverageSummary(agentId, opts = {}) {
    const { month, portfolioType = 'all' } = opts;
    const params = [agentId];
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
    const [rows] = await database_js_1.default.query(sql, params);
    const r = rows[0];
    return {
        coveredCount: Number(r?.covered_count) || 0,
        uncoveredCount: Number(r?.uncovered_count) || 0,
        coveredAmount: Number(r?.covered_amount) || 0,
        uncoveredAmount: Number(r?.uncovered_amount) || 0,
    };
}
async function assignInsuranceCompany(agentId, insuredId, policyNumber, insuranceCompany) {
    if (!insuredId && !policyNumber) {
        throw new Error('at least one of insuredId or policyNumber is required');
    }
    let sql;
    const params = [insuranceCompany, agentId];
    if (insuredId && policyNumber) {
        sql = `UPDATE sales_transactions
           SET insurance_company = ?
           WHERE agent_id = ?
             AND (insurance_company IS NULL OR insurance_company = '')
             AND insured_id = ?
             AND policy_number = ?`;
        params.push(insuredId, policyNumber);
    }
    else if (insuredId) {
        sql = `UPDATE sales_transactions
           SET insurance_company = ?
           WHERE agent_id = ?
             AND (insurance_company IS NULL OR insurance_company = '')
             AND insured_id = ?`;
        params.push(insuredId);
    }
    else {
        sql = `UPDATE sales_transactions
           SET insurance_company = ?
           WHERE agent_id = ?
             AND (insurance_company IS NULL OR insurance_company = '')
             AND policy_number = ?`;
        params.push(policyNumber);
    }
    const [result] = await database_js_1.default.query(sql, params);
    return { updated: result.affectedRows };
}
async function getActivePortfolioTypes(agentId) {
    const [rows] = await database_js_1.default.query(`SELECT DISTINCT portfolio_type
     FROM sales_transactions
     WHERE agent_id = ? AND portfolio_type IN ('personal', 'partners')`, [agentId]);
    return rows.map((r) => r.portfolio_type);
}
async function getSummaryByReportType(agentId, month, portfolioType, partnersSplitPct) {
    const params = [agentId, month];
    let filter = '';
    if (portfolioType && portfolioType !== 'all') {
        filter = ' AND portfolio_type = ?';
        params.push(portfolioType);
    }
    const [rows] = await database_js_1.default.query(`SELECT report_type, ROUND(SUM(commission_amount), 2) AS total
     FROM sales_transactions
     WHERE agent_id = ? AND processing_month = ?${filter}
     GROUP BY report_type`, params);
    let nifraim = 0;
    let hekef = 0;
    let accumulation = 0;
    for (const r of rows) {
        const amount = Number(r.total);
        const rt = r.report_type;
        if (rt === 'nifraim')
            nifraim += amount;
        else if (rt === 'hekef')
            hekef += amount;
        else if (rt.startsWith('accumulation'))
            accumulation += amount;
    }
    if (partnersSplitPct !== undefined && portfolioType === 'all') {
        const splitFactor = partnersSplitPct / 100;
        const [partnerRows] = await database_js_1.default.query(`SELECT report_type, ROUND(SUM(commission_amount), 2) AS total
       FROM sales_transactions
       WHERE agent_id = ? AND processing_month = ? AND portfolio_type = 'partners'
       GROUP BY report_type`, [agentId, month]);
        let partnerNifraim = 0;
        let partnerHekef = 0;
        let partnerAccumulation = 0;
        for (const r of partnerRows) {
            const amount = Number(r.total);
            const rt = r.report_type;
            if (rt === 'nifraim')
                partnerNifraim += amount;
            else if (rt === 'hekef')
                partnerHekef += amount;
            else if (rt.startsWith('accumulation'))
                partnerAccumulation += amount;
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
async function getCompanyProductBreakdown(agentId, options = {}) {
    const { fromMonth, toMonth, portfolioType } = options;
    const params = [agentId];
    const filters = [];
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
    const [rawRows] = await database_js_1.default.query(`SELECT insurance_company AS company,
            COALESCE(branch, '—') AS branch,
            COALESCE(product_name, '—') AS product,
            report_type,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(*) AS record_count
     FROM sales_transactions
     WHERE agent_id = ?${whereExtra}
     GROUP BY insurance_company, branch, product_name, report_type
     ORDER BY insurance_company, branch, product_name`, params);
    let distinctMonths = 1;
    if (fromMonth && toMonth) {
        const [fy, fm] = fromMonth.split('-').map(Number);
        const [ty, tm] = toMonth.split('-').map(Number);
        distinctMonths = Math.max(1, (ty - fy) * 12 + tm - fm + 1);
    }
    else {
        const [countRows] = await database_js_1.default.query(`SELECT COUNT(DISTINCT processing_month) AS cnt
       FROM sales_transactions
       WHERE agent_id = ?${whereExtra}`, params);
        distinctMonths = Math.max(1, Number(countRows[0]?.cnt) || 1);
    }
    const companyMap = new Map();
    for (const r of rawRows) {
        const company = r.company;
        const branch = r.branch;
        const product = r.product;
        const reportType = r.report_type;
        const amount = Number(r.total);
        const key = `${branch}||${product}`;
        if (!companyMap.has(company))
            companyMap.set(company, new Map());
        const products = companyMap.get(company);
        if (!products.has(key)) {
            products.set(key, { branch, product, nifraim: 0, hekef: 0, accumulation: 0, other: 0 });
        }
        const entry = products.get(key);
        if (reportType === 'nifraim')
            entry.nifraim += amount;
        else if (reportType === 'hekef')
            entry.hekef += amount;
        else if (reportType.startsWith('accumulation'))
            entry.accumulation += amount;
        else
            entry.other += amount;
    }
    const companies = [];
    let grandTotal = 0;
    for (const [company, productMap] of companyMap) {
        let companyTotal = 0;
        const products = [];
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
async function getAnnualSnapshot(agentId, portfolioType = 'all') {
    const portfolioFilter = portfolioType !== 'all' ? ' AND portfolio_type = ?' : '';
    const baseParams = (extra = []) => portfolioType !== 'all' ? [agentId, ...extra, portfolioType] : [agentId, ...extra];
    const [growthRows, newClientRows, activeClientRows, retentionRows] = await Promise.all([
        database_js_1.default.query(`SELECT
         SUM(CASE WHEN processing_month >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) THEN commission_amount ELSE 0 END) AS recent12,
         SUM(CASE WHEN processing_month >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
                   AND processing_month < DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
             THEN commission_amount ELSE 0 END) AS prior12
       FROM sales_transactions
       WHERE agent_id = ?
         AND report_type IN ${POLICY_REPORT_TYPES}${portfolioFilter}`, baseParams()),
        database_js_1.default.query(`SELECT COUNT(DISTINCT s1.insured_name) AS new_clients
       FROM sales_transactions s1
       WHERE s1.agent_id = ?
         AND s1.report_type IN ${POLICY_REPORT_TYPES}
         AND s1.insured_name IS NOT NULL AND s1.insured_name != ''
         AND s1.processing_month >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
         AND NOT EXISTS (
           SELECT 1 FROM sales_transactions s2
           WHERE s2.agent_id = s1.agent_id
             AND s2.insured_name = s1.insured_name
             AND s2.processing_month < DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
         )${portfolioFilter.replace('portfolio_type', 's1.portfolio_type')}`, baseParams()),
        database_js_1.default.query(`SELECT COUNT(DISTINCT insured_name) AS active_clients
       FROM sales_transactions
       WHERE agent_id = ?
         AND report_type IN ${POLICY_REPORT_TYPES}
         AND insured_name IS NOT NULL AND insured_name != ''
         AND processing_month >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)${portfolioFilter}`, baseParams()),
        database_js_1.default.query(`SELECT
         COUNT(DISTINCT CASE WHEN recent.insured_name IS NOT NULL THEN prev.insured_name END) AS retained,
         COUNT(DISTINCT prev.insured_name) AS total_prev
       FROM (
         SELECT DISTINCT insured_name
         FROM sales_transactions
         WHERE agent_id = ?
           AND report_type IN ${POLICY_REPORT_TYPES}
           AND insured_name IS NOT NULL AND insured_name != ''
           AND processing_month < DATE_SUB(CURDATE(), INTERVAL 3 MONTH)${portfolioFilter}
       ) AS prev
       LEFT JOIN (
         SELECT DISTINCT insured_name
         FROM sales_transactions
         WHERE agent_id = ?
           AND report_type IN ${POLICY_REPORT_TYPES}
           AND insured_name IS NOT NULL AND insured_name != ''
           AND processing_month >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)${portfolioFilter}
       ) AS recent ON recent.insured_name = prev.insured_name`, portfolioType !== 'all'
            ? [agentId, portfolioType, agentId, portfolioType]
            : [agentId, agentId]),
    ]);
    const recent12 = Number(growthRows[0][0]?.recent12) || 0;
    const prior12 = Number(growthRows[0][0]?.prior12) || 0;
    let growthPct = 0;
    if (prior12 > 0) {
        growthPct = Math.round(((recent12 - prior12) / prior12) * 1000) / 10;
    }
    else if (recent12 > 0) {
        growthPct = 100;
    }
    const newClientsLast3Months = Number(newClientRows[0][0]?.new_clients) || 0;
    const totalActiveClients = Number(activeClientRows[0][0]?.active_clients) || 0;
    const retained = Number(retentionRows[0][0]?.retained) || 0;
    const totalPrev = Number(retentionRows[0][0]?.total_prev) || 0;
    const retentionRate = totalPrev > 0 ? Math.round((retained / totalPrev) * 1000) / 10 : 0;
    return { growthPct, newClientsLast3Months, totalActiveClients, retentionRate };
}
async function getMonthlySalarySummary(agentId, portfolioType = 'all') {
    let sql = `SELECT processing_month AS month,
            ROUND(SUM(commission_amount), 2) AS total_commission,
            COUNT(*) AS record_count
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}`;
    const params = [agentId];
    if (portfolioType !== 'all') {
        sql += ' AND portfolio_type = ?';
        params.push(portfolioType);
    }
    sql += ' GROUP BY processing_month ORDER BY processing_month DESC';
    const [rows] = await database_js_1.default.query(sql, params);
    return rows.map((r) => ({
        month: r.month,
        totalCommission: Number(r.total_commission),
        recordCount: Number(r.record_count),
    }));
}
//# sourceMappingURL=sales.repository.js.map