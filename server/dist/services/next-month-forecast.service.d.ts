import type { PortfolioFilter } from '../repositories/sales.repository.js';
export interface NextMonthForecastBreakdown {
    nifraim: number;
    hekef: number;
    accumulation: number;
}
export type ForecastConfidence = 'high' | 'medium' | 'low';
export interface NextMonthForecast {
    predictedTotal: number;
    breakdown: NextMonthForecastBreakdown;
    confidence: ForecastConfidence;
    basedOnMonths: number;
    assumptions: string[];
}
export declare function predictNextMonthFromTransactions(agentId: string, portfolioType?: PortfolioFilter): Promise<NextMonthForecast>;
//# sourceMappingURL=next-month-forecast.service.d.ts.map