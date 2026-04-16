"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const mysql_repository_js_1 = require("../repositories/mysql.repository.js");
const validate_js_1 = require("../middleware/validate.js");
const common_schemas_js_1 = require("../validators/common.schemas.js");
const policy_schemas_js_1 = require("../validators/policy.schemas.js");
exports.policyRouter = (0, express_1.Router)();
// Static routes BEFORE parameterized routes
exports.policyRouter.get('/stats/summary', async (_req, res, next) => {
    try {
        const stats = await (0, mysql_repository_js_1.getPolicyStats)();
        res.json({ data: stats, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.policyRouter.get('/', (0, validate_js_1.validate)({ query: policy_schemas_js_1.policyListQuerySchema }), async (req, res, next) => {
    try {
        const { page, limit, type, company } = res.locals.parsedQuery;
        const { data, total } = await (0, mysql_repository_js_1.getPolicies)({ type, company, page, limit });
        res.json({
            data,
            error: null,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.policyRouter.get('/:id', (0, validate_js_1.validate)({ params: common_schemas_js_1.idParamSchema }), async (req, res, next) => {
    try {
        const policy = await (0, mysql_repository_js_1.getPolicyById)(req.params.id);
        if (!policy) {
            res.status(404).json({ data: null, error: 'Policy not found', meta: null });
            return;
        }
        res.json({ data: policy, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.policyRouter.post('/', (0, validate_js_1.validate)({ body: policy_schemas_js_1.createPolicyBodySchema }), async (req, res, next) => {
    try {
        const body = req.body;
        const agent = await (0, mysql_repository_js_1.getAgentById)(body.agentId);
        if (!agent) {
            res.status(400).json({ data: null, error: 'Agent not found', meta: null });
            return;
        }
        const id = (0, uuid_1.v4)();
        const policy = await (0, mysql_repository_js_1.createPolicy)(id, body);
        if (!policy) {
            res.status(400).json({ data: null, error: 'Insurance company not found', meta: null });
            return;
        }
        res.status(201).json({ data: policy, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.policyRouter.put('/:id', (0, validate_js_1.validate)({ params: common_schemas_js_1.idParamSchema, body: policy_schemas_js_1.updatePolicyBodySchema }), async (req, res, next) => {
    try {
        const id = req.params.id;
        const existing = await (0, mysql_repository_js_1.getPolicyById)(id);
        if (!existing) {
            res.status(404).json({ data: null, error: 'Policy not found', meta: null });
            return;
        }
        const body = req.body;
        const updated = await (0, mysql_repository_js_1.updatePolicy)(id, body);
        res.json({ data: updated, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.policyRouter.delete('/:id', (0, validate_js_1.validate)({ params: common_schemas_js_1.idParamSchema }), async (req, res, next) => {
    try {
        const id = req.params.id;
        const status = await (0, mysql_repository_js_1.getPolicyStatusById)(id);
        if (!status) {
            res.status(404).json({ data: null, error: 'Policy not found', meta: null });
            return;
        }
        if (status === 'cancelled') {
            res.status(409).json({ data: null, error: 'Policy already cancelled', meta: null });
            return;
        }
        const cancelled = await (0, mysql_repository_js_1.updatePolicy)(id, {
            status: 'cancelled',
            cancelDate: new Date().toISOString().substring(0, 10),
        });
        res.json({ data: cancelled, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=policy.routes.js.map