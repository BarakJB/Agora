export type TrafficLightLevel = 'green' | 'yellow' | 'red';

export type TrendValue = 'up' | 'stable' | 'down';

export interface LevelColors {
  bg: string;
  text: string;
  border: string;
  ring: string;
  dot: string;
}

// ─── Threshold definitions ────────────────────────────────────

export function evaluateConcentrationTop5(pct: number): TrafficLightLevel {
  if (pct <= 40) return 'green';
  if (pct <= 60) return 'yellow';
  return 'red';
}

export function evaluateAtRiskCount(count: number): TrafficLightLevel {
  if (count === 0) return 'green';
  if (count <= 2) return 'yellow';
  return 'red';
}

export function evaluateMonthlyTrend(trend: TrendValue): TrafficLightLevel {
  if (trend === 'up') return 'green';
  if (trend === 'stable') return 'yellow';
  return 'red';
}

export function evaluateClientProfit(amount: number, agentAverage: number): TrafficLightLevel {
  if (agentAverage <= 0) return 'green';
  const ratio = amount / agentAverage;
  if (ratio < 0.5) return 'red';
  if (ratio < 1.0) return 'yellow';
  return 'green';
}

export function evaluateMonthVsAvg(currentTotal: number, historicalAverage: number): TrafficLightLevel {
  if (historicalAverage <= 0) return 'green';
  const diffPct = ((currentTotal - historicalAverage) / historicalAverage) * 100;
  if (diffPct >= 0) return 'green';
  if (diffPct >= -10) return 'yellow';
  return 'red';
}

export function evaluateUncoveredPct(uncoveredPct: number): TrafficLightLevel {
  if (uncoveredPct <= 30) return 'green';
  if (uncoveredPct <= 50) return 'yellow';
  return 'red';
}

// ─── Colors ───────────────────────────────────────────────────

export function getLevelColors(level: TrafficLightLevel): LevelColors {
  switch (level) {
    case 'green':
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        ring: 'ring-green-300',
        dot: 'bg-green-500',
      };
    case 'yellow':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        ring: 'ring-amber-300',
        dot: 'bg-amber-400',
      };
    case 'red':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        ring: 'ring-red-300',
        dot: 'bg-red-500',
      };
  }
}

// ─── Labels ───────────────────────────────────────────────────

export function getLevelLabel(level: TrafficLightLevel): string {
  switch (level) {
    case 'green':
      return 'מצוין';
    case 'yellow':
      return 'תקין';
    case 'red':
      return 'דורש תשומת לב';
  }
}
