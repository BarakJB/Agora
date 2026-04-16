import { z } from 'zod';
export declare const uploadListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type UploadListQuery = z.infer<typeof uploadListQuerySchema>;
//# sourceMappingURL=upload.schemas.d.ts.map