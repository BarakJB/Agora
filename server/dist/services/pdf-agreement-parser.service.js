"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAgreementPdf = parseAgreementPdf;
exports.isPdf = isPdf;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
// ============ Phoenix Agreement Parser ============
/**
 * Parse a Phoenix insurance agreement PDF.
 * Extracts commission rates from tables in the agreement.
 */
async function parseAgreementPdf(buffer) {
    const data = await pdfParse(buffer);
    const text = data.text;
    const company = detectCompany(text);
    const agentInfo = extractAgentInfo(text);
    const dates = extractDates(text);
    let rates = [];
    if (company === 'הפניקס') {
        rates = parsePhoenixAgreement(text);
    }
    return {
        company,
        agentName: agentInfo.name,
        agentId: agentInfo.id,
        agencyName: agentInfo.agency,
        validFrom: dates.from,
        validTo: dates.to,
        rates,
        rawText: text,
    };
}
function detectCompany(text) {
    if (text.includes('הפניקס'))
        return 'הפניקס';
    if (text.includes('הראל'))
        return 'הראל';
    if (text.includes('מנורה'))
        return 'מנורה';
    if (text.includes('מגדל'))
        return 'מגדל';
    if (text.includes('כלל'))
        return 'כלל';
    return 'לא זוהה';
}
function extractAgentInfo(text) {
    // In PDF text, the name appears before the ID like: "דור קאשילבין:" then "209520535"
    // or "דור קאשי\nלבין:"
    let name = null;
    let id = null;
    // Find 9-digit ID (ת.ז)
    const idMatch = text.match(/(\d{9})\s*\.?\s*ח\.פ/);
    if (idMatch)
        id = idMatch[1];
    // Find name before "סוכן המשנה" marker — look for "לבין:" followed by name
    // PDF text has: "דור קאשילבין:" or "דור קאשי\nלבין:"
    const namePatterns = [
        /([א-ת]+ [א-ת]+)\s*לבין\s*:?\s*.*?סוכן המשנה/s,
        /([א-ת]+ [א-ת]+)\s*לבין/g,
    ];
    for (const pattern of namePatterns) {
        const matches = text.matchAll(pattern instanceof RegExp && pattern.global ? pattern : new RegExp(pattern.source, 'gs'));
        let lastMatch = null;
        for (const m of matches)
            lastMatch = m;
        if (lastMatch) {
            name = lastMatch[1].trim();
            break;
        }
    }
    return { name, id, agency: null };
}
function extractDates(text) {
    // PDF text has: "01/06/2025" near "חוזה התקשרות" or "תוקפו"
    // Look for date patterns near "מיום" and "ליום"
    const dateMatch = text.match(/מיום\s*(\d{2}\/\d{2}\/\d{4}).*?ליום\s*(\d{2}\/\d{2}\/\d{4})/s);
    if (dateMatch)
        return { from: dateMatch[1], to: dateMatch[2] };
    // Fallback: find all dates
    const allDates = text.match(/\d{2}\/\d{2}\/\d{4}/g);
    if (allDates && allDates.length >= 1) {
        return { from: allDates[0], to: allDates.length >= 2 ? allDates[1] : null };
    }
    return { from: null, to: null };
}
// ============ Phoenix-Specific Parsing ============
function parsePhoenixAgreement(text) {
    const rates = [];
    const agreementId = extractAgreementId(text);
    // Detect agreement type from title
    const isGamalType = text.includes('מוצרי גמל והשתלמות') || text.includes('מוצרים פיננסים');
    const isLifeHealthType = text.includes('ביטוח חיים ובריאות') || text.includes('עמלות טיפול ורכישה');
    if (isGamalType) {
        rates.push(...parsePhoenixGamalRates(text, agreementId));
    }
    if (isLifeHealthType) {
        rates.push(...parsePhoenixLifeHealthRates(text, agreementId));
    }
    return rates;
}
function extractAgreementId(text) {
    const match = text.match(/מזהה נספח:\s*(\d+)/);
    return match ? match[1] : null;
}
/**
 * Parse Phoenix Gamal/Hishtalmut agreement (נספח 9998 style).
 * Extracts rates from תת נספח א' and תת נספח ב'.
 */
