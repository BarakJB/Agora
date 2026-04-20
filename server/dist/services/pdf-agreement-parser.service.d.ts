export interface AgreementRate {
    company: string;
    agreementId: string | null;
    agreementType: string;
    product: string;
    commissionType: string;
    rate: number;
    yearRange: string | null;
    isBookCommission: boolean;
    notes: string | null;
}
export interface AgreementParseResult {
    company: string;
    agentName: string | null;
    agentId: string | null;
    agencyName: string | null;
    validFrom: string | null;
    validTo: string | null;
    rates: AgreementRate[];
    rawText: string;
}
/**
 * Parse a Phoenix insurance agreement PDF.
 * Extracts commission rates from tables in the agreement.
 */
export declare function parseAgreementPdf(buffer: Buffer): Promise<AgreementParseResult>;
/**
 * Check if a buffer is a PDF file.
 */
export declare function isPdf(buffer: Buffer): boolean;
//# sourceMappingURL=pdf-agreement-parser.service.d.ts.map