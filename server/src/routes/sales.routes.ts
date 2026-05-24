import { Router } from 'express';
import { z } from 'zod';
import {
  insertSalesTransactions,
  getSalesTransactions,
  getMonthlySalarySummary,
  searchClients,
  getClientTransactions,
  getPortfolioAnalysis,
  getSalesWithContractStatus,
  getContractCoverageSummary,
  assignInsuranceCompany,
  type SalesTransactionInput,
  type PortfolioFilter,
} from '../repositories/sales.repository.js';
import { getSalesPotential } from '../repositories/potential.repository.js';
import { validate } from '../middleware/validate.js';
import {
  contractCoverageQuerySchema,
  assignCompanySchema,
  INSURANCE_COMPANY_MAP,
  type AssignCompanyBody,
} from '../validators/sales.schemas.js';

const portfolioTypeSchema = z
  .enum(['personal', 'partners', 'all'])
  .default('all');

function parsePortfolioType(raw: unknown): PortfolioFilter {
  const result = portfolioTypeSchema.safeParse(raw);
  return result.success ? result.data : 'all';
}

export const salesRouter = Router();

/**
 * POST /api/v1/sales
 * Body: { records: SalesTransactionInput[], insuranceCompany: string }
 * Auth: required (agent_id from JWT via res.locals.agentId)
 */
salesRouter.post('/', async (req, res, next) => {
  try {
    const agentId = (res.locals.sub || res.locals.agentId) as string;
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
    const agentId = (res.locals.sub || res.locals.agentId) as string;
    const month = req.query.month as string | undefined;
    const portfolioType = parsePortfolioType(req.query.portfolioType);

    const transactions = await getSalesTransactions(agentId, month, portfolioType);

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
    const agentId = (res.locals.sub || res.locals.agentId) as string;
    const portfolioType = parsePortfolioType(req.query.portfolioType);
    const summary = await getMonthlySalarySummary(agentId, portfolioType);

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
    const agentId = (res.locals.sub || res.locals.agentId) as string;
    const portfolioType = parsePortfolioType(req.query.portfolioType);
    const analysis = await getPortfolioAnalysis(agentId, portfolioType);

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
    const agentId = (res.locals.sub || res.locals.agentId) as string;
    const search = req.query.search as string | undefined;
    const portfolioType = parsePortfolioType(req.query.portfolioType);

    const clients = await searchClients(agentId, search, 50, portfolioType);

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
 * GET /api/v1/sales/contract-coverage?month=YYYY-MM&detailed=true
 * Auth: required
 * Returns coverage summary (+ optionally transactions) split by contract status.
 */
salesRouter.get(
  '/contract-coverage',
  validate({ query: contractCoverageQuerySchema }),
  async (req, res, next) => {
    try {
      const agentId = (res.locals.sub || res.locals.agentId) as string;
      const { month, detailed, limit, page, portfolioType } =
        res.locals.parsedQuery as import('../validators/sales.schemas.js').ContractCoverageQuery;

      const offset = (page - 1) * limit;

      const [summary, transactions] = await Promise.all([
        getContractCoverageSummary(agentId, { month, portfolioType }),
        detailed
          ? getSalesWithContractStatus(agentId, { month, limit, offset, portfolioType })
          : Promise.resolve(undefined),
      ]);

      res.json({
        data: {
          summary,
          ...(detailed && { transactions }),
        },
        error: null,
        meta: detailed
          ? { count: transactions?.length ?? 0, page, limit }
          : null,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/sales/potential
 * Auth: required
 * Returns sales potential analysis: cross-sell opportunities, dormant clients,
 * untapped branches, and employer clusters.
 */
salesRouter.get('/potential', async (req, res, next) => {
  try {
    const agentId = (res.locals.sub || res.locals.agentId) as string;
    const portfolioType = parsePortfolioType(req.query.portfolioType);
    const result = await getSalesPotential(agentId, portfolioType);

    res.json({
      data: result,
      error: null,
      meta: {
        latestMonth: result.meta.latestMonth,
        totalClients: result.meta.totalClients,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/sales/assign-company
 * Auth: required
 * Assigns an insurance company to transactions where the field is missing.
 */
salesRouter.patch(
  '/assign-company',
  validate({ body: assignCompanySchema }),
  async (req, res, next) => {
    try {
      const agentId = (res.locals.sub || res.locals.agentId) as string;
      const { insuredId, policyNumber, insuranceCompany } = req.body as AssignCompanyBody;

      const displayName = INSURANCE_COMPANY_MAP[insuranceCompany];
      const result = await assignInsuranceCompany(
        agentId,
        insuredId ?? '',
        policyNumber ?? '',
        displayName,
      );

      res.json({ data: result, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/v1/sales/client/:clientId
 * Auth: required
 * Returns all transactions for a specific client (by insured_id).
 */
salesRouter.get('/client/:clientId', async (req, res, next) => {
  try {
    const agentId = (res.locals.sub || res.locals.agentId) as string;
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
