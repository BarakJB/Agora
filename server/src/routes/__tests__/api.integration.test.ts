import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import type { Agent, Policy, Commission, UploadRecord } from '../../types/index.js';

// Mock auth middleware — always pass through in tests
vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (_req: unknown, res: { locals: Record<string, string> }, next: () => void) => {
    res.locals.agentId = 'a1111111-1111-1111-1111-111111111111';
    res.locals.sub = 'a1111111-1111-1111-1111-111111111111';
    next();
  },
}));

// Mock the MySQL repository — no DB available in test environment
// When Phase 1 (COV-11) is complete and a test DB is set up,
// these mocks should be replaced with real DB integration tests.
vi.mock('../../repositories/mysql.repository.js', () => {
  const testAgent: Agent = {
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

  const testPolicy: Policy = {
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

  const testCommission: Commission = {
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

  let agents: Agent[] = [];
  let policies: Policy[] = [];
  let commissions: Commission[] = [];

  // Reset state before each test via the beforeEach below
  const _reset = () => {
    agents = [{ ...testAgent }];
    policies = [{ ...testPolicy }];
    commissions = [{ ...testCommission }];
  };
  _reset();

  return {
    _resetMockData: _reset,

    getAllAgents: vi.fn(async () => agents.filter((a) => !a.deletedAt)),
    getAgentById: vi.fn(async (id: string) => agents.find((a) => a.id === id && !a.deletedAt) ?? null),
    findAgentDuplicate: vi.fn(async (agentId: string, email: string, licenseNumber: string) =>
      agents.some((a) => !a.deletedAt && (a.agentId === agentId || a.email === email || a.licenseNumber === licenseNumber)),
    ),
    createAgent: vi.fn(async (id: string, data: Record<string, unknown>) => {
      const agent: Agent = {
        id,
        agentId: data.agentId as string,
        agencyId: data.agencyId as string,
        name: data.name as string,
        email: data.email as string,
        phone: data.phone as string,
        licenseNumber: data.licenseNumber as string,
        taxId: data.taxId as string,
        taxStatus: data.taxStatus as Agent['taxStatus'],
        niiRate: data.niiRate as number,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      agents.push(agent);
      return agent;
    }),
    updateAgent: vi.fn(async (id: string, data: Record<string, unknown>) => {
      const idx = agents.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      agents[idx] = { ...agents[idx], ...data, updatedAt: new Date().toISOString() } as Agent;
      return agents[idx];
    }),
    softDeleteAgent: vi.fn(async (id: string) => {
      const idx = agents.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      agents[idx] = { ...agents[idx], deletedAt: new Date().toISOString() };
      return agents[idx];
    }),

    getPolicies: vi.fn(async (filters: { type?: string; company?: string; page: number; limit: number }) => {
      let filtered = [...policies];
      if (filters.type) filtered = filtered.filter((p) => p.productType === filters.type);
      if (filters.company) filtered = filtered.filter((p) => p.insuranceCompany === filters.company);
      const total = filtered.length;
      const start = (filters.page - 1) * filters.limit;
      return { data: filtered.slice(start, start + filters.limit), total };
    }),
    getPolicyById: vi.fn(async (id: string) => policies.find((p) => p.id === id) ?? null),
    getPolicyStats: vi.fn(async () => ({
      totalPolicies: policies.length,
      activePolicies: policies.filter((p) => p.status === 'active').length,
      totalPremium: policies.reduce((s, p) => s + p.premiumAmount, 0),
      byType: { managers_insurance: 12400 },
      byCompany: { 'הראל': 12400 },
    })),
    getPolicyStatusById: vi.fn(async (id: string) => {
      const p = policies.find((pol) => pol.id === id);
      return p ? p.status : null;
    }),
    countPolicies: vi.fn(async () => policies.length),
    countNewPolicies: vi.fn(async () => 1),
    createPolicy: vi.fn(async (id: string, data: Record<string, unknown>) => {
      const policy: Policy = {
        id,
        agentId: data.agentId as string,
        policyId: data.policyId as string,
        productType: data.productType as Policy['productType'],
        clientName: data.clientName as string,
        clientId: data.clientId as string,
        startDate: data.startDate as string,
        cancelDate: null,
        premiumAmount: data.premiumAmount as number,
        premiumFrequency: (data.premiumFrequency ?? 'monthly') as Policy['premiumFrequency'],
        commissionPct: data.commissionPct as number,
        recurringPct: (data.recurringPct ?? 0) as number,
        volumePct: (data.volumePct ?? 0) as number,
        contractId: (data.contractId as string | null) ?? null,
        insuranceCompany: data.insuranceCompany as string,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      policies.push(policy);
      return policy;
    }),
    updatePolicy: vi.fn(async (id: string, data: Record<string, unknown>) => {
      const idx = policies.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      policies[idx] = { ...policies[idx], ...data, updatedAt: new Date().toISOString() } as Policy;
      return policies[idx];
    }),

    getCommissions: vi.fn(async (filters: { period?: string; type?: string; page: number; limit: number }) => {
      let filtered = [...commissions];
      if (filters.period) filtered = filtered.filter((c) => c.period === filters.period);
      if (filters.type) filtered = filtered.filter((c) => c.type === filters.type);
      const total = filtered.length;
      const start = (filters.page - 1) * filters.limit;
      return { data: filtered.slice(start, start + filters.limit), total };
    }),
    getCommissionsByPeriod: vi.fn(async (period: string) => commissions.filter((c) => c.period === period)),
    getCommissionsByCompany: vi.fn(async () => [{ company: 'הראל', total: 1860 }]),
    getCommissionById: vi.fn(async (id: string) => commissions.find((c) => c.id === id) ?? null),
    getCommissionStatusById: vi.fn(async (id: string) => {
      const c = commissions.find((cm) => cm.id === id);
      return c ? c.status : null;
    }),
    createCommission: vi.fn(async () => null),
    updateCommission: vi.fn(async (id: string, data: Record<string, unknown>) => {
      const idx = commissions.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      commissions[idx] = { ...commissions[idx], ...data } as Commission;
      return commissions[idx];
    }),

    getUploads: vi.fn(async () => ({ data: [], total: 0 })),
    getUploadById: vi.fn(async () => null),
    resolveInsuranceCompanyId: vi.fn(async () => null),
    createUpload: vi.fn(async () => null),
    createCommissionBatch: vi.fn(async () => {}),
  };
});

// Import the mock reset helper
import { _resetMockData } from '../../repositories/mysql.repository.js';

beforeEach(() => {
  (_resetMockData as () => void)();
});

// ==================== Health Check ====================

describe('GET /api/health', () => {
  it('should return 200 with ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.error).toBeNull();
  });

  it('should follow standard response format { data, error, meta }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('meta');
  });
});

// ==================== Agents ====================

describe('Agents API', () => {
  describe('GET /api/v1/agents', () => {
    it('should return agents list', async () => {
      const res = await request(app).get('/api/v1/agents');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.error).toBeNull();
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('GET /api/v1/agents/:id', () => {
    it('should return agent by id', async () => {
      const res = await request(app).get('/api/v1/agents/a1111111-1111-1111-1111-111111111111');
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('דניאל אהרוני');
    });

    it('should return 404 for non-existent agent', async () => {
      const res = await request(app).get('/api/v1/agents/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Agent not found');
      expect(res.body.data).toBeNull();
    });
  });

  describe('POST /api/v1/agents', () => {
    it('should create a new agent with valid data', async () => {
      const res = await request(app)
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

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Test Agent');
      expect(res.body.data.id).toBeTruthy();
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/agents')
        .send({ name: 'Incomplete' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
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

      expect(res.status).toBe(400);
    });

    it('should return 409 for duplicate agentId', async () => {
      const res = await request(app)
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

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/v1/agents/:id', () => {
    it('should update agent fields', async () => {
      const res = await request(app)
        .put('/api/v1/agents/a1111111-1111-1111-1111-111111111111')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent agent', async () => {
      const res = await request(app)
        .put('/api/v1/agents/non-existent')
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/agents/:id', () => {
    it('should soft-delete the agent', async () => {
      const res = await request(app).delete('/api/v1/agents/a1111111-1111-1111-1111-111111111111');
      expect(res.status).toBe(200);
      expect(res.body.data.deletedAt).toBeTruthy();
    });

    it('should return 404 for non-existent agent', async () => {
      const res = await request(app).delete('/api/v1/agents/non-existent');
      expect(res.status).toBe(404);
    });
  });
});

// ==================== Tax ====================

describe('Tax API', () => {
  describe('POST /api/v1/tax/calculate', () => {
    it('should calculate tax for valid input', async () => {
      const res = await request(app)
        .post('/api/v1/tax/calculate')
        .send({ grossIncome: 20000, taxStatus: 'self_employed' });

      expect(res.status).toBe(200);
      expect(res.body.data.grossIncome).toBe(20000);
      expect(res.body.data.incomeTax).toBeGreaterThan(0);
      expect(res.body.data.nationalInsurance).toBeGreaterThan(0);
      expect(res.body.data.vat).toBeGreaterThan(0);
      expect(res.body.data.brackets).toBeInstanceOf(Array);
    });

    it('should return 400 for missing grossIncome', async () => {
      const res = await request(app)
        .post('/api/v1/tax/calculate')
        .send({ taxStatus: 'self_employed' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid taxStatus', async () => {
      const res = await request(app)
        .post('/api/v1/tax/calculate')
        .send({ grossIncome: 10000, taxStatus: 'invalid_status' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for negative income', async () => {
      const res = await request(app)
        .post('/api/v1/tax/calculate')
        .send({ grossIncome: -5000, taxStatus: 'employee' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/tax/brackets', () => {
    it('should return tax bracket reference data', async () => {
      const res = await request(app).get('/api/v1/tax/brackets');
      expect(res.status).toBe(200);
      expect(res.body.data.incomeTax).toBeInstanceOf(Array);
      expect(res.body.data.incomeTax.length).toBe(7);
      expect(res.body.data.vat).toBe(18);
      expect(res.body.meta.year).toBe(2026);
    });
  });
});

// ==================== Policies ====================

describe('Policies API', () => {
  describe('GET /api/v1/policies/stats/summary', () => {
    it('should return policy statistics', async () => {
      const res = await request(app).get('/api/v1/policies/stats/summary');
      expect(res.status).toBe(200);
      expect(res.body.data.totalPolicies).toBeGreaterThan(0);
      expect(res.body.data.activePolicies).toBeDefined();
      expect(res.body.data.totalPremium).toBeGreaterThan(0);
      expect(res.body.data.byType).toBeDefined();
      expect(res.body.data.byCompany).toBeDefined();
    });
  });

  describe('GET /api/v1/policies/:id', () => {
    it('should return policy by id', async () => {
      const res = await request(app).get('/api/v1/policies/p1111111-1111-1111-1111-111111111111');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('p1111111-1111-1111-1111-111111111111');
    });

    it('should return 404 for non-existent policy', async () => {
      const res = await request(app).get('/api/v1/policies/non-existent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Policy not found');
    });
  });

  describe('POST /api/v1/policies', () => {
    it('should create a new policy', async () => {
      const res = await request(app)
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

      expect(res.status).toBe(201);
      expect(res.body.data.policyId).toBe('POL-TEST-001');
      expect(res.body.data.status).toBe('active');
    });

    it('should return 400 for invalid agentId format', async () => {
      const res = await request(app)
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

      expect(res.status).toBe(400);
    });

    it('should return 400 for non-existent agent', async () => {
      const res = await request(app)
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

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Agent not found');
    });
  });

  describe('PUT /api/v1/policies/:id', () => {
    it('should update policy fields', async () => {
      const res = await request(app)
        .put('/api/v1/policies/p1111111-1111-1111-1111-111111111111')
        .send({ premiumAmount: 15000 });

      expect(res.status).toBe(200);
      expect(res.body.data.premiumAmount).toBe(15000);
    });

    it('should return 404 for non-existent policy', async () => {
      const res = await request(app)
        .put('/api/v1/policies/non-existent')
        .send({ premiumAmount: 5000 });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/policies/:id', () => {
    it('should cancel the policy', async () => {
      const res = await request(app).delete('/api/v1/policies/p1111111-1111-1111-1111-111111111111');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('should return 404 for non-existent policy', async () => {
      const res = await request(app).delete('/api/v1/policies/non-existent');
      expect(res.status).toBe(404);
    });
  });
});

// ==================== Commissions ====================

describe('Commissions API', () => {
  describe('GET /api/v1/commissions/by-company', () => {
    it('should return commissions grouped by insurance company', async () => {
      const res = await request(app).get('/api/v1/commissions/by-company');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0]).toHaveProperty('company');
      expect(res.body.data[0]).toHaveProperty('total');
    });
  });

  describe('GET /api/v1/commissions/:id', () => {
    it('should return commission by id', async () => {
      const res = await request(app).get('/api/v1/commissions/c1111111-1111-1111-1111-111111111111');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('c1111111-1111-1111-1111-111111111111');
    });

    it('should return 404 for non-existent commission', async () => {
      const res = await request(app).get('/api/v1/commissions/non-existent');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/commissions/:id', () => {
    it('should void (clawback) the commission', async () => {
      const res = await request(app).delete('/api/v1/commissions/c1111111-1111-1111-1111-111111111111');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('clawback');
    });

    it('should return 404 for non-existent commission', async () => {
      const res = await request(app).delete('/api/v1/commissions/non-existent');
      expect(res.status).toBe(404);
    });
  });
});

