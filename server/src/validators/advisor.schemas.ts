import { z } from 'zod';

export const chatBodySchema = z.object({
  message: z.string().min(1, 'message is required').max(2000, 'message must not exceed 2000 characters'),
  conversationId: z.string().uuid('conversationId must be a valid UUID').optional(),
});

export const conversationIdParamSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export type ChatBody = z.infer<typeof chatBodySchema>;
export type ConversationIdParam = z.infer<typeof conversationIdParamSchema>;
