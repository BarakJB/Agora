import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';
import type { ParsedCommissionRecord, ParseResult, ParseError, ExcelReportType } from './excel-parser.service.js';

// ============ Menora CSV Parser ============
// Menora exports ZIP files containing CSV files in Windows-1255 encoding.
// File naming convention:
//   Policies_NIFRAIM_<timestamp>.zip → היקפי (recurring commissions)
//   Policies_YEADIM_<timestamp>.zip  → נפרעים (one-time/paid commissions)
//
// CSV columns (same for both types):
//   מס פוליסה, שם מוצר, שם מבוטח, ת"ז, תאריך תפוקה, תאריך עיבוד, פרמיה, עמלה

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n)) return null;
  return n;
}

function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length === 0 ? null : s;
}

function dateToMonth(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  // Excel serial date number (XLSX converts date-like CSV values to serial numbers)
  if (typeof value === 'number' && value > 30000) {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}`;
  }
  const s = String(value).trim();
  if (!s) return null;
  // YYYY-MM-DD → YYYY-MM
  const match = s.match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  // Already YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  const match2 = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match2) return `${match2[3]}-${match2[2].padStart(2, '0')}`;
  return null;
}

/**
 * Detect report type from ZIP filename.
 * NIFRAIM → nifraim (היקפי — recurring commissions on premiums)
 * YEADIM → hekef (נפרעים — one-time paid commissions)
 */
export function detectMenoraReportType(fileName: string): ExcelReportType {
  const upper = fileName.toUpperCase();
  if (upper.includes('YEADIM')) return 'hekef';
  return 'nifraim';
}

export function parseMenoraCsvString(
  csvContent: string,
  reportType: ExcelReportType,
  sourceFileName: string,
): ParseResult {
  const records: ParsedCommissionRecord[] = [];
  const errors: ParseError[] = [];
  let skipped = 0;

  const workbook = XLSX.read(csvContent, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

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
        id: uuid(),
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
    } catch (err) {
      errors.push({ row: i + 2, column: null, message: `Failed to parse row: ${(err as Error).message}` });
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
export function parseMenoraZip(zipBuffer: Buffer, zipFileName: string): ParseResult[] {
  const results: ParseResult[] = [];
  const reportType = detectMenoraReportType(zipFileName);

  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = entry.entryName;
    if (!name.toLowerCase().endsWith('.csv')) continue;

    const rawBuffer = entry.getData();
    const csvContent = iconv.decode(rawBuffer, 'windows-1255');

    const result = parseMenoraCsvString(csvContent, reportType, name);
    results.push(result);
  }

  return results;
}

/**
 * Check if a ZIP file is a Menora format by filename pattern.
 */
export function isMenoraZip(fileName: string): boolean {
  const upper = fileName.toUpperCase();
  return upper.includes('POLICIES_NIFRAIM') || upper.includes('POLICIES_YEADIM');
}

/**
 * Check if a CSV filename looks like a Menora format.
 */
export function isMenoraCsvFileName(fileName: string): boolean {
  const upper = fileName.toUpperCase();
  return upper.includes('AGENTPOLICIES') || upper.includes('NIFRAIM') || upper.includes('YEADIM');
}

/**
 * Parse a raw CSV buffer. Tries Windows-1255 first, falls back to UTF-8.
 * Detects report type from filename if possible.
 */
export function parseMenoraCsvBuffer(buffer: Buffer, fileName: string): ParseResult {
  // Try Windows-1255 decoding first (Menora default)
  let csvContent = iconv.decode(buffer, 'windows-1255');

  // If it doesn't look like Hebrew, try UTF-8
  if (!csvContent.includes('פוליסה') && !csvContent.includes('מבוטח') && !csvContent.includes('עמלה')) {
    csvContent = buffer.toString('utf-8');
  }

  const reportType = detectMenoraReportType(fileName);
  return parseMenoraCsvString(csvContent, reportType, fileName);
}
