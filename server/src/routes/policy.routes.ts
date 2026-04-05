import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import {
  getPolicies,
  getPolicyById,
  getPolicyStats,
  getAgentById,
  createPolicy,
  updatePolicy,
  getPolicyStatusById,
} from '../repositories/mysql.repository.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.schemas.js';
import {
  policyListQuerySchema,
  createPolicyBodySchema,
  updatePolicyBodySchema,
  type PolicyListQuery,
  type CreatePolicyBody,
  type UpdatePolicyBody,
} from '../validators/policy.schemas.js';

export const policyRouter = Router();

// Static routes BEFORE parameterized routes
policyRouter.get('/stats/summary', async (_req, res, next) => {
  try {
    const stats = await getPolicyStats();
    res.json({ data: stats, error: null, meta: null });
  } catch (err) {
    next(err);
  }
});

policyRouter.get(
  '/',
  validate({ query: policyListQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, limit, type, company } = res.locals.parsedQuery as PolicyListQuery;
      const { data, total } = await getPolicies({ type, company, page, limit });

      res.json({
        data,
        error: null,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  },
);

policyRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const policy = await getPolicyById(req.params.id as string);
      if (!policy) {
        res.status(404).json({ data: null, error: 'Policy not found', meta: null });
        return;
      }
      res.json({ data: policy, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

policyRouter.post(
  '/',
  validate({ body: createPolicyBodySchema }),
  async (req, res, next) => {
    try {
      const body = req.body as CreatePolicyBody;

      const agent = await getAgentById(body.agentId);
      if (!agent) {
        res.status(400).json({ data: null, error: 'Agent not found', meta: null });
        return;
      }

      const id = uuid();
      const policy = await createPolicy(id, body);
      if (!policy) {
        res.status(400).json({ data: null, error: 'Insurance company not found', meta: null });
        return;
      }
      res.status(201).json({ data: policy, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

policyRouter.put(
  '/:id',
  validate({ params: idParamSchema, body: updatePolicyBodySchema }),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const existing = await getPolicyById(id);
      if (!existing) {
        res.status(404).json({ data: null, error: 'Policy not found', meta: null });
        return;
      }

      const body = req.body as UpdatePolicyBody;
      const updated = await updatePolicy(id, body);
      res.json({ data: updated, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

policyRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const status = await getPolicyStatusById(id);
      if (!status) {
        res.status(404).json({ data: null, error: 'Policy not found', meta: null });
        return;
      }

      if (status === 'cancelled') {
        res.status(409).json({ data: null, error: 'Policy already cancelled', meta: null });
        return;
      }

      const cancelled = await updatePolicy(id, {
        status: 'cancelled',
        cancelDate: new Date().toISOString().substring(0, 10),
      });
      res.json({ data: cancelled, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);
