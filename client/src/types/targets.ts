export type TargetMetric = 'total' | 'nifraim' | 'hekef' | 'accumulation';
export type TargetPeriod = 'monthly' | 'yearly';

export interface Target {
  id: string;
  metric: TargetMetric;
  period: TargetPeriod;
  targetAmount: number;
}

export interface TargetSuggestion {
  metric: TargetMetric;
  period: TargetPeriod;
  suggestedAmount: number;
  basedOn: string;
}

export interface TargetProgress {
  metric: TargetMetric;
  period: TargetPeriod;
  targetAmount: number;
  currentAmount: number;
  progressPct: number;
}
