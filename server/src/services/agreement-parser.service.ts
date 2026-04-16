import * as XLSX from 'xlsx';

// ============ Types ============

export interface AgreementRate {
  product: string;
  commissionType: 'nifraim' | 'hekef';
  company: string;
  rate: number | null;
  isFixedAmount: boolean;
}

export interface ParsedAgreement {
  agentName: string;
  agentTaxId: string | null;      // ת.ז. סוכן
  agentNumber: string | null;     // מספר סוכן בחברה
  rates: AgreementRate[];
}

// ============ Constants ============

const AGREEMENT_SHEET_NAMES = ['הסכם עמלות', 'הסכם'];

const COMMISSION_TYPE_MAP: Record<string, 'nifraim' | 'hekef'> = {
  'נפרעים': 'nifraim',
  'היקף': 'hekef',
};

// ============ Helpers ============

function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length === 0 ? null : s;
}

function detectAgreementSheet(sheetNames: string[]): string | null {
  for (const name of sheetNames) {
    const trimmed = name.trim();
    if (AGREEMENT_SHEET_NAMES.some((n) => trimmed.includes(n))) {
      return name;
    }
  }
  return null;
}

/**
 * Scan the first 8 rows for ת.ז. and מספר סוכן.
 * Handles both label-value pairs in adjacent cells and "label: value" in a single cell.
 */
function extractAgentIdentifiers(
  allRows: unknown[][],
): { agentTaxId: string | null; agentNumber: string | null } {
  let agentTaxId: string | null = null;
  let agentNumber: string | null = null;

  const TAX_ID_LABELS = ['ת.ז', 'תעודת זהות', 'ת"ז', 'מספר זהות'];
  const AGENT_NUM_LABELS = ['מספר סוכן', 'מס סוכן', 'מס\' סוכן', 'קוד סוכן', 'agent number'];
  const TAX_ID_REGEX = /\b\d{8,9}\b/;
  const AGENT_NUM_REGEX = /\b\d{4,10}\b/;

  const scanLimit = Math.min(allRows.length, 8);

  for (let i = 0; i < scanLimit; i++) {
    const row = allRows[i];
    for (let col = 0; col < row.length; col++) {
      const cellStr = toStr(row[col]);
      if (!cellStr) continue;

      const lower = cellStr.toLowerCase();

      // Check if this cell is a label — value is in next cell
      const isTaxLabel = TAX_ID_LABELS.some((l) => lower.includes(l.toLowerCase()));
      const isAgentNumLabel = AGENT_NUM_LABELS.some((l) => lower.includes(l.toLowerCase()));

      if (isTaxLabel && !agentTaxId) {
        // Try inline "ת.ז: 123456789"
        const inlineMatch = cellStr.match(TAX_ID_REGEX);
        if (inlineMatch) {
          agentTaxId = inlineMatch[0];
        } else {
          // Try adjacent cell
          const nextVal = toStr(row[col + 1]);
          if (nextVal && TAX_ID_REGEX.test(nextVal)) {
            agentTaxId = nextVal.match(TAX_ID_REGEX)![0];
          }
        }
      }

      if (isAgentNumLabel && !agentNumber) {
        const inlineMatch = cellStr.match(AGENT_NUM_REGEX);
        if (inlineMatch) {
          agentNumber = inlineMatch[0];
        } else {
          const nextVal = toStr(row[col + 1]);
          if (nextVal && AGENT_NUM_REGEX.test(nextVal)) {
            agentNumber = nextVal.match(AGENT_NUM_REGEX)![0];
          }
        }
      }
    }
    if (agentTaxId && agentNumber) break;
  }

  return { agentTaxId, agentNumber };
}

function extractAgentName(sheet: XLSX.WorkSheet): string {
  // Row 1 typically contains "גיורא ברטקוב - הסכם סוכן ראשי"
  const cell = sheet['A1'] || sheet['B1'];
  if (!cell) return 'לא זוהה';
  const val = toStr(cell.v);
  if (!val) return 'לא זוהה';
  // Extract name before the dash
  const dashIdx = val.indexOf('-');
  if (dashIdx > 0) return val.substring(0, dashIdx).trim();
  return val;
}

