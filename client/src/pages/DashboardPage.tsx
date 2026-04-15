import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Icon from '../components/ui/Icon';
import { useAuthStore } from '../store/authStore';
import type { CommissionRow } from '../store/dataStore';
import * as api from '../services/api';

/* ─── Helpers ─── */
const HEBREW_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function formatMonth(key: string): string {
  const [year, month] = key.split('-');
  return `${HEBREW_MONTHS[parseInt(month) - 1]} ${year}`;
}

function normalizeMonth(raw: string): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  const d = raw.match(/^\d{1,2}[/-](\d{1,2})[/-](\d{4})$/);
  if (d) return `${d[2]}-${d[1].padStart(2, '0')}`;
  return '';
}

const fmt = (n: number) => n.toLocaleString('he-IL', { maximumFractionDigits: 0 });

const REPORT_TYPE_HE: Record<string, string> = {
  nifraim: 'נפרעים',
  hekef: 'היקף',
  agent_data: 'צבירה (פירוט)',
  accumulation_nifraim: 'נפרעים צבירה',
  accumulation_hekef: 'היקף צבירה',
  product_distribution: 'סיכום תשלום',
  branch_distribution: 'היקף',
};

/* Commission type breakdown config */
interface BreakdownType {
  key: string;
  label: string;
  icon: string;
  colorBg: string;
  colorText: string;
  colorIcon: string;
  description: string;
}

const COMMISSION_TYPES: BreakdownType[] = [
  {
    key: 'נפרעים',
    label: 'נפרעים',
    icon: 'autorenew',
    colorBg: 'bg-primary-fixed',
    colorText: 'text-primary',
    colorIcon: 'text-primary',
    description: 'עמלות שוטפות על פרמיות — חוזרות כל חודש',
  },
  {
    key: 'סיכום תשלום',
    label: 'סיכום תשלום',
    icon: 'bar_chart',
    colorBg: 'bg-secondary-fixed',
    colorText: 'text-secondary',
    colorIcon: 'text-secondary',
    description: 'סיכום התפלגות עמלות לפי מוצרים',
  },
  {
    key: 'צבירה (פירוט)',
    label: 'צבירה (פירוט)',
    icon: 'savings',
    colorBg: 'bg-tertiary-fixed',
    colorText: 'text-on-tertiary-container',
    colorIcon: 'text-on-tertiary-container',
    description: 'דמי ניהול ועמלות על מוצרי צבירה (גמל, השתלמות)',
  },
  {
    key: 'היקף',
    label: 'היקף',
    icon: 'bolt',
    colorBg: 'bg-primary-fixed',
    colorText: 'text-primary',
    colorIcon: 'text-primary',
    description: 'עמלה חד-פעמית על ניוד או הצטרפות',
  },
  {
    key: 'נפרעים צבירה',
    label: 'נפרעים צבירה',
    icon: 'account_balance',
    colorBg: 'bg-secondary-fixed',
    colorText: 'text-secondary',
    colorIcon: 'text-secondary',
    description: 'עמלות שוטפות על מוצרי צבירה',
  },
  {
    key: 'היקף צבירה',
    label: 'היקף צבירה',
    icon: 'moving',
    colorBg: 'bg-tertiary-fixed',
    colorText: 'text-on-tertiary-container',
    colorIcon: 'text-on-tertiary-container',
    description: 'עמלה חד-פעמית על ניוד גמל/השתלמות',
  },
];

/* All salary-contributing report type labels */
const ALL_SALARY_TYPES = new Set(COMMISSION_TYPES.map(t => t.key));

type SalesRecord = api.SalesTransaction;

function mapToCommissionRow(s: SalesRecord): CommissionRow {
  const name = s.insuredName || '';
  return {
    id: s.id,
    policyId: s.policyNumber || '',
    clientName: name,
    clientInitials: name.trim().split(' ').map(w => w[0] || '').join('').slice(0, 2),
    type: (s.reportType === 'hekef' || s.reportType === 'accumulation_hekef') ? 'one_time' : 'recurring',
    typeHe: REPORT_TYPE_HE[s.reportType] || s.reportType,
    amount: s.commissionAmount,
    insuranceCompany: s.insuranceCompany,
    date: s.processingMonth,
    processingMonth: s.processingMonth,
    productTypeHe: s.productName || s.branch || s.fundType || '',
    clientIdNumber: s.insuredId || '',
    branch: s.branch || '',
    premiumAmount: s.premium ?? 0,
  };
}

