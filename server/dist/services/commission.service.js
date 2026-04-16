"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOneTimeCommission = calculateOneTimeCommission;
exports.calculateRecurringCommission = calculateRecurringCommission;
exports.calculateVolumeCommission = calculateVolumeCommission;
exports.generateCommissions = generateCommissions;
exports.calculateSalarySummary = calculateSalarySummary;
const tax_service_js_1 = require("./tax.service.js");
const uuid_1 = require("uuid");
function calculateOneTimeCommission(policy) {
    return policy.premiumAmount * (policy.commissionPct / 100);
}
function calculateRecurringCommission(policy) {
    if (policy.recurringPct <= 0)
        return 0;
    return policy.premiumAmount * (policy.recurringPct / 100);
}
function calculateVolumeCommission(policy, totalAnnualPremium) {
    if (policy.volumePct <= 0)
        return 0;
    return totalAnnualPremium * (policy.volumePct / 100);
}
function generateCommissions(policy, period) {
    const commissions = [];
    const now = new Date().toISOString();
    // One-time commission (only for new policies in this period)
    if (policy.startDate.startsWith(period)) {
        commissions.push({
            id: (0, uuid_1.v4)(),
            policyId: policy.id,
            agentId: policy.agentId,
            type: 'one_time',
            amount: calculateOneTimeCommission(policy),
            rate: policy.commissionPct,
            premiumBase: policy.premiumAmount,
            period,
            paymentDate: now,
            status: 'pending',
            insuranceCompany: policy.insuranceCompany,
            createdAt: now,
        });
    }
    // Recurring commission
    if (policy.recurringPct > 0 && policy.status === 'active') {
        commissions.push({
            id: (0, uuid_1.v4)(),
            policyId: policy.id,
            agentId: policy.agentId,
            type: 'recurring',
            amount: calculateRecurringCommission(policy),
            rate: policy.recurringPct,
            premiumBase: policy.premiumAmount,
            period,
            paymentDate: now,
            status: 'pending',
            insuranceCompany: policy.insuranceCompany,
            createdAt: now,
        });
    }
    return commissions;
}
function calculateSalarySummary(commissions, taxStatus, totalPolicies, newPoliciesCount) {
    const oneTimeCommissions = commissions
        .filter((c) => c.type === 'one_time')
        .reduce((sum, c) => sum + c.amount, 0);
    const recurringCommissions = commissions
        .filter((c) => c.type === 'recurring')
        .reduce((sum, c) => sum + c.amount, 0);
    const volumeCommissions = commissions
        .filter((c) => c.type === 'volume')
        .reduce((sum, c) => sum + c.amount, 0);
    const bonuses = commissions
        .filter((c) => c.type === 'bonus')
        .reduce((sum, c) => sum + c.amount, 0);
    const grossTotal = oneTimeCommissions + recurringCommissions + volumeCommissions + bonuses;
    const tax = (0, tax_service_js_1.calculateTax)(grossTotal, taxStatus);
    const conversionRate = totalPolicies > 0 ? (newPoliciesCount / totalPolicies) * 100 : 0;
    return {
        period: commissions[0]?.period ?? '',
        oneTimeCommissions: Math.round(oneTimeCommissions),
        recurringCommissions: Math.round(recurringCommissions),
        volumeCommissions: Math.round(volumeCommissions),
        bonuses: Math.round(bonuses),
        grossTotal: Math.round(grossTotal),
        tax,
        netTotal: Math.round(tax.netIncome),
        policyCount: totalPolicies,
        newPolicies: newPoliciesCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
    };
}
//# sourceMappingURL=commission.service.js.map