export interface AgreementRate {
    product: string;
    commissionType: 'nifraim' | 'hekef';
    company: string;
    rate: number | null;
    isFixedAmount: boolean;
}
export interface ParsedAgreement {
    agentName: string;
    agentTaxId: string | null;
    agentNumber: string | null;
    rates: AgreementRate[];
}
/**
 * Parse a commission agreement Excel file.
 *
 * Expected structure:
 * - Sheet "הסכם עמלות"
 * - Row 1: Agent name title
 * - Row 2: Headers (סוג מוצר | סוג עמלה | company1 | company2 | ...)
 * - Rows 3+: Product × Commission type × rate per company
 */
export declare function parseAgreementFile(buffer: Buffer): ParsedAgreement;
//# sourceMappingURL=agreement-parser.service.d.ts.map