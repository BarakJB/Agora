import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import ContractCoverageCard from '../components/portfolio/ContractCoverageCard';
import * as api from '../services/api';
import { getContractCoverageDetailed } from '../services/api';
import { formatMonth, fmt } from '../utils/dateFormat';
import type { SalesTransactionWithContract, ContractCoverageSummary } from '../types/contract-coverage';
import CompanyLogo from '../components/common/CompanyLogo';

type ActiveTab = 'covered' | 'uncovered';

const EMPTY_SUMMARY: ContractCoverageSummary = {
  coveredCount: 0,
  uncoveredCount: 0,
  coveredAmount: 0,
  uncoveredAmount: 0,
};

export default function ContractCoveragePage() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<ContractCoverageSummary>(EMPTY_SUMMARY);
  const [transactions, setTransactions] = useState<SalesTransactionWithContract[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('uncovered');
  const [companyFilter, setCompanyFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadMonths() {
      try {
        const res = await api.getSalesSummary();
        if (!cancelled && res.data) {
          const months = res.data.map((s) => s.month).sort();
          setAvailableMonths(months);
          if (months.length > 0) {
            setSelectedMonth(months[months.length - 1]);
          }
        }
      } catch {
        // months load is best-effort; main load will surface errors
      }
    }
    loadMonths();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getContractCoverageDetailed(selectedMonth || undefined);
        if (!cancelled && res.data) {
          setSummary(res.data.summary ?? EMPTY_SUMMARY);
          setTransactions((res.data.transactions ?? []) as SalesTransactionWithContract[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof api.ApiError ? err.message : 'שגיאה בטעינת נתוני כיסוי חוזי');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedMonth, availableMonths.length]);

  const coveredRows = useMemo(
    () => transactions.filter((t) => t.contractStatus === 'covered'),
    [transactions],
  );

  const uncoveredRows = useMemo(
    () => transactions.filter((t) => t.contractStatus === 'uncovered'),
    [transactions],
  );

  const companies = useMemo(() => {
    const set = new Set(transactions.map((t) => t.insuranceCompany).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'));
  }, [transactions]);

  const filteredCovered = useMemo(
    () => companyFilter ? coveredRows.filter((t) => t.insuranceCompany === companyFilter) : coveredRows,
    [coveredRows, companyFilter],
  );

  const filteredUncovered = useMemo(
    () => companyFilter ? uncoveredRows.filter((t) => t.insuranceCompany === companyFilter) : uncoveredRows,
    [uncoveredRows, companyFilter],
  );

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
        <Icon name="error" className="text-error" size="lg" />
        <p className="text-on-surface-variant">{error}</p>
        <button
          onClick={() => setError(null)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
        >
          נסה שנית
        </button>
      </div>
    );
  }

  const totalAmount = summary.coveredAmount + summary.uncoveredAmount;

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline text-on-surface">כיסוי חוזי</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            פוליסות ועמלות תחת הסכם מול עמלות שאינן מכוסות בהסכם
          </p>
        </div>

        {availableMonths.length > 0 && (
          <div className="flex items-center gap-2">
            <Icon name="calendar_month" className="text-on-surface-variant" size="sm" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="בחר חודש"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary card */}
      <ContractCoverageCard summary={summary} totalAmount={totalAmount} />

      {/* Filters + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex rounded-xl bg-surface-container-high p-1 gap-1" role="tablist">
          <TabButton
            active={activeTab === 'uncovered'}
            onClick={() => setActiveTab('uncovered')}
            label="ללא חוזה"
            count={filteredUncovered.length}
            alert
          />
          <TabButton
            active={activeTab === 'covered'}
            onClick={() => setActiveTab('covered')}
            label="תחת חוזה"
            count={filteredCovered.length}
          />
        </div>

        {companies.length > 1 && (
          <div className="flex items-center gap-2">
            <Icon name="filter_list" className="text-on-surface-variant" size="sm" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="text-sm bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="סנן לפי חברה"
            >
              <option value="">כל החברות</option>
              {companies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Transactions table */}
      {activeTab === 'uncovered' ? (
        <UncoveredTable rows={filteredUncovered} onUpload={() => navigate('/upload')} />
      ) : (
        <CoveredTable rows={filteredCovered} />
      )}
    </div>
  );
}

/* ─── Tab button ─── */

function TabButton({
  active,
  onClick,
  label,
  count,
  alert = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  alert?: boolean;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        active
          ? 'bg-surface-container-low text-on-surface shadow-sm'
          : 'text-on-surface-variant hover:text-on-surface'
      }`}
    >
      {label}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        alert && count > 0
          ? 'bg-error text-on-error'
          : 'bg-outline-variant/40 text-on-surface-variant'
      }`}>
        {count}
      </span>
    </button>
  );
}

/* ─── Covered table ─── */

