import { create } from 'zustand';
import { advisorApi, ApiError } from '../services/api';
import type { ChatMessage, ConversationSummary } from '../types/advisor';

interface AdvisorState {
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  send: (message: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  newConversation: () => void;
  deleteConversation: (id: string) => Promise<void>;
  clearError: () => void;
}

function buildOptimisticUserMessage(content: string): ChatMessage {
  return {
    id: `optimistic-${Date.now()}`,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  };
}

export const useAdvisorStore = create<AdvisorState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,
  error: null,

  send: async (message) => {
    const { currentConversationId, messages } = get();

    const optimisticMsg = buildOptimisticUserMessage(message);
    set({ messages: [...messages, optimisticMsg], isLoading: true, error: null });

    try {
      const res = await advisorApi.chat({
        message,
        conversationId: currentConversationId ?? undefined,
      });

      if (!res.data) throw new Error('תגובה ריקה מהשרת');

      const { conversationId, assistantMessage, toolsUsed } = res.data;

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantMessage,
        createdAt: new Date().toISOString(),
        toolCalls: toolsUsed.length > 0 ? toolsUsed.map((name) => ({ name })) : undefined,
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        currentConversationId: conversationId,
        isLoading: false,
      }));

      // Refresh conversations list so the new/updated conversation appears
      get().loadConversations().catch(() => undefined);
    } catch (err) {
      const errorMsg =
        err instanceof ApiError
          ? err.serverError || err.message
          : err instanceof Error
            ? err.message
            : 'שגיאה בשליחת ההודעה';

      // Remove optimistic message on failure
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== optimisticMsg.id),
        isLoading: false,
        error: errorMsg,
      }));
    }
  },

  loadConversations: async () => {
    try {
      const res = await advisorApi.listConversations();
      set({ conversations: res.data ?? [] });
    } catch {
      // Non-blocking — sidebar will show empty state
    }
  },

  loadConversation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await advisorApi.getConversation(id);
      if (!res.data) throw new Error('שיחה לא נמצאה');
      set({
        messages: res.data.messages,
        currentConversationId: id,
        isLoading: false,
      });
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.serverError || err.message : 'שגיאה בטעינת השיחה';
      set({ isLoading: false, error: errorMsg });
    }
  },

  newConversation: () => {
    set({ currentConversationId: null, messages: [], error: null });
  },

  deleteConversation: async (id) => {
    try {
      await advisorApi.deleteConversation(id);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
        messages: state.currentConversationId === id ? [] : state.messages,
      }));
    } catch (err) {
      const errorMsg =
        err instanceof ApiError ? err.serverError || err.message : 'שגיאה במחיקת השיחה';
      set({ error: errorMsg });
    }
  },

  clearError: () => set({ error: null }),
}));
