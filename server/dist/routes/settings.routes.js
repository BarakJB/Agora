"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_js_1 = require("../middleware/validate.js");
const mysql_repository_js_1 = require("../repositories/mysql.repository.js");
exports.settingsRouter = (0, express_1.Router)();
const partnersSplitBodySchema = zod_1.z.object({
    pct: zod_1.z.number().min(0).max(100),
});
/**
 * GET /api/v1/settings/partners-split
 * Auth: required
 * Returns the partners split percentage for the authenticated agent.
 */
exports.settingsRouter.get('/partners-split', async (_req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const pct = await (0, mysql_repository_js_1.getPartnersSplitPct)(agentId);
        res.json({ data: { pct }, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
/**
 * PUT /api/v1/settings/partners-split
 * Auth: required
 * Body: { pct: number }
 * Sets the partners split percentage for the authenticated agent.
 */
exports.settingsRouter.put('/partners-split', (0, validate_js_1.validate)({ body: partnersSplitBodySchema }), async (req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const { pct } = req.body;
        await (0, mysql_repository_js_1.setPartnersSplitPct)(agentId, pct);
        res.json({ data: { pct }, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=settings.routes.js.map