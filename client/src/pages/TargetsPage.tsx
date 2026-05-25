import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { targetsApi } from '../services/api';
import type { Target, TargetMetric, TargetPeriod, TargetSuggestion } from '../types/targets';

const METRIC_LABELS: Record<TargetMetric, string> = {
  total: 'סה"כ ברוטו',
  nifraim: 'נפרעים',
  hekef: 'היקף',
  accumulation: 'צבירה',
};

const METRIC_ICONS: Record<TargetMetric, string> = {
  total: 'emoji_events',
  nifraim: 'autorenew',
  hekef: 'bolt',
  accumulation: 'savings',
};

const METRICS: TargetMetric[] = ['total', 'nifraim', 'hekef', 'accumulation'];

function fmt(n: number): string {
  return n.toLocaleString('he-IL');
}

interface RowEditState {
  inputValue: string;
  saving: boolean;
  deleting: boolean;
  error: string | null;
}

type EditMap = Partial<Record<`${TargetMetric}-${TargetPeriod}`, RowEditState>>;

function rowKey(metric: TargetMetric, period: TargetPeriod): `${TargetMetric}-${TargetPeriod}` {
  return `${metric}-${period}`;
}

function progressColor(pct: number): string {
  if (pct >= 100) return 'bg-secondary';
  if (pct >= 70) return 'bg-primary-fixed-dim';
  if (pct >= 40) return 'bg-amber-400';
  return 'bg-error';
}

function progressTextColor(pct: number): string {
  if (pct >= 100) return 'text-secondary';
  if (pct >= 70) return 'text-primary';
  if (pct >= 40) return 'text-amber-600';
  return 'text-error';
}

interface ToastMessage {
  id: number;
  text: string;
}

interface TargetCardProps {
  metric: TargetMetric;
  period: TargetPeriod;
  existing: Target | undefined;
  suggestion: TargetSuggestion | undefined;
  isEditing: boolean;
  editState: RowEditState | undefined;
  onEnterEdit: () => void;
  onCancelEdit: () => void;
  onInput: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onUseSuggestion: () => void;
}

