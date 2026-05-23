export interface Conversation {
    id: string;
    agentId: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface ConversationSummary {
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface Message {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    toolCalls: unknown | null;
    tokensInput: number | null;
    tokensOutput: number | null;
    latencyMs: number | null;
    createdAt: string;
}
export interface AppendMessageInput {
    conversationId: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    toolCalls?: unknown;
    tokensInput?: number;
    tokensOutput?: number;
    latencyMs?: number;
}
export declare function createConversation(agentId: string): Promise<{
    id: string;
}>;
export declare function getConversationById(id: string, agentId: string): Promise<Conversation | null>;
export declare function listConversationsByAgent(agentId: string, limit?: number): Promise<ConversationSummary[]>;
export declare function appendMessage(input: AppendMessageInput): Promise<{
    id: string;
}>;
export declare function getMessagesByConversation(conversationId: string): Promise<Message[]>;
export declare function deleteConversation(id: string, agentId: string): Promise<boolean>;
export declare function updateConversationTitle(id: string, agentId: string, title: string): Promise<void>;
//# sourceMappingURL=advisor.repository.d.ts.map