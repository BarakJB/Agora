import {
  getMonthlySalarySummary,
  getPortfolioAnalysis,
} from '../../repositories/sales.repository.js';

interface CacheEntry {
  context: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function buildBaselineContext(agentId: string): Promise<string> {
  const now = Date.now();
  const cached = cache.get(agentId);
  if (cached && cached.expiresAt > now) {
    return cached.context;
  }

  const [summary, overview] = await Promise.all([
    getMonthlySalarySummary(agentId),
    getPortfolioAnalysis(agentId).then((a) => a.overview),
  ]);

  const currentMonth = summary[0] ?? null;
  const topCompanyRow = await getPortfolioAnalysis(agentId).then((a) =>
    a.byBranch[0]?.branch ?? null,
  );

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

export function invalidateBaselineContext(agentId: string): void {
  cache.delete(agentId);
}
