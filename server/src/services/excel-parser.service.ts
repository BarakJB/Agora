import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';

// ============ Types ============

export type ExcelReportType =
  | 'nifraim'                // נפרעים — עמלות שוטפות על פרמיות
  | 'hekef'                  // היקף — עמלה חד-פעמית (ניוד/הצטרפות)
  | 'accumulation_nifraim'   // נפרעים צבירה — גמל/השתלמות (ללא פנסיה)
  | 'accumulation_hekef'     // היקף צבירה — תגמול על ניוד גמל/השתלמות
  | 'branch_distribution'    // התפלגות עמלות לפי ענפים
  | 'agent_data'             // רשימת נתונים לסוכן
  | 'product_distribution';  // התפלגות עמלות לפי מוצרים

export interface ParsedCommissionRecord {
  id: string;
  reportType: ExcelReportType;
  agentNumber: string | null;
  agentName: string | null;
  policyNumber: string | null;
  branch: string | null;
  subBranch: string | null;
  productName: string | null;
  premiumBase: number | null;
  amount: number;
  rate: number | null;
  collectionFee: number | null;
  advanceAmount: number | null;
  advanceBalance: number | null;
  amountBeforeVat: number | null;
  amountWithVat: number | null;
  accumulationBalance: number | null;
  managementFeePct: number | null;
  managementFeeAmount: number | null;
  transactionType: string | null;
  commissionSource: string | null;
  employerName: string | null;
  employerId: string | null;
  insuredName: string | null;
  insuredId: string | null;
  productionMonth: string | null;
  processingMonth: string | null;
  fundType: string | null;
  planType: string | null;
  paymentAmount: number | null;
  contractNumber: string | null;
  rawRow: Record<string, unknown>;
}

export interface ParseResult {
  reportType: ExcelReportType;
  sheetName: string;
  records: ParsedCommissionRecord[];
  errors: ParseError[];
  totalRows: number;
  skippedRows: number;
  detectedCompany: string | null;
}

export interface ParseError {
  row: number;
  column: string | null;
  message: string;
}

// ============ Sheet Detection ============

const SHEET_NAME_MAP: Record<string, ExcelReportType> = {
  'דוח נפרעים': 'nifraim',
  'התפלגות עמלות לפי ענפים': 'branch_distribution',
  'רשימת נתונים לסוכן': 'agent_data',
  'התפלגות עמלות לפי מוצרים': 'product_distribution',
};

export function detectReportType(sheetNames: string[]): { sheetName: string; type: ExcelReportType } | null {
  for (const name of sheetNames) {
    const trimmed = name.trim();
    if (SHEET_NAME_MAP[trimmed]) {
      return { sheetName: trimmed, type: SHEET_NAME_MAP[trimmed] };
    }
  }
  return null;
}

// ============ Utility Helpers ============

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

