import Icon from '../ui/Icon';
import { fmt } from '../../utils/dateFormat';
import type { EmployerCluster } from '../../types/potential';

interface EmployerClustersTableProps {
  items: EmployerCluster[];
}

function CoverageChips({ branches }: { branches: string[] }) {
  if (branches.length === 0) {
    return <span className="text-on-surface-variant text-xs">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {branches.map((b) => (
        <span
          key={b}
          className="px-1.5 py-0.5 bg-primary-fixed rounded text-[10px] text-primary font-medium"
        >
          {b}
        </span>
      ))}
    </div>
  );
}

function MobileClusterCard({ item }: { item: EmployerCluster }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-secondary-container/30 flex items-center justify-center flex-shrink-0">
            <Icon name="business" className="text-secondary" size="sm" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-on-surface truncate">{item.employerName}</p>
            <p className="text-[10px] text-on-surface-variant">{item.employeeCount} עובדים</p>
          </div>
        </div>
        <div className="text-end flex-shrink-0">
          <p className="font-black text-primary text-sm">{fmt(Math.round(item.totalCommission))} ₪</p>
          <p className="text-[10px] text-on-surface-variant">ממוצע {fmt(Math.round(item.avgPerEmployee))} ₪</p>
        </div>
      </div>
      <CoverageChips branches={item.branchesCovered} />
    </div>
  );
}

export default function EmployerClustersTable({ items }: EmployerClustersTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-surface-container-high">
          <Icon name="business" className="text-on-surface-variant" size="lg" />
        </div>
        <p className="font-semibold text-on-surface text-sm">אין מעסיקים מזוהים</p>
        <p className="text-xs text-on-surface-variant">לקוחות עם אותו מעסיק יוצגו כאן</p>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => b.totalCommission - a.totalCommission);

  return (
    <div>
      <div className="hidden md:block overflow-x-auto">
        <table
          className="w-full text-sm bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden"
          aria-label="אשכולות מעסיקים"
        >
          <thead>
            <tr className="text-on-surface-variant border-b border-outline-variant/30 text-xs uppercase tracking-wide font-headline">
              <th className="text-start py-3 px-4 font-medium">מעסיק</th>
              <th className="text-start py-3 px-4 font-medium">עובדים</th>
              <th className="text-start py-3 px-4 font-medium">ענפים מכוסים</th>
              <th className="text-end py-3 px-4 font-medium">סך עמלה</th>
              <th className="text-end py-3 px-4 font-medium">ממוצע לעובד</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr
                key={item.employerId}
                className="border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-secondary-container/30 flex items-center justify-center flex-shrink-0">
                      <Icon name="business" className="text-secondary" size="sm" />
                    </div>
                    <span className="font-semibold text-on-surface">{item.employerName}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-on-surface">
                    <Icon name="group" size="sm" className="text-on-surface-variant" />
                    <span className="font-bold">{item.employeeCount}</span>
                  </span>
                </td>
                <td className="py-3 px-4">
                  <CoverageChips branches={item.branchesCovered} />
                </td>
                <td className="py-3 px-4 text-end font-black text-primary">
                  {fmt(Math.round(item.totalCommission))} ₪
                </td>
                <td className="py-3 px-4 text-end">
                  <span className="font-semibold text-on-surface">
                    {fmt(Math.round(item.avgPerEmployee))} ₪
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold text-on-surface border-t border-outline-variant/30">
              <td colSpan={3} className="py-3 px-4">
                סה״כ {sorted.length} מעסיקים
              </td>
              <td className="py-3 px-4 text-end text-primary">
                {fmt(sorted.reduce((s, i) => s + i.totalCommission, 0))} ₪
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {sorted.map((item) => (
          <MobileClusterCard key={item.employerId} item={item} />
        ))}
      </div>
    </div>
  );
}
