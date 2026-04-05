import { z } from 'zod';
import { paginationQuerySchema } from './common.schemas.js';

export const productTypeEnum = z.enum([
  'life_insurance',
  'managers_insurance',
  'pension',
  'provident_fund',
  'education_fund',
  'health',
  'general',
]);

export const policyListQuerySchema = paginationQuerySchema.extend({
  type: productTypeEnum.optional(),
  company: z.string().optional(),
});

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const premiumFrequencyEnum = z.enum([
  'monthly',
  'quarterly',
  'annual',
  'one_time',
]);

export const policyStatusEnum = z.enum([
  'active',
  'cancelled',
  'pending',
  'suspended',
]);

export const createPolicyBodySchema = z.object({
  agentId: z.string().uuid('agentId must be a valid UUID'),
  policyId: z.string().min(1, 'policyId is required'),
  productType: productTypeEnum,
  clientName: z.string().min(1, 'clientName is required'),
  clientId: z.string().min(1, 'clientId is required'),
  startDate: z.string().regex(datePattern, 'startDate must be YYYY-MM-DD'),
  premiumAmount: z.number().positive('premiumAmount must be positive'),
  premiumFrequency: premiumFrequencyEnum.default('monthly'),
  commissionPct: z.number().min(0).max(100),
  recurringPct: z.number().min(0).max(100).default(0),
  volumePct: z.number().min(0).max(100).default(0),
  contractId: z.string().nullable().default(null),
  insuranceCompany: z.string().min(1, 'insuranceCompany is required'),
});

export const updatePolicyBodySchema = z.object({
  status: policyStatusEnum.optional(),
  cancelDate: z.string().regex(datePattern, 'cancelDate must be YYYY-MM-DD').nullable().optional(),
  premiumAmount: z.number().positive().optional(),
  premiumFrequency: premiumFrequencyEnum.optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  recurringPct: z.number().min(0).max(100).optional(),
  volumePct: z.number().min(0).max(100).optional(),
  contractId: z.string().nullable().optional(),
});

export type PolicyListQuery = z.infer<typeof policyListQuerySchema>;
export type CreatePolicyBody = z.infer<typeof createPolicyBodySchema>;
export type UpdatePolicyBody = z.infer<typeof updatePolicyBodySchema>;
