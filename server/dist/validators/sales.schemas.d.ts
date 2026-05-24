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
export declare const INSURANCE_COMPANY_MAP: {
    readonly harel: "הראל";
    readonly menora: "מנורה מבטחים";
    readonly phoenix: "הפניקס";
    readonly analyst: "אנליסט";
    readonly migdal: "מגדל";
    readonly clal: "כלל";
    readonly hachshara: "הכשרה";
    readonly altshuler: "אלטשולר שחם";
    readonly meitav: "מיטב דש";
    readonly psagot: "פסגות";
    readonly yashir: "ביטוח ישיר";
};
export type InsuranceCompanyCode = keyof typeof INSURANCE_COMPANY_MAP;
export declare const assignCompanySchema: z.ZodEffects<z.ZodObject<{
    insuredId: z.ZodOptional<z.ZodString>;
    policyNumber: z.ZodOptional<z.ZodString>;
    insuranceCompany: z.ZodEnum<["harel", "menora", "phoenix", "analyst", "migdal", "clal", "hachshara", "altshuler", "meitav", "psagot", "yashir"]>;
}, "strip", z.ZodTypeAny, {
    insuranceCompany: "harel" | "menora" | "phoenix" | "analyst" | "migdal" | "clal" | "hachshara" | "altshuler" | "meitav" | "psagot" | "yashir";
    insuredId?: string | undefined;
    policyNumber?: string | undefined;
}, {
    insuranceCompany: "harel" | "menora" | "phoenix" | "analyst" | "migdal" | "clal" | "hachshara" | "altshuler" | "meitav" | "psagot" | "yashir";
    insuredId?: string | undefined;
    policyNumber?: string | undefined;
}>, {
    insuranceCompany: "harel" | "menora" | "phoenix" | "analyst" | "migdal" | "clal" | "hachshara" | "altshuler" | "meitav" | "psagot" | "yashir";
    insuredId?: string | undefined;
    policyNumber?: string | undefined;
}, {
    insuranceCompany: "harel" | "menora" | "phoenix" | "analyst" | "migdal" | "clal" | "hachshara" | "altshuler" | "meitav" | "psagot" | "yashir";
    insuredId?: string | undefined;
    policyNumber?: string | undefined;
}>;
export type AssignCompanyBody = z.infer<typeof assignCompanySchema>;
//# sourceMappingURL=sales.schemas.d.ts.map