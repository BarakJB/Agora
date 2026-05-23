import { GoogleGenerativeAI, type Content } from '@google/generative-ai';
import { logger } from '../../config/logger.js';
import { SYSTEM_PROMPT } from './advisor.prompts.js';
import { GEMINI_TOOLS, executeTool } from './advisor.tools.js';
import { buildBaselineContext } from './advisor.context.js';
import {
  createConversation,
  getConversationById,
  appendMessage,
  getMessagesByConversation,
  updateConversationTitle,
  type Message,
} from '../../repositories/advisor.repository.js';

const MAX_TOOL_ITERATIONS = 4;
const HISTORY_MESSAGE_LIMIT = 10;

export interface ChatInput {
  agentId: string;
  userMessage: string;
  conversationId?: string;
}

export interface ChatResult {
  conversationId: string;
  assistantMessage: string;
  toolsUsed: string[];
}

function buildHistory(messages: Message[]): Content[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
}

function buildClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Add it to your .env file.');
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function chat(input: ChatInput): Promise<ChatResult> {
  const { agentId, userMessage } = input;
  const startMs = Date.now();

  let conversationId = input.conversationId ?? null;

  if (conversationId) {
    const existing = await getConversationById(conversationId, agentId);
    if (!existing) throw new Error('Conversation not found');
  } else {
    const created = await createConversation(agentId);
    conversationId = created.id;
  }

  const [pastMessages, baselineContext] = await Promise.all([
    getMessagesByConversation(conversationId),
    buildBaselineContext(agentId),
  ]);

  const isFirstMessage = pastMessages.length === 0;

  await appendMessage({ conversationId, role: 'user', content: userMessage });

  const history = buildHistory(pastMessages.slice(-HISTORY_MESSAGE_LIMIT));

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const client = buildClient();
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: `${SYSTEM_PROMPT}\n\nנתוני רקע לסוכן זה:\n${baselineContext}`,
    tools: GEMINI_TOOLS,
  });

  const chatSession = model.startChat({ history });

  const toolsUsed: string[] = [];
  let totalPromptTokens = 0;
  let totalCandidateTokens = 0;

  const firstResult = await chatSession.sendMessage(userMessage);
  let response = firstResult.response;

  totalPromptTokens += response.usageMetadata?.promptTokenCount ?? 0;
  totalCandidateTokens += response.usageMetadata?.candidatesTokenCount ?? 0;

  let iterations = 0;

  while (response.functionCalls() && response.functionCalls()!.length > 0 && iterations < MAX_TOOL_ITERATIONS) {
    iterations++;
    const calls = response.functionCalls()!;
    const toolResultParts: Array<{ functionResponse: { name: string; response: { result: unknown } } }> = [];

    for (const call of calls) {
      toolsUsed.push(call.name);
      const toolResult = await executeTool(call.name, agentId, call.args as Record<string, unknown>);
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

  await appendMessage({
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
    await updateConversationTitle(conversationId, agentId, title);
  }

  logger.info({
    agentId,
    conversationId,
    tokensIn: totalPromptTokens,
    tokensOut: totalCandidateTokens,
    latencyMs,
    toolsUsed,
  }, 'advisor.chat completed');

  return { conversationId, assistantMessage: assistantText, toolsUsed };
}
