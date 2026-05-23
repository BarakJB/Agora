export default function TypingIndicator() {
  return (
    <div className="flex justify-end gap-2 items-end" dir="rtl">
      <div className="w-7 h-7 rounded-full editorial-gradient flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-white text-[14px]">smart_toy</span>
      </div>
      <div className="bg-surface-container-lowest shadow-editorial-sm rounded-xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1.5 h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
