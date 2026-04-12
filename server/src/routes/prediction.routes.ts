import { Router } from 'express';
import { predictDealImpact, predictMonthlySalary } from '../services/salary-prediction.service.js';
import { validate } from '../middleware/validate.js';
import {
  dealPredictionBodySchema,
  monthlyPredictionQuerySchema,
  type DealPredictionBody,
  type MonthlyPredictionQuery,
} from '../validators/prediction.schemas.js';

export const predictionRouter = Router();

/**
 * POST /api/v1/predictions/deal
 * Predict the salary impact of a new deal.
 */
predictionRouter.post(
  '/deal',
  validate({ body: dealPredictionBodySchema }),
  async (req, res, next) => {
    try {
      const body = req.body as DealPredictionBody;
      const prediction = await predictDealImpact(body);

      if (!prediction) {
        res.status(400).json({
          data: null,
          error: 'Could not generate prediction — check agent and deal details',
          meta: null,
        });
        return;
      }

      res.json({ data: prediction, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/predictions/monthly?agentId=...&period=YYYY-MM
 * Full monthly salary prediction for an agent.
 */
predictionRouter.get(
  '/monthly',
  validate({ query: monthlyPredictionQuerySchema }),
  async (_req, res, next) => {
    try {
      const { agentId, period } = res.locals.parsedQuery as MonthlyPredictionQuery;
      const prediction = await predictMonthlySalary(agentId, period);

      if (!prediction) {
        res.status(404).json({
          data: null,
          error: 'Agent not found',
          meta: null,
        });
        return;
      }

      res.json({ data: prediction, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);
