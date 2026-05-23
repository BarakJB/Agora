interface Props {
  onSelect: (question: string) => void;
}

const SUGGESTED_QUESTIONS = [
  'כמה הרווחתי בחודש האחרון?',
  'מי הלקוח הכי רווחי שלי?',
  'תראה לי סיכום החזקות לפי חברה',
  'מה ההיסטוריה של העמלות שלי?',
  'מה החיזוי לחודש הבא?',
];

export default function SuggestedQuestions({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4" dir="rtl">
      <div className="w-16 h-16 editorial-gradient rounded-2xl flex items-center justify-center shadow-editorial">
        <span className="material-symbols-outlined text-white text-3xl">smart_toy</span>
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-xl font-black font-headline text-on-surface">שאל אותי על הנתונים שלך</h2>
        <p className="text-sm text-on-surface-variant">אני מחובר לכל המידע שלך ויכול לענות על כל שאלה</p>
      </div>
      <div className="w-full max-w-lg space-y-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="w-full text-start px-4 py-3 rounded-lg bg-surface-container-lowest hover:bg-primary-fixed hover:text-primary border border-outline-variant/50 hover:border-primary/30 transition-all text-sm text-on-surface font-medium flex items-center justify-between gap-3 group"
            aria-label={`שאל: ${q}`}
          >
            <span>{q}</span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant/40 group-hover:text-primary/60 shrink-0">
              arrow_back
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
