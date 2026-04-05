import { z } from 'zod';
import { paginationQuerySchema } from './common.schemas.js';

export const commissionTypeEnum = z.enum([
  'one_time',
  'recurring',
  'volume',
  'bonus',
]);

const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export const commissionListQuerySchema = paginationQuerySchema.extend({
  period: z.string().regex(periodPattern, 'period must be YYYY-MM format').optional(),
  type: commissionTypeEnum.optional(),
});

export const commissionSummaryQuerySchema = z.object({
  period: z
    .string()
    .regex(periodPattern, 'period must be YYYY-MM format')
    .default('2026-03'),
});

export const commissionStatusEnum = z.enum(['pending', 'paid', 'clawback']);

export const createCommissionBodySchema = z.object({
  policyId: z.string().uuid('policyId must be a valid UUID'),
  agentId: z.string().uuid('agentId must be a valid UUID'),
  type: commissionTypeEnum,
  amount: z.number().positive('amount must be positive'),
  rate: z.number().min(0).max(100),
  premiumBase: z.number().positive('premiumBase must be positive'),
  period: z.string().regex(periodPattern, 'period must be YYYY-MM format'),
  paymentDate: z.string().min(1, 'paymentDate is required'),
  insuranceCompany: z.string().min(1, 'insuranceCompany is required'),
});

export const updateCommissionBodySchema = z.object({
  amount: z.number().positive().optional(),
  rate: z.number().min(0).max(100).optional(),
  status: commissionStatusEnum.optional(),
  paymentDate: z.string().optional(),
});

export type CommissionListQuery = z.infer<typeof commissionListQuerySchema>;
export type CommissionSummaryQuery = z.infer<typeof commissionSummaryQuerySchema>;
export type CreateCommissionBody = z.infer<typeof createCommissionBodySchema>;
export type UpdateCommissionBody = z.infer<typeof updateCommissionBodySchema>;
