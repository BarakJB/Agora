import { z } from 'zod';
export declare const summaryByTypeQuerySchema: z.ZodObject<{
    month: z.ZodString;
    portfolioType: z.ZodDefault<z.ZodEnum<["personal", "partners", "all"]>>;
    compareToPrevMonth: z.ZodDefault<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
}, "strip", z.ZodTypeAny, {
    month: string;
    portfolioType: "personal" | "partners" | "all";
    compareToPrevMonth: boolean;
}, {
    month: string;
    portfolioType?: "personal" | "partners" | "all" | undefined;
    compareToPrevMonth?: "true" | "false" | undefined;
}>;
export type SummaryByTypeQuery = z.infer<typeof summaryByTypeQuerySchema>;
export declare const companyProductQuerySchema: z.ZodObject<{
    fromMonth: z.ZodOptional<z.ZodString>;
    toMonth: z.ZodOptional<z.ZodString>;
    portfolioType: z.ZodDefault<z.ZodEnum<["personal", "partners", "all"]>>;
}, "strip", z.ZodTypeAny, {
    portfolioType: "personal" | "partners" | "all";
    fromMonth?: string | undefined;
    toMonth?: string | undefined;
}, {
    portfolioType?: "personal" | "partners" | "all" | undefined;
    fromMonth?: string | undefined;
    toMonth?: string | undefined;
}>;
export type CompanyProductQuery = z.infer<typeof companyProductQuerySchema>;
export declare const contractCoverageQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
} & {
    month: z.ZodOptional<z.ZodString>;
    detailed: z.ZodDefault<z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">>;
    portfolioType: z.ZodDefault<z.ZodEnum<["personal", "partners", "all"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    portfolioType: "personal" | "partners" | "all";
    detailed: boolean;
    month?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    month?: string | undefined;
    portfolioType?: "personal" | "partners" | "all" | undefined;
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