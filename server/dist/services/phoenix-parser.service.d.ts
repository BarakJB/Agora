import * as XLSX from 'xlsx';
import type { ParseResult } from './excel-parser.service.js';
/**
 * Detect if a workbook is in Phoenix format.
 * Phoenix has "חודש תשלום" as header in "דוח נפרעים" sheet.
 */
export declare function isPhoenixFormat(workbook: XLSX.WorkBook): boolean;
/**
 * Parse a Phoenix workbook. Returns results for all detected sheets.
 */
export declare function parsePhoenixWorkbook(workbook: XLSX.WorkBook): ParseResult[];
//# sourceMappingURL=phoenix-parser.service.d.ts.map