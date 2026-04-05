import type { Policy, Commission, SalarySummary } from '../types/index.js';
import { calculateTax } from './tax.service.js';
import { v4 as uuid } from 'uuid';

export function calculateOneTimeCommission(policy: Policy): number {
  return policy.premiumAmount * (policy.commissionPct / 100);
}

export function calculateRecurringCommission(policy: Policy): number {
  if (policy.recurringPct <= 0) return 0;
  return policy.premiumAmount * (policy.recurringPct / 100);
}

export function calculateVolumeCommission(policy: Policy, totalAnnualPremium: number): number {
  if (policy.volumePct <= 0) return 0;
  return totalAnnualPremium * (policy.volumePct / 100);
}

export function generateCommissions(policy: Policy, period: string): Commission[] {
  const commissions: Commission[] = [];
  const now = new Date().toISOString();

  // One-time commission (only for new policies in this period)
  if (policy.startDate.startsWith(period)) {
    commissions.push({
      id: uuid(),
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
      id: uuid(),
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

export function calculateSalarySummary(
  commissions: Commission[],
  taxStatus: 'self_employed' | 'employee' | 'individual' | 'corporation',
  totalPolicies: number,
  newPoliciesCount: number,
): SalarySummary {
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
  const tax = calculateTax(grossTotal, taxStatus);

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
