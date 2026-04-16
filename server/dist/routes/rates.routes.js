"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ratesRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const XLSX = __importStar(require("xlsx"));
const mysql_repository_js_1 = require("../repositories/mysql.repository.js");
const commission_template_service_js_1 = require("../services/commission-template.service.js");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
exports.ratesRouter = (0, express_1.Router)();
// GET /api/v1/rates/template — download blank Excel template
exports.ratesRouter.get('/template', (_req, res) => {
    const buf = (0, commission_template_service_js_1.generateCommissionTemplate)();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="agora_commission_template.xlsx"');
    res.send(buf);
});
// GET /api/v1/rates/sample — download filled sample with example rates
exports.ratesRouter.get('/sample', (_req, res) => {
    const buf = (0, commission_template_service_js_1.generateCommissionTemplate)('לדוגמה', true);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="agora_sample_commission_agreement.xlsx"');
    res.send(buf);
});
// GET /api/v1/rates — get authenticated agent's commission rates
exports.ratesRouter.get('/', async (req, res, next) => {
    try {
        const agentId = res.locals.agentId;
        if (!agentId) {
            res.status(401).json({ data: null, error: 'Unauthorized', meta: null });
            return;
        }
        const rates = await (0, mysql_repository_js_1.getAgentCommissionRates)(agentId);
        res.json({ data: rates, error: null, meta: { total: rates.length } });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/v1/rates — save/update commission rates (manual edit from settings)
exports.ratesRouter.put('/', async (req, res, next) => {
    try {
        const agentId = res.locals.agentId;
        if (!agentId) {
            res.status(401).json({ data: null, error: 'Unauthorized', meta: null });
            return;
        }
        const { rates } = req.body;
        if (!Array.isArray(rates)) {
            res.status(400).json({ data: null, error: 'rates must be an array', meta: null });
            return;
        }
        // Resolve company names → IDs
        const resolved = [];
        for (const r of rates) {
            const id = await (0, mysql_repository_js_1.resolveInsuranceCompanyId)(r.company);
            if (!id)
                continue;
            resolved.push({
                insuranceCompanyId: id,
                productType: r.productType,
                commissionType: r.commissionType,
                rate: r.rate,
                isFixedAmount: r.isFixedAmount,
            });
        }
        await (0, mysql_repository_js_1.upsertAgentCommissionRates)(agentId, resolved);
        const updated = await (0, mysql_repository_js_1.getAgentCommissionRates)(agentId);
        res.json({ data: updated, error: null, meta: { saved: resolved.length } });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/rates/upload — upload filled-in template → parse and save rates
exports.ratesRouter.post('/upload', upload.single('file'), async (req, res, next) => {
    try {
        const agentId = res.locals.agentId;
        if (!agentId) {
            res.status(401).json({ data: null, error: 'Unauthorized', meta: null });
            return;
        }
        const file = req.file;
        if (!file) {
            res.status(400).json({ data: null, error: 'File is required', meta: null });
            return;
        }
        const wb = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = wb.SheetNames.find((n) => n.includes('עמלות') || n.includes('התחשבנות')) ?? wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const rates = (0, commission_template_service_js_1.parseCommissionAgreementSheet)(raw);
        if (rates.length === 0) {
            res.status(400).json({ data: null, error: 'לא נמצאו שיעורי עמלות בקובץ', meta: null });
            return;
        }
        // Resolve company names → IDs
        const resolved = [];
        const unknownCompanies = [];
        for (const r of rates) {
            const id = await (0, mysql_repository_js_1.resolveInsuranceCompanyId)(r.company);
            if (!id) {
                if (!unknownCompanies.includes(r.company))
                    unknownCompanies.push(r.company);
                continue;
            }
            resolved.push({
                insuranceCompanyId: id,
                productType: r.product,
                commissionType: r.commissionType,
                rate: r.rate,
                isFixedAmount: r.isFixedAmount,
            });
        }
        await (0, mysql_repository_js_1.upsertAgentCommissionRates)(agentId, resolved);
        const updated = await (0, mysql_repository_js_1.getAgentCommissionRates)(agentId);
        res.json({
            data: updated,
            error: null,
            meta: {
                parsed: rates.length,
                saved: resolved.length,
                skipped: rates.length - resolved.length,
                unknownCompanies,
                companies: [...new Set(rates.map((r) => r.company))],
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// Expose COMPANIES list for frontend
exports.ratesRouter.get('/companies', (_req, res) => {
    res.json({ data: [...commission_template_service_js_1.COMPANIES], error: null, meta: null });
});
//# sourceMappingURL=rates.routes.js.map