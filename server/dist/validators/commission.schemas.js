"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCommissionBodySchema = exports.createCommissionBodySchema = exports.commissionStatusEnum = exports.commissionSummaryQuerySchema = exports.commissionListQuerySchema = exports.commissionTypeEnum = void 0;
const zod_1 = require("zod");
const common_schemas_js_1 = require("./common.schemas.js");
exports.commissionTypeEnum = zod_1.z.enum([
    'one_time',
    'recurring',
    'volume',
    'bonus',
]);
const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
exports.commissionListQuerySchema = common_schemas_js_1.paginationQuerySchema.extend({
    period: zod_1.z.string().regex(periodPattern, 'period must be YYYY-MM format').optional(),
    type: exports.commissionTypeEnum.optional(),
});
exports.commissionSummaryQuerySchema = zod_1.z.object({
    period: zod_1.z
        .string()
        .regex(periodPattern, 'period must be YYYY-MM format')
        .default('2026-03'),
});
exports.commissionStatusEnum = zod_1.z.enum(['pending', 'paid', 'clawback']);
exports.createCommissionBodySchema = zod_1.z.object({
    policyId: zod_1.z.string().uuid('policyId must be a valid UUID'),
    agentId: zod_1.z.string().uuid('agentId must be a valid UUID'),
    type: exports.commissionTypeEnum,
    amount: zod_1.z.number().positive('amount must be positive'),
    rate: zod_1.z.number().min(0).max(100),
    premiumBase: zod_1.z.number().positive('premiumBase must be positive'),
    period: zod_1.z.string().regex(periodPattern, 'period must be YYYY-MM format'),
    paymentDate: zod_1.z.string().min(1, 'paymentDate is required'),
    insuranceCompany: zod_1.z.string().min(1, 'insuranceCompany is required'),
});
exports.updateCommissionBodySchema = zod_1.z.object({
    amount: zod_1.z.number().positive().optional(),
    rate: zod_1.z.number().min(0).max(100).optional(),
    status: exports.commissionStatusEnum.optional(),
    paymentDate: zod_1.z.string().optional(),
});
//# sourceMappingURL=commission.schemas.js.map