import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import {
  getCommissions,
  getCommissionsByPeriod,
  getCommissionsByCompany,
  getCommissionById,
  getCommissionStatusById,
  getAllAgents,
  getAgentById,
  getPolicyById,
  countPolicies,
  countNewPolicies,
  createCommission,
  updateCommission,
} from '../repositories/mysql.repository.js';
import { calculateSalarySummary } from '../services/commission.service.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.schemas.js';
import {
  commissionListQuerySchema,
  commissionSummaryQuerySchema,
  createCommissionBodySchema,
  updateCommissionBodySchema,
  type CommissionListQuery,
  type CommissionSummaryQuery,
  type CreateCommissionBody,
  type UpdateCommissionBody,
} from '../validators/commission.schemas.js';

export const commissionRouter = Router();

commissionRouter.get(
  '/',
  validate({ query: commissionListQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, limit, period, type } = res.locals.parsedQuery as CommissionListQuery;
      const { data, total } = await getCommissions({ period, type, page, limit });

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

commissionRouter.get(
  '/summary',
  validate({ query: commissionSummaryQuerySchema }),
  async (req, res, next) => {
    try {
      const { period } = res.locals.parsedQuery as CommissionSummaryQuery;

      const [commissions, totalPolicies, newPolicies, agents] = await Promise.all([
        getCommissionsByPeriod(period),
        countPolicies(),
        countNewPolicies(period),
        getAllAgents(),
      ]);

      const taxStatus = agents[0]?.taxStatus ?? 'self_employed';
      const summary = calculateSalarySummary(commissions, taxStatus, totalPolicies, newPolicies);

      res.json({ data: summary, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

commissionRouter.get('/by-company', async (_req, res, next) => {
  try {
    const data = await getCommissionsByCompany();
    res.json({ data, error: null, meta: null });
  } catch (err) {
    next(err);
  }
});

commissionRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const commission = await getCommissionById(req.params.id as string);
      if (!commission) {
        res.status(404).json({ data: null, error: 'Commission not found', meta: null });
        return;
      }
      res.json({ data: commission, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

commissionRouter.post(
  '/',
  validate({ body: createCommissionBodySchema }),
  async (req, res, next) => {
    try {
      const body = req.body as CreateCommissionBody;

      const policy = await getPolicyById(body.policyId);
      if (!policy) {
        res.status(400).json({ data: null, error: 'Policy not found', meta: null });
        return;
      }

      const agent = await getAgentById(body.agentId);
      if (!agent) {
        res.status(400).json({ data: null, error: 'Agent not found', meta: null });
        return;
      }

      const id = uuid();
      const commission = await createCommission(id, body);
      if (!commission) {
        res.status(400).json({ data: null, error: 'Insurance company not found', meta: null });
        return;
      }
      res.status(201).json({ data: commission, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

commissionRouter.put(
  '/:id',
  validate({ params: idParamSchema, body: updateCommissionBodySchema }),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const existing = await getCommissionById(id);
      if (!existing) {
        res.status(404).json({ data: null, error: 'Commission not found', meta: null });
        return;
      }

      const body = req.body as UpdateCommissionBody;
      const updated = await updateCommission(id, body);
      res.json({ data: updated, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

commissionRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const status = await getCommissionStatusById(id);
      if (!status) {
        res.status(404).json({ data: null, error: 'Commission not found', meta: null });
        return;
      }

      if (status === 'clawback') {
        res.status(409).json({ data: null, error: 'Commission already voided', meta: null });
        return;
      }

      const voided = await updateCommission(id, { status: 'clawback' });
      res.json({ data: voided, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);
