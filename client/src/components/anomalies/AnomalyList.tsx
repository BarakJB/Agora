import Icon from '../ui/Icon';
import AnomalyCard from './AnomalyCard';
import { anomalyKey } from '../../utils/anomalies';
import type { Anomaly } from '../../utils/anomalies';

interface AnomalyListProps {
  anomalies: Anomaly[];
  emptyMessage?: string;
  onAnomalyClick?: (anomaly: Anomaly) => void;
  onAssignmentDone?: () => void;
}

const SEVERITY_ORDER: Record<Anomaly['severity'], number> = { high: 0, medium: 1, low: 2 };
const SEVERITY_LABELS: Record<Anomaly['severity'], string> = { high: 'חמורות', medium: 'בינוניות', low: 'קלות' };
const SEVERITY_COUNTER_COLOR: Record<Anomaly['severity'], string> = {
  high: 'bg-[#B91C1C] text-white',
  medium: 'bg-[#D97706] text-white',
  low: 'bg-[#CA8A04] text-white',
};

export default function AnomalyList({ anomalies, emptyMessage, onAnomalyClick, onAssignmentDone }: AnomalyListProps) {
  if (anomalies.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-lg py-14 flex flex-col items-center gap-4 border border-outline-variant/20">
        <div className="w-14 h-14 bg-secondary-container/30 rounded-full flex items-center justify-center">
          <Icon name="check_circle" size="lg" className="text-secondary" />
        </div>
        <p className="font-bold text-on-surface text-base">הכל תקין!</p>
        <p className="text-on-surface-variant text-sm">{emptyMessage ?? 'לא זוהו חריגות'}</p>
      </div>
    );
  }

  const grouped = anomalies.reduce<Record<Anomaly['severity'], Anomaly[]>>(
    (acc, a) => { acc[a.severity].push(a); return acc; },
    { high: [], medium: [], low: [] },
  );

  const severityGroups = (['high', 'medium', 'low'] as Anomaly['severity'][]).filter(
    (s) => grouped[s].length > 0,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        {severityGroups.map((s) => (
          <span key={s} className={`text-xs font-bold px-2.5 py-1 rounded-full ${SEVERITY_COUNTER_COLOR[s]}`}>
            {grouped[s].length} {SEVERITY_LABELS[s]}
          </span>
        ))}
      </div>

      {severityGroups.map((severity) => (
        <div key={severity} className="space-y-2">
          <div className="space-y-2">
            {grouped[severity].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]).map((a, i) => (
              <AnomalyCard
                key={anomalyKey(a, i)}
                anomaly={a}
                onClick={onAnomalyClick ? () => onAnomalyClick(a) : undefined}
                onAssignmentDone={onAssignmentDone}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
