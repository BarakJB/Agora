"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monthlyPredictionQuerySchema = exports.dealPredictionBodySchema = void 0;
const zod_1 = require("zod");
const productTypeEnum = zod_1.z.enum([
    'life_insurance',
    'managers_insurance',
    'pension',
    'provident_fund',
    'education_fund',
    'health',
    'general',
]);
const datePattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
exports.dealPredictionBodySchema = zod_1.z.object({
    agentId: zod_1.z.string().uuid('agentId must be a valid UUID'),
    dealType: productTypeEnum,
    premiumAmount: zod_1.z.number().positive('premiumAmount must be positive'),
    insuranceCompany: zod_1.z.string().min(1, 'insuranceCompany is required'),
    startDate: zod_1.z.string().regex(datePattern, 'startDate must be YYYY-MM-DD format'),
});
exports.monthlyPredictionQuerySchema = zod_1.z.object({
    agentId: zod_1.z.string().uuid('agentId must be a valid UUID'),
    period: zod_1.z.string().regex(periodPattern, 'period must be YYYY-MM format'),
});
//# sourceMappingURL=prediction.schemas.js.map