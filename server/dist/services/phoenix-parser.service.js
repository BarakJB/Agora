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
exports.isPhoenixFormat = isPhoenixFormat;
exports.parsePhoenixWorkbook = parsePhoenixWorkbook;
const XLSX = __importStar(require("xlsx"));
const uuid_1 = require("uuid");
// ============ Phoenix (הפניקס) Parser ============
// Phoenix exports Excel files with:
//   Sheet "דוח נפרעים" — recurring commissions (nifraim)
//   Sheet "דוח עמלות היקף" — one-time commissions (hekef)
//
// Both have metadata rows 0-5, headers at row 6, data from row 7.
//
// Nifraim columns:
//   חודש תשלום, חודש עיבוד, סוכן מקבל עמלה, שם סוכן מקבל עמלה,
//   תאריך מינוי סוכן, סוכן, שם סוכן, מכירת מוקד, ענף, סוג פוליסה,
//   מס' קולקטיב, שם קולקטיב, שם המבוטח, תז המבוטח, מס' פוליסה,
//   חודש פרודוקציה, תאריך פרודוקציה, תאריך התחלה, זמ"פ, צבירה,
//   פרמיה, עמלה, אחוז פיצול עמלה, דמי גביה, אחוז פיצול דמי גביה,
//   סה"כ לתשלום, עדכון הסכם עמלות, המרת כיסויים
//
// Hekef columns (different structure):
//   חודש תשלום, חודש עיבוד (רישום), מס' סוכן מקבל עמלה, שם סוכן מקבל עמלה,
//   סוכן להסכם, שם סוכן להסכם, מס' סוכן מוכר, שם סוכן מוכר,
//   ענף, סוג פוליסה, מכירת מוקד, שוטף/חד פעמי, מס' קולקטיב, שם קולקטיב,
//   שם המבוטח, תז המבוטח, מספר פוליסה, חודש פרודוקציה, תאריך פרודוקציה,
//   שנת תפוקה, סכום תשלום, ...
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
function excelDateToMonth(value) {
    if (value === null || value === undefined)
        return null;
    // If it's a Date object (from XLSX parsing)
    if (value instanceof Date) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    }
    // If it's a number (Excel serial date)
    if (typeof value === 'number' && value > 30000) {
        const d = XLSX.SSF.parse_date_code(value);
        if (d)
            return `${d.y}-${String(d.m).padStart(2, '0')}`;
    }
    // If it's a string
    const s = String(value).trim();
    if (/^\d{4}-\d{2}$/.test(s))
        return s;
    const match = s.match(/^(\d{1,2})[/-](\d{4})$/);
    if (match)
        return `${match[2]}-${match[1].padStart(2, '0')}`;
    const match2 = s.match(/^(\d{4})-(\d{2})/);
    if (match2)
        return `${match2[1]}-${match2[2]}`;
    return null;
}
function isSummaryRow(row) {
    const values = Object.values(row);
    const strValues = values.map((v) => toStr(v)).filter(Boolean);
    const summaryKeywords = ['סה"כ', 'סהכ', 'סכום', 'total', 'סיכום'];
    return strValues.some((v) => summaryKeywords.some((kw) => v.includes(kw)));
}
function isEmptyRow(row) {
    return Object.values(row).every((v) => v === null || v === undefined || String(v).trim() === '');
}
/**
 * Find the header row index in a Phoenix Excel sheet.
 * Phoenix sheets have metadata rows 0-5, headers at row 6.
 * We look for "חודש תשלום" as the first column.
 */
function findPhoenixHeaderRow(sheet) {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    for (let r = 0; r <= Math.min(range.e.r, 15); r++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
        if (cell && String(cell.v).trim() === 'חודש תשלום')
            return r;
    }
    return -1;
}
/**
 * Detect if a workbook is in Phoenix format.
 * Phoenix has "חודש תשלום" as header in "דוח נפרעים" sheet.
 */
function isPhoenixFormat(workbook) {
    for (const name of workbook.SheetNames) {
        const trimmed = name.trim();
        if (trimmed === 'דוח נפרעים' || trimmed === 'דוח עמלות היקף') {
            const sheet = workbook.Sheets[name];
            const headerRow = findPhoenixHeaderRow(sheet);
            if (headerRow >= 0)
                return true;
            // For "דוח עמלות היקף", check for its specific header
            if (trimmed === 'דוח עמלות היקף')
                return true;
        }
    }
    return false;
}
/**
 * Parse Phoenix nifraim (דוח נפרעים) sheet.
 */
