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

function buildClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Add it to your .env file.');
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function generateWithTools(options: GenerateOptions): Promise<GenerateResult> {
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const client = buildClient();

  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: options.systemInstruction,
    tools: options.tools,
  });

  const chat = model.startChat({ history: options.history });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const result = await chat.sendMessage(options.userMessage);
    const response = result.response;

    const usage: GeminiUsage = {
      promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
      candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    };

    const calls = response.functionCalls();
    if (calls && calls.length > 0) {
      return {
        functionCalls: calls.map((c) => ({
          name: c.name,
          args: c.args as Record<string, unknown>,
        })),
        usage,
      };
    }

    return { text: response.text(), usage };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendFunctionResults(
  chat: ReturnType<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['startChat']>,
  results: Array<{ name: string; result: unknown }>,
): Promise<GenerateResult> {
  const parts = results.map((r) => ({
    functionResponse: {
      name: r.name,
      response: { result: r.result },
    },
  }));

  const result = await chat.sendMessage(parts);
  const response = result.response;

  const usage: GeminiUsage = {
    promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
    candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
  };

  const calls = response.functionCalls();
  if (calls && calls.length > 0) {
    return {
      functionCalls: calls.map((c) => ({
        name: c.name,
        args: c.args as Record<string, unknown>,
      })),
      usage,
    };
  }

  return { text: response.text(), usage };
}
