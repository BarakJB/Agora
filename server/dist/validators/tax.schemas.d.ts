import { z } from 'zod';
export declare const taxStatusEnum: z.ZodEnum<["self_employed", "employee", "individual", "corporation"]>;
export declare const calculateTaxBodySchema: z.ZodObject<{
    grossIncome: z.ZodNumber;
    taxStatus: z.ZodEnum<["self_employed", "employee", "individual", "corporation"]>;
}, "strip", z.ZodTypeAny, {
    taxStatus: "self_employed" | "employee" | "individual" | "corporation";
    grossIncome: number;
}, {
    taxStatus: "self_employed" | "employee" | "individual" | "corporation";
    grossIncome: number;
}>;
export type CalculateTaxBody = z.infer<typeof calculateTaxBodySchema>;
//# sourceMappingURL=tax.schemas.d.ts.map