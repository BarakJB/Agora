import { z } from 'zod';
export declare const registerBodySchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    phone: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    licenseNumber: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    agentId: z.ZodOptional<z.ZodString>;
    agencyId: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    taxId: z.ZodOptional<z.ZodString>;
    taxStatus: z.ZodDefault<z.ZodEnum<["self_employed", "employee", "individual", "corporation"]>>;
    niiRate: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
    phone: string;
    licenseNumber: string;
    agencyId: string;
    taxStatus: "self_employed" | "employee" | "individual" | "corporation";
    niiRate: number;
    agentId?: string | undefined;
    taxId?: string | undefined;
}, {
    name: string;
    email: string;
    password: string;
    phone?: string | undefined;
    licenseNumber?: string | undefined;
    agentId?: string | undefined;
    agencyId?: string | undefined;
    taxId?: string | undefined;
    taxStatus?: "self_employed" | "employee" | "individual" | "corporation" | undefined;
    niiRate?: number | undefined;
}>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
export declare const loginBodySchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginBody = z.infer<typeof loginBodySchema>;
//# sourceMappingURL=auth.schemas.d.ts.map