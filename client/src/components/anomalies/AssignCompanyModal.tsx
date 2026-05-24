import { useState, useEffect, useCallback } from 'react';
import Icon from '../ui/Icon';
import CompanyLogo from '../common/CompanyLogo';
import { salesApi } from '../../services/api';
import type { InsuranceCompanyCode } from '../../services/api';
import { getCompanyDisplay } from '../../utils/insuranceCompanies';

interface AnomalyClient {
  name: string;
  id: string;
  policyNumber?: string;
}

interface AssignCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssigned: (company: string) => void;
  anomalyClient: AnomalyClient;
}

const COMPANIES: InsuranceCompanyCode[] = [
  'harel',
  'phoenix',
  'menora',
  'analyst',
  'migdal',
  'clal',
  'hachshara',
  'altshuler',
  'meitav',
  'psagot',
  'yashir',
];

export default function AssignCompanyModal({
  isOpen,
  onClose,
  onAssigned,
  anomalyClient,
}: AssignCompanyModalProps) {
  const [loading, setLoading] = useState<InsuranceCompanyCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(null);
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  async function handleSelect(company: InsuranceCompanyCode) {
    if (loading) return;
    setLoading(company);
    setError(null);
    try {
      await salesApi.assignCompany({
        insuredId: anomalyClient.id || undefined,
        policyNumber: anomalyClient.policyNumber || undefined,
        insuranceCompany: company,
      });
      onAssigned(company);
      onClose();
    } catch {
      setError('שגיאה בשיוך החברה. נסה שוב.');
      setLoading(null);
    }
  }

  const clientLabel = anomalyClient.policyNumber
    ? `פוליסה ${anomalyClient.policyNumber} — ${anomalyClient.name}`
    : anomalyClient.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="שיוך לחברת ביטוח"
      dir="rtl"
    >
      <div
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-surface-container-lowest rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-[fadeIn_200ms_ease-out]">
        <div className="editorial-gradient p-5 rounded-t-lg">
          <div className="flex justify-between items-start gap-3">
            <div>
              <h2 className="text-lg font-black font-headline text-white">שיוך לחברת ביטוח</h2>
              <p className="text-white/70 text-xs mt-0.5">{clientLabel}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors shrink-0"
              aria-label="סגור"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 bg-error-container/30 text-error text-sm rounded-lg px-4 py-3 flex items-center gap-2">
              <Icon name="error_outline" size="sm" />
              {error}
            </div>
          )}

          <p className="text-xs text-on-surface-variant mb-4">בחר את חברת הביטוח המתאימה לשורה זו:</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COMPANIES.map((code) => {
              const display = getCompanyDisplay(code);
              const isLoading = loading === code;
              return (
                <button
                  key={code}
                  onClick={() => handleSelect(code)}
                  disabled={loading !== null}
                  aria-label={`שייך ל${display.name}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-outline-variant/30 bg-surface-container hover:bg-surface-container-high hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  ) : (
                    <CompanyLogo company={code} size="md" />
                  )}
                  <span className="text-xs font-semibold text-on-surface text-center leading-tight">
                    {display.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
