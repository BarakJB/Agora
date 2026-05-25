"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuggestedTargets = getSuggestedTargets;
const database_js_1 = __importDefault(require("../config/database.js"));
const POLICY_REPORT_TYPES = `('nifraim','hekef','accumulation_nifraim','accumulation_hekef')`;
const MONTHLY_GROWTH = 1.10;
const YEARLY_GROWTH = 1.20;
async function getSuggestedTargets(agentId) {
    const [rows] = await database_js_1.default.query(`SELECT
       processing_month,
       ROUND(SUM(CASE WHEN report_type = 'nifraim' THEN commission_amount ELSE 0 END), 2) AS nifraim,
       ROUND(SUM(CASE WHEN report_type = 'hekef' THEN commission_amount ELSE 0 END), 2) AS hekef,
       ROUND(SUM(CASE WHEN report_type IN ('accumulation_nifraim','accumulation_hekef') THEN commission_amount ELSE 0 END), 2) AS accumulation,
       ROUND(SUM(commission_amount), 2) AS total
     FROM sales_transactions
     WHERE agent_id = ?
       AND report_type IN ${POLICY_REPORT_TYPES}
     GROUP BY processing_month
     ORDER BY processing_month DESC`, [agentId]);
    const months = rows.map((r) => ({
        processingMonth: r.processing_month,
        nifraim: Number(r.nifraim),
        hekef: Number(r.hekef),
        accumulation: Number(r.accumulation),
        total: Number(r.total),
    }));
    if (months.length < 2) {
        const noDataLabel = 'נתונים לא מספיקים';
        const metrics = ['total', 'nifraim', 'hekef', 'accumulation'];
        const periods = ['monthly', 'yearly'];
        return metrics.flatMap((metric) => periods.map((period) => ({
            metric,
            period,
            suggestedAmount: 0,
            basedOn: noDataLabel,
        })));
    }
    const n = months.length;
    const monthlyLabel = `מעל הממוצע השנתי (${n} חודשים) + 10%`;
    const yearlyLabel = `סך ${n} חודשים שהוזנו + 20%`;
    function annualAvg(values) {
        return values.reduce((sum, v) => sum + v, 0) / values.length;
    }
    function sumAll(values) {
        return values.reduce((sum, v) => sum + v, 0);
    }
    function round2(v) {
        return Math.round(v * 100) / 100;
    }
    const totalValues = months.map((m) => m.total);
    const nifraimValues = months.map((m) => m.nifraim);
    const hekefValues = months.map((m) => m.hekef);
    const accumulationValues = months.map((m) => m.accumulation);
    const monthlyTotal = round2(annualAvg(totalValues) * MONTHLY_GROWTH);
    const monthlyNifraim = round2(annualAvg(nifraimValues) * MONTHLY_GROWTH);
    const monthlyHekef = round2(annualAvg(hekefValues) * MONTHLY_GROWTH);
    const monthlyAccumulation = round2(annualAvg(accumulationValues) * MONTHLY_GROWTH);
    const yearlyTotal = round2(sumAll(totalValues) * YEARLY_GROWTH);
    const yearlyNifraim = round2(sumAll(nifraimValues) * YEARLY_GROWTH);
    const yearlyHekef = round2(sumAll(hekefValues) * YEARLY_GROWTH);
    const yearlyAccumulation = round2(sumAll(accumulationValues) * YEARLY_GROWTH);
    return [
        { metric: 'total', period: 'monthly', suggestedAmount: monthlyTotal, basedOn: monthlyLabel },
        { metric: 'nifraim', period: 'monthly', suggestedAmount: monthlyNifraim, basedOn: monthlyLabel },
        { metric: 'hekef', period: 'monthly', suggestedAmount: monthlyHekef, basedOn: monthlyLabel },
        { metric: 'accumulation', period: 'monthly', suggestedAmount: monthlyAccumulation, basedOn: monthlyLabel },
        { metric: 'total', period: 'yearly', suggestedAmount: yearlyTotal, basedOn: yearlyLabel },
        { metric: 'nifraim', period: 'yearly', suggestedAmount: yearlyNifraim, basedOn: yearlyLabel },
        { metric: 'hekef', period: 'yearly', suggestedAmount: yearlyHekef, basedOn: yearlyLabel },
        { metric: 'accumulation', period: 'yearly', suggestedAmount: yearlyAccumulation, basedOn: yearlyLabel },
    ];
}
//# sourceMappingURL=target-suggestions.service.js.map