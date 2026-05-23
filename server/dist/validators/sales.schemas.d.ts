import { z } from 'zod';
export declare const contractCoverageQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
} & {
    month: z.ZodOptional<z.ZodString>;
    detailed: z.ZodDefault<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    detailed: boolean;
    month?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    month?: string | undefined;
    detailed?: "true" | "false" | undefined;
}>;
export type ContractCoverageQuery = z.infer<typeof contractCoverageQuerySchema>;
//# sourceMappingURL=sales.schemas.d.ts.map