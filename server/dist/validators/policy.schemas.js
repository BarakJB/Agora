"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePolicyBodySchema = exports.createPolicyBodySchema = exports.policyStatusEnum = exports.premiumFrequencyEnum = exports.policyListQuerySchema = exports.productTypeEnum = void 0;
const zod_1 = require("zod");
const common_schemas_js_1 = require("./common.schemas.js");
exports.productTypeEnum = zod_1.z.enum([
    'life_insurance',
    'managers_insurance',
    'pension',
    'provident_fund',
    'education_fund',
    'health',
    'general',
]);
exports.policyListQuerySchema = common_schemas_js_1.paginationQuerySchema.extend({
    type: exports.productTypeEnum.optional(),
    company: zod_1.z.string().optional(),
});
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
exports.premiumFrequencyEnum = zod_1.z.enum([
    'monthly',
    'quarterly',
    'annual',
    'one_time',
]);
exports.policyStatusEnum = zod_1.z.enum([
    'active',
    'cancelled',
    'pending',
    'suspended',
]);
exports.createPolicyBodySchema = zod_1.z.object({
    agentId: zod_1.z.string().uuid('agentId must be a valid UUID'),
    policyId: zod_1.z.string().min(1, 'policyId is required'),
    productType: exports.productTypeEnum,
    clientName: zod_1.z.string().min(1, 'clientName is required'),
    clientId: zod_1.z.string().min(1, 'clientId is required'),
    startDate: zod_1.z.string().regex(datePattern, 'startDate must be YYYY-MM-DD'),
    premiumAmount: zod_1.z.number().positive('premiumAmount must be positive'),
    premiumFrequency: exports.premiumFrequencyEnum.default('monthly'),
    commissionPct: zod_1.z.number().min(0).max(100),
    recurringPct: zod_1.z.number().min(0).max(100).default(0),
    volumePct: zod_1.z.number().min(0).max(100).default(0),
    contractId: zod_1.z.string().nullable().default(null),
    insuranceCompany: zod_1.z.string().min(1, 'insuranceCompany is required'),
});
exports.updatePolicyBodySchema = zod_1.z.object({
    status: exports.policyStatusEnum.optional(),
    cancelDate: zod_1.z.string().regex(datePattern, 'cancelDate must be YYYY-MM-DD').nullable().optional(),
    premiumAmount: zod_1.z.number().positive().optional(),
    premiumFrequency: exports.premiumFrequencyEnum.optional(),
    commissionPct: zod_1.z.number().min(0).max(100).optional(),
    recurringPct: zod_1.z.number().min(0).max(100).optional(),
    volumePct: zod_1.z.number().min(0).max(100).optional(),
    contractId: zod_1.z.string().nullable().optional(),
});
//# sourceMappingURL=policy.schemas.js.map