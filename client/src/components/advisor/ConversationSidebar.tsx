import { useState } from 'react';
import type { ConversationSummary } from '../../types/advisor';

interface Props {
  conversations: ConversationSummary[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function formatRelativeDate(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'היום';
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function ConversationSidebar({ conversations, currentId, onSelect, onNew, onDelete }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <aside className="flex flex-col h-full bg-surface-container-low" dir="rtl">
      <div className="p-4 border-b border-outline-variant/30">
        <button
          onClick={onNew}
          aria-label="שיחה חדשה"
          className="w-full bg-primary-container text-white py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          שיחה חדשה
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-on-surface-variant/60 mt-4">
            אין שיחות קודמות
          </div>
        ) : (
          <ul className="p-2 space-y-0.5" role="list">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => onSelect(conv.id)}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  aria-current={currentId === conv.id ? 'true' : undefined}
                  className={`w-full text-start px-3 py-2.5 rounded-lg transition-colors flex items-start justify-between gap-2 group ${
                    currentId === conv.id
                      ? 'bg-surface-container-high text-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate leading-snug">{conv.title}</p>
                    <p className="text-[10px] text-on-surface-variant/50 mt-0.5">
                      {formatRelativeDate(conv.updatedAt)}
                    </p>
                  </div>

                  {hoveredId === conv.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      aria-label={`מחק שיחה: ${conv.title}`}
                      className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-on-surface-variant/50 hover:text-error hover:bg-error-container/30 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
