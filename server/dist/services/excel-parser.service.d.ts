export type ExcelReportType = 'nifraim' | 'hekef' | 'accumulation_nifraim' | 'accumulation_hekef' | 'branch_distribution' | 'agent_data' | 'product_distribution';
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
export declare function detectReportType(sheetNames: string[]): {
    sheetName: string;
    type: ExcelReportType;
} | null;
/**
 * Parse an Excel buffer and return all detected report results.
 *
 * @param buffer - The uploaded file buffer (.xls or .xlsx)
 * @returns Array of parse results, one per detected sheet
 * @throws Error if no recognized sheets are found
 */
export declare function parseExcelBuffer(buffer: Buffer): ParseResult[];
/**
 * Parse an Excel buffer expecting a single specific report type.
 * Useful when the caller already knows what type of file was uploaded.
 */
export declare function parseExcelBufferByType(buffer: Buffer, expectedType: ExcelReportType): ParseResult;
//# sourceMappingURL=excel-parser.service.d.ts.map