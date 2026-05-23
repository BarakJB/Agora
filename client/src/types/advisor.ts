export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  input?: Record<string, unknown>;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export interface ConversationDetail {
  conversation: ConversationSummary;
  messages: ChatMessage[];
}

export interface ChatResponse {
  conversationId: string;
  assistantMessage: string;
  toolsUsed: string[];
}
