import { type Tool } from '@google/generative-ai';
export declare function maskPII(rows: Record<string, unknown>[]): Record<string, unknown>[];
export declare const GEMINI_TOOLS: Tool[];
export declare function executeTool(name: string, agentId: string, args: Record<string, unknown>): Promise<unknown>;
//# sourceMappingURL=advisor.tools.d.ts.map