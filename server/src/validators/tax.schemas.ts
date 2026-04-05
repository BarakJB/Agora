import { z } from 'zod';

export const taxStatusEnum = z.enum([
  'self_employed',
  'employee',
  'individual',
  'corporation',
]);

export const calculateTaxBodySchema = z.object({
  grossIncome: z.number({ required_error: 'grossIncome is required' }).positive('grossIncome must be > 0'),
  taxStatus: taxStatusEnum,
});

export type CalculateTaxBody = z.infer<typeof calculateTaxBodySchema>;