function parseRateValue(value: unknown): { rate: number | null; isFixedAmount: boolean } {
  if (value === null || value === undefined) return { rate: null, isFixedAmount: false };

  const str = String(value).trim();

  // "XXX" or similar markers mean not applicable
  if (/^[Xx]+$/.test(str) || str === '-' || str === '') {
    return { rate: null, isFixedAmount: false };
  }

  const num = Number(str);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return { rate: null, isFixedAmount: false };
  }

  // Rates < 1 are percentages (e.g. 0.2, 0.005), values > 100 are fixed ILS amounts
  const isFixedAmount = num > 100;
  return { rate: num, isFixedAmount };
}

// ============ Main Parser ============

/**
 * Parse a commission agreement Excel file.
 *
 * Expected structure:
 * - Sheet "הסכם עמלות"
 * - Row 1: Agent name title
 * - Row 2: Headers (סוג מוצר | סוג עמלה | company1 | company2 | ...)
 * - Rows 3+: Product × Commission type × rate per company
 */
export function parseAgreementFile(buffer: Buffer): ParsedAgreement {
  const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 65001 });

  const sheetName = detectAgreementSheet(workbook.SheetNames);
  if (!sheetName) {
    throw new Error(
      `לא נמצא גיליון הסכם עמלות. גיליונות בקובץ: ${workbook.SheetNames.join(', ')}. ` +
      `צפוי אחד מ: ${AGREEMENT_SHEET_NAMES.join(', ')}`
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const agentName = extractAgentName(sheet);

  // Read all rows as arrays (not JSON) to handle merged cells and multi-row products
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });

  const { agentTaxId, agentNumber } = extractAgentIdentifiers(allRows);

  if (allRows.length < 3) {
    throw new Error('הגיליון מכיל פחות מ-3 שורות — לא ניתן לפרסר');
  }

  // Find the header row (contains "סוג מוצר" or "סוג עמלה")
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(allRows.length, 5); i++) {
    const row = allRows[i];
    const rowStrs = row.map((v) => toStr(v)).filter(Boolean);
    if (rowStrs.some((s) => s!.includes('סוג מוצר') || s!.includes('סוג עמלה'))) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    // Fallback: assume row index 1 is the header
    headerRowIdx = 1;
  }

  const headerRow = allRows[headerRowIdx];

  // Identify column indices
  let productColIdx = -1;
  let commTypeColIdx = -1;
  const companyColumns: { idx: number; name: string }[] = [];

  for (let col = 0; col < headerRow.length; col++) {
    const val = toStr(headerRow[col]);
    if (!val) continue;

    if (val.includes('סוג מוצר') || val === 'מוצר') {
      productColIdx = col;
    } else if (val.includes('סוג עמלה') || val === 'עמלה') {
      commTypeColIdx = col;
    } else {
      // Any other non-empty header cell after the type columns is a company
      companyColumns.push({ idx: col, name: val });
    }
  }

  // If no explicit product/commission type columns, assume col 0 = product, col 1 = commission type
  if (productColIdx === -1) productColIdx = 0;
  if (commTypeColIdx === -1) commTypeColIdx = 1;

  // Parse data rows
  const rates: AgreementRate[] = [];
  let currentProduct: string | null = null;

  for (let i = headerRowIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (!row || row.every((v) => v === null || v === undefined || String(v).trim() === '')) {
      continue;
    }

    // Check if we've reached a non-rate section (e.g. "Cover מחלק")
    const firstCell = toStr(row[0]);
    if (firstCell && (firstCell.includes('Cover') || firstCell.includes('מחלק') || firstCell.includes('הערות'))) {
      break;
    }

    // Product column — if present, update current product; if empty, inherit from previous row
    const productVal = toStr(row[productColIdx]);
    if (productVal) {
      currentProduct = productVal;
    }

    if (!currentProduct) continue;

    // Commission type
    const commTypeVal = toStr(row[commTypeColIdx]);
    if (!commTypeVal) continue;

    const commissionType = COMMISSION_TYPE_MAP[commTypeVal];
    if (!commissionType) continue;

    // Parse rates for each company
    for (const { idx, name } of companyColumns) {
      const cellValue = row[idx];
      const { rate, isFixedAmount } = parseRateValue(cellValue);

      rates.push({
        product: currentProduct,
        commissionType,
        company: name,
        rate,
        isFixedAmount,
      });
    }
  }

  return { agentName, agentTaxId, agentNumber, rates };
}
