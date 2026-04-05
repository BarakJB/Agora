import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './routes/auth.routes.js';
import { agentRouter } from './routes/agent.routes.js';
import { policyRouter } from './routes/policy.routes.js';
import { commissionRouter } from './routes/commission.routes.js';
import { taxRouter } from './routes/tax.routes.js';
import { uploadRouter } from './routes/upload.routes.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json());

// Health check (public)
app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok', timestamp: new Date().toISOString() }, error: null, meta: null });
});

// Auth routes (public)
app.use('/api/v1/auth', authRouter);

// Protected routes — require valid JWT
app.use('/api/v1/agents', requireAuth, agentRouter);
app.use('/api/v1/policies', requireAuth, policyRouter);
app.use('/api/v1/commissions', requireAuth, commissionRouter);
app.use('/api/v1/tax', requireAuth, taxRouter);
app.use('/api/v1/uploads', requireAuth, uploadRouter);

app.use(errorHandler);

export default app;
