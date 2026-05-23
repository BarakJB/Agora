"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chat = chat;
const generative_ai_1 = require("@google/generative-ai");
const logger_js_1 = require("../../config/logger.js");
const advisor_prompts_js_1 = require("./advisor.prompts.js");
const advisor_tools_js_1 = require("./advisor.tools.js");
const advisor_context_js_1 = require("./advisor.context.js");
const advisor_repository_js_1 = require("../../repositories/advisor.repository.js");
const MAX_TOOL_ITERATIONS = 4;
const HISTORY_MESSAGE_LIMIT = 10;
function buildHistory(messages) {
    return messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
    }));
}
function buildClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured. Add it to your .env file.');
    }
    return new generative_ai_1.GoogleGenerativeAI(apiKey);
}
async function chat(input) {
    const { agentId, userMessage } = input;
    const startMs = Date.now();
    let conversationId = input.conversationId ?? null;
    if (conversationId) {
        const existing = await (0, advisor_repository_js_1.getConversationById)(conversationId, agentId);
        if (!existing)
            throw new Error('Conversation not found');
    }
    else {
        const created = await (0, advisor_repository_js_1.createConversation)(agentId);
        conversationId = created.id;
    }
    const [pastMessages, baselineContext] = await Promise.all([
        (0, advisor_repository_js_1.getMessagesByConversation)(conversationId),
        (0, advisor_context_js_1.buildBaselineContext)(agentId),
    ]);
    const isFirstMessage = pastMessages.length === 0;
    await (0, advisor_repository_js_1.appendMessage)({ conversationId, role: 'user', content: userMessage });
    const history = buildHistory(pastMessages.slice(-HISTORY_MESSAGE_LIMIT));
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const client = buildClient();
    const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: `${advisor_prompts_js_1.SYSTEM_PROMPT}\n\nנתוני רקע לסוכן זה:\n${baselineContext}`,
        tools: advisor_tools_js_1.GEMINI_TOOLS,
    });
    const chatSession = model.startChat({ history });
    const toolsUsed = [];
    let totalPromptTokens = 0;
    let totalCandidateTokens = 0;
    const firstResult = await chatSession.sendMessage(userMessage);
    let response = firstResult.response;
    totalPromptTokens += response.usageMetadata?.promptTokenCount ?? 0;
    totalCandidateTokens += response.usageMetadata?.candidatesTokenCount ?? 0;
    let iterations = 0;
    while (response.functionCalls() && response.functionCalls().length > 0 && iterations < MAX_TOOL_ITERATIONS) {
        iterations++;
        const calls = response.functionCalls();
        const toolResultParts = [];
        for (const call of calls) {
            toolsUsed.push(call.name);
            const toolResult = await (0, advisor_tools_js_1.executeTool)(call.name, agentId, call.args);
            toolResultParts.push({
                functionResponse: {
                    name: call.name,
                    response: { result: toolResult },
                },
            });
        }
        const toolResponse = await chatSession.sendMessage(toolResultParts);
        response = toolResponse.response;
        totalPromptTokens += response.usageMetadata?.promptTokenCount ?? 0;
        totalCandidateTokens += response.usageMetadata?.candidatesTokenCount ?? 0;
    }
    const assistantText = response.text();
    const latencyMs = Date.now() - startMs;
    await (0, advisor_repository_js_1.appendMessage)({
        conversationId,
        role: 'assistant',
        content: assistantText,
        toolCalls: toolsUsed.length > 0 ? toolsUsed : undefined,
        tokensInput: totalPromptTokens,
        tokensOutput: totalCandidateTokens,
        latencyMs,
    });
    if (isFirstMessage) {
        const title = userMessage.slice(0, 50).trim();
        await (0, advisor_repository_js_1.updateConversationTitle)(conversationId, agentId, title);
    }
    logger_js_1.logger.info({
        agentId,
        conversationId,
        tokensIn: totalPromptTokens,
        tokensOut: totalCandidateTokens,
        latencyMs,
        toolsUsed,
    }, 'advisor.chat completed');
    return { conversationId, assistantMessage: assistantText, toolsUsed };
}
//# sourceMappingURL=advisor.service.js.map