"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_js_1 = __importDefault(require("../../app.js"));
// Mock auth middleware — always pass through in tests
vitest_1.vi.mock('../../middleware/auth.middleware.js', () => ({
    requireAuth: (_req, res, next) => {
        res.locals.agentId = 'a1111111-1111-1111-1111-111111111111';
        res.locals.sub = 'a1111111-1111-1111-1111-111111111111';
        next();
    },
}));
// Mock the MySQL repository — no DB available in test environment
// When Phase 1 (COV-11) is complete and a test DB is set up,
// these mocks should be replaced with real DB integration tests.
vitest_1.vi.mock('../../repositories/mysql.repository.js', () => {
    const testAgent = {
        id: 'a1111111-1111-1111-1111-111111111111',
        agentId: '052998432',
        agencyId: 'AG-001',
        name: 'דניאל אהרוני',
        email: 'd.aharoni@agora.co.il',
        phone: '054-9876543',
        licenseNumber: '052-998432-1',
        taxId: '052998432',
        taxStatus: 'self_employed',
        niiRate: 17.83,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
        deletedAt: null,
    };
    const testPolicy = {
        id: 'p1111111-1111-1111-1111-111111111111',
        agentId: testAgent.id,
        policyId: 'POL-ABC123',
        productType: 'managers_insurance',
        clientName: 'ישראל שראבי',
        clientId: '301234567',
        startDate: '2026-01-14',
        cancelDate: null,
        premiumAmount: 12400,
        premiumFrequency: 'monthly',
        commissionPct: 15,
        recurringPct: 2,
        volumePct: 0,
        contractId: null,
        insuranceCompany: 'הראל',
        status: 'active',
        createdAt: '2026-01-14T00:00:00.000Z',
        updatedAt: '2026-01-14T00:00:00.000Z',
    };
    const testCommission = {
        id: 'c1111111-1111-1111-1111-111111111111',
        policyId: testPolicy.id,
        agentId: testAgent.id,
        type: 'one_time',
        amount: 1860,
        rate: 15,
        premiumBase: 12400,
        period: '2026-01',
        paymentDate: '2026-01-14',
        status: 'paid',
        insuranceCompany: 'הראל',
        createdAt: '2026-01-14T00:00:00.000Z',
    };
    let agents = [];
    let policies = [];
    let commissions = [];
    // Reset state before each test via the beforeEach below
    const _reset = () => {
        agents = [{ ...testAgent }];
        policies = [{ ...testPolicy }];
        commissions = [{ ...testCommission }];
    };
    _reset();
    return {
        _resetMockData: _reset,
        getAllAgents: vitest_1.vi.fn(async () => agents.filter((a) => !a.deletedAt)),
        getAgentById: vitest_1.vi.fn(async (id) => agents.find((a) => a.id === id && !a.deletedAt) ?? null),
        findAgentDuplicate: vitest_1.vi.fn(async (agentId, email, licenseNumber) => agents.some((a) => !a.deletedAt && (a.agentId === agentId || a.email === email || a.licenseNumber === licenseNumber))),
        createAgent: vitest_1.vi.fn(async (id, data) => {
            const agent = {
                id,
                agentId: data.agentId,
                agencyId: data.agencyId,
                name: data.name,
                email: data.email,
                phone: data.phone,
                licenseNumber: data.licenseNumber,
                taxId: data.taxId,
                taxStatus: data.taxStatus,
                niiRate: data.niiRate,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null,
            };
            agents.push(agent);
            return agent;
        }),
        updateAgent: vitest_1.vi.fn(async (id, data) => {
            const idx = agents.findIndex((a) => a.id === id);
            if (idx === -1)
                return null;
            agents[idx] = { ...agents[idx], ...data, updatedAt: new Date().toISOString() };
            return agents[idx];
        }),
        softDeleteAgent: vitest_1.vi.fn(async (id) => {
            const idx = agents.findIndex((a) => a.id === id);
            if (idx === -1)
                return null;
            agents[idx] = { ...agents[idx], deletedAt: new Date().toISOString() };
            return agents[idx];
        }),
        getPolicies: vitest_1.vi.fn(async (filters) => {
            let filtered = [...policies];
            if (filters.type)
                filtered = filtered.filter((p) => p.productType === filters.type);
            if (filters.company)
                filtered = filtered.filter((p) => p.insuranceCompany === filters.company);
            const total = filtered.length;
            const start = (filters.page - 1) * filters.limit;
            return { data: filtered.slice(start, start + filters.limit), total };
        }),
        getPolicyById: vitest_1.vi.fn(async (id) => policies.find((p) => p.id === id) ?? null),
        getPolicyStats: vitest_1.vi.fn(async () => ({
            totalPolicies: policies.length,
            activePolicies: policies.filter((p) => p.status === 'active').length,
            totalPremium: policies.reduce((s, p) => s + p.premiumAmount, 0),
            byType: { managers_insurance: 12400 },
            byCompany: { 'הראל': 12400 },
        })),
        getPolicyStatusById: vitest_1.vi.fn(async (id) => {
            const p = policies.find((pol) => pol.id === id);
            return p ? p.status : null;
        }),
        countPolicies: vitest_1.vi.fn(async () => policies.length),
        countNewPolicies: vitest_1.vi.fn(async () => 1),
        createPolicy: vitest_1.vi.fn(async (id, data) => {
            const policy = {
                id,
                agentId: data.agentId,
                policyId: data.policyId,
                productType: data.productType,
                clientName: data.clientName,
                clientId: data.clientId,
                startDate: data.startDate,
                cancelDate: null,
                premiumAmount: data.premiumAmount,
                premiumFrequency: (data.premiumFrequency ?? 'monthly'),
                commissionPct: data.commissionPct,
                recurringPct: (data.recurringPct ?? 0),
                volumePct: (data.volumePct ?? 0),
                contractId: data.contractId ?? null,
                insuranceCompany: data.insuranceCompany,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            policies.push(policy);
            return policy;
        }),
        updatePolicy: vitest_1.vi.fn(async (id, data) => {
            const idx = policies.findIndex((p) => p.id === id);
            if (idx === -1)
                return null;
            policies[idx] = { ...policies[idx], ...data, updatedAt: new Date().toISOString() };
            return policies[idx];
        }),
        getCommissions: vitest_1.vi.fn(async (filters) => {
            let filtered = [...commissions];
            if (filters.period)
                filtered = filtered.filter((c) => c.period === filters.period);
            if (filters.type)
                filtered = filtered.filter((c) => c.type === filters.type);
            const total = filtered.length;
            const start = (filters.page - 1) * filters.limit;
            return { data: filtered.slice(start, start + filters.limit), total };
        }),
        getCommissionsByPeriod: vitest_1.vi.fn(async (period) => commissions.filter((c) => c.period === period)),
        getCommissionsByCompany: vitest_1.vi.fn(async () => [{ company: 'הראל', total: 1860 }]),
        getCommissionById: vitest_1.vi.fn(async (id) => commissions.find((c) => c.id === id) ?? null),
        getCommissionStatusById: vitest_1.vi.fn(async (id) => {
            const c = commissions.find((cm) => cm.id === id);
            return c ? c.status : null;
        }),
        createCommission: vitest_1.vi.fn(async () => null),
        updateCommission: vitest_1.vi.fn(async (id, data) => {
            const idx = commissions.findIndex((c) => c.id === id);
            if (idx === -1)
                return null;
            commissions[idx] = { ...commissions[idx], ...data };
            return commissions[idx];
        }),
        getUploads: vitest_1.vi.fn(async () => ({ data: [], total: 0 })),
        getUploadById: vitest_1.vi.fn(async () => null),
        resolveInsuranceCompanyId: vitest_1.vi.fn(async () => null),
        createUpload: vitest_1.vi.fn(async () => null),
        createCommissionBatch: vitest_1.vi.fn(async () => { }),
    };
});
// Import the mock reset helper
const mysql_repository_js_1 = require("../../repositories/mysql.repository.js");
(0, vitest_1.beforeEach)(() => {
    mysql_repository_js_1._resetMockData();
});
// ==================== Health Check ====================
(0, vitest_1.describe)('GET /api/health', () => {
    (0, vitest_1.it)('should return 200 with ok status', async () => {
        const res = await (0, supertest_1.default)(app_js_1.default).get('/api/health');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.data.status).toBe('ok');
        (0, vitest_1.expect)(res.body.error).toBeNull();
    });
    (0, vitest_1.it)('should follow standard response format { data, error, meta }', async () => {
        const res = await (0, supertest_1.default)(app_js_1.default).get('/api/health');
        (0, vitest_1.expect)(res.body).toHaveProperty('data');
        (0, vitest_1.expect)(res.body).toHaveProperty('error');
        (0, vitest_1.expect)(res.body).toHaveProperty('meta');
    });
});
// ==================== Agents ====================
(0, vitest_1.describe)('Agents API', () => {
    (0, vitest_1.describe)('GET /api/v1/agents', () => {
        (0, vitest_1.it)('should return agents list', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).get('/api/v1/agents');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.length).toBe(1);
            (0, vitest_1.expect)(res.body.error).toBeNull();
            (0, vitest_1.expect)(res.body.meta.total).toBe(1);
        });
    });
    (0, vitest_1.describe)('GET /api/v1/agents/:id', () => {
        (0, vitest_1.it)('should return agent by id', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).get('/api/v1/agents/a1111111-1111-1111-1111-111111111111');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.name).toBe('דניאל אהרוני');
        });
        (0, vitest_1.it)('should return 404 for non-existent agent', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).get('/api/v1/agents/non-existent-id');
            (0, vitest_1.expect)(res.status).toBe(404);
            (0, vitest_1.expect)(res.body.error).toBe('Agent not found');
            (0, vitest_1.expect)(res.body.data).toBeNull();
        });
    });
    (0, vitest_1.describe)('POST /api/v1/agents', () => {
        (0, vitest_1.it)('should create a new agent with valid data', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .post('/api/v1/agents')
                .send({
                agentId: '999888777',
                agencyId: 'AG-TEST',
                name: 'Test Agent',
                email: 'test@example.com',
                phone: '050-1234567',
                licenseNumber: '999-888777-1',
                taxId: '999888777',
                taxStatus: 'self_employed',
                niiRate: 17.83,
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.data.name).toBe('Test Agent');
            (0, vitest_1.expect)(res.body.data.id).toBeTruthy();
        });
        (0, vitest_1.it)('should return 400 for missing required fields', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .post('/api/v1/agents')
                .send({ name: 'Incomplete' });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('should return 400 for invalid email', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .post('/api/v1/agents')
                .send({
                agentId: '111222333',
                agencyId: 'AG-X',
                name: 'Bad Email',
                email: 'not-an-email',
                phone: '050-0000000',
                licenseNumber: '111-222333-1',
                taxId: '111222333',
                taxStatus: 'employee',
                niiRate: 7,
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('should return 409 for duplicate agentId', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .post('/api/v1/agents')
                .send({
                agentId: '052998432', // same as seed agent
                agencyId: 'AG-DUP',
                name: 'Duplicate',
                email: 'unique@example.com',
                phone: '050-9999999',
                licenseNumber: 'UNIQUE-LIC',
                taxId: 'UNIQUE-TAX',
                taxStatus: 'employee',
                niiRate: 7,
            });
            (0, vitest_1.expect)(res.status).toBe(409);
        });
    });
    (0, vitest_1.describe)('PUT /api/v1/agents/:id', () => {
        (0, vitest_1.it)('should update agent fields', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .put('/api/v1/agents/a1111111-1111-1111-1111-111111111111')
                .send({ name: 'Updated Name' });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.name).toBe('Updated Name');
        });
        (0, vitest_1.it)('should return 404 for non-existent agent', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .put('/api/v1/agents/non-existent')
                .send({ name: 'Ghost' });
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
    (0, vitest_1.describe)('DELETE /api/v1/agents/:id', () => {
        (0, vitest_1.it)('should soft-delete the agent', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).delete('/api/v1/agents/a1111111-1111-1111-1111-111111111111');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.deletedAt).toBeTruthy();
        });
        (0, vitest_1.it)('should return 404 for non-existent agent', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).delete('/api/v1/agents/non-existent');
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
});
// ==================== Tax ====================
(0, vitest_1.describe)('Tax API', () => {
    (0, vitest_1.describe)('POST /api/v1/tax/calculate', () => {
        (0, vitest_1.it)('should calculate tax for valid input', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .post('/api/v1/tax/calculate')
                .send({ grossIncome: 20000, taxStatus: 'self_employed' });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.grossIncome).toBe(20000);
            (0, vitest_1.expect)(res.body.data.incomeTax).toBeGreaterThan(0);
            (0, vitest_1.expect)(res.body.data.nationalInsurance).toBeGreaterThan(0);
            (0, vitest_1.expect)(res.body.data.vat).toBeGreaterThan(0);
            (0, vitest_1.expect)(res.body.data.brackets).toBeInstanceOf(Array);
        });
        (0, vitest_1.it)('should return 400 for missing grossIncome', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .post('/api/v1/tax/calculate')
                .send({ taxStatus: 'self_employed' });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('should return 400 for invalid taxStatus', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .post('/api/v1/tax/calculate')
                .send({ grossIncome: 10000, taxStatus: 'invalid_status' });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('should return 400 for negative income', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .post('/api/v1/tax/calculate')
                .send({ grossIncome: -5000, taxStatus: 'employee' });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
    });
    (0, vitest_1.describe)('GET /api/v1/tax/brackets', () => {
        (0, vitest_1.it)('should return tax bracket reference data', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).get('/api/v1/tax/brackets');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.incomeTax).toBeInstanceOf(Array);
            (0, vitest_1.expect)(res.body.data.incomeTax.length).toBe(7);
            (0, vitest_1.expect)(res.body.data.vat).toBe(18);
            (0, vitest_1.expect)(res.body.meta.year).toBe(2026);
        });
    });
});
// ==================== Policies ====================
(0, vitest_1.describe)('Policies API', () => {
    (0, vitest_1.describe)('GET /api/v1/policies/stats/summary', () => {
        (0, vitest_1.it)('should return policy statistics', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).get('/api/v1/policies/stats/summary');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.totalPolicies).toBeGreaterThan(0);
            (0, vitest_1.expect)(res.body.data.activePolicies).toBeDefined();
            (0, vitest_1.expect)(res.body.data.totalPremium).toBeGreaterThan(0);
            (0, vitest_1.expect)(res.body.data.byType).toBeDefined();
            (0, vitest_1.expect)(res.body.data.byCompany).toBeDefined();
        });
    });
    (0, vitest_1.describe)('GET /api/v1/policies/:id', () => {
        (0, vitest_1.it)('should return policy by id', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).get('/api/v1/policies/p1111111-1111-1111-1111-111111111111');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.id).toBe('p1111111-1111-1111-1111-111111111111');
        });
        (0, vitest_1.it)('should return 404 for non-existent policy', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).get('/api/v1/policies/non-existent');
            (0, vitest_1.expect)(res.status).toBe(404);
            (0, vitest_1.expect)(res.body.error).toBe('Policy not found');
        });
    });
    (0, vitest_1.describe)('POST /api/v1/policies', () => {
        (0, vitest_1.it)('should create a new policy', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .post('/api/v1/policies')
                .send({
                agentId: 'a1111111-1111-1111-1111-111111111111',
                policyId: 'POL-TEST-001',
                productType: 'life_insurance',
                clientName: 'Test Client',
                clientId: '999999999',
                startDate: '2026-04-01',
                premiumAmount: 5000,
                premiumFrequency: 'monthly',
                commissionPct: 12,
                recurringPct: 1.5,
                volumePct: 0,
                contractId: null,
                insuranceCompany: 'Test Insurance',
            });
            (0, vitest_1.expect)(res.status).toBe(201);
            (0, vitest_1.expect)(res.body.data.policyId).toBe('POL-TEST-001');
            (0, vitest_1.expect)(res.body.data.status).toBe('active');
        });
        (0, vitest_1.it)('should return 400 for invalid agentId format', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .post('/api/v1/policies')
                .send({
                agentId: 'not-a-uuid',
                policyId: 'POL-X',
                productType: 'life_insurance',
                clientName: 'X',
                clientId: '123',
                startDate: '2026-04-01',
                premiumAmount: 1000,
                commissionPct: 10,
                insuranceCompany: 'Test',
            });
            (0, vitest_1.expect)(res.status).toBe(400);
        });
        (0, vitest_1.it)('should return 400 for non-existent agent', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .post('/api/v1/policies')
                .send({
                agentId: '00000000-0000-0000-0000-000000000000',
                policyId: 'POL-X',
                productType: 'life_insurance',
                clientName: 'X',
                clientId: '123',
                startDate: '2026-04-01',
                premiumAmount: 1000,
                commissionPct: 10,
                insuranceCompany: 'Test',
            });
            (0, vitest_1.expect)(res.status).toBe(400);
            (0, vitest_1.expect)(res.body.error).toBe('Agent not found');
        });
    });
    (0, vitest_1.describe)('PUT /api/v1/policies/:id', () => {
        (0, vitest_1.it)('should update policy fields', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .put('/api/v1/policies/p1111111-1111-1111-1111-111111111111')
                .send({ premiumAmount: 15000 });
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.premiumAmount).toBe(15000);
        });
        (0, vitest_1.it)('should return 404 for non-existent policy', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default)
                .put('/api/v1/policies/non-existent')
                .send({ premiumAmount: 5000 });
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
    (0, vitest_1.describe)('DELETE /api/v1/policies/:id', () => {
        (0, vitest_1.it)('should cancel the policy', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).delete('/api/v1/policies/p1111111-1111-1111-1111-111111111111');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.status).toBe('cancelled');
        });
        (0, vitest_1.it)('should return 404 for non-existent policy', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).delete('/api/v1/policies/non-existent');
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
});
// ==================== Commissions ====================
(0, vitest_1.describe)('Commissions API', () => {
    (0, vitest_1.describe)('GET /api/v1/commissions/by-company', () => {
        (0, vitest_1.it)('should return commissions grouped by insurance company', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).get('/api/v1/commissions/by-company');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data).toBeInstanceOf(Array);
            (0, vitest_1.expect)(res.body.data[0]).toHaveProperty('company');
            (0, vitest_1.expect)(res.body.data[0]).toHaveProperty('total');
        });
    });
    (0, vitest_1.describe)('GET /api/v1/commissions/:id', () => {
        (0, vitest_1.it)('should return commission by id', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).get('/api/v1/commissions/c1111111-1111-1111-1111-111111111111');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.id).toBe('c1111111-1111-1111-1111-111111111111');
        });
        (0, vitest_1.it)('should return 404 for non-existent commission', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).get('/api/v1/commissions/non-existent');
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
    (0, vitest_1.describe)('DELETE /api/v1/commissions/:id', () => {
        (0, vitest_1.it)('should void (clawback) the commission', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).delete('/api/v1/commissions/c1111111-1111-1111-1111-111111111111');
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.data.status).toBe('clawback');
        });
        (0, vitest_1.it)('should return 404 for non-existent commission', async () => {
            const res = await (0, supertest_1.default)(app_js_1.default).delete('/api/v1/commissions/non-existent');
            (0, vitest_1.expect)(res.status).toBe(404);
        });
    });
});
//# sourceMappingURL=api.integration.test.js.map