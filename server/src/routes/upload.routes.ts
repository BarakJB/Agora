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
  upsertAgentCompanyNumber,
  getAgentByCompanyNumber,
  getAgentCompanyNumbers,
  getRegisteredAgentNumber,
} from '../repositories/mysql.repository.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.schemas.js';
import { uploadListQuerySchema, type UploadListQuery } from '../validators/upload.schemas.js';
import { parseExcelBuffer } from '../services/excel-parser.service.js';
import { parseAgreementFile } from '../services/agreement-parser.service.js';
import { parseMenoraZip, isMenoraZip, parseMenoraCsvBuffer, isMenoraCsvFileName } from '../services/menora-csv-parser.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const uploadRouter = Router();

// GET /api/v1/uploads/agent-numbers/:agentId — all company numbers for an agent
uploadRouter.get('/agent-numbers/:agentId', async (req, res, next) => {
  try {
    const { agentId } = req.params as { agentId: string };
    const numbers = await getAgentCompanyNumbers(agentId);
    res.json({ data: numbers, error: null, meta: null });
  } catch (err) {
    next(err);
  }
});

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

// Parse Excel commission file — returns parsed + validated data without persisting
uploadRouter.post('/parse', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ data: null, error: 'File is required (field name: file)', meta: null });
      return;
    }

    const ext = file.originalname.toLowerCase();
    const isZip = ext.endsWith('.zip');
    const isExcel = ext.endsWith('.xls') || ext.endsWith('.xlsx');
    const isCsv = ext.endsWith('.csv');

    if (!isExcel && !isZip && !isCsv) {
      res.status(400).json({ data: null, error: 'Supported formats: XLS, XLSX, ZIP, CSV', meta: null });
      return;
    }

    // Handle CSV files (Menora format — Windows-1255 encoded)
    if (isCsv) {
      try {
        const result = parseMenoraCsvBuffer(file.buffer, file.originalname);
        const results = [result];
        const totalRecords = result.records.length;
        const totalErrors = result.errors.length;
        res.json({
          data: results,
          error: null,
          meta: {
            fileName: file.originalname,
            fileSize: file.size,
            sheetsDetected: 1,
            totalRecords,
            totalErrors,
            isAgreement: false,
            detectedCompany: result.detectedCompany,
          },
        });
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to parse CSV file';
        res.status(400).json({ data: null, error: msg, meta: null });
        return;
      }
    }

    // Handle ZIP files (Menora format)
    if (isZip) {
      try {
        const results = parseMenoraZip(file.buffer, file.originalname);
        if (results.length === 0) {
          res.status(400).json({ data: null, error: 'ZIP file contains no parseable CSV files', meta: null });
          return;
        }
        const totalRecords = results.reduce((sum, r) => sum + r.records.length, 0);
        const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
        res.json({
          data: results,
          error: null,
          meta: {
            fileName: file.originalname,
            fileSize: file.size,
            sheetsDetected: results.length,
            totalRecords,
            totalErrors,
            isAgreement: false,
            detectedCompany: 'מנורה מבטחים',
          },
        });
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to parse ZIP file';
        res.status(400).json({ data: null, error: msg, meta: null });
        return;
      }
    }

    // agentId comes from JWT (set by requireAuth middleware)
    const agentId = res.locals.agentId as string | undefined;
    const insuranceCompanyCode = req.body.insuranceCompany as string | undefined;

    // Try commission reports first, fallback to agreement parser
    let results;
    let isAgreement = false;
    let agreementAgentNumber: string | null = null;
    let agreementAgentTaxId: string | null = null;
    let skippedDueMismatch = 0;
    let mismatchWarning: string | null = null;

    try {
      results = parseExcelBuffer(file.buffer);

      // Filter records by registered agent number
      if (agentId && insuranceCompanyCode) {
        const insuranceCompanyId = await resolveInsuranceCompanyId(insuranceCompanyCode);
        if (insuranceCompanyId) {
          const registeredNumber = await getRegisteredAgentNumber(agentId, insuranceCompanyId);

          if (registeredNumber !== null) {
            // Filter out records whose agent number doesn't match
            for (const sheet of results) {
              const before = sheet.records.length;
              sheet.records = sheet.records.filter(
                (rec) => !rec.agentNumber || rec.agentNumber === registeredNumber,
              );
              skippedDueMismatch += before - sheet.records.length;
            }
            if (skippedDueMismatch > 0) {
              mismatchWarning = `${skippedDueMismatch} שורות לא נכללו בחישוב — מספר סוכן בקובץ אינו תואם למספר הרשום שלך (${registeredNumber})`;
            }
          } else {
            // No registered number yet — register from first valid record
            const firstNumber = results
              .flatMap((r) => r.records)
              .find((rec) => rec.agentNumber)?.agentNumber ?? null;

            if (firstNumber) {
              const owner = await getAgentByCompanyNumber(insuranceCompanyId, firstNumber);
              if (owner && owner.agentId !== agentId) {
                // Number belongs to another agent — filter all records with this number
                for (const sheet of results) {
                  const before = sheet.records.length;
                  sheet.records = sheet.records.filter((rec) => !rec.agentNumber);
                  skippedDueMismatch += before - sheet.records.length;
                }
                mismatchWarning = `${skippedDueMismatch} שורות לא נכללו — מספר סוכן ${firstNumber} רשום על שם סוכן אחר`;
              } else {
                await upsertAgentCompanyNumber(agentId, insuranceCompanyId, firstNumber);
              }
            }
          }
        }
      }
    } catch (commissionErr) {
      // Not a commission file — try agreement parser
      try {
        const agreement = parseAgreementFile(file.buffer);
        isAgreement = true;
        agreementAgentNumber = agreement.agentNumber;
        agreementAgentTaxId = agreement.agentTaxId;

        // Save agent-company mapping when agentId + company are known
        if (agentId && insuranceCompanyCode) {
          const insuranceCompanyId = await resolveInsuranceCompanyId(insuranceCompanyCode);
          if (insuranceCompanyId && agreement.agentNumber) {
            // Verify ת.ז. in file matches authenticated agent
            const agent = await getAgentById(agentId);
            if (agent && agreement.agentTaxId && agent.agentId !== agreement.agentTaxId) {
              res.status(403).json({
                data: null,
                error: `ת.ז. בהסכם (${agreement.agentTaxId}) אינה תואמת לסוכן המחובר`,
                meta: null,
              });
              return;
            }

            const registeredNumber = await getRegisteredAgentNumber(agentId, insuranceCompanyId);
            if (registeredNumber !== null && registeredNumber !== agreement.agentNumber) {
              res.status(403).json({
                data: null,
                error: `מספר סוכן בהסכם (${agreement.agentNumber}) שונה מהמספר הרשום (${registeredNumber})`,
                meta: null,
              });
              return;
            }
            await upsertAgentCompanyNumber(agentId, insuranceCompanyId, agreement.agentNumber);
          }
        }

        results = [{
          reportType: 'agreement' as const,
          sheetName: 'הסכם עמלות',
          records: agreement.rates.map((r) => ({
            id: '',
            reportType: 'agreement' as const,
            agentNumber: agreement.agentNumber,
            agentName: agreement.agentName,
            policyNumber: null,
            branch: r.product,
            subBranch: r.commissionType,
            productName: r.company,
            premiumBase: null,
            amount: r.rate ?? 0,
            rate: r.rate,
            collectionFee: null,
            advanceAmount: null,
            advanceBalance: null,
            amountBeforeVat: null,
            amountWithVat: null,
            accumulationBalance: null,
            managementFeePct: null,
            managementFeeAmount: null,
            transactionType: r.isFixedAmount ? 'fixed' : 'percentage',
            commissionSource: null,
            employerName: null,
            employerId: null,
            insuredName: null,
            insuredId: null,
            productionMonth: null,
            processingMonth: null,
            fundType: null,
            planType: null,
            paymentAmount: null,
            contractNumber: null,
            rawRow: {},
          })),
          errors: [],
          totalRows: agreement.rates.length,
          skippedRows: 0,
          detectedCompany: null,
        }];
      } catch {
        // Neither commission nor agreement
        const msg = commissionErr instanceof Error ? commissionErr.message : 'Unknown file format';
        res.status(400).json({ data: null, error: msg, meta: null });
        return;
      }
    }

    const totalRecords = results.reduce((sum, r) => sum + r.records.length, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const detectedCompany = results.find((r) => r.detectedCompany)?.detectedCompany || null;

    res.json({
      data: results,
      error: null,
      meta: {
        fileName: file.originalname,
        fileSize: file.size,
        sheetsDetected: results.length,
        totalRecords,
        totalErrors,
        isAgreement,
        detectedCompany,
        agentNumber: agreementAgentNumber,
        agentTaxId: agreementAgentTaxId,
        skippedDueMismatch,
        mismatchWarning,
      },
    });
  } catch (err) {
    next(err);
  }
});
