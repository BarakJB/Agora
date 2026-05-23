import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Icon from '../ui/Icon';
import { TrafficLightPill } from '../common/TrafficLight';
import { evaluateUncoveredPct } from '../../utils/profitThresholds';
import { fmt } from '../../utils/dateFormat';
import type { ContractCoverageSummary } from '../../types/contract-coverage';

interface ContractCoverageCardProps {
  summary: ContractCoverageSummary;
  totalAmount?: number;
}

const COVERED_COLOR = '#10b981';
const UNCOVERED_YELLOW = '#f59e0b';
const UNCOVERED_RED = '#ef4444';

export default function ContractCoverageCard({ summary, totalAmount }: ContractCoverageCardProps) {
  const navigate = useNavigate();

  const total = summary.coveredCount + summary.uncoveredCount;
  const uncoveredPct = total > 0 ? Math.round((summary.uncoveredCount / total) * 100) : 0;
  const coveredPct = 100 - uncoveredPct;
  const level = evaluateUncoveredPct(uncoveredPct);

  const uncoveredColor = level === 'red' ? UNCOVERED_RED : level === 'yellow' ? UNCOVERED_YELLOW : UNCOVERED_YELLOW;

  const chartData = [
    { name: 'תחת חוזה', value: summary.coveredCount },
    { name: 'ללא חוזה', value: summary.uncoveredCount },
  ];

  const colors = [COVERED_COLOR, uncoveredColor];

  return (
    <section className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center">
            <Icon name="gavel" className="text-primary" size="sm" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-headline text-on-surface">כיסוי חוזי</h2>
            <p className="text-xs text-on-surface-variant">עמלות תחת הסכם מול ללא הסכם</p>
          </div>
        </div>
        <TrafficLightPill level={level} label={`${uncoveredPct}% ללא חוזה`} size="sm" />
      </div>

      <div className="flex items-center gap-6">
        <div style={{ width: 120, height: 120, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={34}
                outerRadius={54}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={colors[i]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} רשומות`, name]}
                contentStyle={{ direction: 'rtl', fontSize: 12, borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COVERED_COLOR }} aria-hidden="true" />
              <span className="text-sm text-on-surface">תחת חוזה</span>
            </div>
            <div className="text-end">
              <span className="text-sm font-bold text-on-surface">{coveredPct}%</span>
              <span className="text-xs text-on-surface-variant ms-1.5">({summary.coveredCount} רשומות)</span>
            </div>
          </div>
          <div className="text-xs text-on-surface-variant me-5 text-end">
            {fmt(summary.coveredAmount)}{'₪'}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: uncoveredColor }} aria-hidden="true" />
              <span className="text-sm text-on-surface">ללא חוזה</span>
            </div>
            <div className="text-end">
              <span className="text-sm font-bold text-on-surface">{uncoveredPct}%</span>
              <span className="text-xs text-on-surface-variant ms-1.5">({summary.uncoveredCount} רשומות)</span>
            </div>
          </div>
          <div className="text-xs text-on-surface-variant me-5 text-end">
            {fmt(summary.uncoveredAmount)}{'₪'}
          </div>

          {totalAmount !== undefined && totalAmount > 0 && (
            <div className="text-xs text-on-surface-variant border-t border-outline-variant/20 pt-2">
              סה״כ: <span className="font-semibold text-on-surface">{fmt(totalAmount)}{'₪'}</span>
            </div>
          )}
        </div>
      </div>

      {summary.uncoveredCount > 0 && (
        <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
          level === 'red'
            ? 'bg-error-container/20 border border-error/20'
            : 'bg-amber-50 border border-amber-200/50'
        }`}>
          <Icon
            name="warning"
            className={level === 'red' ? 'text-error shrink-0' : 'text-amber-600 shrink-0'}
            size="sm"
          />
          <p className={`text-xs ${level === 'red' ? 'text-on-error-container' : 'text-amber-800'}`}>
            {summary.uncoveredCount} רשומות ({fmt(summary.uncoveredAmount)}₪) אינן מכוסות בהסכם. העלאת הסכם תגדיל שקיפות ותעזור לעקוב אחרי ביצועים מול יעדים.
          </p>
        </div>
      )}

      <button
        onClick={() => navigate('/portfolio/contract-coverage')}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary-fixed text-primary text-sm font-semibold hover:bg-primary-fixed/70 transition-colors"
        aria-label="עבור לדף כיסוי חוזי מפורט"
      >
        <Icon name="open_in_new" size="sm" />
        צפה בפירוט מלא
      </button>
    </section>
  );
}
