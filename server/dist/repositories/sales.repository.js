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
            placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            values.push(uuid(), agentId, insuranceCompany, r.reportType, r.processingMonth, r.productionMonth ?? null, r.insuredName ?? null, r.insuredId ?? null, r.employerName ?? null, r.employerId ?? null, r.policyNumber ?? null, r.branch ?? null, r.subBranch ?? null, r.productName ?? null, r.fundType ?? null, r.planType ?? null, r.premium ?? null, r.commissionAmount, r.commissionRate ?? null, r.collectionFee ?? null, r.advanceAmount ?? null, r.advanceBalance ?? null, r.paymentAmount ?? null, r.amountBeforeVat ?? null, r.amountWithVat ?? null, r.accumulationBalance ?? null, r.transactionType ?? null);
        }
        const sql = `INSERT INTO sales_transactions
      (id, agent_id, insurance_company, report_type, processing_month, production_month,
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
async function getSalesTransactions(agentId, month) {
    let sql = `SELECT id, agent_id, insurance_company, report_type, processing_month,
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
    sql += ' ORDER BY processing_month DESC, created_at DESC LIMIT 10000';
    const [rows] = await database_js_1.default.query(sql, params);
    return rows.map(toSalesTransaction);
}
/**
 * Search clients (unique insured_id + insured_name) for an agent.
 * Optionally filter by name or ID search term.
 */
async function searchClients(agentId, search, limit = 50) {
    // Calculate per-client: latest month commission, monthly average, and total
    // Only policy-level report types to avoid double-counting aggregates
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
      AND report_type IN ${POLICY_REPORT_TYPES}
      AND insured_name IS NOT NULL
      AND insured_name != ''`;
    const params = [agentId];
    if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        sql += ' AND (insured_name LIKE ? OR insured_id LIKE ?)';
        params.push(term, term);
    }
    sql += ' GROUP BY insured_name ORDER BY last_month DESC, total_commission DESC LIMIT ?';
    params.push(limit);
    const [rows] = await database_js_1.default.query(sql, params);
    return rows.map((r) => {
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
async function getPortfolioAnalysis(agentId) {
    // 1. Overview — only policy-level report types to avoid double-counting aggregates
    const [overviewRows] = await database_js_1.default.query(`SELECT
       (SELECT COUNT(DISTINCT insured_name) FROM sales_transactions WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES} AND insured_name IS NOT NULL AND insured_name != '') AS total_clients,
       ROUND(SUM(commission_amount), 2) AS total_commission,
       COUNT(DISTINCT processing_month) AS months_tracked
     FROM sales_transactions
     WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES}`, [agentId, agentId]);
    const totalClients = Number(overviewRows[0]?.total_clients) || 0;
    const totalCommission = Number(overviewRows[0]?.total_commission) || 0;
    const monthsTracked = Number(overviewRows[0]?.months_tracked) || 1;
    const monthlyAverage = Math.round(totalCommission / monthsTracked);
    const avgCommissionPerClient = totalClients > 0 ? Math.round(totalCommission / totalClients) : 0;
    // 2. By branch
    const [branchRows] = await database_js_1.default.query(`SELECT COALESCE(branch, 'אחר') AS branch,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(DISTINCT insured_name) AS clients
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND insured_name IS NOT NULL AND insured_name != ''
     GROUP BY COALESCE(branch, 'אחר')
     ORDER BY total DESC`, [agentId]);
    const byBranch = branchRows.map((r) => ({
        branch: r.branch,
        total: Number(r.total),
        clients: Number(r.clients),
        pct: totalCommission > 0 ? Math.round((Number(r.total) / totalCommission) * 100) : 0,
    }));
    // 3. Top clients
    const [topRows] = await database_js_1.default.query(`SELECT insured_name AS name,
            MAX(insured_id) AS id,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(DISTINCT processing_month) AS months,
            GROUP_CONCAT(DISTINCT branch) AS branches
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND insured_name IS NOT NULL AND insured_name != ''
     GROUP BY insured_name
     ORDER BY total DESC
     LIMIT 20`, [agentId]);
    // For trend calculation, get last two months per client
    const [trendRows] = await database_js_1.default.query(`SELECT insured_name,
            processing_month,
            ROUND(SUM(commission_amount), 2) AS month_total
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND insured_name IS NOT NULL AND insured_name != ''
     GROUP BY insured_name, processing_month
     ORDER BY insured_name, processing_month DESC`, [agentId]);
    // Build trend map: client -> [latest, previous]
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
            trend,
        };
    });
    // 4. Monthly trend — policy-level records only
    const [monthlyRows] = await database_js_1.default.query(`SELECT processing_month AS month,
            ROUND(SUM(commission_amount), 2) AS total,
            COUNT(DISTINCT CASE WHEN insured_name IS NOT NULL AND insured_name != '' THEN insured_name END) AS clients
     FROM sales_transactions
     WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES}
     GROUP BY processing_month
     ORDER BY processing_month ASC`, [agentId]);
    const monthlyTrend = monthlyRows.map((r) => ({
        month: r.month,
        total: Number(r.total),
        clients: Number(r.clients),
    }));
    // 5. Concentration (from topClients sorted by total desc)
    const allClientTotals = topRows.map((r) => Number(r.total));
    // We need all clients for concentration, not just top 20
    const [allTotalsRows] = await database_js_1.default.query(`SELECT ROUND(SUM(commission_amount), 2) AS total
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND insured_name IS NOT NULL AND insured_name != ''
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
    // 6. At risk — clients whose latest month < previous month by 20%+
    const atRisk = [];
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
                    lastMonth: clientTrend ? clientTrend.processing_month : '',
                });
            }
        }
    }
    // Fill IDs for at-risk clients
    if (atRisk.length > 0) {
        const namesForId = atRisk.map((c) => c.name);
        const [idRows] = await database_js_1.default.query(`SELECT insured_name, MAX(insured_id) AS insured_id
       FROM sales_transactions
       WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES} AND insured_name IN (${namesForId.map(() => '?').join(',')})
       GROUP BY insured_name`, [agentId, ...namesForId]);
        const idMap = new Map(idRows.map((r) => [r.insured_name, r.insured_id || '']));
        for (const c of atRisk) {
            c.id = idMap.get(c.name) || '';
        }
    }
    // Sort at risk by drop pct desc, limit 20
    atRisk.sort((a, b) => b.dropPct - a.dropPct);
    atRisk.splice(20);
    // 7. New clients — first appeared in the latest month
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
         AND insured_name IS NOT NULL AND insured_name != ''
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
async function getMonthlySalarySummary(agentId) {
    const [rows] = await database_js_1.default.query(`SELECT processing_month AS month,
            ROUND(SUM(commission_amount), 2) AS total_commission,
            COUNT(*) AS record_count
     FROM sales_transactions
     WHERE agent_id = ?
     GROUP BY processing_month
     ORDER BY processing_month DESC`, [agentId]);
    return rows.map((r) => ({
        month: r.month,
        totalCommission: Number(r.total_commission),
        recordCount: Number(r.record_count),
    }));
}
//# sourceMappingURL=sales.repository.js.map