import { getLevelColors, getLevelLabel } from '../../utils/profitThresholds';
import type { TrafficLightLevel } from '../../utils/profitThresholds';

interface TrafficLightDotsProps {
  level: TrafficLightLevel;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showLabel?: boolean;
}

const DOT_SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3.5 h-3.5',
  lg: 'w-4.5 h-4.5',
};

const LEVELS: TrafficLightLevel[] = ['red', 'yellow', 'green'];

const LEVEL_DOT_COLORS: Record<TrafficLightLevel, Record<TrafficLightLevel, string>> = {
  red: {
    red: 'bg-red-500',
    yellow: 'bg-amber-200',
    green: 'bg-green-200',
  },
  yellow: {
    red: 'bg-red-200',
    yellow: 'bg-amber-400',
    green: 'bg-green-200',
  },
  green: {
    red: 'bg-red-200',
    yellow: 'bg-amber-200',
    green: 'bg-green-500',
  },
};

export function TrafficLightDots({ level, size = 'md', label, showLabel = true }: TrafficLightDotsProps) {
  const dotSize = DOT_SIZE[size];
  const displayLabel = label ?? getLevelLabel(level);

  return (
    <div
      className="inline-flex items-center gap-2"
      role="img"
      aria-label={`רמת בריאות: ${displayLabel}`}
    >
      <div className="flex flex-col gap-1">
        {LEVELS.map((l) => (
          <div
            key={l}
            className={`${dotSize} rounded-full transition-all duration-300 ${LEVEL_DOT_COLORS[level][l]} ${level === l ? 'shadow-sm' : 'opacity-40'}`}
          />
        ))}
      </div>
      {showLabel && (
        <span className={`text-xs font-semibold ${getLevelColors(level).text}`}>
          {displayLabel}
        </span>
      )}
    </div>
  );
}

interface TrafficLightPillProps {
  level: TrafficLightLevel;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const PILL_DOT_SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

const PILL_TEXT_SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

export function TrafficLightPill({ level, label, showLabel = true, size = 'md' }: TrafficLightPillProps) {
  const colors = getLevelColors(level);
  const displayLabel = label ?? getLevelLabel(level);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${colors.bg} ${colors.text} ${colors.border} ${PILL_TEXT_SIZE[size]}`}
      role="status"
      aria-label={`רמת בריאות: ${displayLabel}`}
    >
      <span className={`${PILL_DOT_SIZE[size]} rounded-full flex-shrink-0 ${colors.dot}`} aria-hidden="true" />
      {showLabel && displayLabel}
    </span>
  );
}

export default TrafficLightDots;
