import { useEffect, useRef, useState, useCallback } from 'react';
import { useAdvisorStore } from '../store/advisorStore';
import ChatMessage from '../components/advisor/ChatMessage';
import ChatInput from '../components/advisor/ChatInput';
import SuggestedQuestions from '../components/advisor/SuggestedQuestions';
import TypingIndicator from '../components/advisor/TypingIndicator';
import ConversationSidebar from '../components/advisor/ConversationSidebar';

export default function AdvisorPage() {
  const {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    error,
    send,
    loadConversations,
    loadConversation,
    newConversation,
    deleteConversation,
    clearError,
  } = useAdvisorStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-scroll to bottom when new messages arrive, unless user scrolled up
  useEffect(() => {
    if (userScrolledUp) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading, userScrolledUp]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setUserScrolledUp(distanceFromBottom > 80);
  }

  const handleSend = useCallback(
    async (message: string) => {
      setUserScrolledUp(false);
      await send(message);
    },
    [send],
  );

  function handleSelectConversation(id: string) {
    loadConversation(id);
    setSidebarOpen(false);
  }

  function handleNewConversation() {
    newConversation();
    setSidebarOpen(false);
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden" dir="rtl">
      {/* Sidebar — desktop always visible, mobile overlay */}
      <div className="hidden lg:block w-64 shrink-0 border-l border-outline-variant/30">
        <ConversationSidebar
          conversations={conversations}
          currentId={currentConversationId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onDelete={deleteConversation}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-inverse-surface/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-72 z-50 lg:hidden">
            <ConversationSidebar
              conversations={conversations}
              currentId={currentConversationId}
              onSelect={handleSelectConversation}
              onNew={handleNewConversation}
              onDelete={deleteConversation}
            />
          </div>
        </>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header */}
        <header className="shrink-0 px-4 md:px-6 py-4 border-b border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
              aria-label="פתח רשימת שיחות"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div className="w-9 h-9 editorial-gradient rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[20px]">smart_toy</span>
            </div>
            <div>
              <h1 className="text-base font-black font-headline text-on-surface leading-tight">יועץ AI</h1>
              <p className="text-[11px] text-on-surface-variant/60">שאל אותי על הנתונים שלך</p>
            </div>
          </div>

          <button
            onClick={handleNewConversation}
            aria-label="שיחה חדשה"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-primary hover:bg-primary-fixed transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            שיחה חדשה
          </button>
        </header>

        {/* Error banner */}
        {error && (
          <div className="shrink-0 mx-4 mt-3 bg-error-container text-on-error-container px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error}</span>
            </div>
            <button
              onClick={clearError}
              aria-label="סגור הודעת שגיאה"
              className="shrink-0 text-on-error-container/60 hover:text-on-error-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Messages area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4"
        >
          {messages.length === 0 && !isLoading ? (
            <SuggestedQuestions onSelect={handleSend} />
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
            </>
          )}
        </div>

        {/* Scroll to bottom hint */}
        {userScrolledUp && messages.length > 0 && (
          <div className="shrink-0 flex justify-center pb-2">
            <button
              onClick={() => {
                setUserScrolledUp(false);
                const el = scrollRef.current;
                if (el) el.scrollTop = el.scrollHeight;
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold hover:bg-primary/20 transition-colors"
              aria-label="גלול לתחתית"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
              גלול לתחתית
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="shrink-0 px-4 md:px-6 py-3 border-t border-outline-variant/30 bg-surface-container-lowest">
          <ChatInput onSend={handleSend} disabled={isLoading} />
          <p className="text-[10px] text-on-surface-variant/40 text-center mt-2">
            Enter לשליחה · Shift+Enter לשורה חדשה
          </p>
        </div>
      </div>
    </div>
  );
}