function parsePhoenixGamalRates(text, agreementId) {
    const rates = [];
    const company = 'הפניקס';
    const agreementType = 'גמל והשתלמות';
    // PDF text format: "שם מוצרX.XX%" (rate is right before product name in RTL text)
    // תת נספח א' — מוצרים פיננסים
    const financialProducts = [
        { pattern: /הפקדות שוטפות\s*(\d+\.?\d*)%/, product: 'מוצרים פיננסים — הפקדות שוטפות' },
        { pattern: /הפקדות חד פעמיות\s*(\d+\.?\d*)%/, product: 'מוצרים פיננסים — הפקדות חד פעמיות' },
        { pattern: /קצבה נדחית.*?(\d+\.?\d*)%/s, product: 'מסלול זמן פרישה — קצבה נדחית' },
    ];
    for (const fp of financialProducts) {
        const match = text.match(fp.pattern);
        if (match) {
            rates.push({
                company, agreementId, agreementType,
                product: fp.product,
                commissionType: 'טיפול',
                rate: parseFloat(match[1]) / 100,
                yearRange: null,
                isBookCommission: false,
                notes: 'תת נספח א׳',
            });
        }
    }
    // תת נספח ב' — גמל והשתלמות
    // PDF: "מוצרי גמל והשתלמות 0.24%"
    const gamalMatch = text.match(/גמל והשתלמות\s+(\d+\.?\d*)%/);
    if (gamalMatch) {
        rates.push({
            company, agreementId, agreementType,
            product: 'גמל והשתלמות',
            commissionType: 'טיפול',
            rate: parseFloat(gamalMatch[1]) / 100,
            yearRange: null,
            isBookCommission: false,
            notes: 'תת נספח ב׳ — עמלת טיפול מצבירה',
        });
    }
    // Look for 0.15% rate near ייפוי כוח
    // PDF: "0.15%בשיעור של"
    const yipuiMatch = text.match(/(\d+\.?\d*)%\s*בשיעור של/);
    if (yipuiMatch) {
        rates.push({
            company, agreementId, agreementType,
            product: 'גמל והשתלמות — ייפוי כוח',
            commissionType: 'טיפול',
            rate: parseFloat(yipuiMatch[1]) / 100,
            yearRange: null,
            isBookCommission: false,
            notes: 'תת נספח ב׳ — העברת עמית קיים',
        });
    }
    return rates;
}
/**
 * Parse Phoenix Life & Health agreement (נספח 9996 style).
 * Extracts rates from section 4 (עמלות טיפול) and section 5 (עמלות רכישה).
 */
function parsePhoenixLifeHealthRates(text, agreementId) {
    const rates = [];
    const company = 'הפניקס';
    const agreementType = 'חיים ובריאות';
    // PDF text format: "מוצרי ריסק              15%15%15%3%3%3%"
    // Order: book(1-5) book(6-15) book(16+) additional(1-5) additional(6-15) additional(16+)
    const tipulProducts = [
        { name: 'מוצרי ריסק', pattern: /מוצרי ריסק\s+(\d+)%(\d+)%(\d+)%(\d+)%(\d+)%(\d+)%/ },
        { name: 'ריסק משכנתא', pattern: /ריסק משכנתא\s+(\d+)%(\d+)%(\d+)%(\d+)%(\d+)%(\d+)%/ },
        { name: 'אובדן כושר עבודה', pattern: /אובדן כושר עבודה ומטריה ביטוחית\s+(\d+)%(\d+)%(\d+)%(\d+)%(\d+)%(\d+)%/ },
    ];
    for (const prod of tipulProducts) {
        const match = text.match(prod.pattern);
        if (!match)
            continue;
        const yearRanges = ['1-5', '6-15', '16+'];
        // Book commissions (first 3)
        for (let i = 0; i < 3; i++) {
            rates.push({
                company, agreementId, agreementType,
                product: prod.name,
                commissionType: 'טיפול',
                rate: parseInt(match[i + 1]) / 100,
                yearRange: yearRanges[i],
                isBookCommission: true,
                notes: 'עמלת ספר',
            });
        }
        // Additional commissions (next 3)
        for (let i = 0; i < 3; i++) {
            rates.push({
                company, agreementId, agreementType,
                product: prod.name,
                commissionType: 'טיפול',
                rate: parseInt(match[i + 4]) / 100,
                yearRange: yearRanges[i],
                isBookCommission: false,
                notes: 'תוספת שיעור תגמול',
            });
        }
    }
    // Parse עמלות רכישה — base rates
    // PDF: "בסיס52%52%52%52%8%"
    const rechishaMatch = text.match(/בסיס\s*(\d+)%(\d+)%(\d+)%(\d+)%(\d+)%/);
    if (rechishaMatch) {
        const rechishaProducts = [
            { product: 'ריסק + ריסק משכנתא', rate: parseInt(rechishaMatch[1]) },
            { product: 'בריאות (הוצאות רפואיות)', rate: parseInt(rechishaMatch[2]) },
            { product: 'מוצר ריסק — פרמיה מקובעת', rate: parseInt(rechishaMatch[3]) },
            { product: 'מרפא (מחלות קשות)', rate: parseInt(rechishaMatch[4]) },
            { product: 'אובדן כושר עבודה', rate: parseInt(rechishaMatch[5]) },
        ];
        for (const rp of rechishaProducts) {
            rates.push({
                company, agreementId, agreementType,
                product: rp.product,
                commissionType: 'רכישה',
                rate: rp.rate / 100,
                yearRange: null,
                isBookCommission: false,
                notes: 'עמלת בסיס',
            });
        }
    }
    return rates;
}
/**
 * Check if a buffer is a PDF file.
 */
function isPdf(buffer) {
    return buffer.length >= 5 && buffer.subarray(0, 5).toString() === '%PDF-';
}
//# sourceMappingURL=pdf-agreement-parser.service.js.map