import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { authRouter } from './routes/auth.routes.js';
import { agentRouter } from './routes/agent.routes.js';
import { policyRouter } from './routes/policy.routes.js';
import { commissionRouter } from './routes/commission.routes.js';
import { taxRouter } from './routes/tax.routes.js';
import { uploadRouter } from './routes/upload.routes.js';
import { salesRouter } from './routes/sales.routes.js';
import { predictionRouter } from './routes/prediction.routes.js';
import { stripeRouter } from './routes/stripe.routes.js';
import { ratesRouter } from './routes/rates.routes.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';
import { logger } from './config/logger.js';

const app = express();

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  }),
);

app.use(requestId);

if (process.env.NODE_ENV !== 'test') {
  app.use(
    pinoHttp({
      logger,
      genReqId(req, res) {
        return (res as unknown as { locals?: { requestId?: string } }).locals?.requestId ?? 'unknown';
      },
      customProps(_req, res) {
        return {
          userId: (res as unknown as { locals?: { agentId?: string } }).locals?.agentId,
        };
      },
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: req.url,
          };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );
}

// Stripe webhook — needs raw body, registered BEFORE express.json()
app.use('/api/v1/stripe/webhook', stripeRouter);

app.use(express.json());

// Health check (public)
app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok', timestamp: new Date().toISOString() }, error: null, meta: null });
});

// Auth routes (public)
app.use('/api/v1/auth', authRouter);

// Stripe checkout (public, uses JSON body)
app.use('/api/v1/stripe', stripeRouter);

// Protected routes — require valid JWT
app.use('/api/v1/agents', requireAuth, agentRouter);
app.use('/api/v1/policies', requireAuth, policyRouter);
app.use('/api/v1/commissions', requireAuth, commissionRouter);
app.use('/api/v1/tax', requireAuth, taxRouter);
app.use('/api/v1/uploads', requireAuth, uploadRouter);
app.use('/api/v1/sales', requireAuth, salesRouter);
app.use('/api/v1/predictions', requireAuth, predictionRouter);
app.use('/api/v1/rates', requireAuth, ratesRouter);

app.use(errorHandler);

export default app;
