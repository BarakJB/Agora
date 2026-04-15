import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';
import type { ParsedCommissionRecord, ParseResult, ParseError } from './excel-parser.service.js';

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

/**
 * Convert "31/01/2026" or "DD/MM/YYYY" to "YYYY-MM"
 */
function dateStrToMonth(value: unknown): string | null {
  const s = toStr(value);
  if (!s) return null;
  // DD/MM/YYYY
  const match = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}`;
  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  // YYYY-MM-DD
  const match2 = s.match(/^(\d{4})-(\d{2})/);
  if (match2) return `${match2[1]}-${match2[2]}`;
  return null;
}

function isEmptyRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every((v) => v === null || v === undefined || String(v).trim() === '');
}

function isSummaryRow(row: Record<string, unknown>): boolean {
  const values = Object.values(row);
  const strValues = values.map((v) => toStr(v)).filter(Boolean) as string[];
  const summaryKeywords = ['סה"כ', 'סהכ', 'סכום', 'total', 'סיכום'];
  return strValues.some((v) => summaryKeywords.some((kw) => v.includes(kw)));
}

/**
 * Detect if a workbook is in Analyst format.
 * Analyst has a sheet named "עמלות" with "עמלה לתשלום לסוכנות" column.
 */
export function isAnalystFormat(workbook: XLSX.WorkBook): boolean {
  return workbook.SheetNames.some((n) => n.trim() === 'עמלות');
}

/**
 * Parse an Analyst workbook.
 */
export function parseAnalystWorkbook(workbook: XLSX.WorkBook): ParseResult[] {
  const results: ParseResult[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (sheetName.trim() !== 'עמלות') continue;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    const records: ParsedCommissionRecord[] = [];
    const errors: ParseError[] = [];
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
          id: uuid(),
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
      } catch (err) {
        errors.push({ row: i + 2, column: null, message: `Failed to parse row: ${(err as Error).message}` });
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
