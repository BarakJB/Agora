import { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { useDataStore } from '../../store/dataStore';
import type { PolicyRow } from '../../store/dataStore';

interface NewPolicyModalProps {
  open: boolean;
  onClose: () => void;
}

const productTypes = [
  { value: 'pension', label: 'פנסיה מקיפה' },
  { value: 'managers_insurance', label: 'ביטוח מנהלים' },
  { value: 'life_insurance', label: 'ביטוח חיים' },
  { value: 'health', label: 'ביטוח בריאות' },
  { value: 'education_fund', label: 'קרן השתלמות' },
  { value: 'provident_fund', label: 'קופת גמל' },
  { value: 'general', label: 'ביטוח כללי' },
];

const companies = ['הראל', 'מגדל', 'הפניקס', 'כלל', 'מנורה מבטחים'];

function getInitials(name: string) {
  return name.trim().split(' ').map((w) => w[0] || '').join('').slice(0, 2);
}

export default function NewPolicyModal({ open, onClose }: NewPolicyModalProps) {
  const addPolicy = useDataStore((s) => s.addPolicy);

  const [clientName, setClientName] = useState('');
  const [productType, setProductType] = useState('pension');
  const [company, setCompany] = useState('הראל');
  const [premium, setPremium] = useState('');
  const [commissionPct, setCommissionPct] = useState('15');
  const [recurringPct, setRecurringPct] = useState('2');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setClientName('');
      setProductType('pension');
      setCompany('הראל');
      setPremium('');
      setCommissionPct('15');
      setRecurringPct('2');
    }
  }, [open]);

  // Escape key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const premiumNum = parseFloat(premium) || 0;
  const commNum = parseFloat(commissionPct) || 0;
  const recNum = parseFloat(recurringPct) || 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (premiumNum <= 0) return;

    const typeLabel = productTypes.find((t) => t.value === productType)?.label || productType;

    const policy: PolicyRow = {
      id: crypto.randomUUID(),
      clientName,
      clientInitials: getInitials(clientName),
      productType,
      productTypeHe: typeLabel,
      insuranceCompany: company,
      startDate: new Date().toLocaleDateString('he-IL'),
      premiumAmount: premiumNum,
      commissionPct: commNum,
      recurringPct: recNum,
      commissionAmount: Math.round(premiumNum * (commNum / 100)),
      status: 'active',
    };

    addPolicy(policy);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="הוספת פוליסה חדשה">
      <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-surface-container-lowest rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-[fadeIn_200ms_ease-out]">
        {/* Header */}
        <div className="editorial-gradient p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black font-headline text-white">פוליסה חדשה</h2>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" aria-label="סגור">
              <Icon name="close" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="np-client" className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">שם לקוח</label>
            <input
              id="np-client"
              className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline"
              placeholder="ישראל ישראלי"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="np-type" className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">סוג מוצר</label>
              <select
                id="np-type"
                className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
              >
                {productTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="np-company" className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">חברת ביטוח</label>
              <select
                id="np-company"
                className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              >
                {companies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="np-premium" className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">פרמיה חודשית (&#8362;)</label>
            <input
              id="np-premium"
              className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface placeholder:text-outline"
              placeholder="0"
              type="number"
              min="1"
              step="100"
              value={premium}
              onChange={(e) => setPremium(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="np-comm" className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">עמלה חד-פעמית %</label>
              <input
                id="np-comm"
                className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="np-rec" className="block text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant">עמלה שוטפת %</label>
              <input
                id="np-rec"
                className="w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 text-on-surface"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={recurringPct}
                onChange={(e) => setRecurringPct(e.target.value)}
              />
            </div>
          </div>

          {/* Preview */}
          {premiumNum > 0 && (
            <div className="bg-secondary-container/30 rounded-lg p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">תצוגה מקדימה</p>
              <div className="flex justify-between">
                <span className="text-sm">עמלה חד-פעמית:</span>
                <span className="font-black text-secondary">
                  &#8362;{Math.round(premiumNum * (commNum / 100)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm">עמלה שוטפת (חודשית):</span>
                <span className="font-bold text-primary">
                  &#8362;{Math.round(premiumNum * (recNum / 100)).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-container-high text-on-surface-variant rounded-lg font-semibold hover:opacity-90 transition-all"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-primary-container text-white rounded-lg font-bold shadow-editorial-btn hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Icon name="add" size="sm" />
              הוסף פוליסה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
