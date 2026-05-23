import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createRateLimit } from '../middleware/rateLimit.middleware.js';
import { chatBodySchema, conversationIdParamSchema } from '../validators/advisor.schemas.js';
import { chat } from '../services/advisor/advisor.service.js';
import {
  listConversationsByAgent,
  getConversationById,
  getMessagesByConversation,
  deleteConversation,
} from '../repositories/advisor.repository.js';

export const advisorRouter = Router();

const perMinuteLimit = createRateLimit({
  keyFromReq: (_req, res) => `advisor:min:${res.locals.agentId as string}`,
  max: parseInt(process.env.ADVISOR_RATE_LIMIT_PER_MIN || '10', 10),
  windowMs: 60 * 1000,
  message: 'חרגת ממגבלת הבקשות לדקה. אנא המתן מעט.',
});

const perDayLimit = createRateLimit({
  keyFromReq: (_req, res) => `advisor:day:${res.locals.agentId as string}`,
  max: parseInt(process.env.ADVISOR_RATE_LIMIT_PER_DAY || '200', 10),
  windowMs: 24 * 60 * 60 * 1000,
  message: 'חרגת ממגבלת הבקשות היומית.',
});

advisorRouter.post(
  '/chat',
  perMinuteLimit,
  perDayLimit,
  validate({ body: chatBodySchema }),
  async (req, res, next) => {
    try {
      const agentId = res.locals.agentId as string;
      const { message, conversationId } = req.body as { message: string; conversationId?: string };

      const result = await chat({ agentId, userMessage: message, conversationId });

      res.json({
        data: result,
        error: null,
        meta: null,
      });
    } catch (err) {
      next(err);
    }
  },
);

advisorRouter.get('/conversations', async (req, res, next) => {
  try {
    const agentId = res.locals.agentId as string;
    const conversations = await listConversationsByAgent(agentId);

    res.json({
      data: conversations,
      error: null,
      meta: { count: conversations.length },
    });
  } catch (err) {
    next(err);
  }
});

advisorRouter.get(
  '/conversations/:id',
  validate({ params: conversationIdParamSchema }),
  async (req, res, next) => {
    try {
      const agentId = res.locals.agentId as string;
      const id = req.params.id as string;

      const conversation = await getConversationById(id, agentId);
      if (!conversation) {
        res.status(404).json({ data: null, error: 'Conversation not found', meta: null });
        return;
      }

      const messages = await getMessagesByConversation(id);

      res.json({
        data: { conversation, messages },
        error: null,
        meta: { messageCount: messages.length },
      });
    } catch (err) {
      next(err);
    }
  },
);

advisorRouter.delete(
  '/conversations/:id',
  validate({ params: conversationIdParamSchema }),
  async (req, res, next) => {
    try {
      const agentId = res.locals.agentId as string;
      const id = req.params.id as string;

      const deleted = await deleteConversation(id, agentId);
      if (!deleted) {
        res.status(404).json({ data: null, error: 'Conversation not found', meta: null });
        return;
      }

      res.json({ data: { deleted: true }, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);
