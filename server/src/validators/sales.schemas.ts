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
  portfolioType: z
    .enum(['personal', 'partners', 'all'])
    .default('all'),
});

export type ContractCoverageQuery = z.infer<typeof contractCoverageQuerySchema>;

export const INSURANCE_COMPANY_MAP = {
  harel: 'הראל',
  menora: 'מנורה מבטחים',
  phoenix: 'הפניקס',
  analyst: 'אנליסט',
  migdal: 'מגדל',
  clal: 'כלל',
  hachshara: 'הכשרה',
  altshuler: 'אלטשולר שחם',
  meitav: 'מיטב דש',
  psagot: 'פסגות',
  yashir: 'ביטוח ישיר',
} as const;

export type InsuranceCompanyCode = keyof typeof INSURANCE_COMPANY_MAP;

export const assignCompanySchema = z
  .object({
    insuredId: z.string().min(1).optional(),
    policyNumber: z.string().min(1).optional(),
    insuranceCompany: z.enum([
      'harel',
      'menora',
      'phoenix',
      'analyst',
      'migdal',
      'clal',
      'hachshara',
      'altshuler',
      'meitav',
      'psagot',
      'yashir',
    ]),
  })
  .refine((data) => data.insuredId !== undefined || data.policyNumber !== undefined, {
    message: 'at least one of insuredId or policyNumber is required',
    path: ['insuredId'],
  });

export type AssignCompanyBody = z.infer<typeof assignCompanySchema>;
