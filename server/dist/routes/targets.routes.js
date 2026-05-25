"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.targetsRouter = void 0;
const express_1 = require("express");
const targets_repository_js_1 = require("../repositories/targets.repository.js");
const target_suggestions_service_js_1 = require("../services/target-suggestions.service.js");
const target_progress_service_js_1 = require("../services/target-progress.service.js");
const validate_js_1 = require("../middleware/validate.js");
const targets_schemas_js_1 = require("../validators/targets.schemas.js");
exports.targetsRouter = (0, express_1.Router)();
exports.targetsRouter.get('/', async (_req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const targets = await (0, targets_repository_js_1.getTargets)(agentId);
        res.json({ data: targets, error: null, meta: { count: targets.length } });
    }
    catch (err) {
        next(err);
    }
});
exports.targetsRouter.put('/', (0, validate_js_1.validate)({ body: targets_schemas_js_1.upsertTargetSchema }), async (req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const { metric, period, targetAmount } = req.body;
        await (0, targets_repository_js_1.upsertTarget)(agentId, { metric, period, targetAmount });
        const targets = await (0, targets_repository_js_1.getTargets)(agentId);
        const updated = targets.find((t) => t.metric === metric && t.period === period);
        res.json({ data: updated ?? null, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.targetsRouter.delete('/:metric/:period', async (req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const metric = req.params.metric;
        const period = req.params.period;
        const validMetrics = ['total', 'nifraim', 'hekef', 'accumulation'];
        const validPeriods = ['monthly', 'yearly'];
        if (!validMetrics.includes(metric) || !validPeriods.includes(period)) {
            res.status(400).json({ data: null, error: 'Invalid metric or period', meta: null });
            return;
        }
        await (0, targets_repository_js_1.deleteTarget)(agentId, metric, period);
        res.json({ data: null, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.targetsRouter.get('/suggestions', async (_req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const suggestions = await (0, target_suggestions_service_js_1.getSuggestedTargets)(agentId);
        res.json({ data: suggestions, error: null, meta: { count: suggestions.length } });
    }
    catch (err) {
        next(err);
    }
});
exports.targetsRouter.get('/progress', (0, validate_js_1.validate)({ query: targets_schemas_js_1.progressQuerySchema }), async (_req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const { month } = res.locals.parsedQuery;
        const progress = await (0, target_progress_service_js_1.getCurrentProgress)(agentId, month);
        res.json({ data: progress, error: null, meta: { count: progress.length } });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=targets.routes.js.map