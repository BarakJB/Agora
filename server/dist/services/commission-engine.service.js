"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPensionLikeProduct = isPensionLikeProduct;
exports.calculateOneTimeAmount = calculateOneTimeAmount;
exports.calculateRecurringAmount = calculateRecurringAmount;
exports.buildDealTimeline = buildDealTimeline;
exports.calculateDealImpactForPeriod = calculateDealImpactForPeriod;
exports.calculateExpectedMonthlyFromPolicies = calculateExpectedMonthlyFromPolicies;
// ============ Business Constants ============
/** Months to wait after policy opens before management fee kicks in */
const MANAGEMENT_FEE_WAIT_MONTHS = 3;
/** Months after ניוד before commission is paid (default) */
const NIUD_COMMISSION_WAIT_MONTHS = 12;
/** הראל exception: ניוד commission after 3 months instead of 12 */
const HAREL_NIUD_COMMISSION_WAIT_MONTHS = 3;
/** Business days within which ניוד transfer should happen after הפקדה */
const NIUD_TRANSFER_BUSINESS_DAYS = 10;
const HAREL_COMPANY_NAME = 'הראל';
// ============ Product Classification ============
const PENSION_LIKE_PRODUCTS = new Set([
    'pension',
    'provident_fund',
    'managers_insurance',
    'education_fund',
]);
const INSURANCE_PRODUCTS = new Set([
    'life_insurance',
    'health',
    'general',
]);
function isPensionLikeProduct(productType) {
    return PENSION_LIKE_PRODUCTS.has(productType);
}
// ============ Date Helpers ============
function addMonths(dateStr, months) {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
}
function toPeriod(dateStr) {
    return dateStr.substring(0, 7); // YYYY-MM
}
function addBusinessDays(dateStr, days) {
    const date = new Date(dateStr);
    let added = 0;
    while (added < days) {
        date.setDate(date.getDate() + 1);
        const dow = date.getDay();
        // Skip Saturday (6) and Friday (5) for Israeli business days
        if (dow !== 5 && dow !== 6) {
            added++;
        }
    }
    return date.toISOString().split('T')[0];
}
// ============ Commission Calculation ============
function calculateOneTimeAmount(premiumAmount, commissionPct) {
    return Math.round(premiumAmount * (commissionPct / 100));
}
function calculateRecurringAmount(premiumAmount, recurringPct) {
    return Math.round(premiumAmount * (recurringPct / 100));
}
// ============ Timeline Generation ============
/**
 * Build the full commission timeline for a pension/gemel deal.
 *
 * Sequence:
 * 1. Policy opens → wait 3 months
 * 2. After 3 months → שכר טרחה (management fee commission) starts
 * 3. When הפקדה (deposit) happens → within 10 business days → ניוד transfer
 * 4. On ניוד itself → commission after 1 year (exception: הראל = 3 months)
 * 5. On הפקדה → immediate bonus payment
 * 6. Then → נפרעים (recurring monthly commissions)
 */
function buildPensionTimeline(startDate, premiumAmount, insuranceCompany, rates) {
    const events = [];
    const monthlyRecurring = calculateRecurringAmount(premiumAmount, rates.recurringPct);
    // 1. Immediate one-time commission on policy creation
    if (rates.commissionPct > 0) {
        events.push({
            type: 'one_time',
            label: 'עמלה חד-פעמית על פתיחת פוליסה',
            expectedDate: startDate,
            expectedPeriod: toPeriod(startDate),
            amount: calculateOneTimeAmount(premiumAmount, rates.commissionPct),
            isRecurring: false,
            recurringMonthlyAmount: 0,
            confidence: 'high',
        });
    }
    // 2. After 3 months → שכר טרחה / management fee starts
    const managementFeeStart = addMonths(startDate, MANAGEMENT_FEE_WAIT_MONTHS);
    events.push({
        type: 'management_fee',
        label: 'שכר טרחה (דמי ניהול) — תחילה אחרי 3 חודשים',
        expectedDate: managementFeeStart,
        expectedPeriod: toPeriod(managementFeeStart),
        amount: monthlyRecurring, // First month amount
        isRecurring: true,
        recurringMonthlyAmount: monthlyRecurring,
        confidence: 'high',
    });
    // 3. הפקדה happens around month 3 → ניוד within 10 business days
    const depositDate = managementFeeStart;
    const niudDate = addBusinessDays(depositDate, NIUD_TRANSFER_BUSINESS_DAYS);
    // 4. On ניוד → commission after waiting period (1 year or 3 months for הראל)
    const isHarel = insuranceCompany.includes(HAREL_COMPANY_NAME);
    const niudWait = isHarel ? HAREL_NIUD_COMMISSION_WAIT_MONTHS : NIUD_COMMISSION_WAIT_MONTHS;
    const niudCommissionDate = addMonths(niudDate, niudWait);
    events.push({
        type: 'niud',
        label: `עמלת ניוד — ${isHarel ? '3 חודשים' : 'שנה'} אחרי ניוד`,
        expectedDate: niudCommissionDate,
        expectedPeriod: toPeriod(niudCommissionDate),
        amount: calculateOneTimeAmount(premiumAmount, rates.commissionPct),
        isRecurring: false,
        recurringMonthlyAmount: 0,
        confidence: isHarel ? 'medium' : 'low',
    });
    // 5. הפקדה → immediate bonus
    if (rates.volumePct > 0) {
        events.push({
            type: 'bonus',
            label: 'בונוס הפקדה — מיידי',
            expectedDate: depositDate,
            expectedPeriod: toPeriod(depositDate),
            amount: calculateOneTimeAmount(premiumAmount, rates.volumePct),
            isRecurring: false,
            recurringMonthlyAmount: 0,
            confidence: 'medium',
        });
    }
    // 6. נפרעים — recurring monthly from deposit onward
    if (monthlyRecurring > 0) {
        const nifrarimStart = addMonths(depositDate, 1);
        events.push({
            type: 'recurring',
            label: 'נפרעים — עמלה שוטפת חודשית',
            expectedDate: nifrarimStart,
            expectedPeriod: toPeriod(nifrarimStart),
            amount: monthlyRecurring,
            isRecurring: true,
            recurringMonthlyAmount: monthlyRecurring,
            confidence: 'high',
        });
    }
    return events;
}
/**
 * Build timeline for insurance products (life, health, general).
 * Simpler: one-time commission on sale, then recurring monthly.
 */
