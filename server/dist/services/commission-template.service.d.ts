export declare const COMPANIES: readonly ["הראל", "כלל", "מנורה", "הפניקס", "מגדל", "איילון", "הכשרה", "אלטשולר", "ילין לפידות", "מיטב דש", "אנליסט", "אקסלנס", "מור"];
export type Company = typeof COMPANIES[number];
export declare const PRODUCT_ROWS: Array<{
    product: string;
    commissionType: 'נפרעים' | 'היקף';
    isFixedHint?: string;
}>;
export interface CommissionRate {
    product: string;
    commissionType: 'נפרעים' | 'היקף';
    company: string;
    rate: number | null;
    isFixedAmount: boolean;
}
/**
 * Generates a blank commission agreement template Excel buffer.
 * Structure mirrors "הסכם עמלות" format: rows=product×type, columns=companies.
 */
export declare function generateCommissionTemplate(agentName?: string, withSample?: boolean): Buffer;
/**
 * Parses the cross-table commission agreement structure.
 * Returns flat rate records.
 */
export declare function parseCommissionAgreementSheet(sheetData: unknown[][]): CommissionRate[];
//# sourceMappingURL=commission-template.service.d.ts.map