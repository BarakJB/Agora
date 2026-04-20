import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';
import type { ParsedCommissionRecord, ParseResult, ParseError, ExcelReportType } from './excel-parser.service.js';

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

function excelDateToMonth(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  // If it's a Date object (from XLSX parsing)
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  // If it's a number (Excel serial date)
  if (typeof value === 'number' && value > 30000) {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}`;
  }
  // If it's a string
  const s = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  const match = s.match(/^(\d{1,2})[/-](\d{4})$/);
  if (match) return `${match[2]}-${match[1].padStart(2, '0')}`;
  const match2 = s.match(/^(\d{4})-(\d{2})/);
  if (match2) return `${match2[1]}-${match2[2]}`;
  return null;
}

function isSummaryRow(row: Record<string, unknown>): boolean {
  const values = Object.values(row);
  const strValues = values.map((v) => toStr(v)).filter(Boolean) as string[];
  const summaryKeywords = ['סה"כ', 'סהכ', 'סכום', 'total', 'סיכום'];
  return strValues.some((v) => summaryKeywords.some((kw) => v.includes(kw)));
}

function isEmptyRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((v) => v === null || v === undefined || String(v).trim() === '');
}

/**
 * Find the header row index in a Phoenix Excel sheet.
 * Phoenix "full" format has metadata rows 0-5, headers at row 6 with "חודש תשלום".
 * Phoenix "short" format has headers at row 0 with "חודש עיבוד".
 */
function findPhoenixHeaderRow(sheet: XLSX.Sheet): { row: number; variant: 'full' | 'short' } | null {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  for (let r = 0; r <= Math.min(range.e.r, 15); r++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    if (!cell) continue;
    const val = String(cell.v).trim();
    if (val === 'חודש תשלום') return { row: r, variant: 'full' };
    if (val === 'חודש עיבוד') return { row: r, variant: 'short' };
  }
  return null;
}

/**
 * Map ענף (branch) to report type for the "short" format.
 * בריאות/חיים = סיכונים (risk/life), פנסיה = נפרעים פנסיוני
 */
function mapBranchToCategory(branch: string | null): 'סיכונים' | 'נפרעים' {
  if (!branch) return 'נפרעים';
  const b = branch.trim();
  if (b === 'בריאות' || b === 'חיים') return 'סיכונים';
  return 'נפרעים';
}

/**
 * Detect if a workbook is in Phoenix format.
 */
export function isPhoenixFormat(workbook: XLSX.WorkBook): boolean {
  for (const name of workbook.SheetNames) {
    const trimmed = name.trim();
    if (trimmed === 'דוח נפרעים' || trimmed === 'דוח עמלות היקף') {
      const sheet = workbook.Sheets[name];
      const header = findPhoenixHeaderRow(sheet);
      if (header) return true;
      if (trimmed === 'דוח עמלות היקף') return true;
    }
  }
  return false;
}

/**
 * Parse Phoenix nifraim "full" format (דוח נפרעים with חודש תשלום header at row 6+).
 */
function parsePhoenixNifraimFull(
  sheet: XLSX.Sheet,
  sheetName: string,
  headerRow: number,
): ParseResult {
  const records: ParsedCommissionRecord[] = [];
  const errors: ParseError[] = [];
  let skipped = 0;

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    range: headerRow,
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (isEmptyRow(row) || isSummaryRow(row)) {
      skipped++;
      continue;
    }

    const paymentAmount = toNumber(row['סה"כ לתשלום']);
    const commission = toNumber(row['עמלה']);
    const actualAmount = paymentAmount ?? commission;
    if (actualAmount === null) {
      skipped++;
      continue;
    }

    try {
      records.push({
        id: uuid(),
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
    } catch (err) {
      errors.push({ row: headerRow + i + 2, column: null, message: `Failed to parse row: ${(err as Error).message}` });
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
 * Parse Phoenix nifraim "short" format (headers at row 0 with חודש עיבוד).
 * Columns: חודש עיבוד, ענף, סוג פוליסה, שם סוכן, מספר סוכן,
 *          מספר מעסיק, מעסיק, שם מבוטח, ת.ז, מספר פוליסה,
 *          חודש תפוקה, פרמיה, עמלה, דמי גביה, מקדמה,
 *          יתרת מקדמה, סכום תשלום, אופי חו"ז, מקור זיכוי עמלה
 *
 * Branch mapping:
 *   בריאות/חיים → סיכונים (risk/life insurance products)
 *   פנסיה → נפרעים פנסיוני (pension recurring commissions)
 */
function parsePhoenixNifraimShort(
  sheet: XLSX.Sheet,
  sheetName: string,
  headerRow: number,
): ParseResult[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    range: headerRow,
  });

  // Group records by category (סיכונים vs נפרעים)
  const grouped: Record<string, { records: ParsedCommissionRecord[]; errors: ParseError[]; skipped: number; total: number }> = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (isEmptyRow(row) || isSummaryRow(row)) continue;

    const branch = toStr(row['ענף']);
    const category = mapBranchToCategory(branch);

    if (!grouped[category]) {
      grouped[category] = { records: [], errors: [], skipped: 0, total: 0 };
    }
    grouped[category].total++;

    const paymentAmount = toNumber(row['סכום תשלום']);
    const commission = toNumber(row['עמלה']);
    const actualAmount = paymentAmount ?? commission;
    if (actualAmount === null) {
      grouped[category].skipped++;
      continue;
    }

    const subBranch = toStr(row['סוג פוליסה']);

    try {
      grouped[category].records.push({
        id: uuid(),
        reportType: 'nifraim',
        agentNumber: toStr(row['מספר סוכן']),
        agentName: toStr(row['שם סוכן']),
        policyNumber: toStr(row['מספר פוליסה']),
        branch: branch,
        subBranch: subBranch,
        productName: subBranch || branch,
        premiumBase: toNumber(row['פרמיה']),
        amount: actualAmount,
        rate: null,
        collectionFee: toNumber(row['דמי גביה']),
        advanceAmount: toNumber(row['מקדמה']),
        advanceBalance: toNumber(row['יתרת מקדמה']),
        amountBeforeVat: null,
        amountWithVat: null,
        accumulationBalance: null,
        managementFeePct: null,
        managementFeeAmount: null,
        transactionType: toStr(row['אופי חו"ז']),
        commissionSource: toStr(row['מקור זיכוי עמלה']),
        employerName: toStr(row['מעסיק']),
        employerId: toStr(row['מספר מעסיק']),
        insuredName: toStr(row['שם מבוטח']),
        insuredId: toStr(row['ת.ז']),
        productionMonth: excelDateToMonth(row['חודש תפוקה']),
        processingMonth: excelDateToMonth(row['חודש עיבוד']),
        fundType: null,
        planType: null,
        paymentAmount: paymentAmount,
        contractNumber: null,
        rawRow: row,
      });
    } catch (err) {
      grouped[category].errors.push({
        row: headerRow + i + 2,
        column: null,
        message: `Failed to parse row: ${(err as Error).message}`,
      });
    }
  }

  // Return separate ParseResult per category
  const results: ParseResult[] = [];
  for (const [category, data] of Object.entries(grouped)) {
    results.push({
      reportType: 'nifraim',
      sheetName: `${sheetName} — ${category}`,
      records: data.records,
      errors: data.errors,
      totalRows: data.total,
      skippedRows: data.skipped,
      detectedCompany: 'הפניקס',
    });
  }

  return results;
}

/**
 * Parse Phoenix hekef (דוח עמלות היקף) sheet.
 */
function parsePhoenixHekef(
  sheet: XLSX.Sheet,
  sheetName: string,
): ParseResult {
  const records: ParsedCommissionRecord[] = [];
  const errors: ParseError[] = [];
  let skipped = 0;

  const header = findPhoenixHeaderRow(sheet);
  if (!header) {
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
  const headerRow = header.row;

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
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
        id: uuid(),
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
    } catch (err) {
      errors.push({ row: headerRow + i + 2, column: null, message: `Failed to parse row: ${(err as Error).message}` });
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
 * Supports both "full" format (metadata + headers at row 6) and
 * "short" format (headers at row 0 with חודש עיבוד).
 */
export function parsePhoenixWorkbook(workbook: XLSX.WorkBook): ParseResult[] {
  const results: ParseResult[] = [];

  for (const sheetName of workbook.SheetNames) {
    const trimmed = sheetName.trim();
    const sheet = workbook.Sheets[sheetName];

    if (trimmed === 'דוח נפרעים') {
      const header = findPhoenixHeaderRow(sheet);
      if (!header) continue;

      if (header.variant === 'short') {
        // Short format: split by ענף into סיכונים/נפרעים
        results.push(...parsePhoenixNifraimShort(sheet, trimmed, header.row));
      } else {
        // Full format: standard nifraim parsing
        results.push(parsePhoenixNifraimFull(sheet, trimmed, header.row));
      }
    } else if (trimmed === 'דוח עמלות היקף') {
      results.push(parsePhoenixHekef(sheet, trimmed));
    }
  }

  return results;
}
