import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from './ui/Icon';

const COMPANIES = [
  'הראל', 'כלל', 'מנורה', 'הפניקס', 'מגדל',
  'איילון', 'הכשרה', 'אלטשולר', 'ילין לפידות',
  'מיטב דש', 'אנליסט', 'אקסלנס', 'מור',
] as const;

const PRODUCT_ROWS: Array<{
  product: string;
  commissionType: 'נפרעים' | 'היקף';
  isFixed?: boolean;
  hint?: string;
}> = [
  { product: 'סיכונים',        commissionType: 'נפרעים' },
  { product: 'סיכונים',        commissionType: 'היקף' },
  { product: 'פנסיה',          commissionType: 'נפרעים' },
  { product: 'פנסיה',          commissionType: 'היקף' },
  { product: 'גמל והשתלמות',   commissionType: 'נפרעים' },
  { product: 'גמל והשתלמות',   commissionType: 'היקף', isFixed: true, hint: 'ש"ח למיליון' },
  { product: 'חסכון פרט',      commissionType: 'נפרעים' },
  { product: 'חסכון פרט',      commissionType: 'היקף', isFixed: true, hint: 'ש"ח' },
  { product: 'ניודי פנסיה',    commissionType: 'היקף', isFixed: true, hint: 'ש"ח למיליון' },
];

type RateKey = `${string}|${string}|${string}`;
type RateMap = Map<RateKey, { rate: string; isFixed: boolean }>;

function makeKey(product: string, commissionType: string, company: string): RateKey {
  return `${product}|${commissionType}|${company}` as RateKey;
}

interface RateFromApi {
  insuranceCompanyName: string;
  productType: string;
  commissionType: 'נפרעים' | 'היקף';
  rate: number | null;
  isFixedAmount: boolean;
}