/* ─── Main Component ─── */
export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const userMode = useAuthStore((s) => s.userMode);
  const setAgreementUploaded = useAuthStore((s) => s.setAgreementUploaded);
  const agreementUploaded = profile?.agreementUploaded ?? false;

  // Direct state — loaded fresh from DB on every mount. No localStorage dependency.
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(userMode === 'new');
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<'agreement' | 'sales'>('sales');
  const [tableExpanded, setTableExpanded] = useState(true);
  const [salaryExpanded, setSalaryExpanded] = useState(false);
  const [showNetOfCover, setShowNetOfCover] = useState(false);

  // Load from DB — called on every mount and after upload
  const loadFromDb = useCallback(async () => {
    if (userMode === 'demo') return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSalesTransactions();
      const records = (res.data || []).map(mapToCommissionRow);
      console.log('[Dashboard] Loaded from DB:', records.length, 'records');
      setCommissions(records);
    } catch (err) {
      const msg = err instanceof api.ApiError && err.status === 401
        ? 'פג תוקף ההתחברות. יש להתחבר מחדש.'
        : err instanceof Error ? err.message : 'שגיאה בטעינה מהשרת';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userMode]);

  // Always load on mount for authenticated users
  useEffect(() => {
    if (userMode === 'new') {
      loadFromDb();
    }
  }, [userMode, loadFromDb]);

  // Derived data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    commissions.forEach(c => { if (c.processingMonth) months.add(c.processingMonth); });
    return Array.from(months).sort();
  }, [commissions]);

  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  const filtered = useMemo(() =>
    commissions.filter(c => c.processingMonth === selectedMonth),
  [commissions, selectedMonth]);

  const monthTotal = useMemo(() =>
    filtered.reduce((s, c) => s + c.amount, 0),
  [filtered]);

  const monthlyTotals = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    commissions.forEach(c => {
      const m = c.processingMonth;
      if (!m) return;
      if (!map[m]) map[m] = { total: 0, count: 0 };
      map[m].total += c.amount;
      map[m].count++;
    });
    return Object.entries(map).map(([m, d]) => ({ month: m, ...d })).sort((a, b) => a.month.localeCompare(b.month));
  }, [commissions]);

  // Previous month comparison
  const selectedIdx = availableMonths.indexOf(selectedMonth);
  const prevMonth = selectedIdx > 0 ? availableMonths[selectedIdx - 1] : null;
  const prevTotal = useMemo(() => {
    if (!prevMonth) return 0;
    return commissions.filter(c => c.processingMonth === prevMonth).reduce((s, c) => s + c.amount, 0);
  }, [commissions, prevMonth]);
  const changePct = prevTotal > 0 ? ((monthTotal - prevTotal) / prevTotal * 100) : 0;

  // Prediction: average of all months
  const prediction = useMemo(() => {
    if (monthlyTotals.length === 0) return 0;
    const totals = monthlyTotals.map(m => m.total);
    const avg = totals.reduce((s, t) => s + t, 0) / totals.length;

    if (totals.length === 1) return Math.round(avg);

    // Weighted average: recent months count more
    // Weights: oldest=1, ..., newest=n
    let weightedSum = 0;
    let weightTotal = 0;
    totals.forEach((t, i) => {
      const weight = i + 1;
      weightedSum += t * weight;
      weightTotal += weight;
    });
    const weightedAvg = weightedSum / weightTotal;

    // Never predict below 70% of the average (floor protection)
    const floor = avg * 0.7;
    return Math.round(Math.max(weightedAvg, floor));
  }, [monthlyTotals]);

  const totalAll = commissions.reduce((s, c) => s + c.amount, 0);

  // Breakdown by commission type
  const breakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filtered.forEach(c => {
      const key = c.typeHe || 'אחר';
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count++;
      map[key].total += c.amount;
    });
    return map;
  }, [filtered]);

  // Detect missing report types
  const uploadedTypes = useMemo(() => {
    const types = new Set<string>();
    commissions.forEach(c => { if (c.typeHe) types.add(c.typeHe); });
    return types;
  }, [commissions]);

  const missingTypes = useMemo(() => {
    const important = ['נפרעים', 'צבירה (פירוט)', 'סיכום תשלום'];
    return important.filter(t => !uploadedTypes.has(t));
  }, [uploadedTypes]);

  // Breakdown as array for salary detail — grouped by type + company
  const breakdownList = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filtered.forEach(c => {
      const typeName = c.typeHe || 'אחר';
      const company = c.insuranceCompany || '';
      const key = company ? `${typeName} — ${company}` : typeName;
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count++;
      map[key].total += c.amount;
    });
    return Object.entries(map).map(([type, data]) => ({ type, ...data })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // ─── Anomaly Detection ───
  interface AnomalyClient {
    name: string;
    id: string;
    amount: number;
    product: string;
  }

  interface Anomaly {
    type: 'total_drop' | 'client_lost' | 'client_negative' | 'client_spike' | 'total_spike';
    severity: 'high' | 'medium' | 'low';
    icon: string;
    message: string;
    detail: string;
    clients?: AnomalyClient[];
  }

  const anomalies = useMemo((): Anomaly[] => {
    if (availableMonths.length < 2) return [];
    const alerts: Anomaly[] = [];

    // Find months that have nifraim data specifically
    const nifraimMonths = availableMonths.filter(m =>
      commissions.some(c => c.processingMonth === m && c.typeHe === 'נפרעים')
    );

    // 1. Compare consecutive nifraim months (not all months)
    for (let i = 1; i < nifraimMonths.length; i++) {
      const currMonth = nifraimMonths[i];
      const prevMonth = nifraimMonths[i - 1];
      const currNifraim = commissions.filter(c => c.processingMonth === currMonth && c.typeHe === 'נפרעים');
      const prevNifraim = commissions.filter(c => c.processingMonth === prevMonth && c.typeHe === 'נפרעים');

      if (prevNifraim.length === 0 || currNifraim.length === 0) continue;

      const currTotal = currNifraim.reduce((s, c) => s + c.amount, 0);
      const prevTotal = prevNifraim.reduce((s, c) => s + c.amount, 0);

      // Nifraim should generally grow — drop is suspicious
      if (prevTotal > 0 && currTotal < prevTotal * 0.9) {
        const dropPct = Math.round(((prevTotal - currTotal) / prevTotal) * 100);
        alerts.push({
          type: 'total_drop',
          severity: dropPct > 20 ? 'high' : 'medium',
          icon: 'trending_down',
          message: `ירידה בנפרעים: ${formatMonth(prevMonth)} → ${formatMonth(currMonth)}`,
          detail: `${fmt(Math.round(prevTotal))}₪ → ${fmt(Math.round(currTotal))}₪ (ירידה של ${dropPct}%). נפרעים צפויים לעלות עם הצטרפות לקוחות חדשים.`,
        });
      }

      // 2. Lost clients (in prev but not in curr) — with product details
      const prevClients = new Map<string, { name: string; id: string; amount: number; products: Set<string> }>();
      prevNifraim.forEach(c => {
        const key = c.clientIdNumber || c.clientName;
        if (!key) return;
        const existing = prevClients.get(key);
        if (existing) {
          existing.amount += c.amount;
          if (c.productTypeHe || c.branch) existing.products.add(c.productTypeHe || c.branch || '');
        } else {
          const products = new Set<string>();
          if (c.productTypeHe || c.branch) products.add(c.productTypeHe || c.branch || '');
          prevClients.set(key, { name: c.clientName, id: c.clientIdNumber || '', amount: c.amount, products });
        }
      });

      const currClients = new Set(currNifraim.map(c => c.clientIdNumber || c.clientName).filter(Boolean));

      const lostClients: AnomalyClient[] = [];
      prevClients.forEach((data, key) => {
        if (!currClients.has(key) && data.amount >= 10) {
          lostClients.push({
            name: data.name,
            id: data.id,
            amount: data.amount,
            product: Array.from(data.products).join(', ') || '—',
          });
        }
      });

      if (lostClients.length > 0) {
        const totalLost = lostClients.reduce((s, c) => s + c.amount, 0);
        alerts.push({
          type: 'client_lost',
          severity: totalLost > 100 ? 'high' : 'medium',
          icon: 'person_off',
          message: `${lostClients.length} לקוחות לא מופיעים ב${formatMonth(currMonth)}`,
          detail: `אובדן הכנסה של ${fmt(Math.round(totalLost))}₪`,
          clients: lostClients.sort((a, b) => b.amount - a.amount),
        });
      }

      // 3. Per-client revenue drop >= 20₪
      // Group current month by client
      const currClientMap = new Map<string, { name: string; id: string; amount: number; products: Set<string> }>();
      currNifraim.forEach(c => {
        const key = c.clientIdNumber || c.clientName;
        if (!key) return;
        const existing = currClientMap.get(key);
        if (existing) {
          existing.amount += c.amount;
          if (c.productTypeHe || c.branch) existing.products.add(c.productTypeHe || c.branch || '');
        } else {
          const products = new Set<string>();
          if (c.productTypeHe || c.branch) products.add(c.productTypeHe || c.branch || '');
          currClientMap.set(key, { name: c.clientName, id: c.clientIdNumber || '', amount: c.amount, products });
        }
      });

      const droppedClients: AnomalyClient[] = [];
      prevClients.forEach((prevData, key) => {
        const currData = currClientMap.get(key);
        if (!currData) return; // Already covered in "lost clients"
        const drop = prevData.amount - currData.amount;
        if (drop >= 20) {
          droppedClients.push({
            name: prevData.name,
            id: prevData.id,
            amount: -drop, // negative = how much lost
            product: `${fmt(Math.round(prevData.amount))}₪ → ${fmt(Math.round(currData.amount))}₪ (${Array.from(currData.products).join(', ') || '—'})`,
          });
        }
      });

      if (droppedClients.length > 0) {
        const totalDrop = droppedClients.reduce((s, c) => s + Math.abs(c.amount), 0);
        alerts.push({
          type: 'client_spike',
          severity: totalDrop > 200 ? 'high' : droppedClients.length > 3 ? 'medium' : 'low',
          icon: 'person_alert',
          message: `${droppedClients.length} לקוחות עם ירידה מ${formatMonth(prevMonth)} ל${formatMonth(currMonth)}`,
          detail: `לקוחות שההכנסה מהם ירדה ב-20₪ ומעלה. סה"כ ירידה: ${fmt(Math.round(totalDrop))}₪`,
          clients: droppedClients.sort((a, b) => a.amount - b.amount), // most dropped first
        });
      }

      // 4. Negative amounts (refunds/clawbacks) — with client details
      const negatives = currNifraim.filter(c => c.amount < 0);
      if (negatives.length > 0) {
        const totalNeg = negatives.reduce((s, c) => s + c.amount, 0);
        const negClients: AnomalyClient[] = negatives.map(c => ({
          name: c.clientName,
          id: c.clientIdNumber || '',
          amount: c.amount,
          product: c.productTypeHe || c.branch || '—',
        }));
        alerts.push({
          type: 'client_negative',
          severity: Math.abs(totalNeg) > 50 ? 'high' : 'low',
          icon: 'warning',
          message: `${negatives.length} החזרים/ביטולים ב${formatMonth(currMonth)}`,
          detail: `סה"כ ${fmt(Math.round(Math.abs(totalNeg)))}₪ בהחזרים`,
          clients: negClients.sort((a, b) => a.amount - b.amount),
        });
      }
    }

    // 4. Scan ALL months for negatives (not just compared ones)
    for (const month of availableMonths) {
      const monthNifraim = commissions.filter(c => c.processingMonth === month && c.typeHe === 'נפרעים');
      // Skip if already covered in the comparison loop
      if (nifraimMonths.length >= 2 && nifraimMonths.includes(month) && nifraimMonths.indexOf(month) > 0) continue;

      const negatives = monthNifraim.filter(c => c.amount < 0);
      if (negatives.length > 0) {
        const totalNeg = negatives.reduce((s, c) => s + c.amount, 0);
        const negClients: AnomalyClient[] = negatives.map(c => ({
          name: c.clientName,
          id: c.clientIdNumber || '',
          amount: c.amount,
          product: c.productTypeHe || c.branch || '—',
        }));
        alerts.push({
          type: 'client_negative',
          severity: Math.abs(totalNeg) > 50 ? 'high' : 'low',
          icon: 'warning',
          message: `${negatives.length} החזרים/ביטולים ב${formatMonth(month)}`,
          detail: `סה"כ ${fmt(Math.round(Math.abs(totalNeg)))}₪ בהחזרים`,
          clients: negClients.sort((a, b) => a.amount - b.amount),
        });
      }
    }

    return alerts.sort((a, b) => {
      const sev = { high: 0, medium: 1, low: 2 };
      return sev[a.severity] - sev[b.severity];
    });
  }, [commissions, availableMonths]);

  const [showAnomalies, setShowAnomalies] = useState(true);

  function openUpload(mode: 'agreement' | 'sales') {
    setUploadMode(mode);
    setShowUpload(true);
  }

  async function handleUploadComplete() {
    setShowUpload(false);
    if (uploadMode === 'agreement') {
      setAgreementUploaded();
    }
    // Reload from DB to get fresh data
    await loadFromDb();
  }

  // ─── State 1: No agreement ───
  if (!agreementUploaded) {
    return (
      <>
        <div className="p-4 md:p-8 min-h-[80vh] flex items-center justify-center">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-primary-fixed rounded-full flex items-center justify-center">
              <Icon name="description" size="lg" className="text-primary" />
            </div>
            <h1 className="text-3xl font-black font-headline text-on-surface">העלאת הסכם עמלות</h1>
            <p className="text-on-surface-variant">העלה את הסכם העמלות שלך כדי שנדע מה מגיע לך מכל חברה</p>
            <button onClick={() => openUpload('agreement')} className="w-full editorial-gradient text-white font-bold py-4 rounded-lg shadow-editorial-btn hover:opacity-95 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
              <Icon name="upload_file" />
              העלאת הסכם עמלות
            </button>
          </div>
        </div>
        <UploadModal open={showUpload} mode={uploadMode} onComplete={handleUploadComplete} onClose={() => setShowUpload(false)} />
      </>
    );
  }

  // ─── State 2: No sales data ───
  if (commissions.length === 0 && !loading) {
    return (
      <>
        <div className="p-4 md:p-8 min-h-[80vh] flex items-center justify-center">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-primary-fixed rounded-full flex items-center justify-center">
              <Icon name="upload_file" size="lg" className="text-primary" />
            </div>
            <h1 className="text-3xl font-black font-headline text-on-surface">העלאת קבצי מכירות</h1>
            <p className="text-on-surface-variant">העלה את דוחות העמלות שקיבלת מחברות הביטוח כדי לחשב את השכר שלך</p>
            <button onClick={() => openUpload('sales')} className="w-full editorial-gradient text-white font-bold py-4 rounded-lg shadow-editorial-btn hover:opacity-95 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
              <Icon name="upload_file" />
              העלאת קבצי מכירות
            </button>
          </div>
        </div>
        <UploadModal open={showUpload} mode={uploadMode} onComplete={handleUploadComplete} onClose={() => setShowUpload(false)} />
      </>
    );
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
          <Icon name="cloud_off" size="xl" className="text-error/40" />
          <p className="font-bold">{error}</p>
          <button onClick={loadFromDb} className="bg-primary-container text-white px-6 py-2 rounded-lg font-semibold text-sm">נסה שוב</button>
        </div>
      </div>
    );
  }

  // ─── State 3: Full Dashboard ───
  return (
    <>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <section className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
          <div>
            <h2 className="text-3xl lg:text-4xl font-black font-headline text-on-surface tracking-tight mb-1">תחזית שכר חודשית</h2>
            <p className="text-on-surface-variant">סקירה מפורטת של עמלות ומכירות</p>
          </div>
          <button onClick={() => openUpload('sales')} className="bg-primary-container text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-editorial-btn hover:translate-y-[-1px] transition-all flex items-center gap-2 self-start">
            <Icon name="upload_file" size="sm" />
            העלאת קבצי מכירות
          </button>
        </section>

        {/* Month Navigator — right aligned, compact */}
        <div className="flex items-center gap-2 self-end">
          <button
            onClick={() => { if (selectedIdx > 0) setSelectedMonth(availableMonths[selectedIdx - 1]); }}
            disabled={selectedIdx <= 0}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            aria-label="חודש קודם"
          >
            <Icon name="chevron_right" size="sm" />
          </button>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="בחירת חודש"
            className="appearance-none bg-primary-container text-white font-headline font-bold text-sm px-4 py-2 rounded-lg cursor-pointer border-none focus:ring-2 focus:ring-primary/40"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>

          <button
            onClick={() => { if (selectedIdx < availableMonths.length - 1) setSelectedMonth(availableMonths[selectedIdx + 1]); }}
            disabled={selectedIdx >= availableMonths.length - 1}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            aria-label="חודש הבא"
          >
            <Icon name="chevron_left" size="sm" />
          </button>
        </div>

        {/* 3 Main Cards: Previous | Current | Prediction */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Previous Month */}
          <button
            onClick={() => prevMonth && setSelectedMonth(prevMonth)}
            aria-label={prevMonth ? `הצג שכר ${formatMonth(prevMonth)}` : 'אין חודש קודם'}
            className={`bg-surface-container-lowest rounded-lg p-5 text-start transition-all ${prevMonth ? 'hover:shadow-editorial cursor-pointer' : 'opacity-50'}`}
            disabled={!prevMonth}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 font-headline">
              {prevMonth ? `שכר ${formatMonth(prevMonth)}` : 'חודש קודם'}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-headline text-on-surface">{prevMonth ? fmt(prevTotal) : '—'}</span>
              {prevMonth && <span className="text-sm font-bold text-on-surface-variant/40">&#8362;</span>}
            </div>
            {prevMonth && (
              <p className="text-xs text-on-surface-variant mt-2">
                {commissions.filter(c => c.processingMonth === prevMonth).length} רשומות
              </p>
            )}
          </button>

          {/* Current/Selected Month — expandable */}
          <div className="bg-surface-container-lowest rounded-lg shadow-editorial relative overflow-hidden">
            <div className="absolute -left-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
            {/* Main salary display */}
            <div className="relative z-10 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 font-headline">
                  שכר {formatMonth(selectedMonth)}
                </p>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  aria-label="בחירת חודש"
                  className="text-xs bg-primary-fixed text-primary font-bold px-2 py-1 rounded-full border-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatMonth(m)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-headline text-primary">{fmt(monthTotal)}</span>
                <span className="text-lg font-bold text-primary/40">&#8362;</span>
              </div>
              <p className="text-xs text-on-surface-variant/60 mt-0.5">נטו (ללא סוכנות): {fmt(Math.round(monthTotal * 0.5))}₪</p>
              {prevTotal > 0 && (
                <div className={`mt-2 flex items-center gap-1 font-semibold text-sm ${changePct >= 0 ? 'text-secondary' : 'text-error'}`}>
                  <Icon name={changePct >= 0 ? 'trending_up' : 'trending_down'} size="sm" />
                  <span>{changePct >= 0 ? '+' : ''}{changePct.toFixed(0)}%</span>
                </div>
              )}
              <p className="text-xs text-on-surface-variant mt-1">{filtered.length} רשומות</p>

              {/* Expand/Collapse toggle */}
              <button
                onClick={() => setSalaryExpanded(!salaryExpanded)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-container transition-colors"
                aria-expanded={salaryExpanded}
                aria-label="הצג פירוט שכר"
              >
                <Icon name={salaryExpanded ? 'expand_less' : 'expand_more'} size="sm" />
                {salaryExpanded ? 'הסתר פירוט' : 'הצג פירוט שכר'}
              </button>
            </div>
          </div>

          {/* Prediction */}
          <div className="editorial-gradient rounded-lg p-5 text-white relative overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-3 font-headline">תחזית לחודש הבא</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-headline">{fmt(prediction)}</span>
              <span className="text-lg font-bold text-white/40">&#8362;</span>
            </div>
            <p className="text-xs text-white/60 mt-2">
              {monthlyTotals.length >= 2
                ? `ממוצע משוקלל של ${monthlyTotals.length} חודשים`
                : 'מבוסס על ממוצע חודשי'}
            </p>
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
          </div>
        </div>

        {/* Salary breakdown — shown when expanded, OUTSIDE the grid */}
        {salaryExpanded && breakdownList.length > 0 && (
          <div className="bg-surface-container-lowest rounded-lg p-5 shadow-editorial-sm space-y-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold font-headline text-on-surface">פירוט שכר {formatMonth(selectedMonth)}</span>
              <button onClick={() => setSalaryExpanded(false)} className="text-xs text-primary hover:underline">הסתר</button>
            </div>
            {breakdownList.map(b => (
              <div key={b.type} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    b.type.includes('נפרעים') ? 'bg-primary' :
                    b.type.includes('היקף') ? 'bg-secondary' :
                    b.type.includes('צבירה') ? 'bg-on-tertiary-container' :
                    'bg-on-surface-variant'
                  }`} />
                  <span className="text-sm text-on-surface">{b.type}</span>
                  <span className="text-xs text-on-surface-variant">({b.count})</span>
                </div>
                <span className="font-black text-sm text-primary">{fmt(Math.round(b.total))} &#8362;</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 mt-1" style={{ borderTop: '1px solid rgba(0,6,102,0.08)' }}>
              <span className="text-sm font-bold text-on-surface">סה״כ</span>
              <span className="font-black text-primary">{fmt(monthTotal)} &#8362;</span>
            </div>
            {missingTypes.length > 0 && (
              <div className="mt-2 bg-surface-container rounded-lg px-3 py-2 flex items-start gap-2">
                <Icon name="info" size="sm" className="text-on-surface-variant/50 mt-0.5 shrink-0" />
                <p className="text-[10px] text-on-surface-variant leading-relaxed">
                  חסרים דוחות: {missingTypes.join(', ')}. השכר המוצג חלקי.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Total bar */}
        <div className="bg-secondary-container rounded-lg px-6 py-3 flex justify-between items-center">
          <span className="text-sm font-bold text-on-secondary-container">סה״כ כל החודשים ({availableMonths.length})</span>
          <span className="text-xl font-black font-headline text-on-secondary-container">{fmt(totalAll)} &#8362;</span>
        </div>

        {/* Salary Breakdown by Commission Type */}
        {filtered.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Icon name="pie_chart" size="sm" className="text-primary/60" />
              <h3 className="text-sm font-black font-headline text-on-surface">
                פירוט שכר לפי סוג עמלה — {formatMonth(selectedMonth)}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {COMMISSION_TYPES
                .filter(t => breakdown[t.key])
                .map(t => {
                  const data = breakdown[t.key];
                  return (
                    <div key={t.key} className={`${t.colorBg} rounded-lg p-4`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon name={t.icon} size="sm" className={t.colorIcon} />
                        <span className={`text-sm font-bold ${t.colorText}`}>{t.label}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-xl font-black font-headline ${t.colorText}`}>{fmt(Math.round(data.total))}</span>
                        <span className={`text-sm font-bold ${t.colorText} opacity-40`}>&#8362;</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">{data.count} רשומות</p>
                    </div>
                  );
                })}

              {/* Total card */}
              <div className="bg-surface-container-lowest rounded-lg p-4 shadow-editorial-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="functions" size="sm" className="text-on-surface-variant" />
                  <span className="text-sm font-bold text-on-surface">סה״כ</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black font-headline text-primary">{fmt(monthTotal)}</span>
                  <span className="text-sm font-bold text-primary/40">&#8362;</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">{filtered.length} רשומות</p>
              </div>
            </div>

            {/* Type descriptions */}
            <div className="bg-surface-container-low rounded-lg px-4 py-3">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {COMMISSION_TYPES
                  .filter(t => breakdown[t.key])
                  .map(t => (
                    <p key={t.key} className="text-[11px] text-on-surface-variant">
                      <span className="font-bold">{t.label}</span> — {t.description}
                    </p>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Missing report types warning */}
        {missingTypes.length > 0 && filtered.length > 0 && (
          <div className="bg-tertiary-fixed/30 rounded-lg px-5 py-3 flex items-start gap-3">
            <Icon name="info" size="sm" className="text-on-tertiary-container mt-0.5 shrink-0" />
            <p className="text-sm text-on-tertiary-container">
              <span className="font-bold">שים לב:</span>{' '}
              לא הועלו דוחות {missingTypes.join(' ו')}. השכר המוצג כולל רק {
                Array.from(uploadedTypes).filter(t => ALL_SALARY_TYPES.has(t)).join(' ו') || 'סוגים שהועלו'
              }.
            </p>
          </div>
        )}

        {/* Commissions Table — collapsible */}
        <div className="bg-surface-container-low rounded-lg overflow-hidden">
          <button
            onClick={() => setTableExpanded(!tableExpanded)}
            className="w-full px-6 py-4 flex justify-between items-center bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon name="receipt_long" className="text-primary" />
              <span className="text-base font-black font-headline text-on-surface">
                פירוט עמלות — {formatMonth(selectedMonth)}
              </span>
              <span className="bg-primary-fixed text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">{filtered.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-black text-secondary">{fmt(monthTotal)} &#8362;</span>
              <Icon name={tableExpanded ? 'expand_less' : 'expand_more'} className="text-on-surface-variant" />
            </div>
          </button>

          {tableExpanded && filtered.length > 0 && (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-end text-sm">
                <caption className="sr-only">פירוט עמלות</caption>
                <thead className="sticky top-0 z-10">
                  <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-headline bg-surface-container-low">
                    <th className="px-5 py-3 font-black">לקוח</th>
                    <th className="px-5 py-3 font-black">סוג</th>
                    <th className="px-5 py-3 font-black">ענף</th>
                    <th className="px-5 py-3 font-black">פרמיה</th>
                    <th className="px-5 py-3 font-black">חברה</th>
                    <th className="px-5 py-3 font-black text-start">עמלה</th>
                  </tr>
                </thead>
                <tbody className="bg-surface-container-lowest">
                  {filtered.map(row => (
                    <tr key={row.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-[9px]">{row.clientInitials}</div>
                          <span className="font-medium truncate max-w-[120px]">{row.clientName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">{row.typeHe}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{row.branch || row.productTypeHe}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{(row.premiumAmount ?? 0) > 0 ? `${fmt(row.premiumAmount ?? 0)}₪` : '—'}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{row.insuranceCompany}</td>
                      <td className="px-5 py-3 text-start"><span className="font-black text-secondary">{fmt(row.amount)} &#8362;</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-container-low">
                    <td colSpan={5} className="px-5 py-3 font-bold">סה״כ</td>
                    <td className="px-5 py-3 text-start"><span className="font-black text-primary text-base">{fmt(monthTotal)} &#8362;</span></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {tableExpanded && filtered.length === 0 && (
            <div className="px-6 py-10 text-center space-y-3">
              <Icon name="inbox" size="lg" className="text-on-surface-variant/40 mx-auto" />
              <p className="text-on-surface-variant">אין נתונים לחודש זה</p>
              <button onClick={() => openUpload('sales')} className="text-sm font-bold text-primary hover:underline">
                העלה קבצי מכירות
              </button>
            </div>
          )}
        </div>

        {/* Anomalies / Alerts */}
        {anomalies.length > 0 && (
          <div className="bg-surface-container-low rounded-lg overflow-hidden">
            <button
              onClick={() => setShowAnomalies(!showAnomalies)}
              className="w-full px-6 py-4 bg-surface-container-lowest flex items-center justify-between hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-error-container flex items-center justify-center">
                  <Icon name="notifications_active" size="sm" className="text-error" />
                </div>
                <span className="text-base font-black font-headline text-on-surface">
                  התראות ואי-סדרים
                </span>
                <span className="bg-error text-on-error text-xs font-bold px-2 py-0.5 rounded-full">{anomalies.length}</span>
              </div>
              <Icon name={showAnomalies ? 'expand_less' : 'expand_more'} className="text-on-surface-variant" />
            </button>

            {showAnomalies && (
              <div className="p-4 space-y-3">
                {anomalies.map((alert, i) => (
                  <div
                    key={i}
                    className={`rounded-lg overflow-hidden ${
                      alert.severity === 'high' ? 'bg-error-container/30' :
                      alert.severity === 'medium' ? 'bg-tertiary-fixed/30' :
                      'bg-surface-container-lowest'
                    }`}
                  >
                    <div className="p-4 flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
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
                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{alert.detail}</p>
                      </div>
                    </div>

                    {/* Client details table */}
                    {alert.clients && alert.clients.length > 0 && (
                      <div className="px-4 pb-4">
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
        )}

        {/* Salary History */}
        {monthlyTotals.length > 0 && (
          <div className="bg-surface-container-low rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name="trending_up" className="text-primary" />
                <span className="text-base font-black font-headline text-on-surface">היסטוריית שכר</span>
              </div>
              <button
                onClick={() => setShowNetOfCover(!showNetOfCover)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                  showNetOfCover
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                <Icon name={showNetOfCover ? 'visibility' : 'visibility_off'} size="sm" />
                {showNetOfCover ? 'שכר נטו (ללא סוכנות)' : 'הצג ללא עמלת סוכנות'}
              </button>
            </div>

            {showNetOfCover && (
              <div className="px-6 py-2 bg-primary-fixed/30 flex items-center gap-2">
                <Icon name="info" size="sm" className="text-primary/60" />
                <p className="text-xs text-primary/80">מוצג שכר נטו לאחר ניכוי 50% עמלת סוכנות מהסכום הכולל</p>
              </div>
            )}

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {monthlyTotals.map((item, idx) => {
                const displayTotal = showNetOfCover ? item.total * 0.5 : item.total;
                const prevRaw = idx > 0 ? monthlyTotals[idx - 1].total : null;
                const prevDisplay = prevRaw !== null ? (showNetOfCover ? prevRaw * 0.5 : prevRaw) : null;
                const up = prevDisplay !== null && displayTotal >= prevDisplay;
                const pct = prevDisplay && prevDisplay > 0 ? Math.round(((displayTotal - prevDisplay) / prevDisplay) * 100) : null;
                const isSelected = item.month === selectedMonth;
                return (
                  <button
                    key={item.month}
                    onClick={() => setSelectedMonth(item.month)}
                    className={`rounded-lg p-4 text-start transition-all ${
                      isSelected ? 'bg-primary-fixed shadow-editorial-sm' : 'bg-surface-container-lowest hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-sm">{formatMonth(item.month)}</span>
                      {pct !== null && (
                        <span className={`flex items-center gap-0.5 text-xs font-bold ${up ? 'text-secondary' : 'text-error'}`}>
                          <Icon name={up ? 'arrow_upward' : 'arrow_downward'} size="sm" />
                          {Math.abs(pct)}%
                        </span>
                      )}
                    </div>
                    <span className={`text-xl font-black font-headline ${showNetOfCover ? 'text-secondary' : 'text-primary'}`}>
                      {fmt(Math.round(displayTotal))} &#8362;
                    </span>
                    {showNetOfCover && (
                      <p className="text-[10px] text-on-surface-variant/50 mt-0.5">ברוטו: {fmt(Math.round(item.total))}₪</p>
                    )}
                    <p className="text-xs text-on-surface-variant mt-1">{item.count} רשומות</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <UploadModal open={showUpload} mode={uploadMode} onComplete={handleUploadComplete} onClose={() => setShowUpload(false)} />
    </>
  );
}

/* ─── Upload Modal — supports multiple files before closing ─── */
interface UploadedFile {
  name: string;
  reportType: string;
  records: number;
  status: 'success' | 'error';
  error?: string;
}

function UploadModal({ open, mode, onComplete, onClose }: {
  open: boolean;
  mode: 'agreement' | 'sales';
  onComplete: () => void;
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
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

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setUploadedFiles([]);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const title = mode === 'agreement' ? 'העלאת הסכם עמלות' : 'העלאת קבצי מכירות';
  const SALARY_TYPES = ['nifraim', 'hekef', 'agent_data', 'accumulation_nifraim', 'accumulation_hekef', 'product_distribution', 'branch_distribution'];
  const LABELS: Record<string, string> = { nifraim: 'נפרעים', agent_data: 'רשימת נתונים', product_distribution: 'סיכום מוצרים', branch_distribution: 'התפלגות ענפים', agreement: 'הסכם עמלות', hekef: 'היקף' };

  const totalSaved = uploadedFiles.filter(f => f.status === 'success').reduce((s, f) => s + f.records, 0);

  function handleFinish() {
    if (uploadedFiles.some(f => f.status === 'success')) {
      onComplete(); // reload from DB
    } else {
      onClose();
    }
  }

  async function processFile(file: File) {
    setUploading(true);
    setError(null);

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
        setUploadedFiles(prev => [...prev, { name: file.name, reportType: '?', records: 0, status: 'error', error: json.error }]);
        return;
      }

      const parsed = json.data as Array<{ reportType: string; records: Array<Record<string, unknown>>; errors: unknown[]; detectedCompany?: string }>;
      const isAgreement = json.meta?.isAgreement;

      if (isAgreement) {
        setUploadedFiles(prev => [...prev, { name: file.name, reportType: 'agreement', records: parsed[0]?.records.length || 0, status: 'success' }]);
        return;
      }

      // Determine which types to skip
      const types = parsed.map(r => r.reportType);
      const hasProductDist = types.includes('product_distribution');
      const hasAgentData = types.includes('agent_data');

      for (const result of parsed) {
        if (!SALARY_TYPES.includes(result.reportType)) {
          setUploadedFiles(prev => [...prev, { name: file.name, reportType: result.reportType, records: result.records.length, status: 'success' }]);
          continue;
        }
        if (hasProductDist && hasAgentData && result.reportType === 'agent_data') continue;

        const company = result.detectedCompany || 'הראל';
        const records = result.records
          .filter(r => {
            // Skip records with no month or zero amount
            const month = normalizeMonth((r.processingMonth as string) || '');
            const amount = (r.amount as number) || 0;
            return month !== '' && amount !== 0;
          })
          .map(r => ({
          reportType: (r.reportType as string) || result.reportType,
          processingMonth: normalizeMonth((r.processingMonth as string) || ''),
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
          setUploadedFiles(prev => [...prev, { name: file.name, reportType: result.reportType, records: saved, status: 'success' }]);
        } catch (e) {
          setUploadedFiles(prev => [...prev, { name: file.name, reportType: result.reportType, records: 0, status: 'error', error: String(e) }]);
        }
      }
    } catch {
      setUploadedFiles(prev => [...prev, { name: file.name, reportType: '?', records: 0, status: 'error', error: 'שגיאת חיבור לשרת' }]);
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
          <h2 id="upload-modal-title" className="text-lg font-black font-headline text-white">{title}</h2>
          <button onClick={() => !uploading && handleFinish()} className="text-white/70 hover:text-white" aria-label="סגור"><Icon name="close" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* File input — supports multiple */}
          <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" multiple className="hidden"
            onChange={e => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (files.length > 0) handleMultipleFiles(files);
              if (fileRef.current) fileRef.current.value = '';
            }} />

          {/* Drop zone */}
          <div
            role="button"
            aria-label="גרור קבצים או לחץ לבחירה"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center text-center cursor-pointer group transition-colors ${isDragging ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant hover:bg-primary-fixed/20'}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragging(false);
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) handleMultipleFiles(files);
            }}
            onClick={() => !uploading && fileRef.current?.click()}
          >
            {uploading ? (
              <><div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-3" /><p className="font-bold text-primary">מעבד קבצים...</p></>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="check_circle" className="text-secondary" />
                  <span className="font-bold text-sm">{totalSaved} רשומות נשמרו מ-{uploadedFiles.filter(f => f.status === 'success').length} קבצים</span>
                </div>
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

              {/* Add more files */}
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-2.5 bg-surface-container-high text-on-surface-variant rounded-lg font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Icon name="add" size="sm" />
                העלה קבצים נוספים
              </button>

              {/* Finish button */}
              <button onClick={handleFinish} className="w-full bg-primary-container text-white py-3 rounded-lg font-bold shadow-editorial-btn hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Icon name="dashboard" size="sm" />
                סיימתי — צפה בדשבורד
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
