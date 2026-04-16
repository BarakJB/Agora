"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictionRouter = void 0;
const express_1 = require("express");
const salary_prediction_service_js_1 = require("../services/salary-prediction.service.js");
const validate_js_1 = require("../middleware/validate.js");
const prediction_schemas_js_1 = require("../validators/prediction.schemas.js");
exports.predictionRouter = (0, express_1.Router)();
/**
 * POST /api/v1/predictions/deal
 * Predict the salary impact of a new deal.
 */
exports.predictionRouter.post('/deal', (0, validate_js_1.validate)({ body: prediction_schemas_js_1.dealPredictionBodySchema }), async (req, res, next) => {
    try {
        const body = req.body;
        const prediction = await (0, salary_prediction_service_js_1.predictDealImpact)(body);
        if (!prediction) {
            res.status(400).json({
                data: null,
                error: 'Could not generate prediction — check agent and deal details',
                meta: null,
            });
            return;
        }
        res.json({ data: prediction, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/predictions/monthly?agentId=...&period=YYYY-MM
 * Full monthly salary prediction for an agent.
 */
exports.predictionRouter.get('/monthly', (0, validate_js_1.validate)({ query: prediction_schemas_js_1.monthlyPredictionQuerySchema }), async (_req, res, next) => {
    try {
        const { agentId, period } = res.locals.parsedQuery;
        const prediction = await (0, salary_prediction_service_js_1.predictMonthlySalary)(agentId, period);
        if (!prediction) {
            res.status(404).json({
                data: null,
                error: 'Agent not found',
                meta: null,
            });
            return;
        }
        res.json({ data: prediction, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=prediction.routes.js.map