import { z } from 'zod';

export const registerBodySchema = z.object({
  agentId: z.string().min(1).max(20),
  agencyId: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  phone: z.string().max(20).optional().default(''),
  licenseNumber: z.string().min(1).max(30),
  taxId: z.string().min(1).max(20),
  taxStatus: z.enum(['self_employed', 'employee', 'individual', 'corporation']).default('self_employed'),
  niiRate: z.number().min(0).max(100).default(17.83),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
