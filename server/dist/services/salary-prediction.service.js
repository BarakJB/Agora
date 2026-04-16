"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictDealImpact = predictDealImpact;
exports.predictMonthlySalary = predictMonthlySalary;
const tax_service_js_1 = require("./tax.service.js");
const commission_engine_service_js_1 = require("./commission-engine.service.js");
const mysql_repository_js_1 = require("../repositories/mysql.repository.js");
// ============ Deal Prediction ============
/**
 * Predict the salary impact of a new deal.
 * Looks up contract rates, builds timeline, and returns
 * expected one-time + recurring amounts.
 */
async function predictDealImpact(input) {
    const { agentId, dealType, premiumAmount, insuranceCompany, startDate } = input;
    // Look up contract rates for this agent/company/product
    const contractRates = await (0, mysql_repository_js_1.getContractForDeal)(agentId, insuranceCompany, dealType, startDate);
    // Fall back to policy defaults if no contract found
    const rates = contractRates ?? {
        commissionPct: getDefaultCommissionPct(dealType),
        recurringPct: getDefaultRecurringPct(dealType),
        volumePct: 0,
    };
    const timeline = (0, commission_engine_service_js_1.buildDealTimeline)(dealType, startDate, premiumAmount, insuranceCompany, rates);
    // Current month impact
    const currentPeriod = startDate.substring(0, 7);
    const impact = (0, commission_engine_service_js_1.calculateDealImpactForPeriod)(timeline, currentPeriod);
    // Calculate net impact using agent's tax status
    const agent = await (0, mysql_repository_js_1.getAgentById)(agentId);
    const taxStatus = agent?.taxStatus ?? 'self_employed';
    const grossMonthlyIncrease = timeline.monthlyRecurring;
    const taxOnIncrease = (0, tax_service_js_1.calculateTax)(grossMonthlyIncrease, taxStatus);
    return {
        dealType,
        premiumAmount,
        insuranceCompany,
        expectedOneTime: impact.oneTime,
        expectedMonthlyRecurring: timeline.monthlyRecurring,
        expectedAnnualTotal: timeline.totalFirstYear,
        monthlyImpact: {
            grossIncrease: grossMonthlyIncrease,
            netIncrease: Math.round(taxOnIncrease.netIncome),
        },
    };
}
// ============ Monthly Salary Prediction ============
/**
 * Predict the full monthly salary for an agent.
 *
 * Strategy:
 * 1. Get all active policies → calculate expected recurring
 * 2. Get actual commissions for trailing 3 months → detect trend
 * 3. Compare expected vs actual → determine confidence
 * 4. Apply tax calculation → net prediction
 */
