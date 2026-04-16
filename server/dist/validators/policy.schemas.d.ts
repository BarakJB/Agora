import { z } from 'zod';
export declare const productTypeEnum: z.ZodEnum<["life_insurance", "managers_insurance", "pension", "provident_fund", "education_fund", "health", "general"]>;
export declare const policyListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
} & {
    type: z.ZodOptional<z.ZodEnum<["life_insurance", "managers_insurance", "pension", "provident_fund", "education_fund", "health", "general"]>>;
    company: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    type?: "life_insurance" | "managers_insurance" | "pension" | "provident_fund" | "education_fund" | "health" | "general" | undefined;
    company?: string | undefined;
}, {
    type?: "life_insurance" | "managers_insurance" | "pension" | "provident_fund" | "education_fund" | "health" | "general" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    company?: string | undefined;
}>;
export declare const premiumFrequencyEnum: z.ZodEnum<["monthly", "quarterly", "annual", "one_time"]>;
export declare const policyStatusEnum: z.ZodEnum<["active", "cancelled", "pending", "suspended"]>;
export declare const createPolicyBodySchema: z.ZodObject<{
    agentId: z.ZodString;
    policyId: z.ZodString;
    productType: z.ZodEnum<["life_insurance", "managers_insurance", "pension", "provident_fund", "education_fund", "health", "general"]>;
    clientName: z.ZodString;
    clientId: z.ZodString;
    startDate: z.ZodString;
    premiumAmount: z.ZodNumber;
    premiumFrequency: z.ZodDefault<z.ZodEnum<["monthly", "quarterly", "annual", "one_time"]>>;
    commissionPct: z.ZodNumber;
    recurringPct: z.ZodDefault<z.ZodNumber>;
    volumePct: z.ZodDefault<z.ZodNumber>;
    contractId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    insuranceCompany: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentId: string;
    premiumAmount: number;
    premiumFrequency: "monthly" | "quarterly" | "annual" | "one_time";
    commissionPct: number;
    recurringPct: number;
    volumePct: number;
    contractId: string | null;
    policyId: string;
    productType: "life_insurance" | "managers_insurance" | "pension" | "provident_fund" | "education_fund" | "health" | "general";
    clientName: string;
    clientId: string;
    startDate: string;
    insuranceCompany: string;
}, {
    agentId: string;
    premiumAmount: number;
    commissionPct: number;
    policyId: string;
    productType: "life_insurance" | "managers_insurance" | "pension" | "provident_fund" | "education_fund" | "health" | "general";
    clientName: string;
    clientId: string;
    startDate: string;
    insuranceCompany: string;
    premiumFrequency?: "monthly" | "quarterly" | "annual" | "one_time" | undefined;
    recurringPct?: number | undefined;
    volumePct?: number | undefined;
    contractId?: string | null | undefined;
}>;
export declare const updatePolicyBodySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["active", "cancelled", "pending", "suspended"]>>;
    cancelDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    premiumAmount: z.ZodOptional<z.ZodNumber>;
    premiumFrequency: z.ZodOptional<z.ZodEnum<["monthly", "quarterly", "annual", "one_time"]>>;
    commissionPct: z.ZodOptional<z.ZodNumber>;
    recurringPct: z.ZodOptional<z.ZodNumber>;
    volumePct: z.ZodOptional<z.ZodNumber>;
    contractId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "cancelled" | "pending" | "suspended" | undefined;
    cancelDate?: string | null | undefined;
    premiumAmount?: number | undefined;
    premiumFrequency?: "monthly" | "quarterly" | "annual" | "one_time" | undefined;
    commissionPct?: number | undefined;
    recurringPct?: number | undefined;
    volumePct?: number | undefined;
    contractId?: string | null | undefined;
}, {
    status?: "active" | "cancelled" | "pending" | "suspended" | undefined;
    cancelDate?: string | null | undefined;
    premiumAmount?: number | undefined;
    premiumFrequency?: "monthly" | "quarterly" | "annual" | "one_time" | undefined;
    commissionPct?: number | undefined;
    recurringPct?: number | undefined;
    volumePct?: number | undefined;
    contractId?: string | null | undefined;
}>;
export type PolicyListQuery = z.infer<typeof policyListQuerySchema>;
export type CreatePolicyBody = z.infer<typeof createPolicyBodySchema>;
export type UpdatePolicyBody = z.infer<typeof updatePolicyBodySchema>;
//# sourceMappingURL=policy.schemas.d.ts.map