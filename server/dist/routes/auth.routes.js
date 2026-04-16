"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const validate_js_1 = require("../middleware/validate.js");
const auth_schemas_js_1 = require("../validators/auth.schemas.js");
const mysql_repository_js_1 = require("../repositories/mysql.repository.js");
const auth_service_js_1 = require("../services/auth.service.js");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/register', (0, validate_js_1.validate)({ body: auth_schemas_js_1.registerBodySchema }), async (req, res, next) => {
    try {
        const registrationMode = process.env.REGISTRATION_MODE || 'open';
        if (registrationMode === 'stripe_only') {
            const adminKey = req.headers['x-admin-key'];
            const isAdminOverride = adminKey && adminKey === process.env.ADMIN_REGISTRATION_KEY;
            if (!isAdminOverride) {
                res.status(403).json({
                    data: null,
                    error: 'הרשמה ישירה אינה פעילה. יש להירשם דרך עמוד התשלום.',
                    meta: null,
                });
                return;
            }
        }
        const body = req.body;
        const agentId = body.agentId || `AG${Date.now().toString(36).toUpperCase()}`;
        const licenseNumber = body.licenseNumber || agentId;
        const taxId = body.taxId || agentId;
        const { isDuplicate, field } = await (0, mysql_repository_js_1.findAgentDuplicate)(agentId, body.email, licenseNumber, body.phone ?? '', taxId);
        if (isDuplicate) {
            const fieldMessages = {
                email: 'כתובת האימייל כבר רשומה במערכת',
                phone: 'מספר הטלפון כבר רשום במערכת',
                tax_id: 'ת.ז. כבר רשומה במערכת',
                agent_id: 'מספר סוכן כבר קיים במערכת',
                license_number: 'מספר רישיון כבר קיים במערכת',
            };
            const msg = field ? (fieldMessages[field] ?? 'סוכן כבר קיים במערכת') : 'סוכן כבר קיים במערכת';
            res.status(409).json({ data: null, error: msg, meta: null });
            return;
        }
        const id = (0, uuid_1.v4)();
        const passwordHash = await (0, auth_service_js_1.hashPassword)(body.password);
        const agent = await (0, mysql_repository_js_1.createAgentWithPassword)(id, {
            agentId,
            agencyId: body.agencyId ?? 'AG-NEW',
            name: body.name,
            email: body.email,
            phone: body.phone ?? '',
            licenseNumber,
            taxId,
            taxStatus: body.taxStatus ?? 'self_employed',
            niiRate: body.niiRate ?? 17.83,
            passwordHash,
        });
        const token = (0, auth_service_js_1.signToken)({ agentId: agent.agentId, sub: agent.id });
        res.status(201).json({
            data: { agent, token },
            error: null,
            meta: null,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.authRouter.post('/login', (0, validate_js_1.validate)({ body: auth_schemas_js_1.loginBodySchema }), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const agent = await (0, mysql_repository_js_1.findAgentByEmail)(email);
        if (!agent || !agent.passwordHash) {
            res.status(401).json({ data: null, error: 'Invalid email or password', meta: null });
            return;
        }
        const valid = await (0, auth_service_js_1.verifyPassword)(password, agent.passwordHash);
        if (!valid) {
            res.status(401).json({ data: null, error: 'Invalid email or password', meta: null });
            return;
        }
        const token = (0, auth_service_js_1.signToken)({ agentId: agent.id, sub: agent.id });
        // Check if user has sales data in DB — skip onboarding if they do
        const { getSalesTransactions } = await import('../repositories/sales.repository.js');
        const sales = await getSalesTransactions(agent.id);
        const hasSalesData = sales.length > 0;
        res.json({
            data: {
                agent: {
                    id: agent.id,
                    email: agent.email,
                    name: agent.name,
                    phone: agent.phone || '',
                    licenseNumber: agent.licenseNumber || '',
                    taxStatus: agent.taxStatus || 'self_employed',
                    agreementUploaded: agent.agreementUploaded === 1 || hasSalesData,
                    hasSalesData,
                },
                token,
            },
            error: null,
            meta: null,
        });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=auth.routes.js.map