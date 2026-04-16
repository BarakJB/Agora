import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import {
  getAllAgents,
  getAgentById,
  findAgentDuplicate,
  createAgent,
  updateAgent,
  softDeleteAgent,
} from '../repositories/mysql.repository.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.schemas.js';
import {
  createAgentBodySchema,
  updateAgentBodySchema,
  type CreateAgentBody,
  type UpdateAgentBody,
} from '../validators/agent.schemas.js';

export const agentRouter = Router();

agentRouter.get('/', async (_req, res, next) => {
  try {
    const agents = await getAllAgents();
    res.json({ data: agents, error: null, meta: { total: agents.length } });
  } catch (err) {
    next(err);
  }
});

agentRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const agent = await getAgentById(req.params.id as string);
      if (!agent) {
        res.status(404).json({ data: null, error: 'Agent not found', meta: null });
        return;
      }
      res.json({ data: agent, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

agentRouter.post(
  '/',
  validate({ body: createAgentBodySchema }),
  async (req, res, next) => {
    try {
      const body = req.body as CreateAgentBody;

      const { isDuplicate } = await findAgentDuplicate(
        body.agentId, body.email, body.licenseNumber, body.phone ?? '', body.taxId ?? '',
      );
      if (isDuplicate) {
        res.status(409).json({ data: null, error: 'Agent with this agentId, email, or licenseNumber already exists', meta: null });
        return;
      }

      const id = uuid();
      const agent = await createAgent(id, body);
      res.status(201).json({ data: agent, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

agentRouter.put(
  '/:id',
  validate({ params: idParamSchema, body: updateAgentBodySchema }),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const existing = await getAgentById(id);
      if (!existing) {
        res.status(404).json({ data: null, error: 'Agent not found', meta: null });
        return;
      }

      const body = req.body as UpdateAgentBody;
      const updated = await updateAgent(id, body);
      res.json({ data: updated, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

agentRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const existing = await getAgentById(id);
      if (!existing) {
        res.status(404).json({ data: null, error: 'Agent not found', meta: null });
        return;
      }

      const deleted = await softDeleteAgent(id);
      res.json({ data: deleted, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);
