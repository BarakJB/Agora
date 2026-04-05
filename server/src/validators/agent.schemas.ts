import { z } from 'zod';

export const createAgentBodySchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
  agencyId: z.string().min(1, 'agencyId is required'),
  name: z.string().min(1, 'name is required'),
  email: z.string().email('invalid email'),
  phone: z.string().min(1, 'phone is required'),
  licenseNumber: z.string().min(1, 'licenseNumber is required'),
  taxId: z.string().min(1, 'taxId is required'),
  taxStatus: z.enum(['self_employed', 'employee', 'individual', 'corporation']),
  niiRate: z.number().min(0).max(100),
});

export const updateAgentBodySchema = createAgentBodySchema.partial();

export type CreateAgentBody = z.infer<typeof createAgentBodySchema>;
export type UpdateAgentBody = z.infer<typeof updateAgentBodySchema>;
