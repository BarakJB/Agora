"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWithTools = generateWithTools;
exports.sendFunctionResults = sendFunctionResults;
const generative_ai_1 = require("@google/generative-ai");
function buildClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured. Add it to your .env file.');
    }
    return new generative_ai_1.GoogleGenerativeAI(apiKey);
}
async function generateWithTools(options) {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const client = buildClient();
    const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: options.systemInstruction,
        tools: options.tools,
    });
    const chat = model.startChat({ history: options.history });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const result = await chat.sendMessage(options.userMessage);
        const response = result.response;
        const usage = {
            promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        };
        const calls = response.functionCalls();
        if (calls && calls.length > 0) {
            return {
                functionCalls: calls.map((c) => ({
                    name: c.name,
                    args: c.args,
                })),
                usage,
            };
        }
        return { text: response.text(), usage };
    }
    finally {
        clearTimeout(timeout);
    }
}
async function sendFunctionResults(chat, results) {
    const parts = results.map((r) => ({
        functionResponse: {
            name: r.name,
            response: { result: r.result },
        },
    }));
    const result = await chat.sendMessage(parts);
    const response = result.response;
    const usage = {
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    };
    const calls = response.functionCalls();
    if (calls && calls.length > 0) {
        return {
            functionCalls: calls.map((c) => ({
                name: c.name,
                args: c.args,
            })),
            usage,
        };
    }
    return { text: response.text(), usage };
}
//# sourceMappingURL=gemini.client.js.map