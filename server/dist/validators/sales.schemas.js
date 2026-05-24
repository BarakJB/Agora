"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignCompanySchema = exports.INSURANCE_COMPANY_MAP = exports.contractCoverageQuerySchema = void 0;
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
    portfolioType: zod_1.z
        .enum(['personal', 'partners', 'all'])
        .default('all'),
});
exports.INSURANCE_COMPANY_MAP = {
    harel: 'הראל',
    menora: 'מנורה מבטחים',
    phoenix: 'הפניקס',
    analyst: 'אנליסט',
    migdal: 'מגדל',
    clal: 'כלל',
    hachshara: 'הכשרה',
    altshuler: 'אלטשולר שחם',
    meitav: 'מיטב דש',
    psagot: 'פסגות',
    yashir: 'ביטוח ישיר',
};
exports.assignCompanySchema = zod_1.z
    .object({
    insuredId: zod_1.z.string().min(1).optional(),
    policyNumber: zod_1.z.string().min(1).optional(),
    insuranceCompany: zod_1.z.enum([
        'harel',
        'menora',
        'phoenix',
        'analyst',
        'migdal',
        'clal',
        'hachshara',
        'altshuler',
        'meitav',
        'psagot',
        'yashir',
    ]),
})
    .refine((data) => data.insuredId !== undefined || data.policyNumber !== undefined, {
    message: 'at least one of insuredId or policyNumber is required',
    path: ['insuredId'],
});
//# sourceMappingURL=sales.schemas.js.map