function normalizeMonth(value: unknown): string | null {
  const s = toStr(value);
  if (!s) return null;
  // Already YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  // MM/YYYY or MM-YYYY
  const match = s.match(/^(\d{1,2})[/-](\d{4})$/);
  if (match) return `${match[2]}-${match[1].padStart(2, '0')}`;
  // YYYYMM
  const match2 = s.match(/^(\d{4})(\d{2})$/);
  if (match2) return `${match2[1]}-${match2[2]}`;
  return s;
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

// ============ Parsers per Report Type ============

function parseNifraim(rows: Record<string, unknown>[]): { records: ParsedCommissionRecord[]; errors: ParseError[]; skipped: number } {
  const records: ParsedCommissionRecord[] = [];
  const errors: ParseError[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (isEmptyRow(row) || isSummaryRow(row)) {
      skipped++;
      continue;
    }

    const commission = toNumber(row['עמלה']);
    const paymentAmount = toNumber(row['סכום תשלום']);
    // סכום תשלום = עמלה + דמי גביה - מקדמה. זה מה שהסוכן מקבל בפועל
    const actualAmount = paymentAmount ?? commission;
    if (actualAmount === null || actualAmount === 0) {
      skipped++;
      continue;
    }

    try {
      records.push({
        id: uuid(),
        reportType: 'nifraim',
        agentNumber: toStr(row['מספר סוכן']),
        agentName: toStr(row['שם סוכן']),
        policyNumber: toStr(row['מספר פוליסה']),
        branch: toStr(row['ענף']),
        subBranch: null,
        productName: toStr(row['סוג פוליסה']),
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
        productionMonth: normalizeMonth(row['חודש תפוקה']),
        processingMonth: normalizeMonth(row['חודש עיבוד']),
        fundType: null,
        planType: null,
        paymentAmount: toNumber(row['סכום תשלום']),
        contractNumber: null,
        rawRow: row,
      });
    } catch (err) {
      errors.push({ row: i + 2, column: null, message: `Failed to parse row: ${(err as Error).message}` });
    }
  }

  return { records, errors, skipped };
}

function parseBranchDistribution(rows: Record<string, unknown>[]): { records: ParsedCommissionRecord[]; errors: ParseError[]; skipped: number } {
  const records: ParsedCommissionRecord[] = [];
  const errors: ParseError[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (isEmptyRow(row) || isSummaryRow(row)) {
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
        reportType: 'branch_distribution',
        agentNumber: null,
        agentName: null,
        policyNumber: null,
        branch: toStr(row['ענף']),
        subBranch: toStr(row['תת ענף']),
        productName: toStr(row['מוצר על']),
        premiumBase: toNumber(row['פרמיה מלאה נספרת']),
        amount: commission,
        rate: toNumber(row['אחוז עמלת סוכן']),
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
        insuredName: null,
        insuredId: null,
        productionMonth: null,
        processingMonth: normalizeMonth(row['תאריך עיבוד']),
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

  return { records, errors, skipped };
}

function parseAgentData(rows: Record<string, unknown>[]): { records: ParsedCommissionRecord[]; errors: ParseError[]; skipped: number } {
  const records: ParsedCommissionRecord[] = [];
  const errors: ParseError[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (isEmptyRow(row) || isSummaryRow(row)) {
      skipped++;
      continue;
    }

    // Skip summary rows: no ת.ז means it's a total row
    const insuredId = toStr(row['ת.ז']);
    if (!insuredId) {
      skipped++;
      continue;
    }

    const amountBeforeVat = toNumber(row['עמלה לפני מע"מ']);
    const amountWithVat = toNumber(row['עמלה כולל מע"מ']);
    const managementFeeAmount = toNumber(row['סכום ד"נ']);
    // מוצרי צבירה = עמלה לפני מע"מ בלבד (ד"נ נספר בנפרד)
    // תואם ל-PayLens עמודת "מוצרי צבירה"
    const amount = amountBeforeVat ?? 0;

    if (amount === 0 && managementFeeAmount === null && amountWithVat === null) {
      skipped++;
      continue;
    }

    try {
      records.push({
        id: uuid(),
        reportType: 'agent_data',
        agentNumber: toStr(row['מספר סוכן']),
        agentName: null,
        policyNumber: toStr(row['פוליסה']),
        branch: null,
        subBranch: null,
        productName: toStr(row['חברה מנהלת']),
        premiumBase: null,
        amount,
        rate: toNumber(row['שיעור עמלה']),
        collectionFee: null,
        advanceAmount: null,
        advanceBalance: null,
        amountBeforeVat,
        amountWithVat,
        accumulationBalance: toNumber(row['יתרת סגירה']),
        managementFeePct: toNumber(row['אחוז ד"נ']),
        managementFeeAmount,
        transactionType: null,
        commissionSource: null,
        employerName: toStr(row['שם מעסיק']),
        employerId: toStr(row['זיהוי מעסיק חיצוני']),
        insuredName: toStr(row['שם לקוח']),
        insuredId: toStr(row['ת.ז']),
        productionMonth: null,
        processingMonth: normalizeMonth(row['חודש עיבוד']),
        fundType: toStr(row['סוג קופה']),
        planType: toStr(row['סוג תוכנית']),
        paymentAmount: null,
        contractNumber: toStr(row['הסכם סוכן']),
        rawRow: row,
      });
    } catch (err) {
      errors.push({ row: i + 2, column: null, message: `Failed to parse row: ${(err as Error).message}` });
    }
  }

  return { records, errors, skipped };
}

function parseProductDistribution(rows: Record<string, unknown>[]): { records: ParsedCommissionRecord[]; errors: ParseError[]; skipped: number } {
  const records: ParsedCommissionRecord[] = [];
  const errors: ParseError[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (isEmptyRow(row) || isSummaryRow(row)) {
      skipped++;
      continue;
    }

    // Skip summary rows without agent number
    const agentNumber = toStr(row['מספר סוכן']);
    if (!agentNumber) {
      skipped++;
      continue;
    }

    const commissionWithVat = toNumber(row['עמלת סוכן כולל מעמ']);
    const amountWithoutVat = toNumber(row['סכום ששולם ללא מעמ']);
    // סכום ששולם ללא מעמ = מה שהסוכן באמת מקבל
    const amount = amountWithoutVat ?? commissionWithVat ?? 0;

    if (amount === 0 && commissionWithVat === null) {
      skipped++;
      continue;
    }

    try {
      records.push({
        id: uuid(),
        reportType: 'product_distribution',
        agentNumber: toStr(row['מספר סוכן']),
        agentName: toStr(row['שם סוכן']),
        policyNumber: null,
        branch: null,
        subBranch: null,
        productName: toStr(row['שם מוצר']),
        premiumBase: toNumber(row['פרמיה לתגמול חודשי']),
        amount,
        rate: null,
        collectionFee: null,
        advanceAmount: null,
        advanceBalance: null,
        amountBeforeVat: amountWithoutVat,
        amountWithVat: commissionWithVat,
        accumulationBalance: null,
        managementFeePct: null,
        managementFeeAmount: null,
        transactionType: null,
        commissionSource: null,
        employerName: null,
        employerId: null,
        insuredName: null,
        insuredId: null,
        productionMonth: null,
        processingMonth: normalizeMonth(row['חודש תשלום']),
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

  return { records, errors, skipped };
}

// ============ Main Parser ============

// hekef, accumulation_nifraim, accumulation_hekef share the same file structures
// but are tagged differently for business logic (one-time vs recurring, accumulation vs premium-based)
function withReportType(
  parser: (rows: Record<string, unknown>[]) => { records: ParsedCommissionRecord[]; errors: ParseError[]; skipped: number },
  overrideType: ExcelReportType,
) {
  return (rows: Record<string, unknown>[]) => {
    const result = parser(rows);
    return {
      ...result,
      records: result.records.map((r) => ({ ...r, reportType: overrideType })),
    };
  };
}

const PARSERS: Record<ExcelReportType, (rows: Record<string, unknown>[]) => { records: ParsedCommissionRecord[]; errors: ParseError[]; skipped: number }> = {
  nifraim: parseNifraim,
  hekef: withReportType(parseNifraim, 'hekef'),
  accumulation_nifraim: withReportType(parseAgentData, 'accumulation_nifraim'),
  accumulation_hekef: withReportType(parseAgentData, 'accumulation_hekef'),
  branch_distribution: parseBranchDistribution,
  agent_data: parseAgentData,
  product_distribution: parseProductDistribution,
};

/**
 * Parse a single detected sheet from a workbook.
 */
/** Try to detect insurance company from file data */
function detectCompany(rows: Record<string, unknown>[], reportType: ExcelReportType): string | null {
  // agent_data has "חברה מנהלת" column (e.g. "הראל גמל")
  if (reportType === 'agent_data') {
    for (const row of rows) {
      const val = toStr(row['חברה מנהלת']);
      if (val) {
        // Normalize: "הראל גמל" → "הראל"
        const COMPANY_PATTERNS: [RegExp, string][] = [
          [/הראל/i, 'הראל'],
          [/מגדל/i, 'מגדל'],
          [/הפניקס|פניקס/i, 'הפניקס'],
          [/כלל/i, 'כלל'],
          [/מנורה/i, 'מנורה מבטחים'],
          [/הכשרה/i, 'הכשרה'],
          [/אלטשולר/i, 'אלטשולר שחם'],
          [/מיטב/i, 'מיטב דש'],
          [/אנליסט/i, 'אנליסט'],
          [/פסגות/i, 'פסגות'],
        ];
        for (const [pattern, name] of COMPANY_PATTERNS) {
          if (pattern.test(val)) return name;
        }
        return val; // Return raw value if no pattern match
      }
    }
  }

  // product_name column in agent_data may also contain company (e.g. "הראל גמל")
  // For other report types — no reliable detection
  return null;
}

function parseSheet(workbook: XLSX.WorkBook, sheetName: string, reportType: ExcelReportType): ParseResult {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const parser = PARSERS[reportType];
  const { records, errors, skipped } = parser(rows);
  const detectedCompany = detectCompany(rows, reportType);

  return {
    reportType,
    sheetName,
    records,
    errors,
    totalRows: rows.length,
    skippedRows: skipped,
    detectedCompany,
  };
}

/**
 * Parse an Excel buffer and return all detected report results.
 *
 * @param buffer - The uploaded file buffer (.xls or .xlsx)
 * @returns Array of parse results, one per detected sheet
 * @throws Error if no recognized sheets are found
 */
export function parseExcelBuffer(buffer: Buffer): ParseResult[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 65001 });
  const results: ParseResult[] = [];

  for (const sheetName of workbook.SheetNames) {
    const trimmed = sheetName.trim();
    const reportType = SHEET_NAME_MAP[trimmed];
    if (reportType) {
      results.push(parseSheet(workbook, sheetName, reportType));
    }
  }

  if (results.length === 0) {
    throw new Error(
      `No recognized sheet names found. Expected one of: ${Object.keys(SHEET_NAME_MAP).join(', ')}. ` +
      `Got: ${workbook.SheetNames.join(', ')}`
    );
  }

  return results;
}

/**
 * Parse an Excel buffer expecting a single specific report type.
 * Useful when the caller already knows what type of file was uploaded.
 */
export function parseExcelBufferByType(buffer: Buffer, expectedType: ExcelReportType): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 65001 });

  const expectedSheetName = Object.entries(SHEET_NAME_MAP).find(([, type]) => type === expectedType)?.[0];
  if (!expectedSheetName) {
    throw new Error(`Unknown report type: ${expectedType}`);
  }

  const matchedSheet = workbook.SheetNames.find((name) => name.trim() === expectedSheetName);
  if (!matchedSheet) {
    throw new Error(
      `Sheet "${expectedSheetName}" not found. Available sheets: ${workbook.SheetNames.join(', ')}`
    );
  }

  return parseSheet(workbook, matchedSheet, expectedType);
}
