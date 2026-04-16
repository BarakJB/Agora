import { z } from 'zod';
export declare const commissionTypeEnum: z.ZodEnum<["one_time", "recurring", "volume", "bonus"]>;
export declare const commissionListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
} & {
    period: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["one_time", "recurring", "volume", "bonus"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    type?: "one_time" | "recurring" | "volume" | "bonus" | undefined;
    period?: string | undefined;
}, {
    type?: "one_time" | "recurring" | "volume" | "bonus" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    period?: string | undefined;
}>;
export declare const commissionSummaryQuerySchema: z.ZodObject<{
    period: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    period: string;
}, {
    period?: string | undefined;
}>;
export declare const commissionStatusEnum: z.ZodEnum<["pending", "paid", "clawback"]>;
export declare const createCommissionBodySchema: z.ZodObject<{
    policyId: z.ZodString;
    agentId: z.ZodString;
    type: z.ZodEnum<["one_time", "recurring", "volume", "bonus"]>;
    amount: z.ZodNumber;
    rate: z.ZodNumber;
    premiumBase: z.ZodNumber;
    period: z.ZodString;
    paymentDate: z.ZodString;
    insuranceCompany: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentId: string;
    type: "one_time" | "recurring" | "volume" | "bonus";
    amount: number;
    rate: number;
    period: string;
    paymentDate: string;
    policyId: string;
    insuranceCompany: string;
    premiumBase: number;
}, {
    agentId: string;
    type: "one_time" | "recurring" | "volume" | "bonus";
    amount: number;
    rate: number;
    period: string;
    paymentDate: string;
    policyId: string;
    insuranceCompany: string;
    premiumBase: number;
}>;
export declare const updateCommissionBodySchema: z.ZodObject<{
    amount: z.ZodOptional<z.ZodNumber>;
    rate: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["pending", "paid", "clawback"]>>;
    paymentDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "pending" | "paid" | "clawback" | undefined;
    amount?: number | undefined;
    rate?: number | undefined;
    paymentDate?: string | undefined;
}, {
    status?: "pending" | "paid" | "clawback" | undefined;
    amount?: number | undefined;
    rate?: number | undefined;
    paymentDate?: string | undefined;
}>;
export type CommissionListQuery = z.infer<typeof commissionListQuerySchema>;
export type CommissionSummaryQuery = z.infer<typeof commissionSummaryQuerySchema>;
export type CreateCommissionBody = z.infer<typeof createCommissionBodySchema>;
export type UpdateCommissionBody = z.infer<typeof updateCommissionBodySchema>;
//# sourceMappingURL=commission.schemas.d.ts.map