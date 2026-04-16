import * as XLSX from 'xlsx';

export const COMPANIES = [
  'הראל', 'כלל', 'מנורה', 'הפניקס', 'מגדל',
  'איילון', 'הכשרה', 'אלטשולר', 'ילין לפידות',
  'מיטב דש', 'אנליסט', 'אקסלנס', 'מור',
] as const;

export type Company = typeof COMPANIES[number];

export const PRODUCT_ROWS: Array<{
  product: string;
  commissionType: 'נפרעים' | 'היקף';
  isFixedHint?: string;
}> = [
  { product: 'סיכונים',          commissionType: 'נפרעים' },
  { product: 'סיכונים',          commissionType: 'היקף' },
  { product: 'פנסיה',            commissionType: 'נפרעים' },
  { product: 'פנסיה',            commissionType: 'היקף' },
  { product: 'גמל והשתלמות',     commissionType: 'נפרעים' },
  { product: 'גמל והשתלמות',     commissionType: 'היקף', isFixedHint: 'סכום קבוע בש"ח' },
  { product: 'חסכון פרט',        commissionType: 'נפרעים' },
  { product: 'חסכון פרט',        commissionType: 'היקף', isFixedHint: 'סכום קבוע בש"ח' },
  { product: 'ניודי פנסיה',      commissionType: 'היקף', isFixedHint: 'סכום קבוע לכל מיליון' },
];

export interface CommissionRate {
  product: string;
  commissionType: 'נפרעים' | 'היקף';
  company: string;
  rate: number | null;
  isFixedAmount: boolean;
}

// Example rates for the sample file — mirrors real-world values from the file
const SAMPLE_RATES: Record<string, Record<'נפרעים' | 'היקף', number | null>> = {
  'סיכונים':        { 'נפרעים': 0.20,  'היקף': 0.50  },
  'פנסיה':          { 'נפרעים': 0.005, 'היקף': 0.04  },
  'גמל והשתלמות':   { 'נפרעים': 0.0025,'היקף': 6500  },
  'חסכון פרט':      { 'נפרעים': 0.0025,'היקף': 6500  },
  'ניודי פנסיה':    { 'נפרעים': null,  'היקף': 3000  },
};

/**
 * Generates a blank commission agreement template Excel buffer.
 * Structure mirrors "הסכם עמלות" format: rows=product×type, columns=companies.
 */
export function generateCommissionTemplate(agentName?: string, withSample = false): Buffer {
  const wb = XLSX.utils.book_new();

  const headerRow = ['סוג מוצר', 'סוג עמלה', ...COMPANIES];
  const titleRow = [agentName ? `${agentName} - הסכם עמלות` : 'הסכם עמלות סוכן'];

  const rows: unknown[][] = [titleRow, headerRow];

  let prevProduct = '';
  for (const row of PRODUCT_ROWS) {
    const productCell = row.product !== prevProduct ? row.product : '';
    prevProduct = row.product;

    const hint = row.isFixedHint ? ` (${row.isFixedHint})` : '';
    const sampleRow = withSample
      ? COMPANIES.map(() => SAMPLE_RATES[row.product]?.[row.commissionType] ?? '')
      : COMPANIES.map(() => '');
    rows.push([productCell, row.commissionType + hint, ...sampleRow]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 18 }, // סוג מוצר
    { wch: 22 }, // סוג עמלה
    ...COMPANIES.map(() => ({ wch: 10 })),
  ];

  // Merge title row across all columns
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: COMPANIES.length + 1 } }];

  XLSX.utils.book_append_sheet(wb, ws, 'הסכם עמלות');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

/**
 * Parses the cross-table commission agreement structure.
 * Returns flat rate records.
 */
export function parseCommissionAgreementSheet(
  sheetData: unknown[][],
): CommissionRate[] {
  const rates: CommissionRate[] = [];

  // Find header row (the one that starts with "סוג מוצר" or "סוג עמלה")
  let headerRowIdx = -1;
  let companyStartCol = 2;
  const foundCompanies: string[] = [];

  for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
    const row = sheetData[i];
    if (!row) continue;
    const first = String(row[0] || '').trim();
    const second = String(row[1] || '').trim();
    if (first === 'סוג מוצר' || second === 'סוג עמלה') {
      headerRowIdx = i;
      for (let c = 2; c < row.length; c++) {
        const cell = String(row[c] || '').trim();
        if (cell) foundCompanies.push(cell);
      }
      companyStartCol = 2;
      break;
    }
  }

  if (headerRowIdx === -1 || foundCompanies.length === 0) return rates;

  let currentProduct = '';

  for (let r = headerRowIdx + 1; r < sheetData.length; r++) {
    const row = sheetData[r];
    if (!row) continue;

    const productCell = String(row[0] || '').trim();
    const typeCell = String(row[1] || '').trim();

    if (productCell) currentProduct = productCell;
    if (!currentProduct || !typeCell) continue;

    // Extract commission type (strip hints like "(סכום קבוע בש\"ח)")
    const commissionType = typeCell.replace(/\s*\(.*\)/, '').trim() as 'נפרעים' | 'היקף';
    if (commissionType !== 'נפרעים' && commissionType !== 'היקף') continue;

    for (let c = 0; c < foundCompanies.length; c++) {
      const rawVal = row[companyStartCol + c];
      const strVal = String(rawVal ?? '').trim().toUpperCase();

      if (strVal === 'XXX' || strVal === '' || rawVal === undefined) continue;

      const num = typeof rawVal === 'number' ? rawVal : parseFloat(strVal);
      if (isNaN(num)) continue;

      // Heuristic: values >= 100 are fixed ₪ amounts, < 1 are percentages
      const isFixedAmount = num >= 100;

      rates.push({
        product: currentProduct,
        commissionType,
        company: foundCompanies[c],
        rate: num,
        isFixedAmount,
      });
    }
  }

  return rates;
}
