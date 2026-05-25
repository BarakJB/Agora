"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_TOOLS = void 0;
exports.maskPII = maskPII;
exports.executeTool = executeTool;
const generative_ai_1 = require("@google/generative-ai");
const sales_repository_js_1 = require("../../repositories/sales.repository.js");
const potential_repository_js_1 = require("../../repositories/potential.repository.js");
// ─── PII helpers ─────────────────────────────────────────────────────────────
const PII_FIELD_PATTERNS = ['insured_id', 'insuredId', 'id_number', 'idNumber'];
function maskInsuredId(value) {
    if (!value)
        return value;
    if (value.length <= 4)
        return value;
    return `***${value.slice(-4)}`;
}
function maskPII(rows) {
    return rows.map((row) => {
        const masked = { ...row };
        for (const key of Object.keys(masked)) {
            if (PII_FIELD_PATTERNS.some((p) => key.toLowerCase().includes(p.toLowerCase()))) {
                masked[key] = maskInsuredId(masked[key]);
            }
        }
        return masked;
    });
}
// ─── Tool definitions (Gemini function declarations) ─────────────────────────
exports.GEMINI_TOOLS = [
    {
        functionDeclarations: [
            {
                name: 'getMonthlyRevenue',
                description: 'מחזיר סיכום הכנסות חודשיות של הסוכן לפי חודשים.',
                parameters: {
                    type: generative_ai_1.SchemaType.OBJECT,
                    properties: {
                        months: {
                            type: generative_ai_1.SchemaType.NUMBER,
                            description: 'מספר החודשים האחרונים להצגה (1 עד 24)',
                        },
                    },
                    required: ['months'],
                },
            },
            {
                name: 'getTopClients',
                description: 'מחזיר רשימת הלקוחות המובילים של הסוכן לפי עמלות.',
                parameters: {
                    type: generative_ai_1.SchemaType.OBJECT,
                    properties: {
                        limit: {
                            type: generative_ai_1.SchemaType.NUMBER,
                            description: 'מספר לקוחות להחזיר (5 עד 20)',
                        },
                    },
                    required: ['limit'],
                },
            },
            {
                name: 'getPortfolioOverview',
                description: 'מחזיר ניתוח כולל של תיק הביטוח של הסוכן: סיכום, ענפים, מגמות, לקוחות בסיכון.',
                parameters: {
                    type: generative_ai_1.SchemaType.OBJECT,
                    properties: {},
                },
            },
            {
                name: 'getClientHistory',
                description: 'מחזיר היסטוריית עסקאות לפי שם לקוח.',
                parameters: {
                    type: generative_ai_1.SchemaType.OBJECT,
                    properties: {
                        clientName: {
                            type: generative_ai_1.SchemaType.STRING,
                            description: 'שם הלקוח לחיפוש',
                        },
                    },
                    required: ['clientName'],
                },
            },
            {
                name: 'getCrossSellOpportunities',
                description: 'מחזיר לקוחות עם פוטנציאל למכירה צולבת — לקוחות שיש להם ביטוח בחלק מהענפים של הסוכן אך לא בכולם. מיין לפי ציון פוטנציאל יורד.',
                parameters: {
                    type: generative_ai_1.SchemaType.OBJECT,
                    properties: {
                        limit: {
                            type: generative_ai_1.SchemaType.NUMBER,
                            description: 'מספר לקוחות להחזיר (5 עד 20)',
                        },
                    },
                    required: ['limit'],
                },
            },
            {
                name: 'getDormantClients',
                description: 'מחזיר לקוחות שהיו פעילים בעבר (לפחות 3 חודשים) אך לא הופיעו בדוחות מזה מספר חודשים — לקוחות "ישנים" שכדאי לחדש את הקשר איתם.',
                parameters: {
                    type: generative_ai_1.SchemaType.OBJECT,
                    properties: {
                        minMonthsSince: {
                            type: generative_ai_1.SchemaType.NUMBER,
                            description: 'מינימום חודשים מאז הפעילות האחרונה (3 עד 12). ברירת מחדל: 4',
                        },
                    },
                    required: [],
                },
            },
        ],
    },
];
// ─── Executors ────────────────────────────────────────────────────────────────
async function execGetMonthlyRevenue(agentId, args) {
    const rawMonths = Number(args.months ?? 12);
    const months = Math.min(Math.max(rawMonths, 1), 24);
    const all = await (0, sales_repository_js_1.getMonthlySalarySummary)(agentId);
    return all.slice(0, months);
}
async function execGetTopClients(agentId, args) {
    const rawLimit = Number(args.limit ?? 10);
    const limit = Math.min(Math.max(rawLimit, 5), 20);
    const clients = await (0, sales_repository_js_1.searchClients)(agentId, undefined, limit);
    return maskPII(clients);
}
async function execGetPortfolioOverview(agentId) {
    const analysis = await (0, sales_repository_js_1.getPortfolioAnalysis)(agentId);
    const maskedAtRisk = maskPII(analysis.atRisk);
    const maskedTopClients = maskPII(analysis.topClients);
    const maskedNewClients = maskPII(analysis.newClients);
    return { ...analysis, atRisk: maskedAtRisk, topClients: maskedTopClients, newClients: maskedNewClients };
}
async function execGetClientHistory(agentId, args) {
    const clientName = String(args.clientName ?? '').trim();
    if (!clientName)
        return { error: 'clientName is required' };
    const { items: matches } = await (0, sales_repository_js_1.searchClients)(agentId, clientName, 1);
    if (matches.length === 0)
        return { error: `לא נמצא לקוח בשם "${clientName}"` };
    const clientId = matches[0].insuredId;
    const transactions = await (0, sales_repository_js_1.getClientTransactions)(agentId, clientId);
    return maskPII(transactions);
}
async function execGetCrossSellOpportunities(agentId, args) {
    const rawLimit = Number(args.limit ?? 10);
    const limit = Math.min(Math.max(rawLimit, 5), 20);
    const potential = await (0, potential_repository_js_1.getSalesPotential)(agentId);
    const sliced = potential.crossSell.slice(0, limit);
    return maskPII(sliced);
}
async function execGetDormantClients(agentId, args) {
    const rawMin = Number(args.minMonthsSince ?? 4);
    const minMonthsSince = Math.min(Math.max(rawMin, 3), 12);
    const potential = await (0, potential_repository_js_1.getSalesPotential)(agentId);
    const filtered = potential.dormant.filter((c) => c.monthsSince >= minMonthsSince);
    return maskPII(filtered);
}
// ─── Dispatch ─────────────────────────────────────────────────────────────────
const EXECUTORS = {
    getMonthlyRevenue: execGetMonthlyRevenue,
    getTopClients: execGetTopClients,
    getPortfolioOverview: (_agentId, args) => execGetPortfolioOverview(args['__agentId__']),
    getClientHistory: execGetClientHistory,
    getCrossSellOpportunities: execGetCrossSellOpportunities,
    getDormantClients: execGetDormantClients,
};
async function executeTool(name, agentId, args) {
    if (name === 'getPortfolioOverview') {
        return execGetPortfolioOverview(agentId);
    }
    const executor = EXECUTORS[name];
    if (!executor)
        throw new Error(`Unknown tool: ${name}`);
    return executor(agentId, args);
}
//# sourceMappingURL=advisor.tools.js.map