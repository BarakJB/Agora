import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { validate } from '../middleware/validate.js';
import { registerBodySchema, loginBodySchema, type RegisterBody, type LoginBody } from '../validators/auth.schemas.js';
import { findAgentDuplicate, findAgentByEmail, createAgentWithPassword } from '../repositories/mysql.repository.js';
import { hashPassword, verifyPassword, signToken } from '../services/auth.service.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate({ body: registerBodySchema }),
  async (req, res, next) => {
    try {
      const body = req.body as RegisterBody;

      const exists = await findAgentDuplicate(body.agentId, body.email, body.licenseNumber);
      if (exists) {
        res.status(409).json({ data: null, error: 'Agent with this agentId, email, or licenseNumber already exists', meta: null });
        return;
      }

      const id = uuid();
      const passwordHash = await hashPassword(body.password);
      const agent = await createAgentWithPassword(id, {
        agentId: body.agentId,
        agencyId: body.agencyId,
        name: body.name,
        email: body.email,
        phone: body.phone ?? '',
        licenseNumber: body.licenseNumber,
        taxId: body.taxId,
        taxStatus: body.taxStatus,
        niiRate: body.niiRate,
        passwordHash,
      });

      const token = signToken({ agentId: agent.agentId, sub: agent.id });

      res.status(201).json({
        data: { agent, token },
        error: null,
        meta: null,
      });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/login',
  validate({ body: loginBodySchema }),
  async (req, res, next) => {
    try {
      const { email, password } = req.body as LoginBody;

      const agent = await findAgentByEmail(email);
      if (!agent || !agent.passwordHash) {
        res.status(401).json({ data: null, error: 'Invalid email or password', meta: null });
        return;
      }

      const valid = await verifyPassword(password, agent.passwordHash);
      if (!valid) {
        res.status(401).json({ data: null, error: 'Invalid email or password', meta: null });
        return;
      }

      const token = signToken({ agentId: agent.id, sub: agent.id });

      res.json({
        data: { agent: { id: agent.id, email: agent.email, name: agent.name }, token },
        error: null,
        meta: null,
      });
    } catch (err) {
      next(err);
    }
  },
);
