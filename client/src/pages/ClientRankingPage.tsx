import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import type { ClientSummary } from '../services/api';
import ClientRankingTable from '../components/portfolio/ClientRankingTable';
import { MetricCard } from '../components/common/MetricCard';
import { evaluateClientProfit } from '../utils/profitThresholds';
import { fmt } from '../utils/dateFormat';
import Icon from '../components/ui/Icon';
import { detectAnomalies } from '../utils/anomalies';
import type { CommissionRow } from '../store/dataStore';
import { mapToCommissionRow } from '../utils/commissionMapper';
import PortfolioFilterToggle, { PortfolioFilterBanner } from '../components/common/PortfolioFilterToggle';
import { usePortfolioFilterStore } from '../store/portfolioFilterStore';

export default function ClientRankingPage() {
  const navigate = useNavigate();
  const portfolioFilter = usePortfolioFilterStore((s) => s.portfolioFilter);

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [atRiskOnly, setAtRiskOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [clientsRes, salesRes] = await Promise.all([
          api.searchClients(undefined, portfolioFilter),
          api.getSalesTransactions(undefined, portfolioFilter),
        ]);
        if (!cancelled) {
          setClients(clientsRes.data ?? []);
          setCommissions((salesRes.data || []).map(mapToCommissionRow));
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof api.ApiError && err.status === 401
              ? 'פג תוקף ההתחברות. יש להתחבר מחדש.'
              : err instanceof Error
              ? err.message
              : 'שגיאה בטעינה';
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [portfolioFilter]);

  const anomalyClientKeys = useMemo(() => {
    const months = new Set<string>();
    commissions.forEach(c => { if (c.processingMonth) months.add(c.processingMonth); });
    const sortedMonths = Array.from(months).sort();
    const anomalies = detectAnomalies(commissions, sortedMonths);
    const keys = new Set<string>();
    const relevantTypes = new Set(['client_lost', 'client_negative', 'client_spike']);
    anomalies.forEach(a => {
      if (relevantTypes.has(a.type) && a.clients) {
        a.clients.forEach(c => {
          if (c.id) keys.add(c.id);
          if (c.name) keys.add(c.name);
        });
      }
    });
    return keys;
  }, [commissions]);

  const averageCommission = useMemo(() => {
    if (clients.length === 0) return 0;
    return clients.reduce((s, c) => s + c.totalCommission, 0) / clients.length;
  }, [clients]);

  const sortedAll = useMemo(
    () => [...clients].sort((a, b) => a.totalCommission - b.totalCommission),
    [clients],
  );

  const topPerformer = clients.length > 0
    ? [...clients].sort((a, b) => b.totalCommission - a.totalCommission)[0]
    : null;

  const bottomPerformer = sortedAll[0] ?? null;

  const atRiskCount = useMemo(
    () => clients.filter((c) => evaluateClientProfit(c.totalCommission, averageCommission) === 'red').length,
    [clients, averageCommission],
  );

  const filtered = useMemo(() => {
    let result = clients;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.insuredName.toLowerCase().includes(q) ||
          c.insuredId.toLowerCase().includes(q),
      );
    }

    if (atRiskOnly) {
      result = result.filter(
        (c) => evaluateClientProfit(c.totalCommission, averageCommission) === 'red',
      );
    }

    return result;
  }, [clients, search, atRiskOnly, averageCommission]);

  function handleClientClick(clientId: string) {
    const client = clients.find((c) => c.insuredId === clientId);
    const name = client?.insuredName ?? clientId;
    navigate(`/clients/${encodeURIComponent(clientId)}`, { state: { clientName: name } });
  }

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
          <Icon name="cloud_off" size="xl" className="text-error/40 mx-auto" />
          <p className="font-bold text-on-surface">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-container text-white px-6 py-2 rounded-lg font-semibold text-sm"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6" dir="rtl">
      {/* Header */}
      <section className="flex flex-col lg:flex-row justify-between lg:items-end gap-2">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black font-headline text-on-surface tracking-tight mb-1">
            מידרוג לקוחות
          </h2>
          <p className="text-on-surface-variant">מהפחות רווחי לרווחי ביותר</p>
        </div>
        <PortfolioFilterToggle />
      </section>
      <PortfolioFilterBanner filter={portfolioFilter} />

      {/* Summary cards */}
      {clients.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            title="סה״כ לקוחות"
            value={String(clients.length)}
            icon="group"
          />
          <MetricCard
            title="ממוצע עמלה ללקוח"
            value={`${fmt(Math.round(averageCommission))} ₪`}
            icon="bar_chart"
          />
          <MetricCard
            title="מוביל"
            value={topPerformer?.insuredName ?? '—'}
            subtitle={topPerformer ? `${fmt(Math.round(topPerformer.totalCommission))} ₪` : undefined}
            level="green"
            icon="emoji_events"
          />
          <MetricCard
            title="פחות רווחי"
            value={bottomPerformer?.insuredName ?? '—'}
            subtitle={
              bottomPerformer
                ? `${fmt(Math.round(bottomPerformer.totalCommission))} ₪`
                : undefined
            }
            level={
              bottomPerformer
                ? evaluateClientProfit(bottomPerformer.totalCommission, averageCommission)
                : undefined
            }
            icon="arrow_downward"
          />
        </div>
      )}

      {/* Filter bar */}
      {clients.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute top-1/2 -translate-y-1/2 end-3 text-on-surface-variant/50 pointer-events-none">
              <Icon name="search" size="sm" />
            </span>
            <input
              type="search"
              placeholder="חיפוש לפי שם לקוח..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="חיפוש לקוחות"
              className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg pe-10 ps-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={() => setAtRiskOnly((v) => !v)}
            aria-pressed={atRiskOnly}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              atRiskOnly
                ? 'bg-error-container text-on-error-container'
                : 'bg-surface-container-lowest border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <Icon name="warning" size="sm" />
            הצג רק לקוחות בסיכון
            {atRiskCount > 0 && (
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  atRiskOnly ? 'bg-error text-on-error' : 'bg-error-container text-error'
                }`}
              >
                {atRiskCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Table / Empty state */}
      {clients.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-lg py-16 flex flex-col items-center gap-4 border border-outline-variant/20">
          <div className="w-16 h-16 bg-primary-fixed rounded-full flex items-center justify-center">
            <Icon name="group" size="lg" className="text-primary" />
          </div>
          <p className="text-on-surface font-bold text-lg">אין לקוחות עדיין</p>
          <p className="text-on-surface-variant text-sm">
            העלה קבצי עמלות כדי לראות את הלקוחות שלך
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="bg-primary-container text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Icon name="upload_file" size="sm" />
            העלאת קבצי עמלות
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-lg py-12 flex flex-col items-center gap-3 border border-outline-variant/20">
          <Icon name="search_off" size="lg" className="text-on-surface-variant/40" />
          <p className="text-on-surface-variant">לא נמצאו לקוחות התואמים את הסינון</p>
          <button
            onClick={() => { setSearch(''); setAtRiskOnly(false); }}
            className="text-sm text-primary font-bold hover:underline"
          >
            נקה סינון
          </button>
        </div>
      ) : (
        <ClientRankingTable clients={filtered} onClientClick={handleClientClick} anomalyClientKeys={anomalyClientKeys} />
      )}
    </div>
  );
}
