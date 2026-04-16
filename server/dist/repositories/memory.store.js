"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const uuid_1 = require("uuid");
// In-memory store for development. Replace with MySQL repository later.
class MemoryStore {
    constructor() {
        this.agents = new Map();
        this.policies = new Map();
        this.commissions = new Map();
        this.uploads = new Map();
        this.seed();
    }
    seed() {
        const agentId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const agent = {
            id: agentId,
            agentId: '052998432',
            agencyId: 'AG-001',
            name: 'דניאל אהרוני',
            email: 'd.aharoni@agora.co.il',
            phone: '054-9876543',
            licenseNumber: '052-998432-1',
            taxId: '052998432',
            taxStatus: 'self_employed',
            niiRate: 17.83,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        };
        this.agents.set(agentId, agent);
        const policiesData = [
            { client: 'ישראל שראבי', clientId: '301234567', type: 'managers_insurance', company: 'הראל', premium: 12400, commPct: 15, recurPct: 2, date: '2026-01-14' },
            { client: 'מרים רפאלי', clientId: '302345678', type: 'pension', company: 'מגדל', premium: 8200, commPct: 15, recurPct: 1.5, date: '2026-01-12' },
            { client: 'דניאל גולדשטיין', clientId: '303456789', type: 'health', company: 'הפניקס', premium: 3500, commPct: 15, recurPct: 3, date: '2026-01-10' },
            { client: 'אילנה לוי', clientId: '304567890', type: 'education_fund', company: 'כלל', premium: 15000, commPct: 15, recurPct: 1, date: '2026-01-09' },
            { client: 'יוסף חדד', clientId: '305678901', type: 'life_insurance', company: 'מנורה מבטחים', premium: 9800, commPct: 15, recurPct: 2.5, date: '2026-01-07' },
            { client: 'שרה כהן', clientId: '306789012', type: 'pension', company: 'הראל', premium: 11000, commPct: 12, recurPct: 1.5, date: '2026-02-05' },
            { client: 'משה ביטון', clientId: '307890123', type: 'general', company: 'הפניקס', premium: 6500, commPct: 10, recurPct: 0, date: '2026-02-15' },
            { client: 'רחל אברהם', clientId: '308901234', type: 'health', company: 'מגדל', premium: 4200, commPct: 18, recurPct: 3, date: '2026-03-01' },
            { client: 'אברהם דוד', clientId: '309012345', type: 'managers_insurance', company: 'כלל', premium: 18500, commPct: 14, recurPct: 2, date: '2026-03-10' },
            { client: 'נועה פרידמן', clientId: '310123456', type: 'life_insurance', company: 'הראל', premium: 7800, commPct: 16, recurPct: 2.5, date: '2026-03-20' },
        ];
        for (const p of policiesData) {
            const id = (0, uuid_1.v4)();
            this.policies.set(id, {
                id,
                agentId,
                policyId: `POL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                productType: p.type,
                clientName: p.client,
                clientId: p.clientId,
                startDate: p.date,
                cancelDate: null,
                premiumAmount: p.premium,
                premiumFrequency: 'monthly',
                commissionPct: p.commPct,
                recurringPct: p.recurPct,
                volumePct: 0,
                contractId: null,
                insuranceCompany: p.company,
                status: 'active',
                createdAt: now,
                updatedAt: now,
            });
        }
        // Seed some commissions
        for (const [, policy] of this.policies) {
            const commId = (0, uuid_1.v4)();
            this.commissions.set(commId, {
                id: commId,
                policyId: policy.id,
                agentId,
                type: 'one_time',
                amount: policy.premiumAmount * (policy.commissionPct / 100),
                rate: policy.commissionPct,
                premiumBase: policy.premiumAmount,
                period: policy.startDate.substring(0, 7),
                paymentDate: policy.startDate,
                status: 'paid',
                insuranceCompany: policy.insuranceCompany,
                createdAt: now,
            });
            if (policy.recurringPct > 0) {
                const recId = (0, uuid_1.v4)();
                this.commissions.set(recId, {
                    id: recId,
                    policyId: policy.id,
                    agentId,
                    type: 'recurring',
                    amount: policy.premiumAmount * (policy.recurringPct / 100),
                    rate: policy.recurringPct,
                    premiumBase: policy.premiumAmount,
                    period: '2026-03',
                    paymentDate: '2026-03-28',
                    status: 'paid',
                    insuranceCompany: policy.insuranceCompany,
                    createdAt: now,
                });
            }
        }
        // Seed uploads
        const uploadsData = [
            { name: 'commissions_harel_0326.csv', company: 'הראל', date: '2026-03-12', records: 1240, status: 'completed' },
            { name: 'migdal_ledger_q1.csv', company: 'מגדל', date: '2026-03-08', records: 842, status: 'completed' },
            { name: 'error_report_phoenix.csv', company: 'הפניקס', date: '2026-03-01', records: 0, status: 'error' },
        ];
        for (const u of uploadsData) {
            const id = (0, uuid_1.v4)();
            this.uploads.set(id, {
                id,
                fileName: u.name,
                insuranceCompany: u.company,
                uploadDate: u.date,
                recordCount: u.records,
                status: u.status,
                errorMessage: u.status === 'error' ? 'Invalid CSV format' : undefined,
            });
        }
    }
}
exports.store = new MemoryStore();
//# sourceMappingURL=memory.store.js.map