import { useState, useMemo, useEffect, useRef, useCallback, Fragment } from 'react';
import Icon from '../components/ui/Icon';
import { useAuthStore } from '../store/authStore';
import * as api from '../services/api';

/* ─── Helpers ─── */
const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function formatMonth(key: string): string {
  const [year, month] = key.split('-');
  return `${HEBREW_MONTHS[parseInt(month) - 1]} ${year}`;
}


const fmt = (n: number) => n.toLocaleString('he-IL', { maximumFractionDigits: 2 });

const REPORT_TYPE_HE: Record<string, string> = {
  nifraim: 'נפרעים',
  hekef: 'היקף',
  agent_data: 'צבירה (פירוט)',
  accumulation_nifraim: 'נפרעים צבירה',
  accumulation_hekef: 'היקף צבירה',
  product_distribution: 'סיכום תשלום',
  branch_distribution: 'היקף',
};

const COMPANIES = [
  'הראל', 'מגדל', 'מנורה מבטחים', 'הפניקס', 'כלל ביטוח',
  'הכשרה', 'אלטשולר שחם', 'מיטב דש', 'פסגות', 'אנליסט',
];

/* ─── Main Component ─── */
export default function MonthlySalesPage() {
  const userMode = useAuthStore((s) => s.userMode);

  const [transactions, setTransactions] = useState<api.SalesTransaction[]>([]);
  const [summary, setSummary] = useState<api.MonthlySalarySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [compareMonth, setCompareMonth] = useState('');

  // Load data from DB
  const loadFromDb = useCallback(async () => {
    if (userMode === 'demo') return;
    setLoading(true);
    setError(null);
    try {
      const [salesRes, summaryRes] = await Promise.all([
        api.getSalesTransactions(),
        api.getSalesSummary(),
      ]);
      setTransactions(salesRes.data || []);
      setSummary(summaryRes.data || []);
    } catch (err) {
      const msg = err instanceof api.ApiError && err.status === 401
        ? 'פג תוקף ההתחברות. יש להתחבר מחדש.'
        : err instanceof Error ? err.message : 'שגיאה בטעינה מהשרת';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userMode]);

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  // Available months from summary
  const availableMonths = useMemo(() =>
    summary.map((s) => s.month).sort(),
  [summary]);

  // Auto-select latest month
  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // Filter transactions for selected month
  const filtered = useMemo(() =>
    transactions.filter((t) => t.processingMonth === selectedMonth),
  [transactions, selectedMonth]);

  // Group by branch
  const groupedByBranch = useMemo(() => {
    const groups: Record<string, api.SalesTransaction[]> = {};
    for (const t of filtered) {
      const branch = t.branch || 'אחר';
      if (!groups[branch]) groups[branch] = [];
      groups[branch].push(t);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'he'));
  }, [filtered]);

  // Summary stats
  const totalCommission = filtered.reduce((s, t) => s + t.commissionAmount, 0);
  const recordCount = filtered.length;
  const avgPerPolicy = recordCount > 0 ? totalCommission / recordCount : 0;

  // Detailed salary composition: company → reportType → branch with amounts
  const salaryComposition = useMemo(() => {
    const companyMap: Record<string, {
      total: number;
      count: number;
      byType: Record<string, {
        total: number;
        count: number;
        byBranch: Record<string, { total: number; count: number; premium: number }>;
      }>;
    }> = {};

    for (const t of filtered) {
      const company = t.insuranceCompany || 'לא צוין';
      if (!companyMap[company]) companyMap[company] = { total: 0, count: 0, byType: {} };
      companyMap[company].total += t.commissionAmount;
      companyMap[company].count++;

      const typeKey = REPORT_TYPE_HE[t.reportType] || t.reportType;
      if (!companyMap[company].byType[typeKey]) companyMap[company].byType[typeKey] = { total: 0, count: 0, byBranch: {} };
      companyMap[company].byType[typeKey].total += t.commissionAmount;
      companyMap[company].byType[typeKey].count++;

      const branch = t.branch || t.productName || 'אחר';
      if (!companyMap[company].byType[typeKey].byBranch[branch]) companyMap[company].byType[typeKey].byBranch[branch] = { total: 0, count: 0, premium: 0 };
      companyMap[company].byType[typeKey].byBranch[branch].total += t.commissionAmount;
      companyMap[company].byType[typeKey].byBranch[branch].count++;
      companyMap[company].byType[typeKey].byBranch[branch].premium += t.premium ?? 0;
    }

    return Object.entries(companyMap)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        pct: totalCommission > 0 ? (data.total / totalCommission) * 100 : 0,
        byType: Object.entries(data.byType)
          .map(([type, td]) => ({
            type,
            total: td.total,
            count: td.count,
            byBranch: Object.entries(td.byBranch)
              .map(([branch, bd]) => ({ branch, ...bd }))
              .sort((a, b) => b.total - a.total),
          }))
          .sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, totalCommission]);

  // Company trend across months (for insights)
  const companyTrend = useMemo(() => {
    const months = [...new Set(transactions.map((t) => t.processingMonth))].sort();
    const companies = [...new Set(transactions.map((t) => t.insuranceCompany))].filter(Boolean);
    const trend: Record<string, Record<string, number>> = {};
    for (const company of companies) {
      trend[company] = {};
      for (const month of months) {
        trend[company][month] = transactions
          .filter((t) => t.insuranceCompany === company && t.processingMonth === month)
          .reduce((s, t) => s + t.commissionAmount, 0);
      }
    }
    return { months, companies, trend };
  }, [transactions]);

  // Compare month data
  const compareFiltered = useMemo(() =>
    compareMonth ? transactions.filter((t) => t.processingMonth === compareMonth) : [],
  [transactions, compareMonth]);

  // Breakdown by report type + company (e.g. "נפרעים הראל", "היקף הפניקס")
  const breakdownByType = useCallback((records: api.SalesTransaction[]) => {
    const map: Record<string, { count: number; total: number; premium: number }> = {};
    for (const r of records) {
      const typeName = REPORT_TYPE_HE[r.reportType] || r.reportType;
      const company = r.insuranceCompany || '';
      const key = company ? `${typeName} — ${company}` : typeName;
      if (!map[key]) map[key] = { count: 0, total: 0, premium: 0 };
      map[key].count++;
      map[key].total += r.commissionAmount;
      map[key].premium += r.premium ?? 0;
    }
    return Object.entries(map).sort(([, a], [, b]) => b.total - a.total);
  }, []);

  const selectedBreakdown = useMemo(() => breakdownByType(filtered), [breakdownByType, filtered]);
  const compareBreakdown = useMemo(() => breakdownByType(compareFiltered), [breakdownByType, compareFiltered]);
  const compareTotalCommission = compareFiltered.reduce((s, t) => s + t.commissionAmount, 0);

  async function handleUploadComplete() {
    setShowUpload(false);
    await loadFromDb();
  }

  // ─── Loading / Error states ───
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Icon name="cloud_off" size="xl" className="text-error/40" />
          <p className="font-bold">{error}</p>
          <button onClick={loadFromDb} className="bg-primary-container text-white px-6 py-2 rounded-lg font-semibold text-sm">
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 md:p-8 bg-surface min-h-screen space-y-6">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div>
            <h2 className="font-headline text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tighter mb-1">
              דוח עמלות חודשי מפורט
            </h2>
            <p className="text-on-surface-variant font-medium">
              פירוט מלא של כל הרשומות לפי חודש, ענף וסוג דוח
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Month selector */}
            <div className="flex items-center gap-2">
              <Icon name="calendar_month" className="text-primary" />
              <select
                className="appearance-none bg-surface-container-high rounded-lg px-4 py-2.5 pe-8 font-semibold text-primary focus:ring-2 focus:ring-primary/40 transition-all border-none text-sm"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{formatMonth(m)}</option>
                ))}
                {availableMonths.length === 0 && <option value="">אין נתונים</option>}
              </select>
            </div>

            {/* Upload button */}
            <button
              onClick={() => setShowUpload(true)}
              className="bg-primary-container text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-editorial-btn hover:translate-y-[-1px] transition-all flex items-center gap-2"
            >
              <Icon name="upload_file" size="sm" />
              העלאת קבצים
            </button>
          </div>
        </header>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-lg">
            <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-2">סה"כ עמלות</p>
            <p className="text-3xl font-headline font-black text-primary">{fmt(totalCommission)} <span className="text-lg">&#8362;</span></p>
            <p className="text-xs text-on-surface-variant mt-1">{selectedMonth ? formatMonth(selectedMonth) : '—'}</p>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-lg">
            <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-2">מספר רשומות</p>
            <p className="text-3xl font-headline font-black text-secondary">{recordCount.toLocaleString()}</p>
            <p className="text-xs text-on-surface-variant mt-1">פוליסות בחודש הנבחר</p>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-lg">
            <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-2">ממוצע לפוליסה</p>
            <p className="text-3xl font-headline font-black text-on-surface">{fmt(avgPerPolicy)} <span className="text-lg">&#8362;</span></p>
            <p className="text-xs text-on-surface-variant mt-1">עמלה ממוצעת לרשומה</p>
          </div>
        </div>

        {/* Salary Composition — הרכב שכר מפורט */}
        {salaryComposition.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-on-surface px-2 flex items-center gap-2">
              <Icon name="account_balance_wallet" className="text-primary" />
              הרכב שכר — מאיפה מגיע כל שקל — {selectedMonth ? formatMonth(selectedMonth) : ''}
            </h3>

            {/* Per-company detailed breakdown */}
            <div className="bg-surface-container-lowest rounded-lg overflow-hidden">
              <table className="w-full text-right text-sm">
                <caption className="sr-only">הרכב שכר לפי חברה</caption>
                <thead>
                  <tr className="bg-surface-container text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">
                    <th className="px-4 py-3">חברה / סוג / ענף</th>
                    <th className="px-4 py-3 w-20">רשומות</th>
                    <th className="px-4 py-3 w-28">פרמיה</th>
                    <th className="px-4 py-3 w-28">עמלה</th>
                    <th className="px-4 py-3 w-16">%</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryComposition.map((company, ci) => {
                    const prevMonthIdx = companyTrend.months.indexOf(selectedMonth) - 1;
                    const prevMonth = prevMonthIdx >= 0 ? companyTrend.months[prevMonthIdx] : null;
                    const prevAmount = prevMonth && companyTrend.trend[company.name] ? companyTrend.trend[company.name][prevMonth] || 0 : 0;
                    const trendDiff = prevAmount > 0 ? ((company.total - prevAmount) / prevAmount) * 100 : 0;
                    const hasTrend = prevAmount > 0;
                    const companyColors = ['border-primary', 'border-secondary', 'border-error', 'border-tertiary-container', 'border-on-surface-variant'];

                    return (
                      <Fragment key={company.name}>
                        {/* Company header row */}
                        <tr className={`bg-surface-container-low border-s-4 ${companyColors[ci % companyColors.length]}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Icon name="business" size="sm" className="text-primary" />
                              <span className="font-bold text-on-surface text-base">{company.name}</span>
                              {hasTrend && (
                                <span className={`text-[10px] font-bold ${trendDiff >= 0 ? 'text-secondary' : 'text-error'}`}>
                                  {trendDiff >= 0 ? '▲' : '▼'} {Math.abs(trendDiff).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-on-surface-variant">{company.count}</td>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 font-bold text-primary text-base">{fmt(company.total)} &#8362;</td>
                          <td className="px-4 py-3">
                            <span className="bg-primary-fixed text-primary px-2 py-0.5 rounded-full text-xs font-bold">
                              {company.pct.toFixed(1)}%
                            </span>
                          </td>
                        </tr>

                        {/* Report type rows */}
                        {company.byType.map((typeData) => (
                          <Fragment key={`${company.name}-${typeData.type}`}>
                            <tr className="bg-surface-container-lowest/50 border-b border-outline-variant/10">
                              <td className="px-4 py-2 ps-10">
                                <span className="bg-primary-fixed/60 text-primary px-2 py-0.5 rounded text-xs font-bold">
                                  {typeData.type}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-on-surface-variant text-xs">{typeData.count}</td>
                              <td className="px-4 py-2" />
                              <td className="px-4 py-2 font-semibold text-on-surface">{fmt(typeData.total)} &#8362;</td>
                              <td className="px-4 py-2 text-xs text-on-surface-variant">
                                {totalCommission > 0 ? (typeData.total / totalCommission * 100).toFixed(1) : 0}%
                              </td>
                            </tr>

                            {/* Branch detail rows */}
                            {typeData.byBranch.map((branchData) => (
                              <tr key={`${company.name}-${typeData.type}-${branchData.branch}`} className="hover:bg-surface-container-low transition-colors border-b border-outline-variant/5">
                                <td className="px-4 py-1.5 ps-16 text-xs text-on-surface-variant">{branchData.branch}</td>
                                <td className="px-4 py-1.5 text-xs text-on-surface-variant">{branchData.count}</td>
                                <td className="px-4 py-1.5 text-xs text-on-surface-variant">
                                  {branchData.premium > 0 ? fmt(branchData.premium) : '—'}
                                </td>
                                <td className="px-4 py-1.5 text-xs font-medium text-secondary">{fmt(branchData.total)} &#8362;</td>
                                <td className="px-4 py-1.5" />
                              </tr>
                            ))}
                          </Fragment>
                        ))}

                        {/* Spacer between companies */}
                        {ci < salaryComposition.length - 1 && (
                          <tr><td colSpan={5} className="h-1 bg-surface-container" /></tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-primary-container text-on-primary-container font-bold">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Icon name="payments" size="sm" />
                        <span>סה"כ שכר גולמי</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{recordCount}</td>
                    <td className="px-4 py-4" />
                    <td className="px-4 py-4 text-xl font-headline font-black">{fmt(totalCommission)} &#8362;</td>
                    <td className="px-4 py-4">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Visual bar */}
            {salaryComposition.length > 1 && (
              <div className="bg-surface-container-lowest rounded-lg p-4">
                <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-3">חלוקת הכנסות לפי חברה</p>
                <div className="flex h-5 rounded-full overflow-hidden bg-surface-container-high">
                  {salaryComposition.map((company, idx) => {
                    const colors = ['bg-primary', 'bg-secondary', 'bg-error', 'bg-tertiary-container', 'bg-on-surface-variant'];
                    return (
                      <div
                        key={company.name}
                        className={`${colors[idx % colors.length]} transition-all relative group`}
                        style={{ width: `${Math.max(company.pct, 2)}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {company.name}: {fmt(company.total)} ₪
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 flex-wrap gap-x-4 gap-y-1">
                  {salaryComposition.map((company, idx) => {
                    const dotColors = ['bg-primary', 'bg-secondary', 'bg-error', 'bg-tertiary-container', 'bg-on-surface-variant'];
                    return (
                      <div key={company.name} className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                        <span className="text-xs text-on-surface-variant font-medium">{company.name}</span>
                        <span className="text-xs font-bold text-on-surface">{fmt(company.total)} &#8362;</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* No data */}
        {transactions.length === 0 && (
          <div className="bg-surface-container-lowest rounded-lg p-12 text-center">
            <Icon name="inbox" size="xl" className="text-on-surface-variant/20 mb-4" />
            <p className="text-on-surface-variant font-medium">אין נתונים עדיין</p>
            <p className="text-sm text-on-surface-variant/60 mt-1">העלה קבצי דוחות עמלות כדי לראות את הפירוט</p>
            <button onClick={() => setShowUpload(true)} className="mt-4 bg-primary-container text-white px-6 py-2.5 rounded-lg font-bold text-sm">
              העלאת קבצים
            </button>
          </div>
        )}

        {transactions.length > 0 && (
          <div className="grid grid-cols-12 gap-6">
            {/* Main content — detailed report */}
            <div className="col-span-12 lg:col-span-8 space-y-6">

              {/* Per-branch detail tables */}
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-on-surface px-2 flex items-center gap-2">
                  <Icon name="receipt_long" className="text-secondary" />
                  פירוט לפי ענף — {selectedMonth ? formatMonth(selectedMonth) : ''}
                </h3>

                {filtered.length === 0 ? (
                  <div className="bg-surface-container-lowest rounded-lg p-10 text-center">
                    <Icon name="inbox" size="xl" className="text-on-surface-variant/20 mb-4" />
                    <p className="text-on-surface-variant font-medium">אין רשומות לחודש הנבחר</p>
                  </div>
                ) : (
                  <>
                    {groupedByBranch.map(([branch, records]) => {
                      const branchTotal = records.reduce((s, r) => s + r.commissionAmount, 0);
                      const branchPremium = records.reduce((s, r) => s + (r.premium ?? 0), 0);
                      return (
                        <div key={branch} className="bg-surface-container-lowest rounded-lg overflow-hidden">
                          {/* Branch header */}
                          <div className="px-5 py-3 bg-surface-container-low flex justify-between items-center">
                            <h4 className="font-bold text-on-surface flex items-center gap-2">
                              <Icon name="folder" size="sm" className="text-primary" />
                              {branch}
                            </h4>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-on-surface-variant">{records.length} רשומות</span>
                              {branchPremium > 0 && (
                                <span className="text-xs text-on-surface-variant">פרמיה: {fmt(branchPremium)} &#8362;</span>
                              )}
                              <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold">
                                {fmt(branchTotal)} &#8362;
                              </span>
                            </div>
                          </div>

                          {/* Records table */}
                          <div className="overflow-x-auto max-h-80 overflow-y-auto">
                            <table className="w-full text-right text-sm">
                              <caption className="sr-only">עמלות ענף {branch}</caption>
                              <thead className="sticky top-0">
                                <tr className="bg-surface-container text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">
                                  <th className="px-3 py-2.5">שם מבוטח</th>
                                  <th className="px-3 py-2.5">ת.ז.</th>
                                  <th className="px-3 py-2.5">מס' פוליסה</th>
                                  <th className="px-3 py-2.5">מוצר</th>
                                  <th className="px-3 py-2.5">פרמיה</th>
                                  <th className="px-3 py-2.5">עמלה</th>
                                  <th className="px-3 py-2.5">אחוז</th>
                                  <th className="px-3 py-2.5">חברה</th>
                                  <th className="px-3 py-2.5">סוג דוח</th>
                                </tr>
                              </thead>
                              <tbody>
                                {records.map((rec) => (
                                  <tr key={rec.id} className="hover:bg-surface-container-low transition-colors border-b border-outline-variant/20">
                                    <td className="px-3 py-2.5 font-medium">{rec.insuredName || '—'}</td>
                                    <td className="px-3 py-2.5 font-mono text-xs">{rec.insuredId || '—'}</td>
                                    <td className="px-3 py-2.5 font-mono text-xs">{rec.policyNumber || '—'}</td>
                                    <td className="px-3 py-2.5 text-xs">{rec.productName || rec.subBranch || '—'}</td>
                                    <td className="px-3 py-2.5">{rec.premium != null ? fmt(rec.premium) : '—'}</td>
                                    <td className="px-3 py-2.5 font-bold text-secondary">{fmt(rec.commissionAmount)}</td>
                                    <td className="px-3 py-2.5 text-xs">{rec.commissionRate != null ? `${rec.commissionRate}%` : '—'}</td>
                                    <td className="px-3 py-2.5">
                                      <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded text-xs font-medium">
                                        {rec.insuranceCompany || '—'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className="bg-primary-fixed text-primary px-2 py-0.5 rounded text-xs font-bold">
                                        {REPORT_TYPE_HE[rec.reportType] || rec.reportType}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}

                    {/* Grand total per-branch */}
                    <div className="bg-surface-container-low text-on-surface p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold">סה"כ לפי ענפים</p>
                        <p className="text-xs text-on-surface-variant">{recordCount} רשומות מ-{groupedByBranch.length} ענפים</p>
                      </div>
                      <p className="text-xl font-headline font-black text-primary">{fmt(totalCommission)} &#8362;</p>
                    </div>
                  </>
                )}
              </section>

              {/* Comparison table */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    <Icon name="compare_arrows" className="text-primary" />
                    השוואת חודשים
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-on-surface-variant">השווה עם:</label>
                    <select
                      className="appearance-none bg-surface-container-high rounded-lg px-3 py-2 pe-7 font-semibold text-primary focus:ring-2 focus:ring-primary/40 transition-all border-none text-xs"
                      value={compareMonth}
                      onChange={(e) => setCompareMonth(e.target.value)}
                    >
                      <option value="">בחר חודש...</option>
                      {availableMonths
                        .filter((m) => m !== selectedMonth)
                        .map((m) => (
                          <option key={m} value={m}>{formatMonth(m)}</option>
                        ))}
                    </select>
                  </div>
                </div>

                {compareMonth ? (
                  <div className="bg-surface-container-lowest rounded-lg overflow-hidden">
                    <table className="w-full text-right text-sm">
                      <caption className="sr-only">השוואת חודשים</caption>
                      <thead>
                        <tr className="bg-surface-container text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">
                          <th className="px-4 py-3">סוג דוח</th>
                          <th className="px-4 py-3">{formatMonth(selectedMonth)}</th>
                          <th className="px-4 py-3">{formatMonth(compareMonth)}</th>
                          <th className="px-4 py-3">הפרש</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const allTypes = new Set([
                            ...selectedBreakdown.map(([type]) => type),
                            ...compareBreakdown.map(([type]) => type),
                          ]);
                          const compareMap = Object.fromEntries(compareBreakdown);
                          const selectedMap = Object.fromEntries(selectedBreakdown);

                          return Array.from(allTypes).map((type) => {
                            const selData = selectedMap[type];
                            const cmpData = compareMap[type];
                            const selTotal = selData?.total ?? 0;
                            const cmpTotal = cmpData?.total ?? 0;
                            const diff = selTotal - cmpTotal;
                            return (
                              <tr key={type} className="hover:bg-surface-container-low transition-colors border-b border-outline-variant/20">
                                <td className="px-4 py-3 font-medium">
                                  <span className="bg-primary-fixed text-primary px-2 py-0.5 rounded text-xs font-bold">{type}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div>{fmt(selTotal)} &#8362;</div>
                                  <div className="text-[10px] text-on-surface-variant">{selData?.count ?? 0} רשומות</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div>{fmt(cmpTotal)} &#8362;</div>
                                  <div className="text-[10px] text-on-surface-variant">{cmpData?.count ?? 0} רשומות</div>
                                </td>
                                <td className={`px-4 py-3 font-bold ${diff >= 0 ? 'text-secondary' : 'text-error'}`}>
                                  {diff >= 0 ? '+' : ''}{fmt(diff)} &#8362;
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                      <tfoot>
                        <tr className="bg-surface-container-low font-bold">
                          <td className="px-4 py-3">סה"כ</td>
                          <td className="px-4 py-3">{fmt(totalCommission)} &#8362;</td>
                          <td className="px-4 py-3">{fmt(compareTotalCommission)} &#8362;</td>
                          <td className={`px-4 py-3 ${totalCommission - compareTotalCommission >= 0 ? 'text-secondary' : 'text-error'}`}>
                            {totalCommission - compareTotalCommission >= 0 ? '+' : ''}
                            {fmt(totalCommission - compareTotalCommission)} &#8362;
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="bg-surface-container-lowest rounded-lg p-8 text-center">
                    <Icon name="compare_arrows" size="lg" className="text-on-surface-variant/20 mb-3" />
                    <p className="text-sm text-on-surface-variant">בחר חודש להשוואה מהתפריט למעלה</p>
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              {/* Monthly summary sidebar */}
              <div className="bg-surface-container-lowest p-6 rounded-lg border-s-4 border-secondary">
                <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-5">סיכום חודשים</h4>
                {summary.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">טרם הועלו דוחות</p>
                ) : (
                  <div className="space-y-2">
                    {summary.map((s) => {
                      const isSelected = s.month === selectedMonth;
                      return (
                        <button
                          key={s.month}
                          onClick={() => setSelectedMonth(s.month)}
                          className={`w-full text-right flex justify-between items-center px-3 py-2.5 rounded-lg transition-colors ${
                            isSelected ? 'bg-primary-fixed/30 text-primary' : 'hover:bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          <span className="text-sm font-medium">{formatMonth(s.month)}</span>
                          <div className="text-left">
                            <span className="text-xs font-bold">{fmt(s.totalCommission)} &#8362;</span>
                            <span className="text-[10px] text-on-surface-variant mr-2">{s.recordCount} רש'</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Breakdown by report type for selected month */}
              {selectedBreakdown.length > 0 && (
                <div className="bg-surface-container-lowest p-6 rounded-lg">
                  <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-5">
                    התפלגות לפי סוג — {selectedMonth ? formatMonth(selectedMonth) : ''}
                  </h4>
                  <div className="space-y-3">
                    {selectedBreakdown.map(([type, data]) => {
                      const pct = totalCommission > 0 ? (data.total / totalCommission * 100) : 0;
                      return (
                        <div key={type}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-on-surface">{type}</span>
                            <span className="text-xs font-bold text-primary">{fmt(data.total)} &#8362;</span>
                          </div>
                          <div className="w-full bg-surface-container-high rounded-full h-1.5">
                            <div
                              className="bg-primary rounded-full h-1.5 transition-all"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-[10px] text-on-surface-variant">{data.count} רשומות</span>
                            <span className="text-[10px] text-on-surface-variant">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info card */}
              <div className="bg-primary-container text-on-primary-container p-6 rounded-lg relative overflow-hidden">
                <div className="relative z-10">
                  <Icon name="info" size="lg" className="mb-3 block opacity-80" />
                  <h3 className="text-lg font-bold mb-3">דוח מפורט</h3>
                  <p className="text-sm leading-relaxed opacity-90">
                    דף זה מציג את כל הרשומות עם פירוט מלא: שם מבוטח, ת.ז., פוליסה, פרמיה, עמלה וסוג.
                    הרשומות מקובצות לפי ענף עם סיכומי ביניים.
                  </p>
                </div>
                <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-primary-fixed rounded-full blur-[80px] opacity-20" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal open={showUpload} onComplete={handleUploadComplete} onClose={() => setShowUpload(false)} />
    </>
  );
}

/* ─── Upload Modal ─── */
interface UploadedFile {
  name: string;
  reportType: string;
  records: number;
  status: 'success' | 'error';
  error?: string;
}

const SALARY_TYPES = ['nifraim', 'hekef', 'agent_data', 'accumulation_nifraim', 'accumulation_hekef', 'product_distribution', 'branch_distribution'];
const LABELS: Record<string, string> = {
  nifraim: 'נפרעים',
  agent_data: 'רשימת נתונים',
  product_distribution: 'סיכום מוצרים',
  branch_distribution: 'התפלגות ענפים',
  agreement: 'הסכם עמלות',
  hekef: 'היקף',
};

function normalizeMonthForUpload(raw: string): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  const d = raw.match(/^\d{1,2}[/-](\d{1,2})[/-](\d{4})$/);
  if (d) return `${d[2]}-${d[1].padStart(2, '0')}`;
  return '';
}

function UploadModal({ open, onComplete, onClose }: {
  open: boolean;
  onComplete: () => void;
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !uploading) handleFinish();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  useEffect(() => {
    if (open) {
      setUploadedFiles([]);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const totalSaved = uploadedFiles.filter((f) => f.status === 'success').reduce((s, f) => s + f.records, 0);

  function handleFinish() {
    if (uploadedFiles.some((f) => f.status === 'success')) {
      onComplete();
    } else {
      onClose();
    }
  }

  async function processFile(file: File) {
    setUploading(true);
    setError(null);

    if (!selectedCompany) {
      setError('יש לבחור חברת ביטוח לפני העלאת קובץ');
      setUploading(false);
      return;
    }

    try {
      const token = localStorage.getItem('payagent-token');
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/v1/uploads/parse', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const json = await res.json();

      if (!res.ok) {
        setUploadedFiles((prev) => [...prev, { name: file.name, reportType: '?', records: 0, status: 'error', error: json.error }]);
        return;
      }

      const parsed = json.data as Array<{ reportType: string; records: Array<Record<string, unknown>>; errors: unknown[]; detectedCompany?: string }>;

      const types = parsed.map((r) => r.reportType);
      const hasProductDist = types.includes('product_distribution');
      const hasAgentData = types.includes('agent_data');

      for (const result of parsed) {
        if (!SALARY_TYPES.includes(result.reportType)) {
          setUploadedFiles((prev) => [...prev, { name: file.name, reportType: result.reportType, records: result.records.length, status: 'success' }]);
          continue;
        }
        if (hasProductDist && hasAgentData && result.reportType === 'agent_data') continue;

        const company = result.detectedCompany || selectedCompany;
        const records = result.records
          .filter((r) => {
            const month = normalizeMonthForUpload((r.processingMonth as string) || '');
            const amount = (r.amount as number) || 0;
            return month !== '' && amount !== 0;
          })
          .map((r) => ({
            reportType: (r.reportType as string) || result.reportType,
            processingMonth: normalizeMonthForUpload((r.processingMonth as string) || ''),
            insuredName: (r.insuredName as string) || (r.agentName as string) || null,
            insuredId: r.insuredId ? String(r.insuredId) : null,
            policyNumber: r.policyNumber ? String(r.policyNumber) : null,
            branch: (r.branch as string) || null,
            productName: (r.productName as string) || null,
            fundType: (r.fundType as string) || null,
            premium: (r.premiumBase as number) || null,
            commissionAmount: (r.amount as number) || 0,
            commissionRate: (r.rate as number) || null,
            paymentAmount: (r.paymentAmount as number) || null,
            amountBeforeVat: (r.amountBeforeVat as number) || null,
            amountWithVat: (r.amountWithVat as number) || null,
          }));

        try {
          const saveResult = await api.saveSalesTransactions(records, company);
          const saved = saveResult.data?.inserted || 0;
          setUploadedFiles((prev) => [...prev, { name: file.name, reportType: result.reportType, records: saved, status: 'success' }]);
        } catch (e) {
          setUploadedFiles((prev) => [...prev, { name: file.name, reportType: result.reportType, records: 0, status: 'error', error: String(e) }]);
        }
      }
    } catch {
      setUploadedFiles((prev) => [...prev, { name: file.name, reportType: '?', records: 0, status: 'error', error: 'שגיאת חיבור לשרת' }]);
    } finally {
      setUploading(false);
    }
  }

  async function handleMultipleFiles(files: File[]) {
    for (const file of files) {
      await processFile(file);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="upload-modal-title">
      <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm" onClick={() => !uploading && handleFinish()} />
      <div className="relative bg-surface-container-lowest rounded-lg shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] overflow-y-auto">
        <div className="editorial-gradient p-5 rounded-t-lg flex justify-between items-center">
          <h2 id="upload-modal-title" className="text-lg font-black font-headline text-white">העלאת קבצי מכירות</h2>
          <button onClick={() => !uploading && handleFinish()} className="text-white/70 hover:text-white" aria-label="סגור">
            <Icon name="close" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Company selector */}
          <div>
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-widest block mb-2">
              חברת ביטוח <span className="text-error">*</span>
            </label>
            <select
              className="w-full appearance-none bg-surface-container-high border-none rounded-lg px-4 py-3 font-semibold text-primary focus:ring-2 focus:ring-primary/40 transition-all"
              value={selectedCompany}
              onChange={(e) => { setSelectedCompany(e.target.value); setError(null); }}
            >
              <option value="">בחר חברה...</option>
              {COMPANIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* File input */}
          <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" multiple className="hidden"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (files.length > 0) handleMultipleFiles(files);
              if (fileRef.current) fileRef.current.value = '';
            }}
          />

          {/* Drop zone */}
          <div
            role="button"
            aria-label="גרור קבצים או לחץ לבחירה"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center text-center cursor-pointer group transition-colors ${isDragging ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant hover:bg-primary-fixed/20'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) handleMultipleFiles(files);
            }}
            onClick={() => !uploading && fileRef.current?.click()}
          >
            {uploading ? (
              <>
                <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-3" />
                <p className="font-bold text-primary">מעבד קבצים...</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-primary-fixed rounded-full flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                  <Icon name="cloud_upload" size="lg" />
                </div>
                <p className="font-bold text-primary mb-1">גרור קבצים או לחץ לבחירה</p>
                <p className="text-sm text-on-surface-variant mb-2">ניתן להעלות כמה קבצים בבת אחת</p>
                <div className="flex gap-2">
                  <span className="bg-primary-fixed text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">.xls</span>
                  <span className="bg-primary-fixed text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">.xlsx</span>
                  <span className="bg-surface-container-high text-on-surface-variant text-xs font-bold px-2.5 py-0.5 rounded-full">.csv</span>
                </div>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-error-container text-on-error-container p-3 rounded-lg text-sm flex items-center gap-2">
              <Icon name="error" size="sm" />{error}
            </div>
          )}

          {/* Uploaded files list */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="check_circle" className="text-secondary" />
                <span className="font-bold text-sm">{totalSaved} רשומות נשמרו מ-{uploadedFiles.filter((f) => f.status === 'success').length} קבצים</span>
              </div>

              {uploadedFiles.map((f, i) => (
                <div key={i} className={`rounded-lg px-4 py-3 flex justify-between items-center ${f.status === 'success' ? 'bg-surface-container-low' : 'bg-error-container/20'}`}>
                  <div className="flex items-center gap-3">
                    <Icon name={f.status === 'success' ? 'check_circle' : 'error'} size="sm" className={f.status === 'success' ? 'text-secondary' : 'text-error'} />
                    <div>
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-on-surface-variant">{LABELS[f.reportType] || f.reportType}</p>
                    </div>
                  </div>
                  {f.status === 'success' ? (
                    <span className="text-xs font-bold bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{f.records} רשומות</span>
                  ) : (
                    <span className="text-xs text-error">{f.error}</span>
                  )}
                </div>
              ))}

              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-2.5 bg-surface-container-high text-on-surface-variant rounded-lg font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Icon name="add" size="sm" />
                העלה קבצים נוספים
              </button>

              <button onClick={handleFinish} className="w-full bg-primary-container text-white py-3 rounded-lg font-bold shadow-editorial-btn hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Icon name="check" size="sm" />
                סיימתי
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
