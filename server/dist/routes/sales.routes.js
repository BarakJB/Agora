"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesRouter = void 0;
const express_1 = require("express");
const sales_repository_js_1 = require("../repositories/sales.repository.js");
const potential_repository_js_1 = require("../repositories/potential.repository.js");
const validate_js_1 = require("../middleware/validate.js");
const sales_schemas_js_1 = require("../validators/sales.schemas.js");
exports.salesRouter = (0, express_1.Router)();
/**
 * POST /api/v1/sales
 * Body: { records: SalesTransactionInput[], insuranceCompany: string }
 * Auth: required (agent_id from JWT via res.locals.agentId)
 */
exports.salesRouter.post('/', async (req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const { records, insuranceCompany } = req.body;
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
        const inserted = await (0, sales_repository_js_1.insertSalesTransactions)(agentId, insuranceCompany, records);
        res.status(201).json({
            data: { inserted },
            error: null,
            meta: null,
        });
    }
    catch (err) {
        console.error('[Sales POST] DB Error:', err instanceof Error ? err.message : err);
        next(err);
    }
});
/**
 * GET /api/v1/sales?month=2026-01
 * Auth: required
 * Returns all sales_transactions for the authenticated agent.
 */
exports.salesRouter.get('/', async (req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const month = req.query.month;
        const transactions = await (0, sales_repository_js_1.getSalesTransactions)(agentId, month);
        res.json({
            data: transactions,
            error: null,
            meta: { count: transactions.length },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/sales/summary
 * Auth: required
 * Returns monthly salary summary: { month, totalCommission, recordCount }[]
 */
exports.salesRouter.get('/summary', async (req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const summary = await (0, sales_repository_js_1.getMonthlySalarySummary)(agentId);
        res.json({
            data: summary,
            error: null,
            meta: { months: summary.length },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/sales/portfolio
 * Auth: required
 * Returns portfolio analysis data for the authenticated agent.
 */
exports.salesRouter.get('/portfolio', async (req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const analysis = await (0, sales_repository_js_1.getPortfolioAnalysis)(agentId);
        res.json({
            data: analysis,
            error: null,
            meta: null,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/sales/clients?search=<name or tz>
 * Auth: required
 * Returns unique clients grouped by insured_id, with summary stats.
 */
exports.salesRouter.get('/clients', async (req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const search = req.query.search;
        const clients = await (0, sales_repository_js_1.searchClients)(agentId, search);
        res.json({
            data: clients,
            error: null,
            meta: { count: clients.length },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/sales/contract-coverage?month=YYYY-MM&detailed=true
 * Auth: required
 * Returns coverage summary (+ optionally transactions) split by contract status.
 */
exports.salesRouter.get('/contract-coverage', (0, validate_js_1.validate)({ query: sales_schemas_js_1.contractCoverageQuerySchema }), async (req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const { month, detailed, limit, page } = res.locals.parsedQuery;
        const offset = (page - 1) * limit;
        const [summary, transactions] = await Promise.all([
            (0, sales_repository_js_1.getContractCoverageSummary)(agentId, { month }),
            detailed
                ? (0, sales_repository_js_1.getSalesWithContractStatus)(agentId, { month, limit, offset })
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
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/sales/potential
 * Auth: required
 * Returns sales potential analysis: cross-sell opportunities, dormant clients,
 * untapped branches, and employer clusters.
 */
exports.salesRouter.get('/potential', async (req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const result = await (0, potential_repository_js_1.getSalesPotential)(agentId);
        res.json({
            data: result,
            error: null,
            meta: {
                latestMonth: result.meta.latestMonth,
                totalClients: result.meta.totalClients,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/sales/client/:clientId
 * Auth: required
 * Returns all transactions for a specific client (by insured_id).
 */
exports.salesRouter.get('/client/:clientId', async (req, res, next) => {
    try {
        const agentId = (res.locals.sub || res.locals.agentId);
        const clientId = req.params.clientId;
        const transactions = await (0, sales_repository_js_1.getClientTransactions)(agentId, clientId);
        res.json({
            data: transactions,
            error: null,
            meta: { count: transactions.length },
        });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=sales.routes.js.map