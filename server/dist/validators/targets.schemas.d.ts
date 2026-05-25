import { z } from 'zod';
export declare const upsertTargetSchema: z.ZodObject<{
    metric: z.ZodEnum<["total", "nifraim", "hekef", "accumulation"]>;
    period: z.ZodEnum<["monthly", "yearly"]>;
    targetAmount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    period: "monthly" | "yearly";
    metric: "nifraim" | "accumulation" | "total" | "hekef";
    targetAmount: number;
}, {
    period: "monthly" | "yearly";
    metric: "nifraim" | "accumulation" | "total" | "hekef";
    targetAmount: number;
}>;
export declare const progressQuerySchema: z.ZodObject<{
    month: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    month?: string | undefined;
}, {
    month?: string | undefined;
}>;
export type UpsertTargetBody = z.infer<typeof upsertTargetSchema>;
export type ProgressQuery = z.infer<typeof progressQuerySchema>;
//# sourceMappingURL=targets.schemas.d.ts.map