"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commissionRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const mysql_repository_js_1 = require("../repositories/mysql.repository.js");
const commission_service_js_1 = require("../services/commission.service.js");
const validate_js_1 = require("../middleware/validate.js");
const common_schemas_js_1 = require("../validators/common.schemas.js");
const commission_schemas_js_1 = require("../validators/commission.schemas.js");
exports.commissionRouter = (0, express_1.Router)();
exports.commissionRouter.get('/', (0, validate_js_1.validate)({ query: commission_schemas_js_1.commissionListQuerySchema }), async (req, res, next) => {
    try {
        const { page, limit, period, type } = res.locals.parsedQuery;
        const { data, total } = await (0, mysql_repository_js_1.getCommissions)({ period, type, page, limit });
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
exports.commissionRouter.get('/summary', (0, validate_js_1.validate)({ query: commission_schemas_js_1.commissionSummaryQuerySchema }), async (req, res, next) => {
    try {
        const { period } = res.locals.parsedQuery;
        const [commissions, totalPolicies, newPolicies, agents] = await Promise.all([
            (0, mysql_repository_js_1.getCommissionsByPeriod)(period),
            (0, mysql_repository_js_1.countPolicies)(),
            (0, mysql_repository_js_1.countNewPolicies)(period),
            (0, mysql_repository_js_1.getAllAgents)(),
        ]);
        const taxStatus = agents[0]?.taxStatus ?? 'self_employed';
        const summary = (0, commission_service_js_1.calculateSalarySummary)(commissions, taxStatus, totalPolicies, newPolicies);
        res.json({ data: summary, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.commissionRouter.get('/by-company', async (_req, res, next) => {
    try {
        const data = await (0, mysql_repository_js_1.getCommissionsByCompany)();
        res.json({ data, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.commissionRouter.get('/:id', (0, validate_js_1.validate)({ params: common_schemas_js_1.idParamSchema }), async (req, res, next) => {
    try {
        const commission = await (0, mysql_repository_js_1.getCommissionById)(req.params.id);
        if (!commission) {
            res.status(404).json({ data: null, error: 'Commission not found', meta: null });
            return;
        }
        res.json({ data: commission, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.commissionRouter.post('/', (0, validate_js_1.validate)({ body: commission_schemas_js_1.createCommissionBodySchema }), async (req, res, next) => {
    try {
        const body = req.body;
        const policy = await (0, mysql_repository_js_1.getPolicyById)(body.policyId);
        if (!policy) {
            res.status(400).json({ data: null, error: 'Policy not found', meta: null });
            return;
        }
        const agent = await (0, mysql_repository_js_1.getAgentById)(body.agentId);
        if (!agent) {
            res.status(400).json({ data: null, error: 'Agent not found', meta: null });
            return;
        }
        const id = (0, uuid_1.v4)();
        const commission = await (0, mysql_repository_js_1.createCommission)(id, body);
        if (!commission) {
            res.status(400).json({ data: null, error: 'Insurance company not found', meta: null });
            return;
        }
        res.status(201).json({ data: commission, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.commissionRouter.put('/:id', (0, validate_js_1.validate)({ params: common_schemas_js_1.idParamSchema, body: commission_schemas_js_1.updateCommissionBodySchema }), async (req, res, next) => {
    try {
        const id = req.params.id;
        const existing = await (0, mysql_repository_js_1.getCommissionById)(id);
        if (!existing) {
            res.status(404).json({ data: null, error: 'Commission not found', meta: null });
            return;
        }
        const body = req.body;
        const updated = await (0, mysql_repository_js_1.updateCommission)(id, body);
        res.json({ data: updated, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.commissionRouter.delete('/:id', (0, validate_js_1.validate)({ params: common_schemas_js_1.idParamSchema }), async (req, res, next) => {
    try {
        const id = req.params.id;
        const status = await (0, mysql_repository_js_1.getCommissionStatusById)(id);
        if (!status) {
            res.status(404).json({ data: null, error: 'Commission not found', meta: null });
            return;
        }
        if (status === 'clawback') {
            res.status(409).json({ data: null, error: 'Commission already voided', meta: null });
            return;
        }
        const voided = await (0, mysql_repository_js_1.updateCommission)(id, { status: 'clawback' });
        res.json({ data: voided, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=commission.routes.js.map