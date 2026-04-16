import { z } from 'zod';
export declare const createAgentBodySchema: z.ZodObject<{
    agentId: z.ZodString;
    agencyId: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    licenseNumber: z.ZodString;
    taxId: z.ZodString;
    taxStatus: z.ZodEnum<["self_employed", "employee", "individual", "corporation"]>;
    niiRate: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    phone: string;
    licenseNumber: string;
    agentId: string;
    agencyId: string;
    taxId: string;
    taxStatus: "self_employed" | "employee" | "individual" | "corporation";
    niiRate: number;
}, {
    name: string;
    email: string;
    phone: string;
    licenseNumber: string;
    agentId: string;
    agencyId: string;
    taxId: string;
    taxStatus: "self_employed" | "employee" | "individual" | "corporation";
    niiRate: number;
}>;
export declare const updateAgentBodySchema: z.ZodObject<{
    agentId: z.ZodOptional<z.ZodString>;
    agencyId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    licenseNumber: z.ZodOptional<z.ZodString>;
    taxId: z.ZodOptional<z.ZodString>;
    taxStatus: z.ZodOptional<z.ZodEnum<["self_employed", "employee", "individual", "corporation"]>>;
    niiRate: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    licenseNumber?: string | undefined;
    agentId?: string | undefined;
    agencyId?: string | undefined;
    taxId?: string | undefined;
    taxStatus?: "self_employed" | "employee" | "individual" | "corporation" | undefined;
    niiRate?: number | undefined;
}, {
    name?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    licenseNumber?: string | undefined;
    agentId?: string | undefined;
    agencyId?: string | undefined;
    taxId?: string | undefined;
    taxStatus?: "self_employed" | "employee" | "individual" | "corporation" | undefined;
    niiRate?: number | undefined;
}>;
export type CreateAgentBody = z.infer<typeof createAgentBodySchema>;
export type UpdateAgentBody = z.infer<typeof updateAgentBodySchema>;
//# sourceMappingURL=agent.schemas.d.ts.map