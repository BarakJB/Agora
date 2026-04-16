"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const mysql_repository_js_1 = require("../repositories/mysql.repository.js");
const validate_js_1 = require("../middleware/validate.js");
const common_schemas_js_1 = require("../validators/common.schemas.js");
const agent_schemas_js_1 = require("../validators/agent.schemas.js");
exports.agentRouter = (0, express_1.Router)();
exports.agentRouter.get('/', async (_req, res, next) => {
    try {
        const agents = await (0, mysql_repository_js_1.getAllAgents)();
        res.json({ data: agents, error: null, meta: { total: agents.length } });
    }
    catch (err) {
        next(err);
    }
});
exports.agentRouter.get('/:id', (0, validate_js_1.validate)({ params: common_schemas_js_1.idParamSchema }), async (req, res, next) => {
    try {
        const agent = await (0, mysql_repository_js_1.getAgentById)(req.params.id);
        if (!agent) {
            res.status(404).json({ data: null, error: 'Agent not found', meta: null });
            return;
        }
        res.json({ data: agent, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.agentRouter.post('/', (0, validate_js_1.validate)({ body: agent_schemas_js_1.createAgentBodySchema }), async (req, res, next) => {
    try {
        const body = req.body;
        const { isDuplicate } = await (0, mysql_repository_js_1.findAgentDuplicate)(body.agentId, body.email, body.licenseNumber, body.phone ?? '', body.taxId ?? '');
        if (isDuplicate) {
            res.status(409).json({ data: null, error: 'Agent with this agentId, email, or licenseNumber already exists', meta: null });
            return;
        }
        const id = (0, uuid_1.v4)();
        const agent = await (0, mysql_repository_js_1.createAgent)(id, body);
        res.status(201).json({ data: agent, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.agentRouter.put('/:id', (0, validate_js_1.validate)({ params: common_schemas_js_1.idParamSchema, body: agent_schemas_js_1.updateAgentBodySchema }), async (req, res, next) => {
    try {
        const id = req.params.id;
        const existing = await (0, mysql_repository_js_1.getAgentById)(id);
        if (!existing) {
            res.status(404).json({ data: null, error: 'Agent not found', meta: null });
            return;
        }
        const body = req.body;
        const updated = await (0, mysql_repository_js_1.updateAgent)(id, body);
        res.json({ data: updated, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.agentRouter.delete('/:id', (0, validate_js_1.validate)({ params: common_schemas_js_1.idParamSchema }), async (req, res, next) => {
    try {
        const id = req.params.id;
        const existing = await (0, mysql_repository_js_1.getAgentById)(id);
        if (!existing) {
            res.status(404).json({ data: null, error: 'Agent not found', meta: null });
            return;
        }
        const deleted = await (0, mysql_repository_js_1.softDeleteAgent)(id);
        res.json({ data: deleted, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=agent.routes.js.map