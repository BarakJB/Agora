import { describe, it, expect } from 'vitest';
import {
  calculateOneTimeCommission,
  calculateRecurringCommission,
  calculateVolumeCommission,
  generateCommissions,
  calculateSalarySummary,
} from '../commission.service.js';
import type { Policy, Commission } from '../../types/index.js';

function makePolicy(overrides: Partial<Policy> = {}): Policy {
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

function makeCommission(overrides: Partial<Commission> = {}): Commission {
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

describe('calculateOneTimeCommission', () => {
  it('should calculate one-time commission as premium * commissionPct / 100', () => {
    const policy = makePolicy({ premiumAmount: 10000, commissionPct: 15 });
    expect(calculateOneTimeCommission(policy)).toBe(1500);
  });

  it('should return 0 when commission percentage is 0', () => {
    const policy = makePolicy({ commissionPct: 0 });
    expect(calculateOneTimeCommission(policy)).toBe(0);
  });

  it('should handle fractional percentages', () => {
    const policy = makePolicy({ premiumAmount: 10000, commissionPct: 7.5 });
    expect(calculateOneTimeCommission(policy)).toBe(750);
  });
});

describe('calculateRecurringCommission', () => {
  it('should calculate recurring commission as premium * recurringPct / 100', () => {
    const policy = makePolicy({ premiumAmount: 10000, recurringPct: 2 });
    expect(calculateRecurringCommission(policy)).toBe(200);
  });

  it('should return 0 when recurringPct is 0', () => {
    const policy = makePolicy({ recurringPct: 0 });
    expect(calculateRecurringCommission(policy)).toBe(0);
  });

  it('should return 0 when recurringPct is negative', () => {
    const policy = makePolicy({ recurringPct: -1 });
    expect(calculateRecurringCommission(policy)).toBe(0);
  });
});

describe('calculateVolumeCommission', () => {
  it('should calculate volume commission from total annual premium', () => {
    const policy = makePolicy({ volumePct: 1 });
    expect(calculateVolumeCommission(policy, 500000)).toBe(5000);
  });

  it('should return 0 when volumePct is 0', () => {
    const policy = makePolicy({ volumePct: 0 });
    expect(calculateVolumeCommission(policy, 500000)).toBe(0);
  });

  it('should return 0 when volumePct is negative', () => {
    const policy = makePolicy({ volumePct: -1 });
    expect(calculateVolumeCommission(policy, 500000)).toBe(0);
  });
});

describe('generateCommissions', () => {
  it('should generate one-time commission for new policy in the matching period', () => {
    const policy = makePolicy({ startDate: '2026-03-15', commissionPct: 15, recurringPct: 0 });
    const commissions = generateCommissions(policy, '2026-03');
    expect(commissions).toHaveLength(1);
    expect(commissions[0].type).toBe('one_time');
    expect(commissions[0].amount).toBe(1500);
  });

  it('should not generate one-time commission for policy from a different period', () => {
    const policy = makePolicy({ startDate: '2026-01-15', recurringPct: 0 });
    const commissions = generateCommissions(policy, '2026-03');
    expect(commissions).toHaveLength(0);
  });

  it('should generate recurring commission for active policy with recurringPct > 0', () => {
    const policy = makePolicy({ startDate: '2026-01-15', recurringPct: 2, status: 'active' });
    const commissions = generateCommissions(policy, '2026-03');
    expect(commissions).toHaveLength(1);
    expect(commissions[0].type).toBe('recurring');
    expect(commissions[0].amount).toBe(200);
  });

  it('should not generate recurring commission for cancelled policy', () => {
    const policy = makePolicy({ startDate: '2026-01-15', recurringPct: 2, status: 'cancelled' });
    const commissions = generateCommissions(policy, '2026-03');
    expect(commissions).toHaveLength(0);
  });

  it('should generate both one-time and recurring for new active policy', () => {
    const policy = makePolicy({ startDate: '2026-03-15', recurringPct: 2, status: 'active' });
    const commissions = generateCommissions(policy, '2026-03');
    expect(commissions).toHaveLength(2);
    const types = commissions.map((c) => c.type);
    expect(types).toContain('one_time');
    expect(types).toContain('recurring');
  });

  it('should set correct fields on generated commissions', () => {
    const policy = makePolicy({ startDate: '2026-03-15', recurringPct: 0 });
    const commissions = generateCommissions(policy, '2026-03');
    const comm = commissions[0];
    expect(comm.policyId).toBe(policy.id);
    expect(comm.agentId).toBe(policy.agentId);
    expect(comm.period).toBe('2026-03');
    expect(comm.status).toBe('pending');
    expect(comm.insuranceCompany).toBe(policy.insuranceCompany);
    expect(comm.id).toBeTruthy();
  });
});

describe('calculateSalarySummary', () => {
  it('should aggregate commissions by type', () => {
    const commissions: Commission[] = [
      makeCommission({ type: 'one_time', amount: 1500 }),
      makeCommission({ id: 'c2', type: 'recurring', amount: 200 }),
      makeCommission({ id: 'c3', type: 'volume', amount: 500 }),
      makeCommission({ id: 'c4', type: 'bonus', amount: 1000 }),
    ];

    const summary = calculateSalarySummary(commissions, 'self_employed', 10, 3);
    expect(summary.oneTimeCommissions).toBe(1500);
    expect(summary.recurringCommissions).toBe(200);
    expect(summary.volumeCommissions).toBe(500);
    expect(summary.bonuses).toBe(1000);
    expect(summary.grossTotal).toBe(3200);
  });

  it('should compute tax on gross total', () => {
    const commissions: Commission[] = [
      makeCommission({ type: 'one_time', amount: 10000 }),
    ];
    const summary = calculateSalarySummary(commissions, 'self_employed', 5, 1);
    expect(summary.tax).toBeDefined();
    expect(summary.tax.grossIncome).toBe(10000);
    expect(summary.netTotal).toBe(summary.tax.netIncome);
  });

  it('should calculate conversion rate correctly', () => {
    const commissions: Commission[] = [
      makeCommission({ type: 'one_time', amount: 1000 }),
    ];
    const summary = calculateSalarySummary(commissions, 'self_employed', 20, 5);
    expect(summary.conversionRate).toBe(25); // 5/20 * 100
  });

  it('should handle zero total policies without division by zero', () => {
    const commissions: Commission[] = [
      makeCommission({ type: 'one_time', amount: 1000 }),
    ];
    const summary = calculateSalarySummary(commissions, 'self_employed', 0, 0);
    expect(summary.conversionRate).toBe(0);
  });

  it('should handle empty commissions array', () => {
    const summary = calculateSalarySummary([], 'self_employed', 0, 0);
    expect(summary.grossTotal).toBe(0);
    expect(summary.period).toBe('');
  });

  it('should use period from first commission', () => {
    const commissions: Commission[] = [
      makeCommission({ period: '2026-03' }),
    ];
    const summary = calculateSalarySummary(commissions, 'self_employed', 1, 1);
    expect(summary.period).toBe('2026-03');
  });
});
