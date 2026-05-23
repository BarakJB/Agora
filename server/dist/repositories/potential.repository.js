"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalesPotential = getSalesPotential;
const database_js_1 = __importDefault(require("../config/database.js"));
// Only policy-level report types — same constant rationale as sales.repository.ts
const POLICY_REPORT_TYPES = `('nifraim','hekef','accumulation_nifraim','accumulation_hekef')`;
// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseYearMonth(ym) {
    const [year, month] = ym.split('-').map(Number);
    return new Date(year, (month ?? 1) - 1, 1);
}
function monthDiff(from, to) {
    const a = parseYearMonth(from);
    const b = parseYearMonth(to);
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}
function clamp(val, min, max) {
    return Math.min(Math.max(Math.round(val), min), max);
}
function buildAgentBranchMix(branchRows) {
    const grandTotal = branchRows.reduce((s, r) => s + r.total, 0);
    if (grandTotal === 0)
        return [];
    return branchRows
        .map((r) => ({
        branch: r.branch,
        pct: Math.round((r.total / grandTotal) * 1000) / 10,
    }))
        .sort((a, b) => b.pct - a.pct);
}
function buildCrossSell(clients, topBranches) {
    if (topBranches.length === 0)
        return [];
    const topSet = new Set(topBranches);
    const maxTotal = Math.max(...clients.map((c) => c.total), 1);
    const results = [];
    for (const c of clients) {
        const currentBranches = c.branchesCsv ? c.branchesCsv.split(',').filter(Boolean) : [];
        const currentSet = new Set(currentBranches);
        const missingBranches = topBranches.filter((b) => !currentSet.has(b));
        if (missingBranches.length === 0 || c.total <= 0)
            continue;
        const commissionScore = (c.total / maxTotal) * 60;
        const missingScore = (missingBranches.length / topBranches.length) * 40;
        const potentialScore = clamp(commissionScore + missingScore, 1, 100);
        results.push({
            insuredName: c.insuredName,
            insuredId: c.insuredId,
            currentBranches,
            missingBranches,
            totalCommission: c.total,
            monthsActive: c.monthsActive,
            potentialScore,
        });
    }
    results.sort((a, b) => b.potentialScore - a.potentialScore);
    return results.slice(0, 30);
}
function buildDormant(clients, latestMonth) {
    const results = [];
    for (const c of clients) {
        const since = monthDiff(c.lastMonth, latestMonth);
        // Require at least 3 active months to exclude one-shot clients
        if (since < 4 || c.monthsActive < 3)
            continue;
        results.push({
            insuredName: c.insuredName,
            insuredId: c.insuredId,
            lastMonth: c.lastMonth,
            monthsSince: since,
            historicalTotal: c.total,
            branches: c.branchesCsv ? c.branchesCsv.split(',').filter(Boolean) : [],
        });
    }
    results.sort((a, b) => b.historicalTotal - a.historicalTotal);
    return results.slice(0, 30);
}
function buildUntappedBranches(agentBranchMix, clients, topBranches) {
    const topSet = new Set(topBranches);
    // Only consider branches with low penetration (pct < 5%) that the agent does have
    const underserved = agentBranchMix.filter((b) => b.pct > 0 && b.pct < 5);
    return underserved.map((b) => {
        // Clients who have at least one top-branch policy but lack this branch
        const eligible = clients.filter((c) => {
            const cBranches = new Set(c.branchesCsv ? c.branchesCsv.split(',').filter(Boolean) : []);
            return !cBranches.has(b.branch) && topBranches.some((t) => cBranches.has(t));
        });
        const sample = eligible
            .slice()
            .sort((a, x) => x.total - a.total)
            .slice(0, 5)
            .map((c) => c.insuredName);
        return {
            branch: b.branch,
            currentPct: b.pct,
            opportunityClients: eligible.length,
            sampleClients: sample,
        };
    });
}
function buildEmployerClusters(rows) {
    return rows.map((r) => ({
        employerName: r.employerName,
        employerId: r.employerId,
        employeeCount: r.employeeCount,
        branchesCovered: r.branchesCovered,
        totalCommission: r.total,
        avgPerEmployee: r.employeeCount > 0 ? Math.round(r.total / r.employeeCount) : 0,
    }));
}
// ─── Queries ──────────────────────────────────────────────────────────────────
async function queryClients(agentId) {
    const [rows] = await database_js_1.default.query(`SELECT insured_name,
            MAX(insured_id) AS insured_id,
            MAX(employer_name) AS employer_name,
            GROUP_CONCAT(DISTINCT branch ORDER BY branch SEPARATOR ',') AS branches_csv,
            COUNT(DISTINCT branch) AS branch_count,
            COUNT(DISTINCT processing_month) AS months_active,
            MAX(processing_month) AS last_month,
            MIN(processing_month) AS first_month,
            ROUND(SUM(commission_amount), 2) AS total
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND insured_name IS NOT NULL AND insured_name != ''
     GROUP BY insured_name
     HAVING total > 0`, [agentId]);
    return rows.map((r) => ({
        insuredName: r.insured_name,
        insuredId: r.insured_id || r.insured_name,
        employerName: r.employer_name ?? null,
        branchesCsv: r.branches_csv || '',
        branchCount: Number(r.branch_count),
        monthsActive: Number(r.months_active),
        lastMonth: r.last_month,
        total: Number(r.total),
    }));
}
async function queryLatestMonth(agentId) {
    const [rows] = await database_js_1.default.query(`SELECT MAX(processing_month) AS latest
     FROM sales_transactions
     WHERE agent_id = ? AND report_type IN ${POLICY_REPORT_TYPES}`, [agentId]);
    return rows[0]?.latest || '';
}
async function queryBranchTotals(agentId) {
    const [rows] = await database_js_1.default.query(`SELECT COALESCE(branch, 'אחר') AS branch,
            ROUND(SUM(commission_amount), 2) AS total
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND branch IS NOT NULL AND branch != ''
     GROUP BY COALESCE(branch, 'אחר')
     ORDER BY total DESC`, [agentId]);
    return rows.map((r) => ({
        branch: r.branch,
        total: Number(r.total),
    }));
}
async function queryEmployerClusters(agentId) {
    const [rows] = await database_js_1.default.query(`SELECT employer_name,
            MAX(employer_id) AS employer_id,
            COUNT(DISTINCT insured_name) AS employees,
            COUNT(DISTINCT branch) AS branches,
            ROUND(SUM(commission_amount), 2) AS total
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
       AND employer_name IS NOT NULL AND employer_name != ''
     GROUP BY employer_name
     HAVING employees >= 3
     ORDER BY total DESC
     LIMIT 30`, [agentId]);
    return rows.map((r) => ({
        employerName: r.employer_name,
        employerId: r.employer_id ?? null,
        employeeCount: Number(r.employees),
        branchesCovered: Number(r.branches),
        total: Number(r.total),
    }));
}
// ─── Public API ───────────────────────────────────────────────────────────────
async function getSalesPotential(agentId) {
    const [clients, latestMonth, branchTotals, employerRows] = await Promise.all([
        queryClients(agentId),
        queryLatestMonth(agentId),
        queryBranchTotals(agentId),
        queryEmployerClusters(agentId),
    ]);
    const agentBranchMix = buildAgentBranchMix(branchTotals);
    // Top 5 branches by commission weight — these define the agent's "product basket"
    const topBranches = agentBranchMix.slice(0, 5).map((b) => b.branch);
    const crossSell = buildCrossSell(clients, topBranches);
    const dormant = buildDormant(clients, latestMonth);
    const untappedBranches = buildUntappedBranches(agentBranchMix, clients, topBranches);
    const employerClusters = buildEmployerClusters(employerRows);
    return {
        crossSell,
        dormant,
        untappedBranches,
        employerClusters,
        meta: {
            latestMonth,
            totalClients: clients.length,
            agentBranchMix,
        },
    };
}
//# sourceMappingURL=potential.repository.js.map