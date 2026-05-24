import { usePortfolioFilterStore, type PortfolioFilter } from '../../store/portfolioFilterStore';

interface PortfolioFilterToggleProps {
  value?: PortfolioFilter;
  onChange?: (value: PortfolioFilter) => void;
}

const OPTIONS: { value: PortfolioFilter; label: string }[] = [
  { value: 'all', label: 'הכל' },
  { value: 'personal', label: 'תיק אישי' },
  { value: 'partners', label: 'תיק שותפים' },
];

export default function PortfolioFilterToggle({ value: propValue, onChange: propOnChange }: PortfolioFilterToggleProps) {
  const storeFilter = usePortfolioFilterStore((s) => s.portfolioFilter);
  const setStoreFilter = usePortfolioFilterStore((s) => s.setPortfolioFilter);
  const hasMultiplePortfolios = usePortfolioFilterStore((s) => s.hasMultiplePortfolios);

  if (!hasMultiplePortfolios) return null;

  const value = propValue ?? storeFilter;
  const onChange = propOnChange ?? setStoreFilter;

  return (
    <div className="flex items-center gap-1 bg-surface-container-low rounded-lg p-1" role="group" aria-label="סינון תיק">
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={isSelected}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
              isSelected
                ? 'bg-secondary text-on-secondary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function PortfolioFilterBanner({ filter }: { filter: PortfolioFilter }) {
  if (filter === 'all') return null;
  const label = filter === 'personal' ? 'תיק אישי' : 'תיק שותפים';
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary-container/40 rounded-lg text-xs font-semibold text-on-secondary-container w-fit">
      <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
      מציג רק {label}
    </div>
  );
}
