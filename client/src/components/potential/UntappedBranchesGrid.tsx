import Icon from '../ui/Icon';
import type { UntappedBranch, AgentBranchMix } from '../../types/potential';

interface UntappedBranchesGridProps {
  items: UntappedBranch[];
  agentBranchMix?: AgentBranchMix[];
}

function BranchTile({ item }: { item: UntappedBranch }) {
  const displayClients = item.sampleClients.slice(0, 5);
  const moreCount = item.sampleClients.length - displayClients.length;

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-emerald-200/50 p-5 hover:border-emerald-300/80 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h4 className="font-black text-on-surface text-base leading-tight">{item.branch}</h4>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {item.currentPct.toFixed(1)}% מהתיק הנוכחי
          </p>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
          <Icon name="trending_up" className="text-emerald-600" size="sm" />
        </div>
      </div>

      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-medium mb-1">
          לקוחות פוטנציאליים
        </p>
        <p className="text-3xl font-black text-emerald-600 leading-none">
          {item.opportunityClients}
        </p>
      </div>

      {displayClients.length > 0 && (
        <div className="border-t border-outline-variant/20 pt-3">
          <p className="text-[10px] text-on-surface-variant mb-2 font-medium">לדוגמה:</p>
          <div className="space-y-1">
            {displayClients.map((name) => (
              <div key={name} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" aria-hidden="true" />
                <span className="text-xs text-on-surface-variant truncate">{name}</span>
              </div>
            ))}
            {moreCount > 0 && (
              <p className="text-[10px] text-on-surface-variant/60">
                ועוד {moreCount} לקוחות...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UntappedBranchesGrid({ items, agentBranchMix }: UntappedBranchesGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-50">
          <Icon name="done_all" className="text-emerald-600" size="lg" />
        </div>
        <p className="font-semibold text-on-surface text-sm">כל הענפים מפותחים</p>
        <p className="text-xs text-on-surface-variant">אין ענפים עם פוטנציאל משמעותי שלא נוצל</p>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => b.opportunityClients - a.opportunityClients);

  return (
    <div className="space-y-4">
      {agentBranchMix && agentBranchMix.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4">
          <p className="text-xs font-semibold text-on-surface-variant mb-3 uppercase tracking-wide">
            התפלגות ענפים נוכחית בתיק
          </p>
          <div className="flex flex-wrap gap-2">
            {agentBranchMix.map((m) => (
              <div key={m.branch} className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-on-surface">{m.branch}</span>
                <span className="text-[10px] bg-primary-fixed text-primary px-1.5 py-0.5 rounded-full font-bold">
                  {m.pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sorted.map((item) => (
          <BranchTile key={item.branch} item={item} />
        ))}
      </div>
    </div>
  );
}
