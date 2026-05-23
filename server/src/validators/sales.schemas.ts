import { z } from 'zod';
import { paginationQuerySchema } from './common.schemas.js';

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export const contractCoverageQuerySchema = paginationQuerySchema.extend({
  month: z
    .string()
    .regex(monthPattern, 'month must be YYYY-MM format')
    .optional(),
  detailed: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
});

export type ContractCoverageQuery = z.infer<typeof contractCoverageQuerySchema>;
