import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { fmt } from '../../utils/dateFormat';
import type { CrossSellOpportunity } from '../../types/potential';

interface CrossSellTableProps {
  items: CrossSellOpportunity[];
  onClientClick?: (id: string) => void;
}

function BranchChip({ label, variant }: { label: string; variant: 'current' | 'missing' }) {
  if (variant === 'missing') {
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 ring-1 ring-emerald-200">
        <span className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" aria-hidden="true" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-fixed text-primary border border-primary/20">
      {label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-primary/60';

  return (
    <div className="flex items-center gap-2 min-w-[80px]" aria-label={`ציון פוטנציאל: ${pct}`}>
      <div className="flex-1 h-1.5 bg-outline-variant/20 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-on-surface-variant w-7 text-end">{pct}</span>
    </div>
  );
}

function MobileCard({
  item,
  rank,
  onClick,
}: {
  item: CrossSellOpportunity;
  rank: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-start bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 hover:border-primary/30 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
      aria-label={`לקוח ${item.insuredName}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-6 h-6 rounded-full bg-primary-fixed text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
            {rank}
          </span>
          <span className="font-bold text-on-surface truncate">{item.insuredName}</span>
        </div>
        <span className="font-black text-primary text-sm flex-shrink-0">
          {fmt(Math.round(item.totalCommission))} ₪
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {item.currentBranches.map((b) => (
          <BranchChip key={b} label={b} variant="current" />
        ))}
        {item.missingBranches.map((b) => (
          <BranchChip key={b} label={b} variant="missing" />
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <ScoreBar score={item.potentialScore} />
        <span className="text-[10px] text-on-surface-variant">{item.monthsActive} חודשים</span>
      </div>
    </button>
  );
}

export default function CrossSellTable({ items, onClientClick }: CrossSellTableProps) {
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(10);

  function handleClick(id: string, name: string) {
    if (onClientClick) {
      onClientClick(id);
    } else {
      navigate(`/clients/${encodeURIComponent(id)}`, { state: { clientName: name } });
    }
  }

  const sorted = [...items].sort((a, b) => b.potentialScore - a.potentialScore);
  const visible = sorted.slice(0, visibleCount);

  if (items.length === 0) {
    return (
      <EmptySectionState
        icon="check_circle"
        title="אין הזדמנויות cross-sell"
        subtitle="כל הלקוחות שלך מכוסים בכל הענפים הרלוונטיים"
        positive
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden md:block overflow-x-auto">
        <table
          className="w-full text-sm bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden"
          aria-label="הזדמנויות cross-sell"
        >
          <thead>
            <tr className="text-on-surface-variant border-b border-outline-variant/30 text-xs uppercase tracking-wide font-headline">
              <th className="text-start py-3 px-4 font-medium w-8">#</th>
              <th className="text-start py-3 px-4 font-medium">לקוח</th>
              <th className="text-start py-3 px-4 font-medium">ענפים נוכחיים</th>
              <th className="text-start py-3 px-4 font-medium">
                <span className="flex items-center gap-1 text-emerald-600">
                  <Icon name="add_circle" size="sm" />
                  ענפים חסרים
                </span>
              </th>
              <th className="text-end py-3 px-4 font-medium">עמלות</th>
              <th className="text-start py-3 px-4 font-medium w-36">פוטנציאל</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item, i) => (
              <tr
                key={item.insuredId}
                className="border-b border-outline-variant/10 hover:bg-primary-fixed/10 transition-colors cursor-pointer"
                onClick={() => handleClick(item.insuredId, item.insuredName)}
                role="button"
                aria-label={`פרטי לקוח ${item.insuredName}`}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleClick(item.insuredId, item.insuredName)}
              >
                <td className="py-3 px-4 text-on-surface-variant font-bold text-xs">{i + 1}</td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-on-surface">{item.insuredName}</div>
                  <div className="text-[10px] text-on-surface-variant">{item.monthsActive} חודשים פעיל</div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {item.currentBranches.map((b) => (
                      <BranchChip key={b} label={b} variant="current" />
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {item.missingBranches.map((b) => (
                      <BranchChip key={b} label={b} variant="missing" />
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 text-end font-bold text-primary">
                  {fmt(Math.round(item.totalCommission))} ₪
                </td>
                <td className="py-3 px-4">
                  <ScoreBar score={item.potentialScore} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2">
        {visible.map((item, i) => (
          <MobileCard
            key={item.insuredId}
            item={item}
            rank={i + 1}
            onClick={() => handleClick(item.insuredId, item.insuredName)}
          />
        ))}
      </div>

      {visibleCount < sorted.length && (
        <button
          onClick={() => setVisibleCount((v) => v + 10)}
          className="w-full py-2.5 text-sm font-semibold text-primary hover:bg-primary-fixed/20 rounded-xl border border-primary/20 transition-colors"
        >
          הצג עוד ({sorted.length - visibleCount} נותרו)
        </button>
      )}
    </div>
  );
}

function EmptySectionState({
  icon,
  title,
  subtitle,
  positive = false,
}: {
  icon: string;
  title: string;
  subtitle: string;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center ${
          positive ? 'bg-emerald-50' : 'bg-surface-container-high'
        }`}
      >
        <Icon
          name={icon}
          className={positive ? 'text-emerald-600' : 'text-on-surface-variant'}
          size="lg"
        />
      </div>
      <p className="font-semibold text-on-surface text-sm">{title}</p>
      <p className="text-xs text-on-surface-variant">{subtitle}</p>
    </div>
  );
}