async function predictMonthlySalary(agentId, targetPeriod) {
    const agent = await (0, mysql_repository_js_1.getAgentById)(agentId);
    if (!agent)
        return null;
    // Fetch active policies and historical commissions in parallel
    const trailingFrom = subtractMonths(targetPeriod, 3);
    const [policies, historicalCommissions] = await Promise.all([
        (0, mysql_repository_js_1.getActivePoliciesForAgent)(agentId),
        (0, mysql_repository_js_1.getCommissionsForPeriodRange)(agentId, trailingFrom, targetPeriod),
    ]);
    // Expected recurring from active policies
    const expected = (0, commission_engine_service_js_1.calculateExpectedMonthlyFromPolicies)(policies, targetPeriod);
    // Analyze historical trend for recurring commissions
    const historicalRecurring = historicalCommissions
        .filter((c) => c.type === 'recurring')
        .reduce((sum, c) => sum + c.amount, 0);
    const historicalMonths = countDistinctPeriods(historicalCommissions.filter((c) => c.type === 'recurring'));
    const avgHistoricalRecurring = historicalMonths > 0
        ? Math.round(historicalRecurring / historicalMonths)
        : 0;
    // Use the higher of expected or historical average (conservative upward)
    const predictedRecurring = Math.max(expected.totalRecurring, avgHistoricalRecurring);
    // Historical one-time commissions (less predictable, use average)
    const historicalOneTime = historicalCommissions
        .filter((c) => c.type === 'one_time')
        .reduce((sum, c) => sum + c.amount, 0);
    const avgHistoricalOneTime = historicalMonths > 0
        ? Math.round(historicalOneTime / historicalMonths)
        : 0;
    // Volume/bonus — use historical average
    const historicalVolume = historicalCommissions
        .filter((c) => c.type === 'volume' || c.type === 'bonus')
        .reduce((sum, c) => sum + c.amount, 0);
    const avgHistoricalVolume = historicalMonths > 0
        ? Math.round(historicalVolume / historicalMonths)
        : 0;
    const breakdown = {
        nifraim: predictedRecurring,
        accumulation: 0, // Requires accumulation balance data (future feature)
        managementFees: 0, // Requires AUM data (future feature)
        collectionFees: 0,
        oneTimeCommissions: expected.totalOneTime + avgHistoricalOneTime,
        advanceDeduction: 0, // Requires advance balance data (future feature)
    };
    const grossPrediction = breakdown.nifraim
        + breakdown.accumulation
        + breakdown.managementFees
        + breakdown.collectionFees
        + breakdown.oneTimeCommissions
        - breakdown.advanceDeduction;
    const tax = (0, tax_service_js_1.calculateTax)(grossPrediction, agent.taxStatus);
    // Determine confidence based on data quality
    const confidence = determineConfidence(policies.length, historicalMonths, expected, avgHistoricalRecurring);
    const assumptions = [];
    if (historicalMonths < 3) {
        assumptions.push('פחות מ-3 חודשי היסטוריה — הערכה מבוססת על פוליסות פעילות בלבד');
    }
    if (expected.totalRecurring < avgHistoricalRecurring) {
        assumptions.push('ממוצע היסטורי גבוה מהצפי — ייתכנו עמלות שלא מופיעות בפוליסות');
    }
    if (avgHistoricalVolume > 0) {
        assumptions.push(`בונוסים והיקפים: ממוצע ₪${avgHistoricalVolume} לחודש על בסיס היסטוריה`);
    }
    return {
        agentId,
        period: targetPeriod,
        breakdown,
        grossPrediction: Math.round(grossPrediction),
        tax,
        netPrediction: Math.round(tax.netIncome),
        confidence,
        dataPointsUsed: historicalCommissions.length + policies.length,
        assumptions,
    };
}
// ============ Helpers ============
function subtractMonths(period, months) {
    const [yearStr, monthStr] = period.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - months;
    while (month < 1) {
        month += 12;
        year--;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
}
function countDistinctPeriods(commissions) {
    return new Set(commissions.map((c) => c.period)).size;
}
function determineConfidence(policyCount, historicalMonths, expected, avgHistorical) {
    if (policyCount === 0 || historicalMonths === 0)
        return 'low';
    // If expected is within 20% of historical, confidence is high
    if (avgHistorical > 0) {
        const variance = Math.abs(expected.totalRecurring - avgHistorical) / avgHistorical;
        if (variance < 0.2 && historicalMonths >= 3)
            return 'high';
        if (variance < 0.4 || historicalMonths >= 2)
            return 'medium';
    }
    return 'low';
}
function getDefaultCommissionPct(productType) {
    const defaults = {
        life_insurance: 30,
        health: 25,
        pension: 20,
        provident_fund: 15,
        managers_insurance: 20,
        education_fund: 15,
        general: 20,
    };
    return defaults[productType];
}
function getDefaultRecurringPct(productType) {
    const defaults = {
        life_insurance: 10,
        health: 8,
        pension: 5,
        provident_fund: 5,
        managers_insurance: 5,
        education_fund: 3,
        general: 5,
    };
    return defaults[productType];
}
//# sourceMappingURL=salary-prediction.service.js.map