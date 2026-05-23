import Icon from '../ui/Icon';
import { fmt, formatMonth } from '../../utils/dateFormat';
import type { DormantClient } from '../../types/potential';

interface DormantListProps {
  items: DormantClient[];
}

function SinceBadge({ months }: { months: number }) {
  const urgency =
    months >= 12
      ? { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' }
      : months >= 6
      ? { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' }
      : { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${urgency.bg} ${urgency.text} ${urgency.border}`}
      role="status"
      aria-label={`${months} חודשים מאז עמלה אחרונה`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${urgency.dot}`} aria-hidden="true" />
      {months} חודשים מאז עמלה
    </span>
  );
}

function DormantCard({ item }: { item: DormantClient }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-amber-200/60 p-4 hover:border-amber-300/80 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center flex-shrink-0">
            <Icon name="person_off" className="text-amber-600" size="sm" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-on-surface truncate">{item.insuredName}</p>
            <p className="text-[10px] text-on-surface-variant">
              פעיל לאחרונה: {formatMonth(item.lastMonth)}
            </p>
          </div>
        </div>
        <SinceBadge months={item.monthsSince} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1">
          {item.branches.map((b) => (
            <span
              key={b}
              className="px-1.5 py-0.5 bg-surface-container-high rounded text-[10px] text-on-surface-variant font-medium border border-outline-variant/20"
            >
              {b}
            </span>
          ))}
        </div>
        <div className="text-end flex-shrink-0">
          <p className="text-xs text-on-surface-variant">סה״כ היסטורי</p>
          <p className="font-black text-on-surface text-sm">{fmt(Math.round(item.historicalTotal))} ₪</p>
        </div>
      </div>
    </div>
  );
}

export default function DormantList({ items }: DormantListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-50">
          <Icon name="celebration" className="text-emerald-600" size="lg" />
        </div>
        <p className="font-semibold text-on-surface text-sm">אין לקוחות רדומים</p>
        <p className="text-xs text-on-surface-variant">כל הלקוחות שלך פעילים</p>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => b.monthsSince - a.monthsSince);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sorted.map((item) => (
        <DormantCard key={item.insuredId} item={item} />
      ))}
    </div>
  );
}
