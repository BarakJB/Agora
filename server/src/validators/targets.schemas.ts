import { z } from 'zod';

export const upsertTargetSchema = z.object({
  metric: z.enum(['total', 'nifraim', 'hekef', 'accumulation']),
  period: z.enum(['monthly', 'yearly']),
  targetAmount: z.number().positive(),
});

export const progressQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format')
    .optional(),
});

export type UpsertTargetBody = z.infer<typeof upsertTargetSchema>;
export type ProgressQuery = z.infer<typeof progressQuerySchema>;
