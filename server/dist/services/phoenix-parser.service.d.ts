import * as XLSX from 'xlsx';
import type { ParseResult } from './excel-parser.service.js';
/**
 * Detect if a workbook is in Phoenix format.
 */
export declare function isPhoenixFormat(workbook: XLSX.WorkBook): boolean;
/**
 * Parse a Phoenix workbook. Returns results for all detected sheets.
 * Supports both "full" format (metadata + headers at row 6) and
 * "short" format (headers at row 0 with חודש עיבוד).
 */
export declare function parsePhoenixWorkbook(workbook: XLSX.WorkBook): ParseResult[];
//# sourceMappingURL=phoenix-parser.service.d.ts.map