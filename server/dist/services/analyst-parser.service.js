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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAnalystFormat = isAnalystFormat;
exports.parseAnalystWorkbook = parseAnalystWorkbook;
const XLSX = __importStar(require("xlsx"));
const uuid_1 = require("uuid");
// ============ Analyst (אנליסט) Parser ============
// Analyst exports Excel files with sheet "עמלות".
// Headers at row 0. Data rows from row 1.
//
// Columns:
//   סוג יישות, שיערוך, הסכם, הסכם מגייס, שם סוכן, מס סוכנות, שם סוכנות,
//   עמית, קוד חשבון, קופת על, סניף, חשבון, סניף/מסלול/חשבון, מסלול, אמה,
//   תז, מס מעסיק, שם מעסיק, תאריך הצטרפות, אחוז סוכנות, דנח, יתרה,
//   דנח שנגבה, דנח אחרי תפעול, עמלה לתשלום לסוכנות, עמלת הפצה, רצפה
//
// This is accumulation data (pension/provident funds).
// Report type: accumulation_nifraim
function toNumber(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(n) || !Number.isFinite(n))
        return null;
    return n;
}
function toStr(value) {
    if (value === null || value === undefined)
        return null;
    const s = String(value).trim();
    return s.length === 0 ? null : s;
}
/**
 * Convert "31/01/2026" or "DD/MM/YYYY" to "YYYY-MM"
 */
function dateStrToMonth(value) {
    const s = toStr(value);
    if (!s)
        return null;
    // DD/MM/YYYY
    const match = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match)
        return `${match[3]}-${match[2].padStart(2, '0')}`;
    // YYYY-MM
    if (/^\d{4}-\d{2}$/.test(s))
        return s;
    // YYYY-MM-DD
    const match2 = s.match(/^(\d{4})-(\d{2})/);
    if (match2)
        return `${match2[1]}-${match2[2]}`;
    return null;
}
function isEmptyRow(row) {
    return Object.values(row).every((v) => v === null || v === undefined || String(v).trim() === '');
}
function isSummaryRow(row) {
    const values = Object.values(row);
    const strValues = values.map((v) => toStr(v)).filter(Boolean);
    const summaryKeywords = ['סה"כ', 'סהכ', 'סכום', 'total', 'סיכום'];
    return strValues.some((v) => summaryKeywords.some((kw) => v.includes(kw)));
}
/**
 * Detect if a workbook is in Analyst format.
 * Analyst has a sheet named "עמלות" with "עמלה לתשלום לסוכנות" column.
 */
function isAnalystFormat(workbook) {
    return workbook.SheetNames.some((n) => n.trim() === 'עמלות');
}
/**
 * Parse an Analyst workbook.
 */
function parseAnalystWorkbook(workbook) {
    const results = [];
    for (const sheetName of workbook.SheetNames) {
        if (sheetName.trim() !== 'עמלות')
            continue;
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
        const records = [];
        const errors = [];
        let skipped = 0;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (isEmptyRow(row) || isSummaryRow(row)) {
                skipped++;
                continue;
            }
            const commission = toNumber(row['עמלה לתשלום לסוכנות']);
            if (commission === null || commission === 0) {
                skipped++;
                continue;
            }
            try {
                records.push({
                    id: (0, uuid_1.v4)(),
                    reportType: 'accumulation_nifraim',
                    agentNumber: toStr(row['הסכם']) || toStr(row['מס סוכנות']),
                    agentName: toStr(row['שם סוכן']) || toStr(row['שם סוכנות']),
                    policyNumber: toStr(row['קוד חשבון']),
                    branch: null,
                    subBranch: null,
                    productName: toStr(row['קופת על']),
                    premiumBase: null,
                    amount: commission,
                    rate: toNumber(row['אחוז סוכנות']),
                    collectionFee: null,
                    advanceAmount: null,
                    advanceBalance: null,
                    amountBeforeVat: commission,
                    amountWithVat: null,
                    accumulationBalance: toNumber(row['יתרה']),
                    managementFeePct: toNumber(row['דנח']),
                    managementFeeAmount: toNumber(row['דנח שנגבה']),
                    transactionType: null,
                    commissionSource: null,
                    employerName: toStr(row['שם מעסיק']),
                    employerId: toStr(row['מס מעסיק']),
                    insuredName: toStr(row['עמית']),
                    insuredId: toStr(row['תז']),
                    productionMonth: null,
                    processingMonth: dateStrToMonth(row['שיערוך']),
                    fundType: toStr(row['קופת על']),
                    planType: toStr(row['מסלול']),
                    paymentAmount: null,
                    contractNumber: toStr(row['חשבון']),
                    rawRow: row,
                });
            }
            catch (err) {
                errors.push({ row: i + 2, column: null, message: `Failed to parse row: ${err.message}` });
            }
        }
        results.push({
            reportType: 'accumulation_nifraim',
            sheetName: sheetName.trim(),
            records,
            errors,
            totalRows: rows.length,
            skippedRows: skipped,
            detectedCompany: 'אנליסט',
        });
    }
    return results;
}
//# sourceMappingURL=analyst-parser.service.js.map