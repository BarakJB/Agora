import { z } from 'zod';
import { paginationQuerySchema } from './common.schemas.js';

export const clientsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  portfolioType: z.enum(['personal', 'partners', 'all']).default('all'),
});

export type ClientsQuery = z.infer<typeof clientsQuerySchema>;

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export const summaryByTypeQuerySchema = z.object({
  month: z.string().regex(monthPattern, 'month must be YYYY-MM format'),
  portfolioType: z.enum(['personal', 'partners', 'all']).default('all'),
  compareToPrevMonth: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
});

export type SummaryByTypeQuery = z.infer<typeof summaryByTypeQuerySchema>;

export const companyProductQuerySchema = z.object({
  fromMonth: z.string().regex(monthPattern, 'fromMonth must be YYYY-MM format').optional(),
  toMonth: z.string().regex(monthPattern, 'toMonth must be YYYY-MM format').optional(),
  portfolioType: z.enum(['personal', 'partners', 'all']).default('all'),
});

export type CompanyProductQuery = z.infer<typeof companyProductQuerySchema>;

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
