import { z } from 'zod';

const productTypeEnum = z.enum([
  'life_insurance',
  'managers_insurance',
  'pension',
  'provident_fund',
  'education_fund',
  'health',
  'general',
]);

const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export const dealPredictionBodySchema = z.object({
  agentId: z.string().uuid('agentId must be a valid UUID'),
  dealType: productTypeEnum,
  premiumAmount: z.number().positive('premiumAmount must be positive'),
  insuranceCompany: z.string().min(1, 'insuranceCompany is required'),
  startDate: z.string().regex(datePattern, 'startDate must be YYYY-MM-DD format'),
});

export const monthlyPredictionQuerySchema = z.object({
  agentId: z.string().uuid('agentId must be a valid UUID'),
  period: z.string().regex(periodPattern, 'period must be YYYY-MM format'),
});

export type DealPredictionBody = z.infer<typeof dealPredictionBodySchema>;
export type MonthlyPredictionQuery = z.infer<typeof monthlyPredictionQuerySchema>;
