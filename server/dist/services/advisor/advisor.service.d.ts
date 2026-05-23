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
export declare function chat(input: ChatInput): Promise<ChatResult>;
//# sourceMappingURL=advisor.service.d.ts.map