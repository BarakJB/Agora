"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const commission_service_js_1 = require("../commission.service.js");
function makePolicy(overrides = {}) {
    return {
        id: 'pol-1',
        agentId: 'agent-1',
        policyId: 'POL-ABC123',
        productType: 'life_insurance',
        clientName: 'Test Client',
        clientId: '123456789',
        startDate: '2026-03-15',
        cancelDate: null,
        premiumAmount: 10000,
        premiumFrequency: 'monthly',
        commissionPct: 15,
        recurringPct: 2,
        volumePct: 1,
        contractId: null,
        insuranceCompany: 'הראל',
        status: 'active',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        ...overrides,
    };
}
function makeCommission(overrides = {}) {
    return {
        id: 'comm-1',
        policyId: 'pol-1',
        agentId: 'agent-1',
        type: 'one_time',
        amount: 1500,
        rate: 15,
        premiumBase: 10000,
        period: '2026-03',
        paymentDate: '2026-03-15T00:00:00.000Z',
        status: 'pending',
        insuranceCompany: 'הראל',
        createdAt: '2026-03-01T00:00:00.000Z',
        ...overrides,
    };
}
(0, vitest_1.describe)('calculateOneTimeCommission', () => {
    (0, vitest_1.it)('should calculate one-time commission as premium * commissionPct / 100', () => {
        const policy = makePolicy({ premiumAmount: 10000, commissionPct: 15 });
        (0, vitest_1.expect)((0, commission_service_js_1.calculateOneTimeCommission)(policy)).toBe(1500);
    });
    (0, vitest_1.it)('should return 0 when commission percentage is 0', () => {
        const policy = makePolicy({ commissionPct: 0 });
        (0, vitest_1.expect)((0, commission_service_js_1.calculateOneTimeCommission)(policy)).toBe(0);
    });
    (0, vitest_1.it)('should handle fractional percentages', () => {
        const policy = makePolicy({ premiumAmount: 10000, commissionPct: 7.5 });
        (0, vitest_1.expect)((0, commission_service_js_1.calculateOneTimeCommission)(policy)).toBe(750);
    });
});
(0, vitest_1.describe)('calculateRecurringCommission', () => {
    (0, vitest_1.it)('should calculate recurring commission as premium * recurringPct / 100', () => {
        const policy = makePolicy({ premiumAmount: 10000, recurringPct: 2 });
        (0, vitest_1.expect)((0, commission_service_js_1.calculateRecurringCommission)(policy)).toBe(200);
    });
    (0, vitest_1.it)('should return 0 when recurringPct is 0', () => {
        const policy = makePolicy({ recurringPct: 0 });
        (0, vitest_1.expect)((0, commission_service_js_1.calculateRecurringCommission)(policy)).toBe(0);
    });
    (0, vitest_1.it)('should return 0 when recurringPct is negative', () => {
        const policy = makePolicy({ recurringPct: -1 });
        (0, vitest_1.expect)((0, commission_service_js_1.calculateRecurringCommission)(policy)).toBe(0);
    });
});
(0, vitest_1.describe)('calculateVolumeCommission', () => {
    (0, vitest_1.it)('should calculate volume commission from total annual premium', () => {
        const policy = makePolicy({ volumePct: 1 });
        (0, vitest_1.expect)((0, commission_service_js_1.calculateVolumeCommission)(policy, 500000)).toBe(5000);
    });
    (0, vitest_1.it)('should return 0 when volumePct is 0', () => {
        const policy = makePolicy({ volumePct: 0 });
        (0, vitest_1.expect)((0, commission_service_js_1.calculateVolumeCommission)(policy, 500000)).toBe(0);
    });
    (0, vitest_1.it)('should return 0 when volumePct is negative', () => {
        const policy = makePolicy({ volumePct: -1 });
        (0, vitest_1.expect)((0, commission_service_js_1.calculateVolumeCommission)(policy, 500000)).toBe(0);
    });
});
(0, vitest_1.describe)('generateCommissions', () => {
    (0, vitest_1.it)('should generate one-time commission for new policy in the matching period', () => {
        const policy = makePolicy({ startDate: '2026-03-15', commissionPct: 15, recurringPct: 0 });
        const commissions = (0, commission_service_js_1.generateCommissions)(policy, '2026-03');
        (0, vitest_1.expect)(commissions).toHaveLength(1);
        (0, vitest_1.expect)(commissions[0].type).toBe('one_time');
        (0, vitest_1.expect)(commissions[0].amount).toBe(1500);
    });
    (0, vitest_1.it)('should not generate one-time commission for policy from a different period', () => {
        const policy = makePolicy({ startDate: '2026-01-15', recurringPct: 0 });
        const commissions = (0, commission_service_js_1.generateCommissions)(policy, '2026-03');
        (0, vitest_1.expect)(commissions).toHaveLength(0);
    });
    (0, vitest_1.it)('should generate recurring commission for active policy with recurringPct > 0', () => {
        const policy = makePolicy({ startDate: '2026-01-15', recurringPct: 2, status: 'active' });
        const commissions = (0, commission_service_js_1.generateCommissions)(policy, '2026-03');
        (0, vitest_1.expect)(commissions).toHaveLength(1);
        (0, vitest_1.expect)(commissions[0].type).toBe('recurring');
        (0, vitest_1.expect)(commissions[0].amount).toBe(200);
    });
    (0, vitest_1.it)('should not generate recurring commission for cancelled policy', () => {
        const policy = makePolicy({ startDate: '2026-01-15', recurringPct: 2, status: 'cancelled' });
        const commissions = (0, commission_service_js_1.generateCommissions)(policy, '2026-03');
        (0, vitest_1.expect)(commissions).toHaveLength(0);
    });
    (0, vitest_1.it)('should generate both one-time and recurring for new active policy', () => {
        const policy = makePolicy({ startDate: '2026-03-15', recurringPct: 2, status: 'active' });
        const commissions = (0, commission_service_js_1.generateCommissions)(policy, '2026-03');
        (0, vitest_1.expect)(commissions).toHaveLength(2);
        const types = commissions.map((c) => c.type);
        (0, vitest_1.expect)(types).toContain('one_time');
        (0, vitest_1.expect)(types).toContain('recurring');
    });
    (0, vitest_1.it)('should set correct fields on generated commissions', () => {
        const policy = makePolicy({ startDate: '2026-03-15', recurringPct: 0 });
        const commissions = (0, commission_service_js_1.generateCommissions)(policy, '2026-03');
        const comm = commissions[0];
        (0, vitest_1.expect)(comm.policyId).toBe(policy.id);
        (0, vitest_1.expect)(comm.agentId).toBe(policy.agentId);
        (0, vitest_1.expect)(comm.period).toBe('2026-03');
        (0, vitest_1.expect)(comm.status).toBe('pending');
        (0, vitest_1.expect)(comm.insuranceCompany).toBe(policy.insuranceCompany);
        (0, vitest_1.expect)(comm.id).toBeTruthy();
    });
});
(0, vitest_1.describe)('calculateSalarySummary', () => {
    (0, vitest_1.it)('should aggregate commissions by type', () => {
        const commissions = [
            makeCommission({ type: 'one_time', amount: 1500 }),
            makeCommission({ id: 'c2', type: 'recurring', amount: 200 }),
            makeCommission({ id: 'c3', type: 'volume', amount: 500 }),
            makeCommission({ id: 'c4', type: 'bonus', amount: 1000 }),
        ];
        const summary = (0, commission_service_js_1.calculateSalarySummary)(commissions, 'self_employed', 10, 3);
        (0, vitest_1.expect)(summary.oneTimeCommissions).toBe(1500);
        (0, vitest_1.expect)(summary.recurringCommissions).toBe(200);
        (0, vitest_1.expect)(summary.volumeCommissions).toBe(500);
        (0, vitest_1.expect)(summary.bonuses).toBe(1000);
        (0, vitest_1.expect)(summary.grossTotal).toBe(3200);
    });
    (0, vitest_1.it)('should compute tax on gross total', () => {
        const commissions = [
            makeCommission({ type: 'one_time', amount: 10000 }),
        ];
        const summary = (0, commission_service_js_1.calculateSalarySummary)(commissions, 'self_employed', 5, 1);
        (0, vitest_1.expect)(summary.tax).toBeDefined();
        (0, vitest_1.expect)(summary.tax.grossIncome).toBe(10000);
        (0, vitest_1.expect)(summary.netTotal).toBe(summary.tax.netIncome);
    });
    (0, vitest_1.it)('should calculate conversion rate correctly', () => {
        const commissions = [
            makeCommission({ type: 'one_time', amount: 1000 }),
        ];
        const summary = (0, commission_service_js_1.calculateSalarySummary)(commissions, 'self_employed', 20, 5);
        (0, vitest_1.expect)(summary.conversionRate).toBe(25); // 5/20 * 100
    });
    (0, vitest_1.it)('should handle zero total policies without division by zero', () => {
        const commissions = [
            makeCommission({ type: 'one_time', amount: 1000 }),
        ];
        const summary = (0, commission_service_js_1.calculateSalarySummary)(commissions, 'self_employed', 0, 0);
        (0, vitest_1.expect)(summary.conversionRate).toBe(0);
    });
    (0, vitest_1.it)('should handle empty commissions array', () => {
        const summary = (0, commission_service_js_1.calculateSalarySummary)([], 'self_employed', 0, 0);
        (0, vitest_1.expect)(summary.grossTotal).toBe(0);
        (0, vitest_1.expect)(summary.period).toBe('');
    });
    (0, vitest_1.it)('should use period from first commission', () => {
        const commissions = [
            makeCommission({ period: '2026-03' }),
        ];
        const summary = (0, commission_service_js_1.calculateSalarySummary)(commissions, 'self_employed', 1, 1);
        (0, vitest_1.expect)(summary.period).toBe('2026-03');
    });
});
//# sourceMappingURL=commission.service.test.js.map