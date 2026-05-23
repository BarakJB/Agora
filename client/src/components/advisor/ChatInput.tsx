import { useState, useRef, useEffect } from 'react';

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

const MAX_LENGTH = 2000;

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  function adjustHeight() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value.slice(0, MAX_LENGTH);
    setValue(next);
    adjustHeight();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  const remaining = MAX_LENGTH - value.length;
  const isNearLimit = remaining < 200;

  return (
    <div
      className="flex items-end gap-2 bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-editorial-sm px-3 py-2 focus-within:border-primary/50 focus-within:shadow-editorial transition-all"
      dir="rtl"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="שאל אותי כל שאלה על הנתונים שלך..."
        aria-label="הודעה ליועץ AI"
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none leading-relaxed py-1 min-h-[36px] max-h-[160px] disabled:opacity-50"
      />

      <div className="flex items-center gap-2 pb-1 shrink-0">
        {isNearLimit && (
          <span className={`text-[10px] font-medium ${remaining < 50 ? 'text-error' : 'text-on-surface-variant/50'}`}>
            {remaining}
          </span>
        )}
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="שלח הודעה"
          className="w-8 h-8 rounded-lg editorial-gradient text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </div>
    </div>
  );
}
