import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '../../types/advisor';

interface Props {
  message: ChatMessageType;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;

  return (
    <div
      className={`flex ${isUser ? 'justify-start' : 'justify-end'} gap-2 items-end`}
      dir="rtl"
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full editorial-gradient flex items-center justify-center shrink-0 mb-5">
          <span className="material-symbols-outlined text-white text-[14px]">smart_toy</span>
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'order-2' : ''}`}>
        {hasToolCalls && (
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <span className="material-symbols-outlined text-[13px] text-on-surface-variant/60">database</span>
            <span className="text-[11px] text-on-surface-variant/60 font-medium">שאל את הנתונים</span>
          </div>
        )}

        <div
          className={`rounded-xl px-4 py-3 ${
            isUser
              ? 'bg-primary text-on-primary rounded-br-sm'
              : 'bg-surface-container-lowest shadow-editorial-sm text-on-surface rounded-bl-sm'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none text-on-surface [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>table]:text-xs [&>table]:border-collapse [&_th]:border [&_th]:border-outline-variant [&_th]:px-2 [&_th]:py-1 [&_th]:bg-surface-container-low [&_td]:border [&_td]:border-outline-variant [&_td]:px-2 [&_td]:py-1 [&>code]:bg-surface-container-high [&>code]:px-1 [&>code]:rounded [&>pre]:bg-surface-container-high [&>pre]:p-3 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>blockquote]:border-r-2 [&>blockquote]:border-primary/30 [&>blockquote]:pr-3 [&>blockquote]:text-on-surface-variant">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <p className={`text-[10px] text-on-surface-variant/50 mt-1 px-1 ${isUser ? 'text-start' : 'text-end'}`}>
          {formatTime(message.createdAt)}
        </p>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 mb-5 order-1">
          <span className="material-symbols-outlined text-primary text-[14px]">person</span>
        </div>
      )}
    </div>
  );
}
