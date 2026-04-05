import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import {
  getUploads,
  getUploadById,
  getAgentById,
  createUpload,
  createCommissionBatch,
  resolveInsuranceCompanyId,
} from '../repositories/mysql.repository.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.schemas.js';
import { uploadListQuerySchema, type UploadListQuery } from '../validators/upload.schemas.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const uploadRouter = Router();

uploadRouter.get(
  '/',
  validate({ query: uploadListQuerySchema }),
  async (req, res, next) => {
    try {
      const { page, limit } = res.locals.parsedQuery as UploadListQuery;
      const { data, total } = await getUploads({ page, limit });

      res.json({
        data,
        error: null,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  },
);

uploadRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const uploadRecord = await getUploadById(id);
      if (!uploadRecord) {
        res.status(404).json({ data: null, error: 'Upload not found', meta: null });
        return;
      }
      res.json({ data: uploadRecord, error: null, meta: null });
    } catch (err) {
      next(err);
    }
  },
);

uploadRouter.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ data: null, error: 'File is required (field name: file)', meta: null });
      return;
    }

    const insuranceCompany = req.body.insuranceCompany as string;
    if (!insuranceCompany) {
      res.status(400).json({ data: null, error: 'insuranceCompany is required', meta: null });
      return;
    }

    const agentId = req.body.agentId as string;
    if (!agentId) {
      res.status(400).json({ data: null, error: 'agentId is required', meta: null });
      return;
    }

    const agent = await getAgentById(agentId);
    if (!agent) {
      res.status(400).json({ data: null, error: 'Agent not found', meta: null });
      return;
    }

    const insuranceCompanyId = await resolveInsuranceCompanyId(insuranceCompany);

    const uploadId = uuid();

    const csvContent = file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      const errorUpload = await createUpload(uploadId, {
        agentId, insuranceCompany, fileName: file.originalname,
        recordCount: 0, status: 'error',
        errorMessage: 'CSV must have a header row and at least one data row',
      });
      res.status(400).json({ data: errorUpload, error: 'Invalid CSV', meta: null });
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const requiredHeaders = ['policy_id', 'type', 'amount', 'rate', 'premium_base', 'period', 'payment_date'];
    const missing = requiredHeaders.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      const errorMsg = `Missing CSV columns: ${missing.join(', ')}`;
      const errorUpload = await createUpload(uploadId, {
        agentId, insuranceCompany, fileName: file.originalname,
        recordCount: 0, status: 'error', errorMessage: errorMsg,
      });
      res.status(400).json({ data: errorUpload, error: errorMsg, meta: null });
      return;
    }

    const dataRows = lines.slice(1);
    const commissionRows: Array<{
      id: string; policyId: string; agentId: string; insuranceCompanyId: string;
      type: string; amount: number; rate: number; premiumBase: number;
      period: string; paymentDate: string;
    }> = [];

    for (const row of dataRows) {
      const values = row.split(',').map((v) => v.trim());
      const record: Record<string, string> = {};
      headers.forEach((h, i) => { record[h] = values[i] ?? ''; });

      commissionRows.push({
        id: uuid(),
        policyId: record['policy_id'],
        agentId,
        insuranceCompanyId: insuranceCompanyId ?? '',
        type: record['type'],
        amount: parseFloat(record['amount']) || 0,
        rate: parseFloat(record['rate']) || 0,
        premiumBase: parseFloat(record['premium_base']) || 0,
        period: record['period'],
        paymentDate: record['payment_date'],
      });
    }

    await createCommissionBatch(commissionRows);

    const uploadRecord = await createUpload(uploadId, {
      agentId, insuranceCompany, fileName: file.originalname,
      recordCount: commissionRows.length, status: 'completed',
    });

    res.status(201).json({
      data: uploadRecord,
      error: null,
      meta: { commissionsCreated: commissionRows.length },
    });
  } catch (err) {
    next(err);
  }
});