function CoveredTable({ rows }: { rows: SalesTransactionWithContract[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="check_circle"
        title="אין רשומות תחת חוזה"
        subtitle="לא נמצאו עמלות מכוסות בהסכם לחודש זה"
      />
    );
  }

  return (
    <section className="bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-x-auto">
      <table className="w-full text-sm" aria-label="עמלות תחת חוזה">
        <thead>
          <tr className="text-on-surface-variant border-b border-outline-variant/30 text-xs uppercase tracking-wide font-headline">
            <th className="text-start py-3 px-4 font-medium">לקוח</th>
            <th className="text-start py-3 px-4 font-medium">חברה</th>
            <th className="text-start py-3 px-4 font-medium">ענף</th>
            <th className="text-end py-3 px-4 font-medium">עמלה</th>
            <th className="text-end py-3 px-4 font-medium">שיעור מהסכם</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr
              key={t.id}
              className="border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors"
            >
              <td className="py-2.5 px-4 font-medium text-on-surface">{t.insuredName || '—'}</td>
              <td className="py-2.5 px-4 text-on-surface-variant">
                {t.insuranceCompany ? (
                  <div className="flex items-center gap-2">
                    <CompanyLogo company={t.insuranceCompany} size="xs" />
                    <span>{t.insuranceCompany}</span>
                  </div>
                ) : '—'}
              </td>
              <td className="py-2.5 px-4">
                {t.branch ? (
                  <span className="px-1.5 py-0.5 bg-primary-fixed rounded text-[10px] text-primary font-medium">
                    {t.branch}
                  </span>
                ) : (
                  <span className="text-on-surface-variant">—</span>
                )}
              </td>
              <td className="py-2.5 px-4 text-end font-bold text-on-surface">
                {fmt(t.commissionAmount)}{'₪'}
              </td>
              <td className="py-2.5 px-4 text-end">
                {t.agreedRate != null ? (
                  <span className="font-semibold text-emerald-600">{t.agreedRate}%</span>
                ) : (
                  <span className="text-on-surface-variant">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold text-on-surface border-t border-outline-variant/30">
            <td colSpan={3} className="py-3 px-4">
              סה״כ {rows.length} רשומות
            </td>
            <td className="py-3 px-4 text-end text-primary">
              {fmt(rows.reduce((s, t) => s + t.commissionAmount, 0))}{'₪'}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

/* ─── Uncovered table ─── */

function UncoveredTable({
  rows,
  onUpload,
}: {
  rows: SalesTransactionWithContract[];
  onUpload: () => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="verified"
        title="כל העמלות מכוסות בחוזה"
        subtitle="מעולה! לא נמצאו עמלות ללא הסכם בחודש זה"
        positive
      />
    );
  }

  return (
    <section className="bg-surface-container-low rounded-2xl border border-error/20 overflow-x-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 bg-error-container/10">
        <div className="flex items-center gap-2">
          <Icon name="warning" className="text-error" size="sm" />
          <span className="text-sm font-semibold text-error">
            {rows.length} רשומות ללא הסכם — {fmt(rows.reduce((s, t) => s + t.commissionAmount, 0))}{'₪'}
          </span>
        </div>
        <button
          onClick={onUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
          aria-label="עבור לדף העלאת הסכם"
        >
          <Icon name="upload_file" size="sm" />
          העלה הסכם
        </button>
      </div>

      <table className="w-full text-sm" aria-label="עמלות ללא חוזה">
        <thead>
          <tr className="text-on-surface-variant border-b border-outline-variant/30 text-xs uppercase tracking-wide font-headline">
            <th className="text-start py-3 px-4 font-medium">לקוח</th>
            <th className="text-start py-3 px-4 font-medium">חברה</th>
            <th className="text-start py-3 px-4 font-medium">ענף</th>
            <th className="text-end py-3 px-4 font-medium">עמלה</th>
            <th className="text-start py-3 px-4 font-medium">סוג</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr
              key={t.id}
              className="border-b border-outline-variant/10 hover:bg-error-container/5 transition-colors"
            >
              <td className="py-2.5 px-4 font-medium text-on-surface">{t.insuredName || '—'}</td>
              <td className="py-2.5 px-4 text-on-surface-variant">
                {t.insuranceCompany ? (
                  <div className="flex items-center gap-2">
                    <CompanyLogo company={t.insuranceCompany} size="xs" />
                    <span>{t.insuranceCompany}</span>
                  </div>
                ) : '—'}
              </td>
              <td className="py-2.5 px-4">
                {t.branch ? (
                  <span className="px-1.5 py-0.5 bg-error-container/30 rounded text-[10px] text-error font-medium">
                    {t.branch}
                  </span>
                ) : (
                  <span className="text-on-surface-variant">—</span>
                )}
              </td>
              <td className="py-2.5 px-4 text-end font-bold text-error">
                {fmt(t.commissionAmount)}{'₪'}
              </td>
              <td className="py-2.5 px-4 text-xs text-on-surface-variant">
                {t.reportType || '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold text-on-surface border-t border-outline-variant/30">
            <td colSpan={3} className="py-3 px-4">
              סה״כ {rows.length} רשומות
            </td>
            <td className="py-3 px-4 text-end text-error">
              {fmt(rows.reduce((s, t) => s + t.commissionAmount, 0))}{'₪'}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

/* ─── Empty state ─── */

function EmptyState({
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
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
        positive ? 'bg-secondary-container/30' : 'bg-surface-container-high'
      }`}>
        <Icon
          name={icon}
          className={positive ? 'text-secondary' : 'text-on-surface-variant'}
          size="lg"
        />
      </div>
      <p className="font-semibold text-on-surface">{title}</p>
      <p className="text-sm text-on-surface-variant">{subtitle}</p>
    </div>
  );
}