export default function CommissionRatesEditor() {
  const [rates, setRates] = useState<RateMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editingKey, setEditingKey] = useState<RateKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = () => localStorage.getItem('agora-token');

  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/rates', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const map: RateMap = new Map();
      for (const r of (json.data as RateFromApi[])) {
        const key = makeKey(r.productType, r.commissionType, r.insuranceCompanyName);
        map.set(key, {
          rate: r.rate !== null ? String(r.rate) : '',
          isFixed: r.isFixedAmount,
        });
      }
      setRates(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRates(); }, [loadRates]);

  function updateCell(product: string, commissionType: string, company: string, value: string) {
    const key = makeKey(product, commissionType, company);
    const rowDef = PRODUCT_ROWS.find((r) => r.product === product && r.commissionType === commissionType);
    setRates((prev) => {
      const next = new Map(prev);
      next.set(key, { rate: value, isFixed: rowDef?.isFixed ?? false });
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload: Array<{
        company: string;
        productType: string;
        commissionType: 'נפרעים' | 'היקף';
        rate: number | null;
        isFixedAmount: boolean;
      }> = [];

      for (const row of PRODUCT_ROWS) {
        for (const company of COMPANIES) {
          const key = makeKey(row.product, row.commissionType, company);
          const entry = rates.get(key);
          const rawVal = entry?.rate?.trim() ?? '';
          if (!rawVal) continue;
          const num = parseFloat(rawVal);
          if (isNaN(num)) continue;
          payload.push({
            company,
            productType: row.product,
            commissionType: row.commissionType,
            rate: num,
            isFixedAmount: row.isFixed ?? false,
          });
        }
      }

      const res = await fetch('/api/v1/rates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ rates: payload }),
      });

      if (res.ok) {
        setSaveMsg({ ok: true, text: `נשמרו ${payload.length} שיעורי עמלות` });
        await loadRates();
      } else {
        const j = await res.json();
        setSaveMsg({ ok: false, text: j.error || 'שגיאה בשמירה' });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    setSaveMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/v1/rates/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      const json = await res.json();
      if (res.ok) {
        setSaveMsg({ ok: true, text: `נטענו ${json.meta.saved} שיעורי עמלות מהקובץ` });
        await loadRates();
      } else {
        setSaveMsg({ ok: false, text: json.error || 'שגיאה בטעינת הקובץ' });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function downloadTemplate() {
    const a = document.createElement('a');
    a.href = '/api/v1/rates/template';
    a.download = 'agora_commission_template.xlsx';
    a.click();
  }

  const displayRate = (product: string, commissionType: string, company: string) => {
    const key = makeKey(product, commissionType, company);
    const entry = rates.get(key);
    if (!entry || entry.rate === '') return null;
    const num = parseFloat(entry.rate);
    if (isNaN(num)) return null;
    return { num, isFixed: entry.isFixed };
  };

  // Group rows for merged product column
  let prevProduct = '';

  return (
    <section className="col-span-12 bg-surface-container-lowest rounded-xl shadow-editorial overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-on-surface font-headline flex items-center gap-2">
            <Icon name="percent" className="text-primary" />
            שיעורי עמלות לפי מוצר וחברה
          </h3>
          <p className="text-sm text-on-surface-variant mt-0.5">
            לפי מבנה הסכם העמלות — ערכי אחוז (0.005 = 0.5%) או סכום קבוע (₪)
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-high text-on-surface-variant text-sm font-semibold hover:bg-surface-container transition-colors"
          >
            <Icon name="download" size="sm" />
            תבנית ריקה
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-fixed text-primary text-sm font-semibold hover:bg-primary-fixed-dim transition-colors disabled:opacity-50"
          >
            <Icon name="upload_file" size="sm" />
            {uploading ? 'טוען...' : 'העלה הסכם'}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold hover:shadow-md transition-all disabled:opacity-50"
          >
            <Icon name="save" size="sm" />
            {saving ? 'שומר...' : 'שמור'}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>

      {/* Status message */}
      {saveMsg && (
        <div className={`mx-8 mt-4 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
          saveMsg.ok
            ? 'bg-secondary-container text-on-secondary-container'
            : 'bg-error-container text-on-error-container'
        }`}>
          <Icon name={saveMsg.ok ? 'check_circle' : 'error'} size="sm" />
          {saveMsg.text}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm border-collapse" dir="rtl">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="sticky right-0 z-10 bg-surface-container-low px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap border-b border-outline-variant">
                  סוג מוצר
                </th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-on-surface-variant whitespace-nowrap border-b border-outline-variant min-w-[110px]">
                  סוג עמלה
                </th>
                {COMPANIES.map((c) => (
                  <th key={c} className="px-3 py-3 text-center text-xs font-bold text-on-surface-variant whitespace-nowrap border-b border-outline-variant min-w-[80px]">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRODUCT_ROWS.map((row, idx) => {
                const isNewProduct = row.product !== prevProduct;
                prevProduct = row.product;

                return (
                  <tr key={idx} className={`group hover:bg-surface-container/40 transition-colors ${
                    isNewProduct && idx > 0 ? 'border-t-2 border-outline-variant' : ''
                  }`}>
                    {/* Product cell */}
                    <td className="sticky right-0 z-10 bg-surface-container-lowest group-hover:bg-surface-container/40 px-4 py-2.5 font-bold text-on-surface whitespace-nowrap border-b border-outline-variant/30 text-sm">
                      {isNewProduct ? row.product : ''}
                    </td>
                    {/* Commission type */}
                    <td className="px-4 py-2.5 text-on-surface-variant whitespace-nowrap border-b border-outline-variant/30">
                      <span className="flex items-center gap-1.5">
                        {row.commissionType}
                        {row.hint && (
                          <span className="text-[10px] bg-tertiary-container text-on-tertiary-container px-1.5 py-0.5 rounded-full font-semibold">
                            {row.hint}
                          </span>
                        )}
                      </span>
                    </td>
                    {/* Company cells */}
                    {COMPANIES.map((company) => {
                      const key = makeKey(row.product, row.commissionType, company);
                      const isEditing = editingKey === key;
                      const existing = displayRate(row.product, row.commissionType, company);
                      const rawVal = rates.get(key)?.rate ?? '';

                      return (
                        <td key={company} className="px-2 py-1.5 text-center border-b border-outline-variant/30">
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              autoFocus
                              value={rawVal}
                              onChange={(e) => updateCell(row.product, row.commissionType, company, e.target.value)}
                              onBlur={() => setEditingKey(null)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingKey(null); }}
                              className="w-20 text-center bg-primary-fixed rounded px-2 py-1 text-sm font-mono text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                          ) : (
                            <button
                              onClick={() => setEditingKey(key)}
                              className={`w-full min-h-[32px] rounded px-2 py-1 text-xs font-mono transition-colors ${
                                existing
                                  ? 'text-on-surface font-bold hover:bg-primary-fixed'
                                  : 'text-on-surface-variant/30 hover:bg-surface-container-high hover:text-on-surface-variant'
                              }`}
                            >
                              {existing
                                ? (existing.isFixed
                                    ? `₪${existing.num.toLocaleString()}`
                                    : `${(existing.num * 100).toFixed(2)}%`)
                                : '—'}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-8 py-4 bg-surface-container-low/50 text-xs text-on-surface-variant flex items-center gap-2">
        <Icon name="info" size="sm" />
        לחץ על תא לעריכה. ערכי אחוז: הזן כעשרוני (0.005 = 0.5%). ערכי סכום קבוע: הזן בש"ח (6500).
      </div>
    </section>
  );
}
