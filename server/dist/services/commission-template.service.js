"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCT_ROWS = exports.COMPANIES = void 0;
exports.generateCommissionTemplate = generateCommissionTemplate;
exports.parseCommissionAgreementSheet = parseCommissionAgreementSheet;
const XLSX = __importStar(require("xlsx"));
exports.COMPANIES = [
    'הראל', 'כלל', 'מנורה', 'הפניקס', 'מגדל',
    'איילון', 'הכשרה', 'אלטשולר', 'ילין לפידות',
    'מיטב דש', 'אנליסט', 'אקסלנס', 'מור',
];
exports.PRODUCT_ROWS = [
    { product: 'סיכונים', commissionType: 'נפרעים' },
    { product: 'סיכונים', commissionType: 'היקף' },
    { product: 'פנסיה', commissionType: 'נפרעים' },
    { product: 'פנסיה', commissionType: 'היקף' },
    { product: 'גמל והשתלמות', commissionType: 'נפרעים' },
    { product: 'גמל והשתלמות', commissionType: 'היקף', isFixedHint: 'סכום קבוע בש"ח' },
    { product: 'חסכון פרט', commissionType: 'נפרעים' },
    { product: 'חסכון פרט', commissionType: 'היקף', isFixedHint: 'סכום קבוע בש"ח' },
    { product: 'ניודי פנסיה', commissionType: 'היקף', isFixedHint: 'סכום קבוע לכל מיליון' },
];
// Example rates for the sample file — mirrors real-world values from the file
const SAMPLE_RATES = {
    'סיכונים': { 'נפרעים': 0.20, 'היקף': 0.50 },
    'פנסיה': { 'נפרעים': 0.005, 'היקף': 0.04 },
    'גמל והשתלמות': { 'נפרעים': 0.0025, 'היקף': 6500 },
    'חסכון פרט': { 'נפרעים': 0.0025, 'היקף': 6500 },
    'ניודי פנסיה': { 'נפרעים': null, 'היקף': 3000 },
};
/**
 * Generates a blank commission agreement template Excel buffer.
 * Structure mirrors "הסכם עמלות" format: rows=product×type, columns=companies.
 */
function generateCommissionTemplate(agentName, withSample = false) {
    const wb = XLSX.utils.book_new();
    const headerRow = ['סוג מוצר', 'סוג עמלה', ...exports.COMPANIES];
    const titleRow = [agentName ? `${agentName} - הסכם עמלות` : 'הסכם עמלות סוכן'];
    const rows = [titleRow, headerRow];
    let prevProduct = '';
    for (const row of exports.PRODUCT_ROWS) {
        const productCell = row.product !== prevProduct ? row.product : '';
        prevProduct = row.product;
        const hint = row.isFixedHint ? ` (${row.isFixedHint})` : '';
        const sampleRow = withSample
            ? exports.COMPANIES.map(() => SAMPLE_RATES[row.product]?.[row.commissionType] ?? '')
            : exports.COMPANIES.map(() => '');
        rows.push([productCell, row.commissionType + hint, ...sampleRow]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Column widths
    ws['!cols'] = [
        { wch: 18 }, // סוג מוצר
        { wch: 22 }, // סוג עמלה
        ...exports.COMPANIES.map(() => ({ wch: 10 })),
    ];
    // Merge title row across all columns
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: exports.COMPANIES.length + 1 } }];
    XLSX.utils.book_append_sheet(wb, ws, 'הסכם עמלות');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
/**
 * Parses the cross-table commission agreement structure.
 * Returns flat rate records.
 */
function parseCommissionAgreementSheet(sheetData) {
    const rates = [];
    // Find header row (the one that starts with "סוג מוצר" or "סוג עמלה")
    let headerRowIdx = -1;
    let companyStartCol = 2;
    const foundCompanies = [];
    for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
        const row = sheetData[i];
        if (!row)
            continue;
        const first = String(row[0] || '').trim();
        const second = String(row[1] || '').trim();
        if (first === 'סוג מוצר' || second === 'סוג עמלה') {
            headerRowIdx = i;
            for (let c = 2; c < row.length; c++) {
                const cell = String(row[c] || '').trim();
                if (cell)
                    foundCompanies.push(cell);
            }
            companyStartCol = 2;
            break;
        }
    }
    if (headerRowIdx === -1 || foundCompanies.length === 0)
        return rates;
    let currentProduct = '';
    for (let r = headerRowIdx + 1; r < sheetData.length; r++) {
        const row = sheetData[r];
        if (!row)
            continue;
        const productCell = String(row[0] || '').trim();
        const typeCell = String(row[1] || '').trim();
        if (productCell)
            currentProduct = productCell;
        if (!currentProduct || !typeCell)
            continue;
        // Extract commission type (strip hints like "(סכום קבוע בש\"ח)")
        const commissionType = typeCell.replace(/\s*\(.*\)/, '').trim();
        if (commissionType !== 'נפרעים' && commissionType !== 'היקף')
            continue;
        for (let c = 0; c < foundCompanies.length; c++) {
            const rawVal = row[companyStartCol + c];
            const strVal = String(rawVal ?? '').trim().toUpperCase();
            if (strVal === 'XXX' || strVal === '' || rawVal === undefined)
                continue;
            const num = typeof rawVal === 'number' ? rawVal : parseFloat(strVal);
            if (isNaN(num))
                continue;
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
//# sourceMappingURL=commission-template.service.js.map