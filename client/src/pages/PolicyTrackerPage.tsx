import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '../components/ui/Icon';
import {
  searchClients,
  getClientTransactions,
  type ClientSummary,
  type ClientTransaction,
} from '../services/api';

export default function PolicyTrackerPage() {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fmt = (n: number) => n.toLocaleString('he-IL');

  const fetchClients = useCallback(async (term: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchClients(term || undefined);
      setClients(res.data ?? []);
    } catch {
      setError('שגיאה בטעינת לקוחות');
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all clients on mount
  useEffect(() => {
    fetchClients('');
  }, [fetchClients]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchClients(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchClients]);

  const handleClientClick = async (clientId: string) => {
    if (selectedClientId === clientId) {
      setSelectedClientId(null);
      setTransactions([]);
      return;
    }
    setSelectedClientId(clientId);
    setTxLoading(true);
    try {
      const res = await getClientTransactions(clientId);
      setTransactions(res.data ?? []);
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8" dir="rtl">
      {/* Header */}
      <section>
        <h1 className="font-headline text-3xl md:text-4xl font-black tracking-tight mb-2">
          מעקב לקוחות ופוליסות
        </h1>
        <p className="text-on-surface-variant text-sm mb-6">
          חיפוש לקוחות לפי שם או תעודת זהות
        </p>

        {/* Search Bar */}
        <div className="relative max-w-xl">
          <Icon
            name="search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש לפי שם לקוח או ת.ז..."
            className="w-full pr-12 pl-4 py-3 bg-surface-container-lowest rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-label text-sm"
          />
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="bg-error-container/20 text-error rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-on-surface-variant">
          <Icon name="hourglass_empty" size="lg" className="animate-pulse mb-2" />
          <p className="text-sm">טוען...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && clients.length === 0 && !error && (
        <section className="bg-surface-container-lowest rounded-lg p-16 text-center">
          <Icon name="person_search" size="xl" className="text-on-surface-variant/20 mb-4" />
          <h3 className="text-xl font-bold text-on-surface mb-2">
            {search ? 'לא נמצאו תוצאות' : 'חפש לקוח לפי שם או תעודת זהות'}
          </h3>
          <p className="text-on-surface-variant">
            {search
              ? 'נסה לחפש עם מילת מפתח אחרת'
              : 'הקלד שם לקוח או מספר תעודת זהות בשדה החיפוש'}
          </p>
        </section>
      )}

      {/* Results */}
      {!loading && clients.length > 0 && (
        <section className="space-y-4">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">
            {clients.length} לקוחות
          </p>

          <div className="space-y-3">
            {clients.map((client) => (
              <div key={client.insuredId}>
                {/* Client Card */}
                <button
                  onClick={() => handleClientClick(client.insuredId)}
                  className={`w-full text-right bg-surface-container-lowest rounded-lg p-6 transition-all hover:scale-[1.005] hover:shadow-sm ${
                    selectedClientId === client.insuredId
                      ? 'ring-2 ring-primary/30'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center">
                        <Icon name="person" className="text-primary/50" />
                      </div>
                      <div>
                        <p className="font-bold text-base">{client.insuredName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-on-surface-variant font-mono">ת.ז {client.insuredId}</span>
                          {client.insuranceCompanies.map((co) => (
                            <span
                              key={co}
                              className="text-[10px] bg-primary-fixed text-primary px-2 py-0.5 rounded-full font-bold"
                            >
                              {co}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {/* Monthly average — the key metric */}
                      <div className="text-left">
                        <p className="text-xl font-headline font-black text-primary">
                          &#8362;{fmt(client.monthlyAverage ?? Math.round(client.totalCommission / Math.max(client.monthsActive || 1, 1)))}
                        </p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                          ממוצע חודשי
                        </p>
                        <p className="text-[10px] text-secondary/60">
                          נטו: {fmt(Math.round((client.monthlyAverage ?? client.totalCommission / Math.max(client.monthsActive || 1, 1)) * 0.5))}₪
                        </p>
                      </div>
                      {/* Months active */}
                      <div className="text-left hidden sm:block">
                        <p className="font-bold text-sm">{client.monthsActive || '—'}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                          חודשים
                        </p>
                      </div>
                      {/* Last month */}
                      <div className="text-left hidden md:block">
                        <p className="font-bold text-sm">{client.lastMonth}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                          חודש אחרון
                        </p>
                      </div>
                      {/* Products */}
                      <div className="hidden lg:flex gap-1 flex-wrap max-w-[200px]">
                        {(client.products || []).map((p) => (
                          <span
                            key={p}
                            className="text-[10px] bg-surface-container-low px-2 py-0.5 rounded-full text-on-surface-variant font-medium"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                      <Icon
                        name={selectedClientId === client.insuredId ? 'expand_less' : 'expand_more'}
                        className="text-on-surface-variant/40"
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded Transactions — grouped by month */}
                {selectedClientId === client.insuredId && (
                  <div className="bg-surface-container-low rounded-lg mt-1 animate-in">
                    {txLoading ? (
                      <p className="text-center text-on-surface-variant text-sm py-6">טוען עסקאות...</p>
                    ) : transactions.length === 0 ? (
                      <p className="text-center text-on-surface-variant text-sm py-6">אין עסקאות</p>
                    ) : (
                      <div className="space-y-0">
                        {(() => {
                          // Group by month, sort months DESC, sort rows by amount DESC
                          const byMonth: Record<string, typeof transactions> = {};
                          transactions.forEach(tx => {
                            const m = tx.processingMonth || 'ללא';
                            if (!byMonth[m]) byMonth[m] = [];
                            byMonth[m].push(tx);
                          });
                          const sortedMonths = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

                          return sortedMonths.map((month, mi) => {
                            const rows = byMonth[month].sort((a, b) => b.commissionAmount - a.commissionAmount);
                            const monthTotal = rows.reduce((s, r) => s + r.commissionAmount, 0);
                            const HEBREW_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
                            const [y, m] = month.split('-');
                            const monthLabel = m ? `${HEBREW_MONTHS[parseInt(m) - 1]} ${y}` : month;

                            return (
                              <div key={month}>
                                {/* Month header */}
                                <div className={`px-6 py-3 flex justify-between items-center ${mi === 0 ? 'rounded-t-lg' : ''} bg-surface-container-high`}>
                                  <span className="font-bold text-sm text-on-surface font-headline">{monthLabel}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-on-surface-variant">{rows.length} רשומות</span>
                                    <span className="font-black text-primary">{fmt(Math.round(monthTotal))}₪</span>
                                    <span className="text-[10px] text-on-surface-variant/50">נטו: {fmt(Math.round(monthTotal * 0.5))}₪</span>
                                  </div>
                                </div>
                                {/* Rows */}
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold border-b border-outline-variant/30">
                                      <th className="px-6 py-2 text-right font-bold">ענף</th>
                                      <th className="py-2 text-right font-bold">מוצר</th>
                                      <th className="py-2 text-right font-bold">מס׳ פוליסה</th>
                                      <th className="py-2 text-right font-bold">פרמיה</th>
                                      <th className="py-2 text-right font-bold">עמלה</th>
                                      <th className="py-2 text-right font-bold">חברה</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.map((tx) => (
                                      <tr key={tx.id} className="hover:bg-surface-container-lowest transition-colors">
                                        <td className="px-6 py-2.5 text-on-surface-variant w-24">{tx.branch ?? '—'}</td>
                                        <td className="py-2.5 text-on-surface-variant">{tx.productName ?? '—'}</td>
                                        <td className="py-2.5 text-on-surface-variant/60 font-mono text-xs w-28">
                                          {tx.policyNumber ?? '—'}
                                        </td>
                                        <td className="py-2.5 text-on-surface-variant w-24">{tx.premium != null ? `${fmt(tx.premium)}₪` : '—'}</td>
                                        <td className="py-2.5 font-bold text-end w-28">
                                          <span className={tx.commissionAmount < 0 ? 'text-error' : 'text-secondary'}>{fmt(tx.commissionAmount)}₪</span>
                                        </td>
                                        <td className="py-2.5 text-on-surface-variant text-xs w-20">{tx.insuranceCompany}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
