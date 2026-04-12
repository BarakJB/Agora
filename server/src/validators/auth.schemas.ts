import { z } from 'zod';

export const registerBodySchema = z.object({
  name: z.string().min(1, 'שם הוא שדה חובה').max(100),
  email: z.string().email('כתובת אימייל לא תקינה').max(255),
  password: z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים').max(128),
  phone: z.string().max(20).optional().default(''),
  licenseNumber: z.string().max(30).optional().default(''),
  agentId: z.string().max(20).optional(),
  agencyId: z.string().max(20).optional().default('AG-NEW'),
  taxId: z.string().max(20).optional(),
  taxStatus: z.enum(['self_employed', 'employee', 'individual', 'corporation']).default('self_employed'),
  niiRate: z.number().min(0).max(100).default(17.83),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(1, 'סיסמה היא שדה חובה'),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
