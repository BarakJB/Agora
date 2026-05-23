import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import AnomalyList from '../components/anomalies/AnomalyList';
import * as api from '../services/api';
import type { CommissionRow } from '../store/dataStore';
import { detectAnomalies } from '../utils/anomalies';
import type { Anomaly } from '../utils/anomalies';
import { formatMonth, fmt } from '../utils/dateFormat';
import { mapToCommissionRow } from '../utils/commissionMapper';

const TYPE_LABELS: Record<Anomaly['type'], string> = {
  total_drop: 'ירידה כללית',
  client_lost: 'לקוח שאבד',
  client_negative: 'ביטול/החזר',
  client_spike: 'ירידה אצל לקוח',
  total_spike: 'עלייה חדה',
  policy_lost: 'פוליסה שנעלמה',
};

const ALL_TYPES: Anomaly['type'][] = ['total_drop', 'client_lost', 'client_negative', 'client_spike', 'total_spike', 'policy_lost'];
const ALL_SEVERITIES: Anomaly['severity'][] = ['high', 'medium', 'low'];

const SEVERITY_LABELS: Record<Anomaly['severity'], string> = {
  high: 'חמורה',
  medium: 'בינונית',
  low: 'קלה',
};

export default function AnomaliesPage() {
  const navigate = useNavigate();

  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<Anomaly['severity'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<Anomaly['type'] | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getSalesTransactions();
        if (!cancelled) {
          setCommissions((res.data || []).map(mapToCommissionRow));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    commissions.forEach(c => { if (c.processingMonth) months.add(c.processingMonth); });
    return Array.from(months).sort();
  }, [commissions]);

  const allAnomalies = useMemo(
    () => detectAnomalies(commissions, availableMonths),
    [commissions, availableMonths],
  );

  const filtered = useMemo(() => {
    let result = allAnomalies;
    if (selectedMonth !== 'all') result = result.filter(a => a.month === selectedMonth);
    if (severityFilter !== 'all') result = result.filter(a => a.severity === severityFilter);
    if (typeFilter !== 'all') result = result.filter(a => a.type === typeFilter);
    return result;
  }, [allAnomalies, selectedMonth, severityFilter, typeFilter]);

  const highCount = useMemo(() => allAnomalies.filter(a => a.severity === 'high').length, [allAnomalies]);
  const mediumCount = useMemo(() => allAnomalies.filter(a => a.severity === 'medium').length, [allAnomalies]);
  const lowCount = useMemo(() => allAnomalies.filter(a => a.severity === 'low').length, [allAnomalies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Icon name="cloud_off" size="xl" className="text-error/40" />
        <p className="font-bold text-on-surface">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary-container text-white px-6 py-2 rounded-lg font-semibold text-sm"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6" dir="rtl">
      <section className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black font-headline text-on-surface tracking-tight mb-1">
            חריגות והתראות
          </h2>
          <p className="text-on-surface-variant">זיהוי אוטומטי של שינויים חריגים בעמלות</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="self-start flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <Icon name="arrow_forward" size="sm" />
          חזור לדשבורד
        </button>
      </section>

      {allAnomalies.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard
            label="סה״כ חריגות"
            value={allAnomalies.length}
            icon="notifications_active"
            iconBg="bg-surface-container-high"
            iconColor="text-on-surface-variant"
          />
          <SummaryCard
            label="חמורות"
            value={highCount}
            icon="error"
            iconBg="bg-error-container"
            iconColor="text-error"
          />
          <SummaryCard
            label="בינוניות"
            value={mediumCount}
            icon="warning"
            iconBg="bg-tertiary-fixed"
            iconColor="text-on-tertiary-container"
          />
          <SummaryCard
            label="קלות"
            value={lowCount}
            icon="info"
            iconBg="bg-primary-fixed"
            iconColor="text-primary"
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Icon name="calendar_month" size="sm" className="text-on-surface-variant shrink-0" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="סינון לפי חודש"
            className="appearance-none bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">כל החודשים</option>
            {availableMonths.slice().reverse().map(m => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Icon name="flag" size="sm" className="text-on-surface-variant shrink-0" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as Anomaly['severity'] | 'all')}
            aria-label="סינון לפי חומרה"
            className="appearance-none bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">כל החומרות</option>
            {ALL_SEVERITIES.map(s => (
              <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Icon name="category" size="sm" className="text-on-surface-variant shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as Anomaly['type'] | 'all')}
            aria-label="סינון לפי סוג חריגה"
            className="appearance-none bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">כל הסוגים</option>
            {ALL_TYPES.map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {(selectedMonth !== 'all' || severityFilter !== 'all' || typeFilter !== 'all') && (
          <button
            onClick={() => { setSelectedMonth('all'); setSeverityFilter('all'); setTypeFilter('all'); }}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <Icon name="close" size="sm" />
            נקה סינון
          </button>
        )}
      </div>

      {filtered.length !== allAnomalies.length && (
        <p className="text-xs text-on-surface-variant">
          מציג {filtered.length} מתוך {allAnomalies.length} חריגות
        </p>
      )}

      <AnomalyList
        anomalies={filtered}
        emptyMessage={allAnomalies.length === 0 ? 'טעינת נתונים מלאה מספיק לזיהוי חריגות' : 'אין חריגות התואמות את הסינון'}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: number;
  icon: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant/20">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon name={icon} size="sm" className={iconColor} />
        </div>
        <span className="text-xs text-on-surface-variant font-medium">{label}</span>
      </div>
      <p className="text-2xl font-black font-headline text-on-surface">{fmt(value)}</p>
    </div>
  );
}
