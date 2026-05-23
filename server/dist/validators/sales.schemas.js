"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractCoverageQuerySchema = void 0;
const zod_1 = require("zod");
const common_schemas_js_1 = require("./common.schemas.js");
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
exports.contractCoverageQuerySchema = common_schemas_js_1.paginationQuerySchema.extend({
    month: zod_1.z
        .string()
        .regex(monthPattern, 'month must be YYYY-MM format')
        .optional(),
    detailed: zod_1.z
        .enum(['true', 'false'])
        .transform((v) => v === 'true')
        .default('false'),
});
//# sourceMappingURL=sales.schemas.js.map