// Vercel serverless entry point.
// Loads env vars before any module-level code runs (database pool, stripe, etc.)
// then re-exports the Express app. Vercel accepts a raw Express app as a handler.
import 'dotenv/config';
import app from '../server/dist/app.js';

export default app;
