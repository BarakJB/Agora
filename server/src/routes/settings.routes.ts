import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { getPartnersSplitPct, setPartnersSplitPct } from '../repositories/mysql.repository.js';

export const settingsRouter = Router();

const partnersSplitBodySchema = z.object({
  pct: z.number().min(0).max(100),
});

type PartnersSplitBody = z.infer<typeof partnersSplitBodySchema>;

/**
 * GET /api/v1/settings/partners-split
 * Auth: required
 * Returns the partners split percentage for the authenticated agent.
 */
settingsRouter.get('/partners-split', async (_req, res, next) => {
  try {
    const agentId = (res.locals.sub || res.locals.agentId) as string;
    const pct = await getPartnersSplitPct(agentId);
    res.json({ data: { pct }, error: null, meta: null });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/settings/partners-split
 * Auth: required
 * Body: { pct: number }
 * Sets the partners split percentage for the authenticated agent.
 */
settingsRouter.put(
  '/partners-split',
  validate({ body: partnersSplitBodySchema }),
  async (req, res, next) => {
    try {
      const agentId = (res.locals.sub || res.locals.agentId) as string;
      const { pct } = req.body as PartnersSplitBody;
      await setPartnersSplitPct(agentId, pct);
      res.json({ data: { pct }, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);
