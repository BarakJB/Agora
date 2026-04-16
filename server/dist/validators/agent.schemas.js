"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAgentBodySchema = exports.createAgentBodySchema = void 0;
const zod_1 = require("zod");
exports.createAgentBodySchema = zod_1.z.object({
    agentId: zod_1.z.string().min(1, 'agentId is required'),
    agencyId: zod_1.z.string().min(1, 'agencyId is required'),
    name: zod_1.z.string().min(1, 'name is required'),
    email: zod_1.z.string().email('invalid email'),
    phone: zod_1.z.string().min(1, 'phone is required'),
    licenseNumber: zod_1.z.string().min(1, 'licenseNumber is required'),
    taxId: zod_1.z.string().min(1, 'taxId is required'),
    taxStatus: zod_1.z.enum(['self_employed', 'employee', 'individual', 'corporation']),
    niiRate: zod_1.z.number().min(0).max(100),
});
exports.updateAgentBodySchema = exports.createAgentBodySchema.partial();
//# sourceMappingURL=agent.schemas.js.map