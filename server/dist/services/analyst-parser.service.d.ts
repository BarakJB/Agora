import * as XLSX from 'xlsx';
import type { ParseResult } from './excel-parser.service.js';
/**
 * Detect if a workbook is in Analyst format.
 * Analyst has a sheet named "עמלות" with "עמלה לתשלום לסוכנות" column.
 */
export declare function isAnalystFormat(workbook: XLSX.WorkBook): boolean;
/**
 * Parse an Analyst workbook.
 */
export declare function parseAnalystWorkbook(workbook: XLSX.WorkBook): ParseResult[];
//# sourceMappingURL=analyst-parser.service.d.ts.map