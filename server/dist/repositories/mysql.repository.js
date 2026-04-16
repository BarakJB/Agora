"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._resetMockData = _resetMockData;
exports.getAllAgents = getAllAgents;
exports.getAgentById = getAgentById;
exports.getPolicies = getPolicies;
exports.getPolicyById = getPolicyById;
exports.getPolicyStats = getPolicyStats;
exports.countPolicies = countPolicies;
exports.countNewPolicies = countNewPolicies;
exports.getCommissions = getCommissions;
exports.getCommissionsByPeriod = getCommissionsByPeriod;
exports.getCommissionsByCompany = getCommissionsByCompany;
exports.getUploads = getUploads;
exports.getUploadById = getUploadById;
exports.findAgentDuplicate = findAgentDuplicate;
exports.createAgent = createAgent;
exports.updateAgent = updateAgent;
exports.softDeleteAgent = softDeleteAgent;
exports.createPolicy = createPolicy;
exports.updatePolicy = updatePolicy;
exports.getPolicyStatusById = getPolicyStatusById;
exports.getCommissionById = getCommissionById;
exports.createCommission = createCommission;
exports.updateCommission = updateCommission;
exports.getCommissionStatusById = getCommissionStatusById;
exports.createUpload = createUpload;
exports.createCommissionBatch = createCommissionBatch;
exports.findAgentByEmail = findAgentByEmail;
exports.createAgentWithPassword = createAgentWithPassword;
exports.resolveInsuranceCompanyId = resolveInsuranceCompanyId;
exports.getContractForDeal = getContractForDeal;
exports.getActivePoliciesForAgent = getActivePoliciesForAgent;
exports.getCommissionsForPeriodRange = getCommissionsForPeriodRange;
exports.getAgentPolicyCountByType = getAgentPolicyCountByType;
exports.createCommissionReport = createCommissionReport;
exports.getCommissionReportsByUpload = getCommissionReportsByUpload;
exports.getCommissionRules = getCommissionRules;
exports.upsertAgentCompanyNumber = upsertAgentCompanyNumber;
exports.getRegisteredAgentNumber = getRegisteredAgentNumber;
exports.getAgentByCompanyNumber = getAgentByCompanyNumber;
exports.getAgentCompanyNumbers = getAgentCompanyNumbers;
exports.getAgentCommissionRates = getAgentCommissionRates;
exports.upsertAgentCommissionRates = upsertAgentCommissionRates;
const database_js_1 = __importDefault(require("../config/database.js"));
// No-op in production; overridden by vi.mock in tests
function _resetMockData() { }
// Row-to-entity mappers (snake_case DB → camelCase TS)
function toAgent(row) {
    return {
        id: row.id,
        agentId: row.agent_id,
        agencyId: row.agency_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        licenseNumber: row.license_number,
        taxId: row.tax_id,
        taxStatus: row.tax_status,
        niiRate: Number(row.nii_rate),
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
        updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
        deletedAt: row.deleted_at?.toISOString?.() ?? row.deleted_at ?? null,
    };
}
function toPolicy(row) {
    return {
        id: row.id,
        agentId: row.agent_id,
        policyId: row.policy_number,
        productType: row.product_type,
        clientName: row.client_name,
        clientId: row.client_id_number,
        startDate: row.start_date instanceof Date
            ? row.start_date.toISOString().split('T')[0]
            : row.start_date,
        cancelDate: row.cancel_date instanceof Date
            ? row.cancel_date.toISOString().split('T')[0]
            : row.cancel_date ?? null,
        premiumAmount: Number(row.premium_amount),
        premiumFrequency: row.premium_frequency,
        commissionPct: Number(row.commission_pct),
        recurringPct: Number(row.recurring_pct),
        volumePct: Number(row.volume_pct),
        contractId: row.contract_id ?? null,
        insuranceCompany: row.insurance_company_name,
        status: row.status,
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
        updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    };
}
function toCommission(row) {
    return {
        id: row.id,
        policyId: row.policy_id,
        agentId: row.agent_id,
        type: row.type,
        amount: Number(row.amount),
        rate: Number(row.rate),
        premiumBase: Number(row.premium_base),
        period: row.period,
        paymentDate: row.payment_date instanceof Date
            ? row.payment_date.toISOString().split('T')[0]
            : row.payment_date,
        status: row.status,
        insuranceCompany: row.insurance_company_name,
        createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    };
}
function toUpload(row) {
    return {
        id: row.id,
        fileName: row.file_name,
        insuranceCompany: row.insurance_company_name,
        uploadDate: row.upload_date instanceof Date
            ? row.upload_date.toISOString().split('T')[0]
            : row.upload_date,
        recordCount: Number(row.record_count),
        status: row.status,
        errorMessage: row.error_message ?? undefined,
    };
}
// ============ Agents ============
async function getAllAgents() {
    const [rows] = await database_js_1.default.query('SELECT id, agent_id, agency_id, name, email, phone, license_number, tax_id, tax_status, nii_rate, created_at, updated_at, deleted_at FROM agents WHERE deleted_at IS NULL');
    return rows.map(toAgent);
}
async function getAgentById(id) {
    const [rows] = await database_js_1.default.query('SELECT id, agent_id, agency_id, name, email, phone, license_number, tax_id, tax_status, nii_rate, created_at, updated_at, deleted_at FROM agents WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows.length > 0 ? toAgent(rows[0]) : null;
}
// ============ Policies ============
const POLICY_SELECT = `
  SELECT p.id, p.agent_id, p.policy_number, p.product_type,
         c.name AS client_name, c.id_number AS client_id_number,
         p.start_date, p.cancel_date, p.premium_amount, p.premium_frequency,
         p.commission_pct, p.recurring_pct, p.volume_pct,
         p.contract_id, ic.name AS insurance_company_name,
         p.status, p.created_at, p.updated_at
  FROM policies p
  JOIN clients c ON c.id = p.client_id
  JOIN insurance_companies ic ON ic.id = p.insurance_company_id
`;
async function getPolicies(filters) {
    const conditions = [];
    const params = [];
    if (filters.type) {
        conditions.push('p.product_type = ?');
        params.push(filters.type);
    }
    if (filters.company) {
        conditions.push('ic.name = ?');
        params.push(filters.company);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = await database_js_1.default.query(`SELECT COUNT(*) AS total FROM policies p JOIN insurance_companies ic ON ic.id = p.insurance_company_id ${where}`, params);
    const total = countRows[0].total;
    const offset = (filters.page - 1) * filters.limit;
    const [rows] = await database_js_1.default.query(`${POLICY_SELECT} ${where} ORDER BY p.start_date DESC LIMIT ? OFFSET ?`, [...params, filters.limit, offset]);
    return { data: rows.map(toPolicy), total };
}
async function getPolicyById(id) {
    const [rows] = await database_js_1.default.query(`${POLICY_SELECT} WHERE p.id = ?`, [id]);
    return rows.length > 0 ? toPolicy(rows[0]) : null;
}
async function getPolicyStats() {
    const [totalRows] = await database_js_1.default.query('SELECT COUNT(*) AS total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS active, SUM(premium_amount) AS premium FROM policies', ['active']);
    const [typeRows] = await database_js_1.default.query('SELECT product_type, SUM(premium_amount) AS total FROM policies GROUP BY product_type');
    const [companyRows] = await database_js_1.default.query('SELECT ic.name, SUM(p.premium_amount) AS total FROM policies p JOIN insurance_companies ic ON ic.id = p.insurance_company_id GROUP BY ic.name');
    const byType = {};
    for (const row of typeRows) {
        byType[row.product_type] = Number(row.total);
    }
    const byCompany = {};
    for (const row of companyRows) {
        byCompany[row.name] = Number(row.total);
    }
    return {
        totalPolicies: totalRows[0].total,
        activePolicies: totalRows[0].active,
        totalPremium: Number(totalRows[0].premium),
        byType,
        byCompany,
    };
}
async function countPolicies() {
    const [rows] = await database_js_1.default.query('SELECT COUNT(*) AS total FROM policies');
    return rows[0].total;
}
async function countNewPolicies(period) {
    const [rows] = await database_js_1.default.query('SELECT COUNT(*) AS total FROM policies WHERE DATE_FORMAT(start_date, ?) = ?', ['%Y-%m', period]);
    return rows[0].total;
}
// ============ Commissions ============
const COMMISSION_SELECT = `
  SELECT cm.id, cm.policy_id, cm.agent_id, cm.type, cm.amount, cm.rate,
         cm.premium_base, cm.period, cm.payment_date, cm.status,
         ic.name AS insurance_company_name, cm.created_at
  FROM commissions cm
  JOIN insurance_companies ic ON ic.id = cm.insurance_company_id
`;
async function getCommissions(filters) {
    const conditions = [];
    const params = [];
    if (filters.period) {
        conditions.push('cm.period = ?');
        params.push(filters.period);
    }
    if (filters.type) {
        conditions.push('cm.type = ?');
        params.push(filters.type);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = await database_js_1.default.query(`SELECT COUNT(*) AS total FROM commissions cm ${where}`, params);
    const total = countRows[0].total;
    const offset = (filters.page - 1) * filters.limit;
    const [rows] = await database_js_1.default.query(`${COMMISSION_SELECT} ${where} ORDER BY cm.created_at DESC LIMIT ? OFFSET ?`, [...params, filters.limit, offset]);
    return { data: rows.map(toCommission), total };
}
async function getCommissionsByPeriod(period) {
    const [rows] = await database_js_1.default.query(`${COMMISSION_SELECT} WHERE cm.period = ?`, [period]);
    return rows.map(toCommission);
}
async function getCommissionsByCompany() {
    const [rows] = await database_js_1.default.query(`SELECT ic.name AS company, ROUND(SUM(cm.amount)) AS total
     FROM commissions cm
     JOIN insurance_companies ic ON ic.id = cm.insurance_company_id
     GROUP BY ic.name
     ORDER BY total DESC`);
    return rows.map((r) => ({ company: r.company, total: Number(r.total) }));
}
// ============ Uploads ============
const UPLOAD_SELECT = `
  SELECT u.id, u.file_name, ic.name AS insurance_company_name,
         u.upload_date, u.record_count, u.status, u.error_message
  FROM uploads u
  LEFT JOIN insurance_companies ic ON ic.id = u.insurance_company_id
`;
async function getUploads(filters) {
    const [countRows] = await database_js_1.default.query('SELECT COUNT(*) AS total FROM uploads');
    const total = countRows[0].total;
    const offset = (filters.page - 1) * filters.limit;
    const [rows] = await database_js_1.default.query(`${UPLOAD_SELECT} ORDER BY u.upload_date DESC LIMIT ? OFFSET ?`, [filters.limit, offset]);
    return { data: rows.map(toUpload), total };
}
async function getUploadById(id) {
    const [rows] = await database_js_1.default.query(`${UPLOAD_SELECT} WHERE u.id = ?`, [id]);
    return rows.length > 0 ? toUpload(rows[0]) : null;
}
// ============ Agent Writes ============
async function findAgentDuplicate(agentId, email, licenseNumber, phone, taxId) {
    const [rows] = await database_js_1.default.query(`SELECT
       MAX(CASE WHEN agent_id = ? THEN 'agent_id' END) AS by_agent_id,
       MAX(CASE WHEN email = ? THEN 'email' END) AS by_email,
       MAX(CASE WHEN license_number = ? THEN 'license_number' END) AS by_license,
       MAX(CASE WHEN phone = ? AND phone != '' THEN 'phone' END) AS by_phone,
       MAX(CASE WHEN tax_id = ? THEN 'tax_id' END) AS by_tax_id
     FROM agents WHERE deleted_at IS NULL
       AND (agent_id = ? OR email = ? OR license_number = ? OR (phone = ? AND phone != '') OR tax_id = ?)`, [agentId, email, licenseNumber, phone, taxId, agentId, email, licenseNumber, phone, taxId]);
    const row = rows[0];
    const field = row.by_agent_id ?? row.by_email ?? row.by_license ?? row.by_phone ?? row.by_tax_id ?? null;
    return { isDuplicate: field !== null, field };
}
async function createAgent(id, data) {
    await database_js_1.default.query(`INSERT INTO agents (id, agent_id, agency_id, name, email, phone, license_number, tax_id, tax_status, nii_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, data.agentId, data.agencyId, data.name, data.email, data.phone, data.licenseNumber, data.taxId, data.taxStatus, data.niiRate]);
    return (await getAgentById(id));
}
async function updateAgent(id, data) {
    const fieldMap = {
        agentId: 'agent_id', agencyId: 'agency_id', name: 'name', email: 'email',
        phone: 'phone', licenseNumber: 'license_number', taxId: 'tax_id',
        taxStatus: 'tax_status', niiRate: 'nii_rate',
    };
    const sets = [];
    const params = [];
    for (const [key, value] of Object.entries(data)) {
        const col = fieldMap[key];
        if (col && value !== undefined) {
            sets.push(`${col} = ?`);
            params.push(value);
        }
    }
    if (sets.length === 0)
        return getAgentById(id);
    params.push(id);
    await database_js_1.default.query(`UPDATE agents SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`, params);
    return getAgentById(id);
}
async function softDeleteAgent(id) {
    await database_js_1.default.query('UPDATE agents SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
    // Return with deletedAt set
    const [rows] = await database_js_1.default.query('SELECT id, agent_id, agency_id, name, email, phone, license_number, tax_id, tax_status, nii_rate, created_at, updated_at, deleted_at FROM agents WHERE id = ?', [id]);
    return rows.length > 0 ? toAgent(rows[0]) : null;
}
// ============ Policy Writes ============
async function createPolicy(id, data) {
    // Resolve insurance company id by name
    const [icRows] = await database_js_1.default.query('SELECT id FROM insurance_companies WHERE name = ? LIMIT 1', [data.insuranceCompany]);
    if (icRows.length === 0)
        return null;
    const insuranceCompanyId = icRows[0].id;
    // Resolve or create client
    const [clientRows] = await database_js_1.default.query('SELECT id FROM clients WHERE agent_id = ? AND id_number = ? LIMIT 1', [data.agentId, data.clientId]);
    let clientDbId;
    if (clientRows.length > 0) {
        clientDbId = clientRows[0].id;
    }
    else {
        const { v4: uuid } = await import('uuid');
        clientDbId = uuid();
        await database_js_1.default.query('INSERT INTO clients (id, agent_id, name, id_number) VALUES (?, ?, ?, ?)', [clientDbId, data.agentId, data.clientName, data.clientId]);
    }
    await database_js_1.default.query(`INSERT INTO policies (id, agent_id, client_id, insurance_company_id, contract_id, policy_number, product_type, start_date, premium_amount, premium_frequency, commission_pct, recurring_pct, volume_pct, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`, [id, data.agentId, clientDbId, insuranceCompanyId, data.contractId, data.policyId, data.productType, data.startDate, data.premiumAmount, data.premiumFrequency, data.commissionPct, data.recurringPct, data.volumePct]);
    return getPolicyById(id);
}
async function updatePolicy(id, data) {
    const fieldMap = {
        status: 'status', cancelDate: 'cancel_date', premiumAmount: 'premium_amount',
        premiumFrequency: 'premium_frequency', commissionPct: 'commission_pct',
        recurringPct: 'recurring_pct', volumePct: 'volume_pct', contractId: 'contract_id',
    };
    const sets = [];
    const params = [];
    for (const [key, value] of Object.entries(data)) {
        const col = fieldMap[key];
        if (col && value !== undefined) {
            sets.push(`${col} = ?`);
            params.push(value);
        }
    }
    if (sets.length === 0)
        return getPolicyById(id);
    params.push(id);
    await database_js_1.default.query(`UPDATE policies SET ${sets.join(', ')} WHERE id = ?`, params);
    return getPolicyById(id);
}
async function getPolicyStatusById(id) {
    const [rows] = await database_js_1.default.query('SELECT status FROM policies WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? rows[0].status : null;
}
// ============ Commission Writes ============
async function getCommissionById(id) {
    const [rows] = await database_js_1.default.query(`${COMMISSION_SELECT} WHERE cm.id = ?`, [id]);
    return rows.length > 0 ? toCommission(rows[0]) : null;
}
async function createCommission(id, data) {
    // Resolve insurance company id by name
    const [icRows] = await database_js_1.default.query('SELECT id FROM insurance_companies WHERE name = ? LIMIT 1', [data.insuranceCompany]);
    if (icRows.length === 0)
        return null;
    const insuranceCompanyId = icRows[0].id;
    await database_js_1.default.query(`INSERT INTO commissions (id, policy_id, agent_id, insurance_company_id, type, amount, rate, premium_base, period, payment_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`, [id, data.policyId, data.agentId, insuranceCompanyId, data.type, data.amount, data.rate, data.premiumBase, data.period, data.paymentDate]);
    return getCommissionById(id);
}
async function updateCommission(id, data) {
    const fieldMap = {
        amount: 'amount', rate: 'rate', status: 'status', paymentDate: 'payment_date',
    };
    const sets = [];
    const params = [];
    for (const [key, value] of Object.entries(data)) {
        const col = fieldMap[key];
        if (col && value !== undefined) {
            sets.push(`${col} = ?`);
            params.push(value);
        }
    }
    if (sets.length === 0)
        return getCommissionById(id);
    params.push(id);
    await database_js_1.default.query(`UPDATE commissions SET ${sets.join(', ')} WHERE id = ?`, params);
    return getCommissionById(id);
}
async function getCommissionStatusById(id) {
    const [rows] = await database_js_1.default.query('SELECT status FROM commissions WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? rows[0].status : null;
}
// ============ Upload Writes ============
async function createUpload(id, data) {
    // Resolve insurance company id by name
    const [icRows] = await database_js_1.default.query('SELECT id FROM insurance_companies WHERE name = ? LIMIT 1', [data.insuranceCompany]);
    const insuranceCompanyId = icRows.length > 0 ? icRows[0].id : null;
    await database_js_1.default.query(`INSERT INTO uploads (id, agent_id, insurance_company_id, file_name, record_count, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, data.agentId, insuranceCompanyId, data.fileName, data.recordCount, data.status, data.errorMessage ?? null]);
    return getUploadById(id);
}
async function createCommissionBatch(rows) {
    if (rows.length === 0)
        return;
    const values = rows.map((r) => [r.id, r.policyId, r.agentId, r.insuranceCompanyId, r.type, r.amount, r.rate, r.premiumBase, r.period, r.paymentDate, 'pending']);
    await database_js_1.default.query(`INSERT INTO commissions (id, policy_id, agent_id, insurance_company_id, type, amount, rate, premium_base, period, payment_date, status)
     VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`, values.flat());
}
// ============ Auth ============
async function findAgentByEmail(email) {
    const [rows] = await database_js_1.default.query('SELECT id, email, name, password_hash FROM agents WHERE email = ? AND deleted_at IS NULL LIMIT 1', [email]);
    if (rows.length === 0)
        return null;
    return { id: rows[0].id, email: rows[0].email, name: rows[0].name, passwordHash: rows[0].password_hash };
}
async function createAgentWithPassword(id, data) {
    await database_js_1.default.query(`INSERT INTO agents (id, agent_id, agency_id, name, email, phone, license_number, tax_id, tax_status, nii_rate, password_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, data.agentId, data.agencyId, data.name, data.email, data.phone, data.licenseNumber, data.taxId, data.taxStatus, data.niiRate, data.passwordHash]);
    return (await getAgentById(id));
}
async function resolveInsuranceCompanyId(name) {
    const [rows] = await database_js_1.default.query('SELECT id FROM insurance_companies WHERE name = ? LIMIT 1', [name]);
    return rows.length > 0 ? rows[0].id : null;
}
// ============ Contracts (for prediction engine) ============
async function getContractForDeal(agentId, insuranceCompany, productType, asOfDate) {
    const [rows] = await database_js_1.default.query(`SELECT c.commission_pct, c.recurring_pct, c.volume_pct
     FROM contracts c
     JOIN insurance_companies ic ON ic.id = c.insurance_company_id
     WHERE c.agent_id = ? AND ic.name = ? AND c.product_type = ?
       AND c.effective_from <= ? AND (c.effective_to IS NULL OR c.effective_to >= ?)
     ORDER BY c.effective_from DESC
     LIMIT 1`, [agentId, insuranceCompany, productType, asOfDate, asOfDate]);
    if (rows.length === 0)
        return null;
    return {
        commissionPct: Number(rows[0].commission_pct),
        recurringPct: Number(rows[0].recurring_pct),
        volumePct: Number(rows[0].volume_pct),
    };
}
async function getActivePoliciesForAgent(agentId) {
    const [rows] = await database_js_1.default.query(`${POLICY_SELECT} WHERE p.agent_id = ? AND p.status = 'active' ORDER BY p.start_date DESC LIMIT 5000`, [agentId]);
    return rows.map(toPolicy);
}
async function getCommissionsForPeriodRange(agentId, fromPeriod, toPeriod) {
    const [rows] = await database_js_1.default.query(`${COMMISSION_SELECT} WHERE cm.agent_id = ? AND cm.period >= ? AND cm.period <= ? ORDER BY cm.period ASC LIMIT 10000`, [agentId, fromPeriod, toPeriod]);
    return rows.map(toCommission);
}
async function getAgentPolicyCountByType(agentId, productType) {
    const [rows] = await database_js_1.default.query("SELECT COUNT(*) AS total FROM policies WHERE agent_id = ? AND product_type = ? AND status = 'active'", [agentId, productType]);
    return rows[0].total;
}
async function createCommissionReport(data) {
    await database_js_1.default.query(`INSERT INTO commission_reports
      (id, upload_id, agent_id, insurance_company_id, report_type, period,
       record_count, skipped_rows, error_count, total_commission, total_premium,
       sheet_name, error_details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        data.id, data.uploadId, data.agentId, data.insuranceCompanyId,
        data.reportType, data.period, data.recordCount, data.skippedRows,
        data.errorCount, data.totalCommission, data.totalPremium,
        data.sheetName, data.errorDetails ? JSON.stringify(data.errorDetails) : null,
    ]);
}
async function getCommissionReportsByUpload(uploadId) {
    const [rows] = await database_js_1.default.query(`SELECT id, upload_id, agent_id, insurance_company_id, report_type, period,
            record_count, skipped_rows, error_count, total_commission, total_premium,
            sheet_name, status, created_at
     FROM commission_reports
     WHERE upload_id = ?
     ORDER BY created_at ASC`, [uploadId]);
    return rows.map((r) => ({
        id: r.id,
        uploadId: r.upload_id,
        agentId: r.agent_id,
        insuranceCompanyId: r.insurance_company_id,
        reportType: r.report_type,
        period: r.period,
        recordCount: r.record_count,
        skippedRows: r.skipped_rows,
        errorCount: r.error_count,
        totalCommission: Number(r.total_commission),
        totalPremium: Number(r.total_premium),
        sheetName: r.sheet_name,
        status: r.status,
        createdAt: r.created_at?.toISOString?.() ?? r.created_at,
    }));
}
async function getCommissionRules(insuranceCompanyId, productType) {
    let sql = `SELECT id, insurance_company_id, product_type, rule_type,
                    delay_months, delay_business_days, rate_pct, description, is_active
             FROM commission_rules
             WHERE insurance_company_id = ? AND is_active = 1`;
    const params = [insuranceCompanyId];
    if (productType) {
        sql += ' AND product_type = ?';
        params.push(productType);
    }
    sql += ' ORDER BY product_type, rule_type';
    const [rows] = await database_js_1.default.query(sql, params);
    return rows.map((r) => ({
        id: r.id,
        insuranceCompanyId: r.insurance_company_id,
        productType: r.product_type,
        ruleType: r.rule_type,
        delayMonths: r.delay_months,
        delayBusinessDays: r.delay_business_days,
        ratePct: r.rate_pct != null ? Number(r.rate_pct) : null,
        description: r.description,
        isActive: Boolean(r.is_active),
    }));
}
/**
 * Save or update the agent number for a specific agent at a specific company.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE for idempotency.
 */
async function upsertAgentCompanyNumber(agentId, insuranceCompanyId, companyAgentNumber) {
    const id = (await import('uuid')).v4();
    await database_js_1.default.query(`INSERT INTO agent_company_numbers
       (id, agent_id, insurance_company_id, company_agent_number)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       company_agent_number = VALUES(company_agent_number),
       updated_at = CURRENT_TIMESTAMP`, [id, agentId, insuranceCompanyId, companyAgentNumber]);
}
/**
 * Get the registered agent number for a specific agent at a specific company.
 * Returns null if no mapping exists yet.
 */
async function getRegisteredAgentNumber(agentId, insuranceCompanyId) {
    const [rows] = await database_js_1.default.query('SELECT company_agent_number FROM agent_company_numbers WHERE agent_id = ? AND insurance_company_id = ? LIMIT 1', [agentId, insuranceCompanyId]);
    return rows.length > 0 ? rows[0].company_agent_number : null;
}
/**
 * Resolve which agent owns a given agent number at a specific company.
 * Used to validate that an uploaded file belongs to the authenticated agent.
 */
async function getAgentByCompanyNumber(insuranceCompanyId, companyAgentNumber) {
    const [rows] = await database_js_1.default.query(`SELECT acn.agent_id, a.agent_id AS tax_id
     FROM agent_company_numbers acn
     JOIN agents a ON a.id = acn.agent_id
     WHERE acn.insurance_company_id = ?
       AND acn.company_agent_number = ?
     LIMIT 1`, [insuranceCompanyId, companyAgentNumber]);
    if (rows.length === 0)
        return null;
    return { agentId: rows[0].agent_id, taxId: rows[0].tax_id };
}
/**
 * Get all company numbers registered for a given agent.
 */
async function getAgentCompanyNumbers(agentId) {
    const [rows] = await database_js_1.default.query(`SELECT acn.id, acn.agent_id, acn.insurance_company_id,
            ic.name AS insurance_company_name,
            acn.company_agent_number, acn.created_at, acn.updated_at
     FROM agent_company_numbers acn
     JOIN insurance_companies ic ON ic.id = acn.insurance_company_id
     WHERE acn.agent_id = ?
     ORDER BY ic.name`, [agentId]);
    return rows.map((r) => ({
        id: r.id,
        agentId: r.agent_id,
        insuranceCompanyId: r.insurance_company_id,
        insuranceCompanyName: r.insurance_company_name,
        companyAgentNumber: r.company_agent_number,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }));
}
async function getAgentCommissionRates(agentId) {
    const [rows] = await database_js_1.default.query(`SELECT acr.id, acr.agent_id, acr.insurance_company_id,
            ic.name AS insurance_company_name,
            acr.product_type, acr.commission_type,
            acr.rate, acr.is_fixed_amount, acr.is_active, acr.updated_at
     FROM agent_commission_rates acr
     JOIN insurance_companies ic ON ic.id = acr.insurance_company_id
     WHERE acr.agent_id = ?
     ORDER BY acr.product_type, acr.commission_type, ic.name`, [agentId]);
    return rows.map((r) => ({
        id: r.id,
        agentId: r.agent_id,
        insuranceCompanyId: r.insurance_company_id,
        insuranceCompanyName: r.insurance_company_name,
        productType: r.product_type,
        commissionType: r.commission_type,
        rate: r.rate !== null ? Number(r.rate) : null,
        isFixedAmount: r.is_fixed_amount === 1,
        isActive: r.is_active === 1,
        updatedAt: r.updated_at,
    }));
}
async function upsertAgentCommissionRates(agentId, rates) {
    if (rates.length === 0)
        return;
    const { v4: uuid } = await import('uuid');
    const values = rates.map((r) => [
        uuid(), agentId, r.insuranceCompanyId,
        r.productType, r.commissionType,
        r.rate, r.isFixedAmount ? 1 : 0,
    ]);
    await database_js_1.default.query(`INSERT INTO agent_commission_rates
       (id, agent_id, insurance_company_id, product_type, commission_type, rate, is_fixed_amount)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       rate            = VALUES(rate),
       is_fixed_amount = VALUES(is_fixed_amount),
       is_active       = 1,
       updated_at      = CURRENT_TIMESTAMP`, [values]);
}
//# sourceMappingURL=mysql.repository.js.map