function buildInsuranceTimeline(startDate, premiumAmount, rates) {
    const events = [];
    const monthlyRecurring = calculateRecurringAmount(premiumAmount, rates.recurringPct);
    // One-time commission on sale
    if (rates.commissionPct > 0) {
        events.push({
            type: 'one_time',
            label: 'עמלה חד-פעמית על מכירה',
            expectedDate: startDate,
            expectedPeriod: toPeriod(startDate),
            amount: calculateOneTimeAmount(premiumAmount, rates.commissionPct),
            isRecurring: false,
            recurringMonthlyAmount: 0,
            confidence: 'high',
        });
    }
    // Recurring monthly commissions
    if (monthlyRecurring > 0) {
        const recurringStart = addMonths(startDate, 1);
        events.push({
            type: 'recurring',
            label: 'נפרעים — עמלה שוטפת חודשית',
            expectedDate: recurringStart,
            expectedPeriod: toPeriod(recurringStart),
            amount: monthlyRecurring,
            isRecurring: true,
            recurringMonthlyAmount: monthlyRecurring,
            confidence: 'high',
        });
    }
    // Volume bonus
    if (rates.volumePct > 0) {
        events.push({
            type: 'bonus',
            label: 'בונוס היקפים',
            expectedDate: startDate,
            expectedPeriod: toPeriod(startDate),
            amount: calculateOneTimeAmount(premiumAmount, rates.volumePct),
            isRecurring: false,
            recurringMonthlyAmount: 0,
            confidence: 'low',
        });
    }
    return events;
}
// ============ Public API ============
/**
 * Generate a full commission timeline for a new deal.
 * Applies the correct business rules based on product type.
 */
function buildDealTimeline(dealType, startDate, premiumAmount, insuranceCompany, rates) {
    const events = isPensionLikeProduct(dealType)
        ? buildPensionTimeline(startDate, premiumAmount, insuranceCompany, rates)
        : buildInsuranceTimeline(startDate, premiumAmount, rates);
    const monthlyRecurring = events
        .filter((e) => e.isRecurring)
        .reduce((max, e) => Math.max(max, e.recurringMonthlyAmount), 0);
    const oneTimeTotal = events
        .filter((e) => !e.isRecurring)
        .reduce((sum, e) => sum + e.amount, 0);
    const totalFirstYear = oneTimeTotal + monthlyRecurring * 12;
    return {
        dealType,
        insuranceCompany,
        premiumAmount,
        events,
        totalFirstYear,
        monthlyRecurring,
    };
}
/**
 * Calculate the salary impact of a deal in a given target month.
 * Looks at the timeline and sums up all events that fall in or before
 * the target period.
 */
function calculateDealImpactForPeriod(timeline, targetPeriod) {
    let oneTime = 0;
    let recurring = 0;
    for (const event of timeline.events) {
        if (event.expectedPeriod > targetPeriod)
            continue;
        if (event.isRecurring && event.expectedPeriod <= targetPeriod) {
            recurring += event.recurringMonthlyAmount;
        }
        else if (!event.isRecurring && event.expectedPeriod === targetPeriod) {
            oneTime += event.amount;
        }
    }
    return { oneTime, recurring, total: oneTime + recurring };
}
/**
 * Calculate expected monthly income from all active policies for a given period.
 */
function calculateExpectedMonthlyFromPolicies(policies, targetPeriod) {
    let totalRecurring = 0;
    let totalOneTime = 0;
    const byCompany = {};
    for (const policy of policies) {
        if (policy.status !== 'active')
            continue;
        const policyStartPeriod = toPeriod(policy.startDate);
        // One-time commissions only for policies starting in the target period
        if (policyStartPeriod === targetPeriod) {
            const amount = calculateOneTimeAmount(policy.premiumAmount, policy.commissionPct);
            totalOneTime += amount;
            byCompany[policy.insuranceCompany] = (byCompany[policy.insuranceCompany] ?? 0) + amount;
        }
        // Recurring commissions for policies that started before the target period
        if (policyStartPeriod < targetPeriod && policy.recurringPct > 0) {
            const amount = calculateRecurringAmount(policy.premiumAmount, policy.recurringPct);
            totalRecurring += amount;
            byCompany[policy.insuranceCompany] = (byCompany[policy.insuranceCompany] ?? 0) + amount;
        }
    }
    return { totalRecurring, totalOneTime, byCompany };
}
//# sourceMappingURL=commission-engine.service.js.map