import { Router } from 'express';
import {
  insertSalesTransactions,
  getSalesTransactions,
  getMonthlySalarySummary,
  searchClients,
  getClientTransactions,
  getPortfolioAnalysis,
  type SalesTransactionInput,
} from '../repositories/sales.repository.js';

export const salesRouter = Router();

/**
 * POST /api/v1/sales
 * Body: { records: SalesTransactionInput[], insuranceCompany: string }
 * Auth: required (agent_id from JWT via res.locals.agentId)
 */
salesRouter.post('/', async (req, res, next) => {
  try {
    const agentId = res.locals.agentId as string;
    const { records, insuranceCompany } = req.body as {
      records: SalesTransactionInput[];
      insuranceCompany: string;
    };

    if (!Array.isArray(records) || records.length === 0) {
      res.status(400).json({ data: null, error: 'records array is required and must not be empty', meta: null });
      return;
    }

    if (!insuranceCompany || typeof insuranceCompany !== 'string') {
      res.status(400).json({ data: null, error: 'insuranceCompany is required', meta: null });
      return;
    }

    // Validate each record has required fields
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (!r.reportType || !r.processingMonth) {
        res.status(400).json({
          data: null,
          error: `Record at index ${i} missing required fields (reportType, processingMonth)`,
          meta: null,
        });
        return;
      }
      if (typeof r.commissionAmount !== 'number') {
        res.status(400).json({
          data: null,
          error: `Record at index ${i} has invalid commissionAmount`,
          meta: null,
        });
        return;
      }
    }

    const inserted = await insertSalesTransactions(agentId, insuranceCompany, records);

    res.status(201).json({
      data: { inserted },
      error: null,
      meta: null,
    });
  } catch (err: unknown) {
    console.error('[Sales POST] DB Error:', err instanceof Error ? err.message : err);
    next(err);
  }
});

/**
 * GET /api/v1/sales?month=2026-01
 * Auth: required
 * Returns all sales_transactions for the authenticated agent.
 */
salesRouter.get('/', async (req, res, next) => {
  try {
    const agentId = res.locals.agentId as string;
    const month = req.query.month as string | undefined;

    const transactions = await getSalesTransactions(agentId, month);

    res.json({
      data: transactions,
      error: null,
      meta: { count: transactions.length },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/sales/summary
 * Auth: required
 * Returns monthly salary summary: { month, totalCommission, recordCount }[]
 */
salesRouter.get('/summary', async (req, res, next) => {
  try {
    const agentId = res.locals.agentId as string;
    const summary = await getMonthlySalarySummary(agentId);

    res.json({
      data: summary,
      error: null,
      meta: { months: summary.length },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/sales/portfolio
 * Auth: required
 * Returns portfolio analysis data for the authenticated agent.
 */
salesRouter.get('/portfolio', async (req, res, next) => {
  try {
    const agentId = res.locals.agentId as string;
    const analysis = await getPortfolioAnalysis(agentId);

    res.json({
      data: analysis,
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/sales/clients?search=<name or tz>
 * Auth: required
 * Returns unique clients grouped by insured_id, with summary stats.
 */
salesRouter.get('/clients', async (req, res, next) => {
  try {
    const agentId = res.locals.agentId as string;
    const search = req.query.search as string | undefined;

    const clients = await searchClients(agentId, search);

    res.json({
      data: clients,
      error: null,
      meta: { count: clients.length },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/sales/client/:clientId
 * Auth: required
 * Returns all transactions for a specific client (by insured_id).
 */
salesRouter.get('/client/:clientId', async (req, res, next) => {
  try {
    const agentId = res.locals.agentId as string;
    const clientId = req.params.clientId;

    const transactions = await getClientTransactions(agentId, clientId);

    res.json({
      data: transactions,
      error: null,
      meta: { count: transactions.length },
    });
  } catch (err) {
    next(err);
  }
});
