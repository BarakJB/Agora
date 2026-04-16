import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import {
  getAgentCommissionRates,
  upsertAgentCommissionRates,
  resolveInsuranceCompanyId,
} from '../repositories/mysql.repository.js';
import {
  generateCommissionTemplate,
  parseCommissionAgreementSheet,
  COMPANIES,
} from '../services/commission-template.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const ratesRouter = Router();

// GET /api/v1/rates/template — download blank Excel template
ratesRouter.get('/template', (_req, res) => {
  const buf = generateCommissionTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="agora_commission_template.xlsx"');
  res.send(buf);
});

// GET /api/v1/rates — get authenticated agent's commission rates
ratesRouter.get('/', async (req, res, next) => {
  try {
    const agentId = res.locals.agentId as string | undefined;
    if (!agentId) {
      res.status(401).json({ data: null, error: 'Unauthorized', meta: null });
      return;
    }
    const rates = await getAgentCommissionRates(agentId);
    res.json({ data: rates, error: null, meta: { total: rates.length } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/rates — save/update commission rates (manual edit from settings)
ratesRouter.put('/', async (req, res, next) => {
  try {
    const agentId = res.locals.agentId as string | undefined;
    if (!agentId) {
      res.status(401).json({ data: null, error: 'Unauthorized', meta: null });
      return;
    }

    const { rates } = req.body as {
      rates: Array<{
        company: string;
        productType: string;
        commissionType: 'נפרעים' | 'היקף';
        rate: number | null;
        isFixedAmount: boolean;
      }>;
    };

    if (!Array.isArray(rates)) {
      res.status(400).json({ data: null, error: 'rates must be an array', meta: null });
      return;
    }

    // Resolve company names → IDs
    const resolved: Array<{
      insuranceCompanyId: string;
      productType: string;
      commissionType: 'נפרעים' | 'היקף';
      rate: number | null;
      isFixedAmount: boolean;
    }> = [];

    for (const r of rates) {
      const id = await resolveInsuranceCompanyId(r.company);
      if (!id) continue;
      resolved.push({
        insuranceCompanyId: id,
        productType: r.productType,
        commissionType: r.commissionType,
        rate: r.rate,
        isFixedAmount: r.isFixedAmount,
      });
    }

    await upsertAgentCommissionRates(agentId, resolved);
    const updated = await getAgentCommissionRates(agentId);
    res.json({ data: updated, error: null, meta: { saved: resolved.length } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/rates/upload — upload filled-in template → parse and save rates
ratesRouter.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    const agentId = res.locals.agentId as string | undefined;
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
    const sheetName = wb.SheetNames.find((n) =>
      n.includes('עמלות') || n.includes('התחשבנות'),
    ) ?? wb.SheetNames[0];

    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
    const rates = parseCommissionAgreementSheet(raw);

    if (rates.length === 0) {
      res.status(400).json({ data: null, error: 'לא נמצאו שיעורי עמלות בקובץ', meta: null });
      return;
    }

    // Resolve company names → IDs
    const resolved: Array<{
      insuranceCompanyId: string;
      productType: string;
      commissionType: 'נפרעים' | 'היקף';
      rate: number | null;
      isFixedAmount: boolean;
    }> = [];

    const unknownCompanies: string[] = [];

    for (const r of rates) {
      const id = await resolveInsuranceCompanyId(r.company);
      if (!id) {
        if (!unknownCompanies.includes(r.company)) unknownCompanies.push(r.company);
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

    await upsertAgentCommissionRates(agentId, resolved);
    const updated = await getAgentCommissionRates(agentId);

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
  } catch (err) {
    next(err);
  }
});

// Expose COMPANIES list for frontend
ratesRouter.get('/companies', (_req, res) => {
  res.json({ data: [...COMPANIES], error: null, meta: null });
});
