"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTaxBodySchema = exports.taxStatusEnum = void 0;
const zod_1 = require("zod");
exports.taxStatusEnum = zod_1.z.enum([
    'self_employed',
    'employee',
    'individual',
    'corporation',
]);
exports.calculateTaxBodySchema = zod_1.z.object({
    grossIncome: zod_1.z.number({ required_error: 'grossIncome is required' }).positive('grossIncome must be > 0'),
    taxStatus: exports.taxStatusEnum,
});
//# sourceMappingURL=tax.schemas.js.map