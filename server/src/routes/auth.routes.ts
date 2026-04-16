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
      const registrationMode = process.env.REGISTRATION_MODE || 'open';

      if (registrationMode === 'stripe_only') {
        const adminKey = req.headers['x-admin-key'] as string | undefined;
        const isAdminOverride = adminKey && adminKey === process.env.ADMIN_REGISTRATION_KEY;

        if (!isAdminOverride) {
          res.status(403).json({
            data: null,
            error: 'הרשמה ישירה אינה פעילה. יש להירשם דרך עמוד התשלום.',
            meta: null,
          });
          return;
        }
      }

      const body = req.body as RegisterBody;

      const agentId = body.agentId || `AG${Date.now().toString(36).toUpperCase()}`;
      const licenseNumber = body.licenseNumber || agentId;
      const taxId = body.taxId || agentId;

      const { isDuplicate, field } = await findAgentDuplicate(
        agentId, body.email, licenseNumber, body.phone ?? '', taxId,
      );
      if (isDuplicate) {
        const fieldMessages: Record<string, string> = {
          email: 'כתובת האימייל כבר רשומה במערכת',
          phone: 'מספר הטלפון כבר רשום במערכת',
          tax_id: 'ת.ז. כבר רשומה במערכת',
          agent_id: 'מספר סוכן כבר קיים במערכת',
          license_number: 'מספר רישיון כבר קיים במערכת',
        };
        const msg = field ? (fieldMessages[field] ?? 'סוכן כבר קיים במערכת') : 'סוכן כבר קיים במערכת';
        res.status(409).json({ data: null, error: msg, meta: null });
        return;
      }

      const id = uuid();
      const passwordHash = await hashPassword(body.password);
      const agent = await createAgentWithPassword(id, {
        agentId,
        agencyId: body.agencyId ?? 'AG-NEW',
        name: body.name,
        email: body.email,
        phone: body.phone ?? '',
        licenseNumber,
        taxId,
        taxStatus: body.taxStatus ?? 'self_employed',
        niiRate: body.niiRate ?? 17.83,
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

      // Check if user has sales data in DB — skip onboarding if they do
      const { getSalesTransactions } = await import('../repositories/sales.repository.js');
      const sales = await getSalesTransactions(agent.id);
      const hasSalesData = sales.length > 0;

      res.json({
        data: {
          agent: {
            id: agent.id,
            email: agent.email,
            name: agent.name,
            phone: (agent as Record<string, unknown>).phone || '',
            licenseNumber: (agent as Record<string, unknown>).licenseNumber || '',
            taxStatus: (agent as Record<string, unknown>).taxStatus || 'self_employed',
            agreementUploaded: (agent as Record<string, unknown>).agreementUploaded === 1 || hasSalesData,
            hasSalesData,
          },
          token,
        },
        error: null,
        meta: null,
      });
    } catch (err) {
      next(err);
    }
  },
);
