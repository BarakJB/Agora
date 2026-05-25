import { usePortfolioFilterStore, type PortfolioFilter } from '../../store/portfolioFilterStore';
import type { AgentNumber } from '../../services/api';

interface PortfolioFilterToggleProps {
  value?: PortfolioFilter;
  onChange?: (value: PortfolioFilter) => void;
}

const PORTFOLIO_TYPE_LABEL: Record<AgentNumber['portfolioType'], string> = {
  personal: 'אישי',
  partners: 'שותפים',
};

function truncateNumber(num: string): string {
  return num.length > 6 ? `${num.slice(0, 2)}...${num.slice(-2)}` : num;
}

function buildPortfolioLabel(numbers: AgentNumber[], type: AgentNumber['portfolioType']): string {
  const matches = numbers.filter((n) => n.portfolioType === type);
  if (matches.length === 0) return PORTFOLIO_TYPE_LABEL[type];

  const shortNumbers = matches.map((n) => truncateNumber(n.companyAgentNumber)).join(', ');
  return `${shortNumbers} - ${PORTFOLIO_TYPE_LABEL[type]}`;
}

function buildPortfolioTitle(numbers: AgentNumber[], type: AgentNumber['portfolioType']): string {
  const matches = numbers.filter((n) => n.portfolioType === type);
  if (matches.length === 0) return PORTFOLIO_TYPE_LABEL[type];

  return matches.map((n) => `${n.companyAgentNumber} (${n.insuranceCompanyName})`).join(', ') + ` - ${PORTFOLIO_TYPE_LABEL[type]}`;
}

export default function PortfolioFilterToggle({ value: propValue, onChange: propOnChange }: PortfolioFilterToggleProps) {
  const storeFilter = usePortfolioFilterStore((s) => s.portfolioFilter);
  const setStoreFilter = usePortfolioFilterStore((s) => s.setPortfolioFilter);
  const hasMultiplePortfolios = usePortfolioFilterStore((s) => s.hasMultiplePortfolios);
  const agentNumbers = usePortfolioFilterStore((s) => s.agentNumbers);

  if (!hasMultiplePortfolios) return null;

  const value = propValue ?? storeFilter;
  const onChange = propOnChange ?? setStoreFilter;

  const options: { value: PortfolioFilter; label: string; title: string }[] = [
    { value: 'all', label: 'הכל', title: 'כל הפורטפוליו' },
    {
      value: 'personal',
      label: buildPortfolioLabel(agentNumbers, 'personal'),
      title: buildPortfolioTitle(agentNumbers, 'personal'),
    },
    {
      value: 'partners',
      label: buildPortfolioLabel(agentNumbers, 'partners'),
      title: buildPortfolioTitle(agentNumbers, 'partners'),
    },
  ];

  return (
    <div
      className="flex items-center gap-1 bg-surface-container-low rounded-lg p-1"
      role="group"
      aria-label="סינון תיק"
      dir="rtl"
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={isSelected}
            title={opt.title}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${
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