function parsePhoenixNifraim(sheet, sheetName) {
    const records = [];
    const errors = [];
    let skipped = 0;
    const headerRow = findPhoenixHeaderRow(sheet);
    if (headerRow < 0) {
        return {
            reportType: 'nifraim',
            sheetName,
            records: [],
            errors: [{ row: 0, column: null, message: 'Could not find header row' }],
            totalRows: 0,
            skippedRows: 0,
            detectedCompany: 'הפניקס',
        };
    }
    // Parse with range starting from header row
    const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: null,
        range: headerRow,
    });
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (isEmptyRow(row) || isSummaryRow(row)) {
            skipped++;
            continue;
        }
        // Use "סה"כ לתשלום" (total payment) as the actual commission amount
        const paymentAmount = toNumber(row['סה"כ לתשלום']);
        const commission = toNumber(row['עמלה']);
        const actualAmount = paymentAmount ?? commission;
        if (actualAmount === null) {
            skipped++;
            continue;
        }
        try {
            records.push({
                id: (0, uuid_1.v4)(),
                reportType: 'nifraim',
                agentNumber: toStr(row['סוכן מקבל עמלה']) || toStr(row['סוכן']),
                agentName: toStr(row['שם סוכן מקבל עמלה']) || toStr(row['שם סוכן']),
                policyNumber: toStr(row["מס' פוליסה"]),
                branch: toStr(row['ענף']),
                subBranch: toStr(row['סוג פוליסה']),
                productName: toStr(row['סוג פוליסה']),
                premiumBase: toNumber(row['פרמיה']),
                amount: actualAmount,
                rate: null,
                collectionFee: toNumber(row['דמי גביה']),
                advanceAmount: null,
                advanceBalance: null,
                amountBeforeVat: null,
                amountWithVat: null,
                accumulationBalance: toNumber(row['צבירה']),
                managementFeePct: null,
                managementFeeAmount: null,
                transactionType: null,
                commissionSource: null,
                employerName: toStr(row['שם קולקטיב']),
                employerId: toStr(row["מס' קולקטיב"]),
                insuredName: toStr(row['שם המבוטח']),
                insuredId: toStr(row['תז המבוטח']),
                productionMonth: excelDateToMonth(row['חודש פרודוקציה']),
                processingMonth: excelDateToMonth(row['חודש עיבוד']),
                fundType: null,
                planType: null,
                paymentAmount: paymentAmount,
                contractNumber: null,
                rawRow: row,
            });
        }
        catch (err) {
            errors.push({ row: headerRow + i + 2, column: null, message: `Failed to parse row: ${err.message}` });
        }
    }
    return {
        reportType: 'nifraim',
        sheetName,
        records,
        errors,
        totalRows: rows.length,
        skippedRows: skipped,
        detectedCompany: 'הפניקס',
    };
}
/**
 * Parse Phoenix hekef (דוח עמלות היקף) sheet.
 */
function parsePhoenixHekef(sheet, sheetName) {
    const records = [];
    const errors = [];
    let skipped = 0;
    const headerRow = findPhoenixHeaderRow(sheet);
    if (headerRow < 0) {
        return {
            reportType: 'hekef',
            sheetName,
            records: [],
            errors: [{ row: 0, column: null, message: 'Could not find header row' }],
            totalRows: 0,
            skippedRows: 0,
            detectedCompany: 'הפניקס',
        };
    }
    const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: null,
        range: headerRow,
    });
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (isEmptyRow(row) || isSummaryRow(row)) {
            skipped++;
            continue;
        }
        const paymentAmount = toNumber(row['סכום תשלום']);
        if (paymentAmount === null) {
            skipped++;
            continue;
        }
        const transactionType = toStr(row['שוטף/חד פעמי']);
        try {
            records.push({
                id: (0, uuid_1.v4)(),
                reportType: 'hekef',
                agentNumber: toStr(row["מס' סוכן מקבל עמלה"]),
                agentName: toStr(row['שם סוכן מקבל עמלה']),
                policyNumber: toStr(row['מספר פוליסה']),
                branch: toStr(row['ענף']),
                subBranch: toStr(row['סוג פוליסה']),
                productName: toStr(row['תאור קוד ביטוח']) || toStr(row['סוג פוליסה']),
                premiumBase: null,
                amount: paymentAmount,
                rate: null,
                collectionFee: null,
                advanceAmount: null,
                advanceBalance: null,
                amountBeforeVat: null,
                amountWithVat: null,
                accumulationBalance: null,
                managementFeePct: null,
                managementFeeAmount: null,
                transactionType,
                commissionSource: null,
                employerName: toStr(row['שם קולקטיב']),
                employerId: toStr(row["מס' קולקטיב"]),
                insuredName: toStr(row['שם המבוטח']),
                insuredId: toStr(row['תז המבוטח']),
                productionMonth: excelDateToMonth(row['חודש פרודוקציה']),
                processingMonth: excelDateToMonth(row['חודש עיבוד (רישום)']) || excelDateToMonth(row['חודש עיבוד']),
                fundType: null,
                planType: null,
                paymentAmount: paymentAmount,
                contractNumber: null,
                rawRow: row,
            });
        }
        catch (err) {
            errors.push({ row: headerRow + i + 2, column: null, message: `Failed to parse row: ${err.message}` });
        }
    }
    return {
        reportType: 'hekef',
        sheetName,
        records,
        errors,
        totalRows: rows.length,
        skippedRows: skipped,
        detectedCompany: 'הפניקס',
    };
}
/**
 * Parse a Phoenix workbook. Returns results for all detected sheets.
 */
function parsePhoenixWorkbook(workbook) {
    const results = [];
    for (const sheetName of workbook.SheetNames) {
        const trimmed = sheetName.trim();
        const sheet = workbook.Sheets[sheetName];
        if (trimmed === 'דוח נפרעים') {
            results.push(parsePhoenixNifraim(sheet, trimmed));
        }
        else if (trimmed === 'דוח עמלות היקף') {
            results.push(parsePhoenixHekef(sheet, trimmed));
        }
    }
    return results;
}
//# sourceMappingURL=phoenix-parser.service.js.map