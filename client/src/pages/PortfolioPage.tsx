import { useState, useEffect, useMemo } from 'react';
import Icon from '../components/ui/Icon';
import CompanyLogo from '../components/common/CompanyLogo';
import { TrafficLightPill } from '../components/common/TrafficLight';
import * as api from '../services/api';
import { getContractCoverageSummary } from '../services/api';
import type { CommissionRow } from '../store/dataStore';
import { detectAnomalies, anomalyKey } from '../utils/anomalies';
import type { Anomaly } from '../utils/anomalies';
import { formatMonth, fmt } from '../utils/dateFormat';
import { mapToCommissionRow } from '../utils/commissionMapper';
import { evaluateConcentrationTop5, evaluateAtRiskCount } from '../utils/profitThresholds';
import ContractCoverageCard from '../components/portfolio/ContractCoverageCard';
import type { ContractCoverageSummary } from '../types/contract-coverage';

type SortKey = 'total' | 'monthlyAvg' | 'trend';
type SortDir = 'asc' | 'desc';

const TREND_ORDER = { up: 1, stable: 0, down: -1 };

export default function PortfolioPage() {
  const [data, setData] = useState<api.PortfolioAnalysis | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [coverageSummary, setCoverageSummary] = useState<ContractCoverageSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [portfolioRes, salesRes, coverageRes] = await Promise.all([
          api.getPortfolioAnalysis(),
          api.getSalesTransactions(),
          getContractCoverageSummary(),
        ]);
        if (!cancelled) {
          if (portfolioRes.data) setData(portfolioRes.data);
          setCommissions((salesRes.data || []).map(mapToCommissionRow));
          if (coverageRes.data?.summary) setCoverageSummary(coverageRes.data.summary);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof api.ApiError ? err.message : 'שגיאה בטעינת נתוני תיק');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const sortedClients = useMemo(() => {
    if (!data) return [];
    const clients = [...data.topClients];
    clients.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'total') cmp = a.total - b.total;
      else if (sortKey === 'monthlyAvg') cmp = a.monthlyAvg - b.monthlyAvg;
      else cmp = TREND_ORDER[a.trend] - TREND_ORDER[b.trend];
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return clients;
  }, [data, sortKey, sortDir]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    commissions.forEach(c => { if (c.processingMonth) months.add(c.processingMonth); });
    return Array.from(months).sort();
  }, [commissions]);

  const anomaliesByMonth = useMemo((): Record<string, Anomaly[]> => {
    const all = detectAnomalies(commissions, availableMonths);
    const map: Record<string, Anomaly[]> = {};
    all.forEach(a => {
      if (!map[a.month]) map[a.month] = [];
      map[a.month].push(a);
    });
    return map;
  }, [commissions, availableMonths]);

  const alertMonths = useMemo(
    () => Object.keys(anomaliesByMonth).sort((a, b) => b.localeCompare(a)),
    [anomaliesByMonth],
  );

  function toggleMonth(month: string) {
    setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return 'unfold_more';
    return sortDir === 'desc' ? 'expand_more' : 'expand_less';
  }

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
      </div>
    );
  }

  if (!data) return null;

  const { overview, byBranch, monthlyTrend, concentration, atRisk, newClients } = data;

  const maxMonthlyTotal = Math.max(...monthlyTrend.map((m) => m.total), 1);
  const maxBranchPct = Math.max(...byBranch.map((b) => b.pct), 1);

  return (
    <div className="space-y-8 pb-12">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold font-headline text-on-surface">
          ניתוח תיק לקוחות
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          סקירה מקיפה של תיק הלקוחות שלך
        </p>
      </div>

      {/* ─── Contract coverage widget ─── */}
      {coverageSummary && (
        <ContractCoverageCard
          summary={coverageSummary}
          totalAmount={coverageSummary.coveredAmount + coverageSummary.uncoveredAmount}
        />
      )}

      {/* ─── Row 1: Overview cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard icon="group" label="סה״כ לקוחות פעילים" value={fmt(overview.totalClients)} />
        <OverviewCard icon="payments" label="הכנסה חודשית ממוצעת" value={`${fmt(overview.monthlyAverage)}\u20AA`} sub={`נטו: ${fmt(Math.round(overview.monthlyAverage * 0.5))}₪`} />
        <OverviewCard icon="person" label="נפרעים ממוצע ללקוח/חודש" value={`${fmt(Math.round(overview.totalCommission / Math.max(overview.totalClients, 1) / Math.max(overview.monthsTracked, 1)))}₪`} sub="עמלה שוטפת ממוצעת" />
        <OverviewCard icon="date_range" label="חודשים במערכת" value={String(overview.monthsTracked)} />
      </div>

      {/* ─── Row 2: Branch breakdown + Concentration ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch breakdown */}
        <section className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30">
          <h2 className="text-lg font-bold font-headline text-on-surface mb-4">פילוח לפי ענף</h2>
          <div className="space-y-3">
            {byBranch.map((b) => (
              <div key={b.branch}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-on-surface">{b.branch}</span>
                  <span className="text-xs text-on-surface-variant">{b.pct}% &middot; {b.clients} לקוחות &middot; {fmt(b.total)}{'\u20AA'}</span>
                </div>
                <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(b.pct / maxBranchPct) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {byBranch.length === 0 && (
              <p className="text-sm text-on-surface-variant">אין נתונים</p>
            )}
          </div>
        </section>

        {/* Concentration */}
        <section className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30">
          <h2 className="text-lg font-bold font-headline text-on-surface mb-2">תלות בלקוחות מובילים</h2>
          <p className="text-xs text-on-surface-variant mb-4">
            כמה מההכנסה שלך תלויה בקבוצה קטנה של לקוחות? ככל שהאחוז גבוה יותר — הסיכון גדול יותר אם לקוח עוזב.
          </p>
          <div className="space-y-5">
            <ConcentrationMeter label="5 הלקוחות הגדולים" pct={concentration.top5Pct} />
            <ConcentrationMeter label="10 הלקוחות הגדולים" pct={concentration.top10Pct} />
            <ConcentrationMeter label="20 הלקוחות הגדולים" pct={concentration.top20Pct} />
          </div>
          {concentration.top5Pct > 50 ? (
            <div className="mt-4 p-3 bg-error-container/30 rounded-lg flex items-start gap-2">
              <Icon name="warning" className="text-error shrink-0" size="sm" />
              <p className="text-xs text-on-error-container">
                <strong>סיכון גבוה:</strong> 5 לקוחות מובילים = {concentration.top5Pct}% מהעמלות. אם אחד מהם עוזב, ההכנסה שלך תיפגע משמעותית. מומלץ לגוון.
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-secondary-container/30 rounded-lg flex items-start gap-2">
              <Icon name="check_circle" className="text-secondary shrink-0" size="sm" />
              <p className="text-xs text-on-secondary-container">
                תיק מגוון — ההכנסה מתפלגת בצורה בריאה בין הלקוחות.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ─── Row 3: Top 20 clients table ─── */}
      <section className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30 overflow-x-auto">
        <h2 className="text-lg font-bold font-headline text-on-surface mb-4">20 לקוחות מובילים</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-on-surface-variant border-b border-outline-variant/30">
              <th className="text-start py-2 pe-3 font-medium">#</th>
              <th className="text-start py-2 pe-3 font-medium">שם</th>
              <th className="text-start py-2 pe-3 font-medium">ת.ז</th>
              <th className="text-start py-2 pe-3 font-medium">ענפים</th>
              <th className="text-start py-2 pe-3 font-medium">חברות</th>
              <th className="text-start py-2 pe-3 font-medium cursor-pointer select-none" onClick={() => handleSort('monthlyAvg')}>
                <span className="inline-flex items-center gap-1">ממוצע חודשי <Icon name={sortIcon('monthlyAvg')} size="sm" /></span>
              </th>
              <th className="text-start py-2 pe-3 font-medium">נטו (50%)</th>
              <th className="text-start py-2 pe-3 font-medium cursor-pointer select-none" onClick={() => handleSort('trend')}>
                <span className="inline-flex items-center gap-1">מגמה <Icon name={sortIcon('trend')} size="sm" /></span>
              </th>
              <th className="text-start py-2 pe-3 font-medium cursor-pointer select-none" onClick={() => handleSort('total')}>
                <span className="inline-flex items-center gap-1">סה״כ <Icon name={sortIcon('total')} size="sm" /></span>
              </th>
              <th className="text-start py-2 font-medium">חודשים</th>
            </tr>
          </thead>
          <tbody>
            {sortedClients.map((c, i) => (
              <tr key={c.id || c.name} className="border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors">
                <td className="py-2.5 pe-3 text-on-surface-variant">{i + 1}</td>
                <td className="py-2.5 pe-3 font-medium text-on-surface">{c.name}</td>
                <td className="py-2.5 pe-3 text-on-surface-variant font-mono text-xs">{c.id || '—'}</td>
                <td className="py-2.5 pe-3">
                  <div className="flex flex-wrap gap-1">
                    {c.branches.map((b) => (
                      <span key={b} className="px-1.5 py-0.5 bg-primary-fixed rounded text-[10px] text-primary font-medium">{b}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 pe-3">
                  <div className="flex items-center gap-0.5">
                    {(c.insuranceCompanies ?? []).slice(0, 3).map((co) => (
                      <CompanyLogo key={co} company={co} size="xs" />
                    ))}
                    {(c.insuranceCompanies ?? []).length > 3 && (
                      <span className="text-[10px] text-on-surface-variant font-medium ms-0.5">
                        +{(c.insuranceCompanies ?? []).length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 pe-3 font-medium">{fmt(c.monthlyAvg)}{'\u20AA'}</td>
                <td className="py-2.5 pe-3 text-on-surface-variant">{fmt(Math.round(c.monthlyAvg * 0.5))}{'\u20AA'}</td>
                <td className="py-2.5 pe-3">
                  <TrendBadge trend={c.trend} />
                </td>
                <td className="py-2.5 pe-3 font-bold">{fmt(c.total)}{'\u20AA'}</td>
                <td className="py-2.5">{c.months}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedClients.length === 0 && (
          <p className="text-center text-on-surface-variant py-8">אין נתוני לקוחות</p>
        )}
      </section>

      {/* ─── Row 4: At risk + New clients ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* At risk */}
        <section className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-headline text-on-surface flex items-center gap-2">
              <Icon name="trending_down" className="text-error" size="sm" />
              לקוחות בסיכון
            </h2>
            <TrafficLightPill
              level={evaluateAtRiskCount(atRisk.length)}
              label={`${atRisk.length} לקוחות`}
              size="sm"
            />
          </div>
          {atRisk.length > 0 ? (
            <div className="space-y-3">
              {atRisk.map((c) => (
                <div key={c.id || c.name} className="flex items-center justify-between p-3 bg-error-container/10 rounded-lg border border-error/10">
                  <div>
                    <p className="font-medium text-on-surface text-sm">{c.name}</p>
                    <p className="text-xs text-on-surface-variant">{c.lastMonth ? formatMonth(c.lastMonth) : ''}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-on-surface-variant line-through">{fmt(c.prevAmount)}{'\u20AA'}</p>
                    <p className="text-sm font-bold text-error">{fmt(c.lastAmount)}{'\u20AA'}</p>
                    <p className="text-[10px] text-error font-medium">-{c.dropPct}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">אין לקוחות בסיכון כרגע</p>
          )}
        </section>

        {/* New clients */}
        <section className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30">
          <h2 className="text-lg font-bold font-headline text-on-surface mb-4 flex items-center gap-2">
            <Icon name="person_add" className="text-primary" size="sm" />
            לקוחות חדשים
          </h2>
          {newClients.length > 0 ? (
            <div className="space-y-3">
              {newClients.map((c) => (
                <div key={c.id || c.name} className="flex items-center justify-between p-3 bg-primary-fixed/30 rounded-lg border border-primary/10">
                  <div>
                    <p className="font-medium text-on-surface text-sm">{c.name}</p>
                    <p className="text-xs text-on-surface-variant">הצטרף {formatMonth(c.firstMonth)}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold text-primary">{fmt(c.total)}{'\u20AA'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">אין לקוחות חדשים בחודש האחרון</p>
          )}
        </section>
      </div>

      {/* ─── Row 5: Monthly trend ─── */}
      <section className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30">
        <h2 className="text-lg font-bold font-headline text-on-surface mb-4">מגמה חודשית</h2>
        {monthlyTrend.length > 0 ? (
          <div>
            {/* Bar chart */}
            <div className="flex items-end gap-2" style={{ minHeight: 160 }}>
              {monthlyTrend.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-on-surface">{fmt(m.total)}</span>
                  <div
                    className="w-full bg-primary rounded-t-md transition-all duration-500 min-h-[4px]"
                    style={{ height: `${(m.total / maxMonthlyTotal) * 120}px` }}
                  />
                  <span className="text-[10px] text-on-surface-variant whitespace-nowrap">{formatMonth(m.month)}</span>
                  <span className="text-[10px] text-on-surface-variant">{m.clients} לק׳</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">אין נתונים חודשיים</p>
        )}
      </section>

      {/* ─── Row 6: Alerts history ─── */}
      {alertMonths.length > 0 && (
        <section className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-error-container flex items-center justify-center shrink-0">
              <Icon name="notifications_active" size="sm" className="text-error" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-headline text-on-surface">מעקב התראות לאורך כל החודשים</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">{alertMonths.length} חודשים עם התראות</p>
            </div>
          </div>
          <div className="space-y-2">
            {alertMonths.map((month) => {
              const monthAlerts = anomaliesByMonth[month];
              const highCount = monthAlerts.filter(a => a.severity === 'high').length;
              const isOpen = !!expandedMonths[month];
              return (
                <div key={month} className="rounded-xl overflow-hidden border border-outline-variant/20">
                  <button
                    onClick={() => toggleMonth(month)}
                    className="w-full px-4 py-3 bg-surface-container-lowest flex items-center justify-between hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon name="calendar_month" size="sm" className="text-on-surface-variant" />
                      <span className="font-bold text-sm text-on-surface">{formatMonth(month)}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        highCount > 0 ? 'bg-error text-on-error' : 'bg-tertiary-fixed text-on-tertiary-container'
                      }`}>
                        {monthAlerts.length} התראות
                      </span>
                      {highCount > 0 && (
                        <span className="text-xs text-error font-medium">{highCount} קריטיות</span>
                      )}
                    </div>
                    <Icon name={isOpen ? 'expand_less' : 'expand_more'} className="text-on-surface-variant" />
                  </button>

                  {isOpen && (
                    <div className="p-3 space-y-2 bg-surface-container-lowest/50">
                      {monthAlerts.map((alert, i) => (
                        <div
                          key={anomalyKey(alert, i)}
                          className={`rounded-lg overflow-hidden ${
                            alert.severity === 'high' ? 'bg-error-container/30' :
                            alert.severity === 'medium' ? 'bg-tertiary-fixed/30' :
                            'bg-surface-container-lowest'
                          }`}
                        >
                          <div className="p-3 flex items-start gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              alert.severity === 'high' ? 'bg-error-container' :
                              alert.severity === 'medium' ? 'bg-tertiary-fixed' :
                              'bg-surface-container-high'
                            }`}>
                              <Icon name={alert.icon} size="sm" className={
                                alert.severity === 'high' ? 'text-error' :
                                alert.severity === 'medium' ? 'text-on-tertiary-container' :
                                'text-on-surface-variant'
                              } />
                            </div>
                            <div className="flex-1">
                              <p className={`font-bold text-sm ${
                                alert.severity === 'high' ? 'text-error' : 'text-on-surface'
                              }`}>{alert.message}</p>
                              <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{alert.detail}</p>
                            </div>
                          </div>

                          {alert.clients && alert.clients.length > 0 && (
                            <div className="px-3 pb-3">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-headline">
                                    <th className="text-start py-2 pe-3">שם</th>
                                    <th className="text-start py-2 pe-3">ת.ז</th>
                                    <th className="text-start py-2 pe-3">מוצר</th>
                                    <th className="text-end py-2">סכום</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {alert.clients.filter(c => Math.abs(c.amount) >= 1).map((client, ci) => (
                                    <tr key={ci} className="text-on-surface">
                                      <td className="py-1.5 pe-3 font-medium">{client.name}</td>
                                      <td className="py-1.5 pe-3 text-on-surface-variant">{client.id || '—'}</td>
                                      <td className="py-1.5 pe-3 text-on-surface-variant">{client.product}</td>
                                      <td className={`py-1.5 text-end font-bold ${
                                        alert.type === 'client_lost' ? 'text-error' :
                                        alert.type === 'client_spike' ? 'text-error' :
                                        client.amount < 0 ? 'text-error' : 'text-on-surface'
                                      }`}>
                                        {alert.type === 'client_negative' && <>{fmt(Math.round(Math.abs(client.amount)))}₪ החזר</>}
                                        {alert.type === 'client_lost' && <>-{fmt(Math.round(Math.abs(client.amount)))}₪ אובדן</>}
                                        {alert.type === 'client_spike' && <>-{fmt(Math.round(Math.abs(client.amount)))}₪ ירידה</>}
                                        {!['client_negative','client_lost','client_spike'].includes(alert.type) && <>{fmt(Math.round(Math.abs(client.amount)))}₪</>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="font-bold text-on-surface">
                                    <td colSpan={3} className="py-2 pt-3">סה״כ {alert.clients.length} לקוחות</td>
                                    <td className={`py-2 pt-3 text-end ${alert.type === 'client_negative' ? 'text-error' : 'text-primary'}`}>
                                      {fmt(Math.round(Math.abs(alert.clients.reduce((s, c) => s + c.amount, 0))))}₪
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function OverviewCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center">
          <Icon name={icon} className="text-primary" size="sm" />
        </div>
        <span className="text-xs text-on-surface-variant font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold font-headline text-on-surface">{value}</p>
      {sub && <p className="text-[10px] text-on-surface-variant/60 mt-1">{sub}</p>}
    </div>
  );
}

function ConcentrationMeter({ label, pct }: { label: string; pct: number }) {
  const isHigh = pct > 50;
  const level = evaluateConcentrationTop5(pct);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-on-surface">{label}</span>
        <div className="flex items-center gap-2">
          <TrafficLightPill level={level} showLabel={false} size="sm" />
          <span className={`text-sm font-bold ${isHigh ? 'text-error' : 'text-primary'}`}>{pct}%</span>
        </div>
      </div>
      <div className="h-2.5 bg-surface-container-high rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-error' : 'bg-primary'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function TrendBadge({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
        <Icon name="trending_up" size="sm" />
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
        <Icon name="trending_down" size="sm" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded">
      <Icon name="trending_flat" size="sm" />
    </span>
  );
}