function TargetCard({
  metric,
  period,
  existing,
  suggestion,
  isEditing,
  editState,
  onEnterEdit,
  onCancelEdit,
  onInput,
  onSave,
  onDelete,
  onUseSuggestion,
}: TargetCardProps) {
  const periodLabel = period === 'monthly' ? 'חודשי' : 'שנתי';
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancelEdit();
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    }
  };

  const parsedValue =
    editState ? parseInt(editState.inputValue.replace(/[^\d]/g, ''), 10) : NaN;
  const isValid = !isNaN(parsedValue) && parsedValue > 0;

  const hasExisting = Boolean(existing);
  const isEmpty = !hasExisting && !isEditing;

  return (
    <div
      className={[
        'rounded-xl border transition-all duration-200 flex flex-col',
        isEditing
          ? 'bg-surface-container-lowest border-primary/40 shadow-editorial ring-1 ring-primary/20 p-5'
          : isEmpty
          ? 'bg-surface-container-lowest border-outline-variant/20 opacity-60 cursor-pointer hover:opacity-90 hover:border-outline-variant/40 p-5'
          : 'bg-surface-container-lowest border-outline-variant/30 hover:shadow-editorial-sm p-5',
      ].join(' ')}
      onClick={isEmpty && !isEditing ? onEnterEdit : undefined}
      role={isEmpty ? 'button' : undefined}
      tabIndex={isEmpty ? 0 : undefined}
      onKeyDown={isEmpty ? (e) => { if (e.key === 'Enter' || e.key === ' ') onEnterEdit(); } : undefined}
      aria-label={isEmpty ? `הגדר יעד ${periodLabel} עבור ${METRIC_LABELS[metric]}` : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center flex-shrink-0">
            <Icon name={METRIC_ICONS[metric]} className="text-primary" size="sm" />
          </div>
          <div>
            <p className="font-bold text-sm text-on-surface">{METRIC_LABELS[metric]}</p>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">
              {periodLabel}
            </p>
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onEnterEdit(); }}
            aria-label={`ערוך יעד ${periodLabel} עבור ${METRIC_LABELS[metric]}`}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-primary-fixed hover:text-primary transition-colors flex-shrink-0"
          >
            <Icon name="edit" size="sm" />
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="flex-1 flex flex-col gap-3">
          {existing ? (
            <>
              <p className="text-2xl font-black font-headline text-on-surface leading-none">
                {fmt(existing.targetAmount)}
                <span className="text-sm font-normal text-on-surface-variant mr-1">₪</span>
              </p>
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressColor(0)}`}
                    style={{ width: '0%' }}
                    role="progressbar"
                    aria-valuenow={0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`התקדמות: 0% מהיעד`}
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  <span className={`font-bold ${progressTextColor(0)}`}>0%</span>
                  {' '}מהיעד
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-2 text-center gap-1">
              <Icon name="add_circle" size="md" className="text-on-surface-variant/30" />
              <p className="text-xs text-on-surface-variant/60">לא הוגדר יעד</p>
              {suggestion && (
                <p className="text-[11px] text-primary/70 font-medium">
                  הצעה: {fmt(suggestion.suggestedAmount)}₪
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={editState?.inputValue ?? ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '');
                onInput(raw);
              }}
              onKeyDown={handleKeyDown}
              placeholder="הכנס סכום יעד"
              aria-label={`סכום יעד ${periodLabel} עבור ${METRIC_LABELS[metric]}`}
              className="w-full bg-surface-container rounded-lg px-3 py-3 text-lg font-black font-headline text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all ps-10"
            />
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm font-bold text-on-surface-variant/60">
              ₪
            </span>
          </div>

          {editState?.error && (
            <p className="text-xs text-error flex items-center gap-1">
              <Icon name="error" size="sm" />
              {editState.error}
            </p>
          )}

          {suggestion && (
            <div className="bg-secondary-fixed/40 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-on-surface-variant leading-relaxed flex-1">
                הצעה:{' '}
                <span className="font-bold text-on-surface">{fmt(suggestion.suggestedAmount)}₪</span>
                <span className="text-on-surface-variant/60"> — {suggestion.basedOn}</span>
              </p>
              <button
                onClick={onUseSuggestion}
                className="text-[11px] font-bold text-primary hover:underline flex-shrink-0 flex items-center gap-1"
                aria-label={`השתמש בהמלצה ${fmt(suggestion.suggestedAmount)}₪ ל${METRIC_LABELS[metric]} ${periodLabel}`}
              >
                <Icon name="auto_awesome" size="sm" />
                השתמש
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onSave}
              disabled={!isValid || editState?.saving}
              className="flex-1 bg-primary-container text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {editState?.saving ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Icon name="save" size="sm" />
              )}
              שמור
            </button>

            <button
              onClick={onCancelEdit}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              ביטול
            </button>

            {hasExisting && (
              <button
                onClick={onDelete}
                disabled={editState?.deleting}
                aria-label={`מחק יעד ${periodLabel} עבור ${METRIC_LABELS[metric]}`}
                className="w-9 h-9 rounded-lg bg-error-container/30 text-error flex items-center justify-center flex-shrink-0 hover:bg-error-container/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {editState?.deleting ? (
                  <span className="w-4 h-4 rounded-full border-2 border-error/30 border-t-error animate-spin" />
                ) : (
                  <Icon name="delete" size="sm" />
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PeriodSectionProps {
  period: TargetPeriod;
  targets: Target[];
  suggestions: TargetSuggestion[];
  editMap: EditMap;
  editingAll: boolean;
  onEnterEdit: (metric: TargetMetric) => void;
  onCancelEdit: (metric: TargetMetric) => void;
  onInput: (metric: TargetMetric, value: string) => void;
  onSave: (metric: TargetMetric, period: TargetPeriod) => void;
  onDelete: (metric: TargetMetric, period: TargetPeriod) => void;
  onUseSuggestion: (metric: TargetMetric, period: TargetPeriod) => void;
}

function PeriodSection({
  period,
  targets,
  suggestions,
  editMap,
  onEnterEdit,
  onCancelEdit,
  onInput,
  onSave,
  onDelete,
  onUseSuggestion,
}: PeriodSectionProps) {
  const title = period === 'monthly' ? 'יעדים חודשיים' : 'יעדים שנתיים';
  const icon = period === 'monthly' ? 'calendar_month' : 'event_repeat';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center">
          <Icon name={icon} className="text-primary" size="sm" />
        </div>
        <h3 className="text-base font-black font-headline text-on-surface">{title}</h3>
        <div className="flex-1 h-px bg-outline-variant/20" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {METRICS.map((metric) => {
          const key = rowKey(metric, period);
          const isEditing = Boolean(editMap[key]);
          return (
            <TargetCard
              key={key}
              metric={metric}
              period={period}
              existing={targets.find(t => t.metric === metric && t.period === period)}
              suggestion={suggestions.find(s => s.metric === metric && s.period === period)}
              isEditing={isEditing}
              editState={editMap[key]}
              onEnterEdit={() => onEnterEdit(metric)}
              onCancelEdit={() => onCancelEdit(metric)}
              onInput={(value) => onInput(metric, value)}
              onSave={() => onSave(metric, period)}
              onDelete={() => onDelete(metric, period)}
              onUseSuggestion={() => onUseSuggestion(metric, period)}
            />
          );
        })}
      </div>
    </div>
  );
}

let toastCounter = 0;

export default function TargetsPage() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState<Target[]>([]);
  const [suggestions, setSuggestions] = useState<TargetSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [editMap, setEditMap] = useState<EditMap>({});
  const [bulkCreating, setBulkCreating] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const announce = (msg: string) => {
    setLiveMessage('');
    setTimeout(() => setLiveMessage(msg), 50);
  };

  const pushToast = (text: string) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [targetsRes, suggestionsRes] = await Promise.all([
        targetsApi.list(),
        targetsApi.getSuggestions(),
      ]);
      const loadedTargets = targetsRes.data ?? [];
      const loadedSuggestions = suggestionsRes.data ?? [];
      setTargets(loadedTargets);
      setSuggestions(loadedSuggestions);
    } catch {
      setPageError('שגיאה בטעינת היעדים. נסה שוב.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function enterEdit(metric: TargetMetric, period: TargetPeriod) {
    const existing = targets.find(t => t.metric === metric && t.period === period);
    const suggestion = suggestions.find(s => s.metric === metric && s.period === period);
    const defaultValue = existing
      ? String(existing.targetAmount)
      : suggestion
      ? String(suggestion.suggestedAmount)
      : '';
    setEditMap(prev => ({
      ...prev,
      [rowKey(metric, period)]: {
        inputValue: defaultValue,
        saving: false,
        deleting: false,
        error: null,
      },
    }));
  }

  function cancelEdit(metric: TargetMetric, period: TargetPeriod) {
    setEditMap(prev => {
      const next = { ...prev };
      delete next[rowKey(metric, period)];
      return next;
    });
  }

  function handleInput(metric: TargetMetric, period: TargetPeriod, value: string) {
    setEditMap(prev => {
      const key = rowKey(metric, period);
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: { ...current, inputValue: value, error: null },
      };
    });
  }

  async function handleSave(metric: TargetMetric, period: TargetPeriod) {
    const key = rowKey(metric, period);
    const current = editMap[key];
    if (!current) return;

    const raw = current.inputValue.replace(/[^\d]/g, '');
    const amount = parseInt(raw, 10);

    if (isNaN(amount) || amount <= 0) {
      setEditMap(prev => ({
        ...prev,
        [key]: { ...prev[key]!, error: 'יש להזין סכום גדול מ-0' },
      }));
      return;
    }

    setEditMap(prev => ({ ...prev, [key]: { ...prev[key]!, saving: true, error: null } }));

    try {
      const res = await targetsApi.upsert({ metric, period, targetAmount: amount });
      const saved = res.data!;
      setTargets(prev => {
        const filtered = prev.filter(t => !(t.metric === metric && t.period === period));
        return [...filtered, saved];
      });
      setEditMap(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      const periodLabel = period === 'monthly' ? 'חודשי' : 'שנתי';
      pushToast(`יעד ${periodLabel} עבור ${METRIC_LABELS[metric]} נשמר`);
      announce(`יעד ${METRIC_LABELS[metric]} נשמר בהצלחה`);
    } catch {
      setEditMap(prev => ({
        ...prev,
        [key]: { ...prev[key]!, saving: false, error: 'שגיאה בשמירה' },
      }));
    }
  }

  async function handleDelete(metric: TargetMetric, period: TargetPeriod) {
    const key = rowKey(metric, period);
    setEditMap(prev => ({ ...prev, [key]: { ...prev[key]!, deleting: true, error: null } }));

    try {
      await targetsApi.delete(metric, period);
      setTargets(prev => prev.filter(t => !(t.metric === metric && t.period === period)));
      setEditMap(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      announce(`יעד ${METRIC_LABELS[metric]} נמחק`);
    } catch {
      setEditMap(prev => ({
        ...prev,
        [key]: { ...prev[key]!, deleting: false, error: 'שגיאה במחיקה' },
      }));
    }
  }

  function handleUseSuggestion(metric: TargetMetric, period: TargetPeriod) {
    const suggestion = suggestions.find(s => s.metric === metric && s.period === period);
    if (!suggestion) return;
    setEditMap(prev => {
      const key = rowKey(metric, period);
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: { ...current, inputValue: String(suggestion.suggestedAmount), error: null },
      };
    });
  }

  function handleEditAll() {
    const next: EditMap = {};
    for (const metric of METRICS) {
      for (const period of ['monthly', 'yearly'] as TargetPeriod[]) {
        const key = rowKey(metric, period);
        if (!editMap[key]) {
          const existing = targets.find(t => t.metric === metric && t.period === period);
          const suggestion = suggestions.find(s => s.metric === metric && s.period === period);
          next[key] = {
            inputValue: existing
              ? String(existing.targetAmount)
              : suggestion
              ? String(suggestion.suggestedAmount)
              : '',
            saving: false,
            deleting: false,
            error: null,
          };
        }
      }
    }
    setEditMap(prev => ({ ...prev, ...next }));
  }

  function handleCancelAll() {
    setEditMap({});
  }

  async function handleBulkCreate() {
    if (suggestions.length === 0) return;
    setBulkCreating(true);
    try {
      const results = await Promise.allSettled(
        suggestions.map(s =>
          targetsApi.upsert({ metric: s.metric, period: s.period, targetAmount: s.suggestedAmount })
        )
      );
      const saved: Target[] = [];
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.data) saved.push(r.value.data);
      });
      setTargets(saved);
      pushToast('כל היעדים המומלצים נוצרו בהצלחה');
      announce('כל היעדים המומלצים נוצרו בהצלחה');
    } catch {
      setPageError('שגיאה ביצירת יעדים אוטומטית');
    } finally {
      setBulkCreating(false);
    }
  }

  const isAnyEditing = Object.keys(editMap).length > 0;
  const hasNoTargets = targets.length === 0;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (pageError && targets.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Icon name="cloud_off" size="xl" className="text-error/40" />
          <p className="font-bold">{pageError}</p>
          <button
            onClick={load}
            className="bg-primary-container text-white px-6 py-2 rounded-lg font-semibold text-sm"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8" dir="rtl">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>

      <section className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black font-headline text-on-surface tracking-tight mb-1">
            יעדי סוכן
          </h2>
          <p className="text-on-surface-variant">הגדר יעדים חודשיים ושנתיים ועקוב אחרי ההתקדמות</p>
        </div>
        <div className="flex items-center gap-2 self-start flex-wrap">
          {!hasNoTargets && (
            isAnyEditing ? (
              <button
                onClick={handleCancelAll}
                className="flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant border border-outline-variant/40 px-3 py-2 rounded-lg hover:bg-surface-container transition-colors"
              >
                <Icon name="close" size="sm" />
                סיום עריכה
              </button>
            ) : (
              <button
                onClick={handleEditAll}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary border border-primary/30 bg-primary-fixed/30 px-3 py-2 rounded-lg hover:bg-primary-fixed/50 transition-colors"
                aria-label="ערוך את כל היעדים"
              >
                <Icon name="edit_note" size="sm" />
                ערוך הכל
              </button>
            )
          )}
          {hasNoTargets && suggestions.length > 0 && (
            <button
              onClick={handleBulkCreate}
              disabled={bulkCreating}
              className="flex items-center gap-1.5 text-sm font-semibold editorial-gradient text-white px-4 py-2 rounded-lg shadow-editorial-btn hover:opacity-95 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="צור יעדים מומלצים אוטומטית"
            >
              {bulkCreating ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Icon name="auto_awesome" size="sm" />
              )}
              {bulkCreating ? 'יוצר...' : 'צור יעדים אוטומטית'}
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            aria-label="חזרה לדשבורד"
          >
            <Icon name="arrow_back" size="sm" />
            דשבורד
          </button>
        </div>
      </section>

      {hasNoTargets ? (
        <EmptyState
          suggestions={suggestions}
          bulkCreating={bulkCreating}
          onBulkCreate={handleBulkCreate}
          onEnterEdit={(metric, period) => enterEdit(metric, period)}
          editMap={editMap}
          targets={targets}
          onCancelEdit={cancelEdit}
          onInput={handleInput}
          onSave={handleSave}
          onDelete={handleDelete}
          onUseSuggestion={handleUseSuggestion}
        />
      ) : (
        <div className="space-y-10">
          <PeriodSection
            period="monthly"
            targets={targets}
            suggestions={suggestions}
            editMap={editMap}
            editingAll={isAnyEditing}
            onEnterEdit={(metric) => enterEdit(metric, 'monthly')}
            onCancelEdit={(metric) => cancelEdit(metric, 'monthly')}
            onInput={(metric, value) => handleInput(metric, 'monthly', value)}
            onSave={handleSave}
            onDelete={handleDelete}
            onUseSuggestion={handleUseSuggestion}
          />

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent" />
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/20">
              <Icon name="event_repeat" size="sm" className="text-primary/50" />
              <span className="text-xs font-semibold text-on-surface-variant">יעדים שנתיים</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-outline-variant/30 to-transparent" />
          </div>

          <PeriodSection
            period="yearly"
            targets={targets}
            suggestions={suggestions}
            editMap={editMap}
            editingAll={isAnyEditing}
            onEnterEdit={(metric) => enterEdit(metric, 'yearly')}
            onCancelEdit={(metric) => cancelEdit(metric, 'yearly')}
            onInput={(metric, value) => handleInput(metric, 'yearly', value)}
            onSave={handleSave}
            onDelete={handleDelete}
            onUseSuggestion={handleUseSuggestion}
          />
        </div>
      )}

      <div
        className="fixed bottom-6 start-1/2 -translate-x-1/2 flex flex-col gap-2 pointer-events-none z-50"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="bg-inverse-surface text-inverse-on-surface px-4 py-2.5 rounded-lg shadow-editorial text-sm font-semibold flex items-center gap-2 animate-fade-in pointer-events-auto"
          >
            <Icon name="check_circle" size="sm" className="text-secondary-fixed-dim" />
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  suggestions: TargetSuggestion[];
  bulkCreating: boolean;
  onBulkCreate: () => void;
  onEnterEdit: (metric: TargetMetric, period: TargetPeriod) => void;
  editMap: EditMap;
  targets: Target[];
  onCancelEdit: (metric: TargetMetric, period: TargetPeriod) => void;
  onInput: (metric: TargetMetric, period: TargetPeriod, value: string) => void;
  onSave: (metric: TargetMetric, period: TargetPeriod) => void;
  onDelete: (metric: TargetMetric, period: TargetPeriod) => void;
  onUseSuggestion: (metric: TargetMetric, period: TargetPeriod) => void;
}

function EmptyState({
  suggestions,
  bulkCreating,
  onBulkCreate,
  onEnterEdit,
  editMap,
  targets,
  onCancelEdit,
  onInput,
  onSave,
  onDelete,
  onUseSuggestion,
}: EmptyStateProps) {
  const hasAnyEditing = Object.keys(editMap).length > 0;

  if (hasAnyEditing) {
    return (
      <div className="space-y-10">
        <PeriodSection
          period="monthly"
          targets={targets}
          suggestions={suggestions}
          editMap={editMap}
          editingAll={true}
          onEnterEdit={(metric) => onEnterEdit(metric, 'monthly')}
          onCancelEdit={(metric) => onCancelEdit(metric, 'monthly')}
          onInput={(metric, value) => onInput(metric, 'monthly', value)}
          onSave={onSave}
          onDelete={onDelete}
          onUseSuggestion={onUseSuggestion}
        />
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/20">
            <Icon name="event_repeat" size="sm" className="text-primary/50" />
            <span className="text-xs font-semibold text-on-surface-variant">יעדים שנתיים</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-outline-variant/30 to-transparent" />
        </div>
        <PeriodSection
          period="yearly"
          targets={targets}
          suggestions={suggestions}
          editMap={editMap}
          editingAll={true}
          onEnterEdit={(metric) => onEnterEdit(metric, 'yearly')}
          onCancelEdit={(metric) => onCancelEdit(metric, 'yearly')}
          onInput={(metric, value) => onInput(metric, 'yearly', value)}
          onSave={onSave}
          onDelete={onDelete}
          onUseSuggestion={onUseSuggestion}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-primary-fixed rounded-full flex items-center justify-center">
          <Icon name="flag" size="lg" className="text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-black font-headline text-on-surface mb-2">
            טרם הגדרת יעדים
          </h3>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            הגדרת יעדים עוזרת לך לעקוב אחרי הביצועים ולדעת איפה אתה עומד בכל חודש ושנה.
          </p>
        </div>
        {suggestions.length > 0 && (
          <button
            onClick={onBulkCreate}
            disabled={bulkCreating}
            className="w-full editorial-gradient text-white font-bold py-4 rounded-lg shadow-editorial-btn hover:opacity-95 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="צור יעדים מומלצים אוטומטית"
          >
            {bulkCreating ? (
              <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Icon name="auto_awesome" />
            )}
            {bulkCreating ? 'יוצר יעדים...' : 'צור יעדים מומלצים אוטומטית'}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          {METRICS.map(metric => (
            <button
              key={metric}
              onClick={() => onEnterEdit(metric, 'monthly')}
              className="flex items-center gap-2 p-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest hover:border-primary/30 hover:bg-primary-fixed/20 transition-all text-start"
              aria-label={`הגדר יעד חודשי עבור ${METRIC_LABELS[metric]}`}
            >
              <div className="w-7 h-7 rounded-md bg-primary-fixed flex items-center justify-center flex-shrink-0">
                <Icon name={METRIC_ICONS[metric]} className="text-primary" size="sm" />
              </div>
              <span className="text-xs font-semibold text-on-surface-variant">{METRIC_LABELS[metric]}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-on-surface-variant/60">
          היעדים מבוססים על הנתונים ההיסטוריים שלך
        </p>
      </div>
    </div>
  );
}
