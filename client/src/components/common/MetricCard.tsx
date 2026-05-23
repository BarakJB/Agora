import Icon from '../ui/Icon';
import { TrafficLightPill } from './TrafficLight';
import type { TrafficLightLevel, TrendValue } from '../../utils/profitThresholds';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  level?: TrafficLightLevel;
  trend?: TrendValue;
  icon?: string;
}

const TREND_ICON: Record<TrendValue, string> = {
  up: 'trending_up',
  stable: 'trending_flat',
  down: 'trending_down',
};

const TREND_COLOR: Record<TrendValue, string> = {
  up: 'text-secondary',
  stable: 'text-on-surface-variant',
  down: 'text-error',
};

export function MetricCard({ title, value, subtitle, level, trend, icon }: MetricCardProps) {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-4 border border-outline-variant/30 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center">
              <Icon name={icon} className="text-primary" size="sm" />
            </div>
          )}
          <span className="text-xs font-medium text-on-surface-variant">{title}</span>
        </div>
        {level && <TrafficLightPill level={level} size="sm" />}
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className="text-xl font-black font-headline text-on-surface">{value}</p>
        {trend && (
          <div
            className={`flex items-center gap-0.5 text-xs font-semibold ${TREND_COLOR[trend]}`}
            aria-label={`מגמה: ${trend === 'up' ? 'עולה' : trend === 'down' ? 'יורדת' : 'יציבה'}`}
          >
            <Icon name={TREND_ICON[trend]} size="sm" />
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-[10px] text-on-surface-variant/60 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

export default MetricCard;
