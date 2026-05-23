import { z } from 'zod';
export declare const chatBodySchema: z.ZodObject<{
    message: z.ZodString;
    conversationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    conversationId?: string | undefined;
}, {
    message: string;
    conversationId?: string | undefined;
}>;
export declare const conversationIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type ChatBody = z.infer<typeof chatBodySchema>;
export type ConversationIdParam = z.infer<typeof conversationIdParamSchema>;
//# sourceMappingURL=advisor.schemas.d.ts.map