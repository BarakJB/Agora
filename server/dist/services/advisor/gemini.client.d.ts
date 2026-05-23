import { GoogleGenerativeAI, type Content, type Tool } from '@google/generative-ai';
export interface GeminiUsage {
    promptTokens: number;
    candidateTokens: number;
    totalTokens: number;
}
export interface FunctionCall {
    name: string;
    args: Record<string, unknown>;
}
export interface GenerateResult {
    text?: string;
    functionCalls?: FunctionCall[];
    usage: GeminiUsage;
}
export interface GenerateOptions {
    systemInstruction: string;
    history: Content[];
    tools: Tool[];
    userMessage: string;
}
export declare function generateWithTools(options: GenerateOptions): Promise<GenerateResult>;
export declare function sendFunctionResults(chat: ReturnType<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['startChat']>, results: Array<{
    name: string;
    result: unknown;
}>): Promise<GenerateResult>;
//# sourceMappingURL=gemini.client.d.ts.map