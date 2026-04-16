import { z } from 'zod';
export declare const dealPredictionBodySchema: z.ZodObject<{
    agentId: z.ZodString;
    dealType: z.ZodEnum<["life_insurance", "managers_insurance", "pension", "provident_fund", "education_fund", "health", "general"]>;
    premiumAmount: z.ZodNumber;
    insuranceCompany: z.ZodString;
    startDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentId: string;
    premiumAmount: number;
    startDate: string;
    insuranceCompany: string;
    dealType: "life_insurance" | "managers_insurance" | "pension" | "provident_fund" | "education_fund" | "health" | "general";
}, {
    agentId: string;
    premiumAmount: number;
    startDate: string;
    insuranceCompany: string;
    dealType: "life_insurance" | "managers_insurance" | "pension" | "provident_fund" | "education_fund" | "health" | "general";
}>;
export declare const monthlyPredictionQuerySchema: z.ZodObject<{
    agentId: z.ZodString;
    period: z.ZodString;
}, "strip", z.ZodTypeAny, {
    agentId: string;
    period: string;
}, {
    agentId: string;
    period: string;
}>;
export type DealPredictionBody = z.infer<typeof dealPredictionBodySchema>;
export type MonthlyPredictionQuery = z.infer<typeof monthlyPredictionQuerySchema>;
//# sourceMappingURL=prediction.schemas.d.ts.map