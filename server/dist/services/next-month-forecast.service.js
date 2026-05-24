"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictNextMonthFromTransactions = predictNextMonthFromTransactions;
const database_js_1 = __importDefault(require("../config/database.js"));
const LOOKBACK_MONTHS = 6;
async function getReportTypeHistory(agentId, portfolioType) {
    const portfolioFilter = portfolioType !== 'all' ? ` AND portfolio_type = '${portfolioType}'` : '';
    const [rows] = await database_js_1.default.query(`SELECT processing_month, report_type, ROUND(SUM(commission_amount), 2) AS total
     FROM sales_transactions
     WHERE agent_id = ?${portfolioFilter}
     GROUP BY processing_month, report_type
     ORDER BY processing_month DESC
     LIMIT ${LOOKBACK_MONTHS * 20}`, [agentId]);
    return rows.map((r) => ({
        processingMonth: r.processing_month,
        reportType: r.report_type,
        total: Number(r.total),
    }));
}
function weightedAverage(values) {
    if (values.length === 0)
        return 0;
    const weights = values.map((_, i) => i + 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    return values.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight;
}
function deriveConfidence(months) {
    if (months >= 6)
        return 'high';
    if (months >= 3)
        return 'medium';
    return 'low';
}
async function predictNextMonthFromTransactions(agentId, portfolioType = 'all') {
    const rows = await getReportTypeHistory(agentId, portfolioType);
    const monthSet = new Set(rows.map((r) => r.processingMonth));
    const sortedMonths = [...monthSet].sort().reverse().slice(0, LOOKBACK_MONTHS);
    const basedOnMonths = sortedMonths.length;
    const nifraimByMonth = new Map();
    const hekefByMonth = new Map();
    const accumulationByMonth = new Map();
    for (const r of rows) {
        if (!sortedMonths.includes(r.processingMonth))
            continue;
        const m = r.processingMonth;
        if (r.reportType === 'nifraim')
            nifraimByMonth.set(m, (nifraimByMonth.get(m) ?? 0) + r.total);
        else if (r.reportType === 'hekef')
            hekefByMonth.set(m, (hekefByMonth.get(m) ?? 0) + r.total);
        else if (r.reportType.startsWith('accumulation'))
            accumulationByMonth.set(m, (accumulationByMonth.get(m) ?? 0) + r.total);
    }
    const toSortedValues = (map) => sortedMonths.map((m) => map.get(m) ?? 0).reverse();
    const nifraimValues = toSortedValues(nifraimByMonth);
    const hekefValues = toSortedValues(hekefByMonth);
    const accumulationValues = toSortedValues(accumulationByMonth);
    const predictedNifraim = Math.round(weightedAverage(nifraimValues));
    const predictedHekef = Math.round(weightedAverage(hekefValues));
    const predictedAccumulation = Math.round(weightedAverage(accumulationValues));
    const predictedTotal = predictedNifraim + predictedHekef + predictedAccumulation;
    const assumptions = [
        `מבוסס על ${basedOnMonths} חודשים אחרונים`,
        'שימוש בממוצע משוקלל — חודשים אחרונים מקבלים משקל גבוה יותר',
    ];
    if (basedOnMonths < 3) {
        assumptions.push('נתונים מועטים — הדיוק נמוך');
    }
    const totalByMonth = sortedMonths.map((m) => {
        return (nifraimByMonth.get(m) ?? 0) + (hekefByMonth.get(m) ?? 0) + (accumulationByMonth.get(m) ?? 0);
    });
    if (totalByMonth.length >= 2) {
        const latest = totalByMonth[0];
        const prev = totalByMonth[1];
        if (prev > 0) {
            const changePct = Math.round(((latest - prev) / prev) * 100);
            if (Math.abs(changePct) >= 10) {
                assumptions.push(`מגמה: ${changePct > 0 ? '+' : ''}${changePct}% בחודש האחרון`);
            }
        }
    }
    return {
        predictedTotal,
        breakdown: {
            nifraim: predictedNifraim,
            hekef: predictedHekef,
            accumulation: predictedAccumulation,
        },
        confidence: deriveConfidence(basedOnMonths),
        basedOnMonths,
        assumptions,
    };
}
//# sourceMappingURL=next-month-forecast.service.js.map