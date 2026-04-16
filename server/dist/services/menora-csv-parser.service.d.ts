import type { ParseResult, ExcelReportType } from './excel-parser.service.js';
/**
 * Detect report type from ZIP filename.
 * NIFRAIM → nifraim (היקפי — recurring commissions on premiums)
 * YEADIM → hekef (נפרעים — one-time paid commissions)
 */
export declare function detectMenoraReportType(fileName: string): ExcelReportType;
export declare function parseMenoraCsvString(csvContent: string, reportType: ExcelReportType, sourceFileName: string): ParseResult;
/**
 * Parse a Menora ZIP buffer containing CSV files.
 */
export declare function parseMenoraZip(zipBuffer: Buffer, zipFileName: string): ParseResult[];
/**
 * Check if a ZIP file is a Menora format by filename pattern.
 */
export declare function isMenoraZip(fileName: string): boolean;
/**
 * Check if a CSV filename looks like a Menora format.
 */
export declare function isMenoraCsvFileName(fileName: string): boolean;
/**
 * Parse a raw CSV buffer. Tries Windows-1255 first, falls back to UTF-8.
 * Detects report type from filename if possible.
 */
export declare function parseMenoraCsvBuffer(buffer: Buffer, fileName: string): ParseResult;
//# sourceMappingURL=menora-csv-parser.service.d.ts.map