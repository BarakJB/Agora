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
exports.detectMenoraReportType = detectMenoraReportType;
exports.parseMenoraCsvString = parseMenoraCsvString;
exports.parseMenoraZip = parseMenoraZip;
exports.isMenoraZip = isMenoraZip;
exports.isMenoraCsvFileName = isMenoraCsvFileName;
exports.parseMenoraCsvBuffer = parseMenoraCsvBuffer;
const XLSX = __importStar(require("xlsx"));
const uuid_1 = require("uuid");
const adm_zip_1 = __importDefault(require("adm-zip"));
const iconv_lite_1 = __importDefault(require("iconv-lite"));
// ============ Menora CSV Parser ============
// Menora exports ZIP files containing CSV files in Windows-1255 encoding.
// File naming convention:
//   Policies_NIFRAIM_<timestamp>.zip → היקפי (recurring commissions)
//   Policies_YEADIM_<timestamp>.zip  → נפרעים (one-time/paid commissions)
//
// CSV columns (same for both types):
//   מס פוליסה, שם מוצר, שם מבוטח, ת"ז, תאריך תפוקה, תאריך עיבוד, פרמיה, עמלה
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
function dateToMonth(value) {
    if (value === null || value === undefined)
        return null;
    // Excel serial date number (XLSX converts date-like CSV values to serial numbers)
    if (typeof value === 'number' && value > 30000) {
        const d = XLSX.SSF.parse_date_code(value);
        if (d)
            return `${d.y}-${String(d.m).padStart(2, '0')}`;
    }
    const s = String(value).trim();
    if (!s)
        return null;
    // YYYY-MM-DD → YYYY-MM
    const match = s.match(/^(\d{4})-(\d{2})/);
    if (match)
        return `${match[1]}-${match[2]}`;
    // Already YYYY-MM
    if (/^\d{4}-\d{2}$/.test(s))
        return s;
    // DD/MM/YYYY
    const match2 = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match2)
        return `${match2[3]}-${match2[2].padStart(2, '0')}`;
    return null;
}
/**
 * Detect report type from ZIP filename.
 * NIFRAIM → nifraim (היקפי — recurring commissions on premiums)
 * YEADIM → hekef (נפרעים — one-time paid commissions)
 */
function detectMenoraReportType(fileName) {
    const upper = fileName.toUpperCase();
    if (upper.includes('YEADIM'))
        return 'hekef';
    return 'nifraim';
}
function parseMenoraCsvString(csvContent, reportType, sourceFileName) {
    const records = [];
    const errors = [];
    let skipped = 0;
    const workbook = XLSX.read(csvContent, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (Object.values(row).every((v) => v === null || v === undefined || String(v).trim() === '')) {
            skipped++;
            continue;
        }
        const commission = toNumber(row['עמלה']);
        if (commission === null) {
            skipped++;
            continue;
        }
        try {
            records.push({
                id: (0, uuid_1.v4)(),
                reportType,
                agentNumber: null,
                agentName: null,
                policyNumber: toStr(row['מס פוליסה']),
                branch: toStr(row['שם מוצר']),
                subBranch: null,
                productName: toStr(row['שם מוצר']),
                premiumBase: toNumber(row['פרמיה']),
                amount: commission,
                rate: null,
                collectionFee: null,
                advanceAmount: null,
                advanceBalance: null,
                amountBeforeVat: null,
                amountWithVat: null,
                accumulationBalance: null,
                managementFeePct: null,
                managementFeeAmount: null,
                transactionType: null,
                commissionSource: null,
                employerName: null,
                employerId: null,
                insuredName: toStr(row['שם מבוטח']),
                insuredId: toStr(row['ת"ז']),
                productionMonth: dateToMonth(row['תאריך תפוקה']),
                processingMonth: dateToMonth(row['תאריך עיבוד']),
                fundType: null,
                planType: null,
                paymentAmount: null,
                contractNumber: null,
                rawRow: row,
            });
        }
        catch (err) {
            errors.push({ row: i + 2, column: null, message: `Failed to parse row: ${err.message}` });
        }
    }
    const reportLabel = reportType === 'hekef' ? 'נפרעים (YEADIM)' : 'היקפי (NIFRAIM)';
    return {
        reportType,
        sheetName: `${reportLabel} — ${sourceFileName}`,
        records,
        errors,
        totalRows: rows.length,
        skippedRows: skipped,
        detectedCompany: 'מנורה מבטחים',
    };
}
/**
 * Parse a Menora ZIP buffer containing CSV files.
 */
function parseMenoraZip(zipBuffer, zipFileName) {
    const results = [];
    const reportType = detectMenoraReportType(zipFileName);
    const zip = new adm_zip_1.default(zipBuffer);
    const entries = zip.getEntries();
    for (const entry of entries) {
        if (entry.isDirectory)
            continue;
        const name = entry.entryName;
        if (!name.toLowerCase().endsWith('.csv'))
            continue;
        const rawBuffer = entry.getData();
        const csvContent = iconv_lite_1.default.decode(rawBuffer, 'windows-1255');
        const result = parseMenoraCsvString(csvContent, reportType, name);
        results.push(result);
    }
    return results;
}
/**
 * Check if a ZIP file is a Menora format by filename pattern.
 */
function isMenoraZip(fileName) {
    const upper = fileName.toUpperCase();
    return upper.includes('POLICIES_NIFRAIM') || upper.includes('POLICIES_YEADIM');
}
/**
 * Check if a CSV filename looks like a Menora format.
 */
function isMenoraCsvFileName(fileName) {
    const upper = fileName.toUpperCase();
    return upper.includes('AGENTPOLICIES') || upper.includes('NIFRAIM') || upper.includes('YEADIM');
}
/**
 * Parse a raw CSV buffer. Tries Windows-1255 first, falls back to UTF-8.
 * Detects report type from filename if possible.
 */
function parseMenoraCsvBuffer(buffer, fileName) {
    // Try Windows-1255 decoding first (Menora default)
    let csvContent = iconv_lite_1.default.decode(buffer, 'windows-1255');
    // If it doesn't look like Hebrew, try UTF-8
    if (!csvContent.includes('פוליסה') && !csvContent.includes('מבוטח') && !csvContent.includes('עמלה')) {
        csvContent = buffer.toString('utf-8');
    }
    const reportType = detectMenoraReportType(fileName);
    return parseMenoraCsvString(csvContent, reportType, fileName);
}
//# sourceMappingURL=menora-csv-parser.service.js.map