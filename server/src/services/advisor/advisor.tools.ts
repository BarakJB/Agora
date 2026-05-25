import { SchemaType, type Tool } from '@google/generative-ai';
import {
  getMonthlySalarySummary,
  searchClients,
  getPortfolioAnalysis,
  getClientTransactions,
} from '../../repositories/sales.repository.js';
import { getSalesPotential } from '../../repositories/potential.repository.js';

// ─── PII helpers ─────────────────────────────────────────────────────────────

const PII_FIELD_PATTERNS = ['insured_id', 'insuredId', 'id_number', 'idNumber'];

function maskInsuredId(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  if (value.length <= 4) return value;
  return `***${value.slice(-4)}`;
}

export function maskPII(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const masked: Record<string, unknown> = { ...row };
    for (const key of Object.keys(masked)) {
      if (PII_FIELD_PATTERNS.some((p) => key.toLowerCase().includes(p.toLowerCase()))) {
        masked[key] = maskInsuredId(masked[key] as string | null | undefined);
      }
    }
    return masked;
  });
}

// ─── Tool definitions (Gemini function declarations) ─────────────────────────

export const GEMINI_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'getMonthlyRevenue',
        description: 'מחזיר סיכום הכנסות חודשיות של הסוכן לפי חודשים.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            months: {
              type: SchemaType.NUMBER,
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
          type: SchemaType.OBJECT,
          properties: {
            limit: {
              type: SchemaType.NUMBER,
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
          type: SchemaType.OBJECT,
          properties: {},
        },
      },
      {
        name: 'getClientHistory',
        description: 'מחזיר היסטוריית עסקאות לפי שם לקוח.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            clientName: {
              type: SchemaType.STRING,
              description: 'שם הלקוח לחיפוש',
            },
          },
          required: ['clientName'],
        },
      },
      {
        name: 'getCrossSellOpportunities',
        description:
          'מחזיר לקוחות עם פוטנציאל למכירה צולבת — לקוחות שיש להם ביטוח בחלק מהענפים של הסוכן אך לא בכולם. מיין לפי ציון פוטנציאל יורד.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            limit: {
              type: SchemaType.NUMBER,
              description: 'מספר לקוחות להחזיר (5 עד 20)',
            },
          },
          required: ['limit'],
        },
      },
      {
        name: 'getDormantClients',
        description:
          'מחזיר לקוחות שהיו פעילים בעבר (לפחות 3 חודשים) אך לא הופיעו בדוחות מזה מספר חודשים — לקוחות "ישנים" שכדאי לחדש את הקשר איתם.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            minMonthsSince: {
              type: SchemaType.NUMBER,
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

async function execGetMonthlyRevenue(agentId: string, args: Record<string, unknown>): Promise<unknown> {
  const rawMonths = Number(args.months ?? 12);
  const months = Math.min(Math.max(rawMonths, 1), 24);
  const all = await getMonthlySalarySummary(agentId);
  return all.slice(0, months);
}

async function execGetTopClients(agentId: string, args: Record<string, unknown>): Promise<unknown> {
  const rawLimit = Number(args.limit ?? 10);
  const limit = Math.min(Math.max(rawLimit, 5), 20);
  const clients = await searchClients(agentId, undefined, limit);
  return maskPII(clients as unknown as Record<string, unknown>[]);
}

async function execGetPortfolioOverview(agentId: string): Promise<unknown> {
  const analysis = await getPortfolioAnalysis(agentId);
  const maskedAtRisk = maskPII(analysis.atRisk as unknown as Record<string, unknown>[]);
  const maskedTopClients = maskPII(analysis.topClients as unknown as Record<string, unknown>[]);
  const maskedNewClients = maskPII(analysis.newClients as unknown as Record<string, unknown>[]);
  return { ...analysis, atRisk: maskedAtRisk, topClients: maskedTopClients, newClients: maskedNewClients };
}

async function execGetClientHistory(agentId: string, args: Record<string, unknown>): Promise<unknown> {
  const clientName = String(args.clientName ?? '').trim();
  if (!clientName) return { error: 'clientName is required' };

  const { items: matches } = await searchClients(agentId, clientName, 1);
  if (matches.length === 0) return { error: `לא נמצא לקוח בשם "${clientName}"` };

  const clientId = matches[0].insuredId;
  const transactions = await getClientTransactions(agentId, clientId);
  return maskPII(transactions as unknown as Record<string, unknown>[]);
}

async function execGetCrossSellOpportunities(agentId: string, args: Record<string, unknown>): Promise<unknown> {
  const rawLimit = Number(args.limit ?? 10);
  const limit = Math.min(Math.max(rawLimit, 5), 20);
  const potential = await getSalesPotential(agentId);
  const sliced = potential.crossSell.slice(0, limit);
  return maskPII(sliced as unknown as Record<string, unknown>[]);
}

async function execGetDormantClients(agentId: string, args: Record<string, unknown>): Promise<unknown> {
  const rawMin = Number(args.minMonthsSince ?? 4);
  const minMonthsSince = Math.min(Math.max(rawMin, 3), 12);
  const potential = await getSalesPotential(agentId);
  const filtered = potential.dormant.filter((c) => c.monthsSince >= minMonthsSince);
  return maskPII(filtered as unknown as Record<string, unknown>[]);
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

const EXECUTORS: Record<string, (agentId: string, args: Record<string, unknown>) => Promise<unknown>> = {
  getMonthlyRevenue: execGetMonthlyRevenue,
  getTopClients: execGetTopClients,
  getPortfolioOverview: (_agentId, args) => execGetPortfolioOverview(args['__agentId__'] as string),
  getClientHistory: execGetClientHistory,
  getCrossSellOpportunities: execGetCrossSellOpportunities,
  getDormantClients: execGetDormantClients,
};

export async function executeTool(
  name: string,
  agentId: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (name === 'getPortfolioOverview') {
    return execGetPortfolioOverview(agentId);
  }
  const executor = EXECUTORS[name];
  if (!executor) throw new Error(`Unknown tool: ${name}`);
  return executor(agentId, args);
}
