"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationIdParamSchema = exports.chatBodySchema = void 0;
const zod_1 = require("zod");
exports.chatBodySchema = zod_1.z.object({
    message: zod_1.z.string().min(1, 'message is required').max(2000, 'message must not exceed 2000 characters'),
    conversationId: zod_1.z.string().uuid('conversationId must be a valid UUID').optional(),
});
exports.conversationIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('id must be a valid UUID'),
});
//# sourceMappingURL=advisor.schemas.js.map