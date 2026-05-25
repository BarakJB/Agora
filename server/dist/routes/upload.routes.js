"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const mysql_repository_js_1 = require("../repositories/mysql.repository.js");
const validate_js_1 = require("../middleware/validate.js");
const common_schemas_js_1 = require("../validators/common.schemas.js");
const upload_schemas_js_1 = require("../validators/upload.schemas.js");
const excel_parser_service_js_1 = require("../services/excel-parser.service.js");
const agreement_parser_service_js_1 = require("../services/agreement-parser.service.js");
const menora_csv_parser_service_js_1 = require("../services/menora-csv-parser.service.js");
const pdf_agreement_parser_service_js_1 = require("../services/pdf-agreement-parser.service.js");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
exports.uploadRouter = (0, express_1.Router)();
exports.uploadRouter.get('/agent-numbers/:agentId', async (req, res, next) => {
    try {
        const { agentId } = req.params;
        const numbers = await (0, mysql_repository_js_1.getAgentCompanyNumbers)(agentId);
        res.json({ data: numbers, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.uploadRouter.get('/agent-numbers', async (req, res, next) => {
    try {
        const agentId = res.locals.agentId;
        const numbers = await (0, mysql_repository_js_1.getAgentCompanyNumbersWithPortfolio)(agentId);
        res.json({ data: numbers, error: null, meta: { count: numbers.length } });
    }
    catch (err) {
        next(err);
    }
});
exports.uploadRouter.post('/agent-numbers', async (req, res, next) => {
    try {
        const agentId = res.locals.agentId;
        const { insuranceCompanyId, companyAgentNumber, portfolioType } = req.body;
        if (!insuranceCompanyId || !companyAgentNumber || !portfolioType) {
            res.status(400).json({ data: null, error: 'insuranceCompanyId, companyAgentNumber and portfolioType are required', meta: null });
            return;
        }
        if (portfolioType !== 'personal' && portfolioType !== 'partners') {
            res.status(400).json({ data: null, error: 'portfolioType must be personal or partners', meta: null });
            return;
        }
        await (0, mysql_repository_js_1.upsertAgentCompanyNumber)(agentId, insuranceCompanyId, companyAgentNumber, portfolioType);
        const updated = await (0, mysql_repository_js_1.getAgentNumbersByCompany)(agentId, insuranceCompanyId);
        res.json({ data: updated, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.uploadRouter.delete('/agent-numbers', async (req, res, next) => {
    try {
        const agentId = res.locals.agentId;
        const { insuranceCompanyId, portfolioType } = req.body;
        if (!insuranceCompanyId || !portfolioType) {
            res.status(400).json({ data: null, error: 'insuranceCompanyId and portfolioType are required', meta: null });
            return;
        }
        if (portfolioType !== 'personal' && portfolioType !== 'partners') {
            res.status(400).json({ data: null, error: 'portfolioType must be personal or partners', meta: null });
            return;
        }
        await (0, mysql_repository_js_1.deleteAgentCompanyNumber)(agentId, insuranceCompanyId, portfolioType);
        res.json({ data: null, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.uploadRouter.get('/', (0, validate_js_1.validate)({ query: upload_schemas_js_1.uploadListQuerySchema }), async (req, res, next) => {
    try {
        const { page, limit } = res.locals.parsedQuery;
        const { data, total } = await (0, mysql_repository_js_1.getUploads)({ page, limit });
        res.json({
            data,
            error: null,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.uploadRouter.get('/:id', (0, validate_js_1.validate)({ params: common_schemas_js_1.idParamSchema }), async (req, res, next) => {
    try {
        const id = req.params.id;
        const uploadRecord = await (0, mysql_repository_js_1.getUploadById)(id);
        if (!uploadRecord) {
            res.status(404).json({ data: null, error: 'Upload not found', meta: null });
            return;
        }
        res.json({ data: uploadRecord, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
exports.uploadRouter.post('/', upload.single('file'), async (req, res, next) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ data: null, error: 'File is required (field name: file)', meta: null });
            return;
        }
        const insuranceCompany = req.body.insuranceCompany;
        if (!insuranceCompany) {
            res.status(400).json({ data: null, error: 'insuranceCompany is required', meta: null });
            return;
        }
        const agentId = req.body.agentId;
        if (!agentId) {
            res.status(400).json({ data: null, error: 'agentId is required', meta: null });
            return;
        }
        const agent = await (0, mysql_repository_js_1.getAgentById)(agentId);
        if (!agent) {
            res.status(400).json({ data: null, error: 'Agent not found', meta: null });
            return;
        }
        const insuranceCompanyId = await (0, mysql_repository_js_1.resolveInsuranceCompanyId)(insuranceCompany);
        const uploadId = (0, uuid_1.v4)();
        const csvContent = file.buffer.toString('utf-8');
        const lines = csvContent.split('\n').filter((line) => line.trim());
        if (lines.length < 2) {
            const errorUpload = await (0, mysql_repository_js_1.createUpload)(uploadId, {
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
            const errorUpload = await (0, mysql_repository_js_1.createUpload)(uploadId, {
                agentId, insuranceCompany, fileName: file.originalname,
                recordCount: 0, status: 'error', errorMessage: errorMsg,
            });
            res.status(400).json({ data: errorUpload, error: errorMsg, meta: null });
            return;
        }
        const dataRows = lines.slice(1);
        const commissionRows = [];
        for (const row of dataRows) {
            const values = row.split(',').map((v) => v.trim());
            const record = {};
            headers.forEach((h, i) => { record[h] = values[i] ?? ''; });
            commissionRows.push({
                id: (0, uuid_1.v4)(),
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
        await (0, mysql_repository_js_1.createCommissionBatch)(commissionRows);
        const uploadRecord = await (0, mysql_repository_js_1.createUpload)(uploadId, {
            agentId, insuranceCompany, fileName: file.originalname,
            recordCount: commissionRows.length, status: 'completed',
        });
        res.status(201).json({
            data: uploadRecord,
            error: null,
            meta: { commissionsCreated: commissionRows.length },
        });
    }
    catch (err) {
        next(err);
    }
});
const VALID_INSURANCE_COMPANIES = ['harel', 'menora', 'phoenix', 'analyst'];
const COMPANY_CODE_TO_DETECTED = {
    harel: 'הראל',
    menora: 'מנורה מבטחים',
    phoenix: 'הפניקס',
    analyst: 'אנליסט',
};
const COMPANY_CODE_TO_LABEL = {
    harel: 'הראל',
    menora: 'מנורה מבטחים',
    phoenix: 'הפניקס',
    analyst: 'אנליסט',
};
function isValidCompanyCode(value) {
    return VALID_INSURANCE_COMPANIES.includes(value);
}
// Parse Excel commission file — returns parsed + validated data without persisting
exports.uploadRouter.post('/parse', upload.single('file'), async (req, res, next) => {
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
        const isPdfFile = ext.endsWith('.pdf');
        if (!isExcel && !isZip && !isCsv && !isPdfFile) {
            res.status(400).json({ data: null, error: 'Supported formats: XLS, XLSX, ZIP, CSV, PDF', meta: null });
            return;
        }
        const clientIsAgreement = req.body.isAgreement === 'true';
        const isAgreementUpload = isPdfFile || clientIsAgreement;
        const rawCompany = req.body.insuranceCompany?.trim() ?? '';
        if (!isAgreementUpload) {
            if (!rawCompany) {
                res.status(400).json({ data: null, error: 'יש לבחור חברת ביטוח לפני העלאת קובץ', meta: null });
                return;
            }
            if (!isValidCompanyCode(rawCompany)) {
                res.status(400).json({
                    data: null,
                    error: `חברת ביטוח לא חוקית. ערכים מותרים: ${VALID_INSURANCE_COMPANIES.join(', ')}`,
                    meta: null,
                });
                return;
            }
        }
        const insuranceCompanyCode = isValidCompanyCode(rawCompany) ? rawCompany : null;
        const selectedLabel = insuranceCompanyCode ? COMPANY_CODE_TO_LABEL[insuranceCompanyCode] : null;
        function buildCompanyMismatchWarning(detected) {
            if (!detected || !selectedLabel || detected === selectedLabel)
                return null;
            return `החברה שזוהתה (${detected}) שונה מהבחירה שלך (${selectedLabel})`;
        }
        // Handle PDF files (commission agreement contracts)
        if (isPdfFile) {
            try {
                const result = await (0, pdf_agreement_parser_service_js_1.parseAgreementPdf)(file.buffer);
                const companyWarning = buildCompanyMismatchWarning(result.company);
                res.json({
                    data: result.rates,
                    error: null,
                    meta: {
                        fileName: file.originalname,
                        fileSize: file.size,
                        isAgreement: true,
                        detectedCompany: result.company,
                        agentName: result.agentName,
                        agentId: result.agentId,
                        validFrom: result.validFrom,
                        validTo: result.validTo,
                        totalRates: result.rates.length,
                        warning: companyWarning,
                    },
                });
                return;
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : 'Failed to parse PDF file';
                res.status(400).json({ data: null, error: msg, meta: null });
                return;
            }
        }
        // Handle CSV files (Menora format — Windows-1255 encoded)
        if (isCsv) {
            try {
                const result = (0, menora_csv_parser_service_js_1.parseMenoraCsvBuffer)(file.buffer, file.originalname);
                const results = [result];
                const totalRecords = result.records.length;
                const totalErrors = result.errors.length;
                const companyWarning = buildCompanyMismatchWarning(result.detectedCompany);
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
                        warning: companyWarning,
                    },
                });
                return;
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : 'Failed to parse CSV file';
                res.status(400).json({ data: null, error: msg, meta: null });
                return;
            }
        }
        // Handle ZIP files (Menora format)
        if (isZip) {
            try {
                const results = (0, menora_csv_parser_service_js_1.parseMenoraZip)(file.buffer, file.originalname);
                if (results.length === 0) {
                    res.status(400).json({ data: null, error: 'ZIP file contains no parseable CSV files', meta: null });
                    return;
                }
                const totalRecords = results.reduce((sum, r) => sum + r.records.length, 0);
                const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
                const companyWarning = buildCompanyMismatchWarning('מנורה מבטחים');
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
                        warning: companyWarning,
                    },
                });
                return;
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : 'Failed to parse ZIP file';
                res.status(400).json({ data: null, error: msg, meta: null });
                return;
            }
        }
        // agentId comes from JWT (set by requireAuth middleware)
        const agentId = res.locals.agentId;
        // Try commission reports first, fallback to agreement parser
        let results;
        let isAgreement = false;
        let agreementAgentNumber = null;
        let agreementAgentTaxId = null;
        let portfolioSummary = { personal: 0, partners: 0, unknown: 0 };
        let mismatchWarning = null;
        try {
            results = (0, excel_parser_service_js_1.parseExcelBuffer)(file.buffer);
            if (agentId && insuranceCompanyCode) {
                const insuranceCompanyId = await (0, mysql_repository_js_1.resolveInsuranceCompanyId)(insuranceCompanyCode);
                if (insuranceCompanyId) {
                    const knownNumbers = await (0, mysql_repository_js_1.getAgentNumbersByCompany)(agentId, insuranceCompanyId);
                    const hasRegisteredNumbers = knownNumbers.personal !== undefined || knownNumbers.partners !== undefined;
                    for (const sheet of results) {
                        for (const rec of sheet.records) {
                            const agentNum = rec.agentNumber ?? null;
                            if (!agentNum) {
                                rec.portfolioType = 'unknown';
                                portfolioSummary.unknown++;
                                continue;
                            }
                            const resolved = await (0, mysql_repository_js_1.resolvePortfolioByAgentNumber)(agentId, insuranceCompanyId, agentNum);
                            if (resolved !== null) {
                                rec.portfolioType = resolved;
                                if (resolved === 'personal')
                                    portfolioSummary.personal++;
                                else
                                    portfolioSummary.partners++;
                            }
                            else if (!hasRegisteredNumbers) {
                                const owner = await (0, mysql_repository_js_1.getAgentByCompanyNumber)(insuranceCompanyId, agentNum);
                                if (owner && owner.agentId !== agentId) {
                                    rec.portfolioType = 'unknown';
                                    portfolioSummary.unknown++;
                                }
                                else {
                                    await (0, mysql_repository_js_1.upsertAgentCompanyNumber)(agentId, insuranceCompanyId, agentNum, 'personal');
                                    rec.portfolioType = 'personal';
                                    portfolioSummary.personal++;
                                }
                            }
                            else {
                                rec.portfolioType = 'unknown';
                                portfolioSummary.unknown++;
                            }
                        }
                    }
                    if (portfolioSummary.unknown > 0) {
                        mismatchWarning = `${portfolioSummary.unknown} שורות עם מספר סוכן לא מזוהה (portfolio_type = unknown)`;
                    }
                }
            }
        }
        catch (commissionErr) {
            // Not a commission file — try agreement parser
            try {
                const agreement = (0, agreement_parser_service_js_1.parseAgreementFile)(file.buffer);
                isAgreement = true;
                agreementAgentNumber = agreement.agentNumber;
                agreementAgentTaxId = agreement.agentTaxId;
                // Save agent-company mapping when agentId + company are known
                if (agentId && insuranceCompanyCode) {
                    const insuranceCompanyId = await (0, mysql_repository_js_1.resolveInsuranceCompanyId)(insuranceCompanyCode);
                    if (insuranceCompanyId && agreement.agentNumber) {
                        // Verify ת.ז. in file matches authenticated agent
                        const agent = await (0, mysql_repository_js_1.getAgentById)(agentId);
                        if (agent && agreement.agentTaxId && agent.agentId !== agreement.agentTaxId) {
                            res.status(403).json({
                                data: null,
                                error: `ת.ז. בהסכם (${agreement.agentTaxId}) אינה תואמת לסוכן המחובר`,
                                meta: null,
                            });
                            return;
                        }
                        const registered = await (0, mysql_repository_js_1.getRegisteredAgentNumber)(agentId, insuranceCompanyId);
                        if (registered !== null && registered.companyAgentNumber !== agreement.agentNumber) {
                            res.status(403).json({
                                data: null,
                                error: `מספר סוכן בהסכם (${agreement.agentNumber}) שונה מהמספר הרשום (${registered.companyAgentNumber})`,
                                meta: null,
                            });
                            return;
                        }
                        await (0, mysql_repository_js_1.upsertAgentCompanyNumber)(agentId, insuranceCompanyId, agreement.agentNumber, registered?.portfolioType ?? 'personal');
                    }
                }
                results = [{
                        reportType: 'agreement',
                        sheetName: 'הסכם עמלות',
                        records: agreement.rates.map((r) => ({
                            id: '',
                            reportType: 'agreement',
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
            }
            catch {
                // Neither commission nor agreement
                const msg = commissionErr instanceof Error ? commissionErr.message : 'Unknown file format';
                res.status(400).json({ data: null, error: msg, meta: null });
                return;
            }
        }
        const totalRecords = results.reduce((sum, r) => sum + r.records.length, 0);
        const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
        const detectedCompany = results.find((r) => r.detectedCompany)?.detectedCompany || null;
        const companyMismatch = buildCompanyMismatchWarning(detectedCompany);
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
                portfolioSummary,
                mismatchWarning,
                warning: companyMismatch,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=upload.routes.js.map