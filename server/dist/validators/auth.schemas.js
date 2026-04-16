"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginBodySchema = exports.registerBodySchema = void 0;
const zod_1 = require("zod");
exports.registerBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'שם הוא שדה חובה').max(100),
    email: zod_1.z.string().email('כתובת אימייל לא תקינה').max(255),
    password: zod_1.z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים').max(128),
    phone: zod_1.z.string().max(20).optional().default(''),
    licenseNumber: zod_1.z.string().max(30).optional().default(''),
    agentId: zod_1.z.string().max(20).optional(),
    agencyId: zod_1.z.string().max(20).optional().default('AG-NEW'),
    taxId: zod_1.z.string().max(20).optional(),
    taxStatus: zod_1.z.enum(['self_employed', 'employee', 'individual', 'corporation']).default('self_employed'),
    niiRate: zod_1.z.number().min(0).max(100).default(17.83),
});
exports.loginBodySchema = zod_1.z.object({
    email: zod_1.z.string().email('כתובת אימייל לא תקינה'),
    password: zod_1.z.string().min(1, 'סיסמה היא שדה חובה'),
});
//# sourceMappingURL=auth.schemas.js.map