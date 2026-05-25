"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressQuerySchema = exports.upsertTargetSchema = void 0;
const zod_1 = require("zod");
exports.upsertTargetSchema = zod_1.z.object({
    metric: zod_1.z.enum(['total', 'nifraim', 'hekef', 'accumulation']),
    period: zod_1.z.enum(['monthly', 'yearly']),
    targetAmount: zod_1.z.number().positive(),
});
exports.progressQuerySchema = zod_1.z.object({
    month: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format')
        .optional(),
});
//# sourceMappingURL=targets.schemas.js.map