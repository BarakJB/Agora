import { Router } from 'express';
import {
  getTargets,
  upsertTarget,
  deleteTarget,
  type TargetMetric,
  type TargetPeriod,
} from '../repositories/targets.repository.js';
import { getSuggestedTargets } from '../services/target-suggestions.service.js';
import { getCurrentProgress } from '../services/target-progress.service.js';
import { validate } from '../middleware/validate.js';
import {
  upsertTargetSchema,
  progressQuerySchema,
  type UpsertTargetBody,
  type ProgressQuery,
} from '../validators/targets.schemas.js';

export const targetsRouter = Router();

targetsRouter.get('/', async (_req, res, next) => {
  try {
    const agentId = (res.locals.sub || res.locals.agentId) as string;
    const targets = await getTargets(agentId);
    res.json({ data: targets, error: null, meta: { count: targets.length } });
  } catch (err) {
    next(err);
  }
});

targetsRouter.put('/', validate({ body: upsertTargetSchema }), async (req, res, next) => {
  try {
    const agentId = (res.locals.sub || res.locals.agentId) as string;
    const { metric, period, targetAmount } = req.body as UpsertTargetBody;

    await upsertTarget(agentId, { metric, period, targetAmount });

    const targets = await getTargets(agentId);
    const updated = targets.find((t) => t.metric === metric && t.period === period);

    res.json({ data: updated ?? null, error: null, meta: null });
  } catch (err) {
    next(err);
  }
});

targetsRouter.delete('/:metric/:period', async (req, res, next) => {
  try {
    const agentId = (res.locals.sub || res.locals.agentId) as string;
    const metric = req.params.metric as TargetMetric;
    const period = req.params.period as TargetPeriod;

    const validMetrics: TargetMetric[] = ['total', 'nifraim', 'hekef', 'accumulation'];
    const validPeriods: TargetPeriod[] = ['monthly', 'yearly'];

    if (!validMetrics.includes(metric) || !validPeriods.includes(period)) {
      res.status(400).json({ data: null, error: 'Invalid metric or period', meta: null });
      return;
    }

    await deleteTarget(agentId, metric, period);
    res.json({ data: null, error: null, meta: null });
  } catch (err) {
    next(err);
  }
});

targetsRouter.get('/suggestions', async (_req, res, next) => {
  try {
    const agentId = (res.locals.sub || res.locals.agentId) as string;
    const suggestions = await getSuggestedTargets(agentId);
    res.json({ data: suggestions, error: null, meta: { count: suggestions.length } });
  } catch (err) {
    next(err);
  }
});

targetsRouter.get(
  '/progress',
  validate({ query: progressQuerySchema }),
  async (_req, res, next) => {
    try {
      const agentId = (res.locals.sub || res.locals.agentId) as string;
      const { month } = res.locals.parsedQuery as ProgressQuery;

      const progress = await getCurrentProgress(agentId, month);
      res.json({ data: progress, error: null, meta: { count: progress.length } });
    } catch (err) {
      next(err);
    }
  },
);
