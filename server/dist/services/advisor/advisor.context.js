"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBaselineContext = buildBaselineContext;
exports.invalidateBaselineContext = invalidateBaselineContext;
const sales_repository_js_1 = require("../../repositories/sales.repository.js");
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
async function buildBaselineContext(agentId) {
    const now = Date.now();
    const cached = cache.get(agentId);
    if (cached && cached.expiresAt > now) {
        return cached.context;
    }
    const [summary, overview] = await Promise.all([
        (0, sales_repository_js_1.getMonthlySalarySummary)(agentId),
        (0, sales_repository_js_1.getPortfolioAnalysis)(agentId).then((a) => a.overview),
    ]);
    const currentMonth = summary[0] ?? null;
    const topCompanyRow = await (0, sales_repository_js_1.getPortfolioAnalysis)(agentId).then((a) => a.byBranch[0]?.branch ?? null);
    const totalClients = overview.totalClients;
    const context = JSON.stringify({
        currentMonth: currentMonth?.month ?? null,
        currentMonthRevenue: currentMonth?.totalCommission ?? 0,
        totalClients,
        leadingBranch: topCompanyRow,
        portfolioAvgMonthly: overview.monthlyAverage,
    });
    cache.set(agentId, { context, expiresAt: now + CACHE_TTL_MS });
    return context;
}
function invalidateBaselineContext(agentId) {
    cache.delete(agentId);
}
//# sourceMappingURL=advisor.context.js.map