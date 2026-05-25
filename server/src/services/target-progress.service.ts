import type { RowDataPacket } from 'mysql2';
import pool from '../config/database.js';
import { getTargets } from '../repositories/targets.repository.js';
import type { TargetMetric, TargetPeriod } from '../repositories/targets.repository.js';

const POLICY_REPORT_TYPES = `('nifraim','hekef','accumulation_nifraim','accumulation_hekef')`;

export interface TargetProgress {
  metric: TargetMetric;
  period: TargetPeriod;
  targetAmount: number;
  currentAmount: number;
  progressPct: number;
}

function resolveCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function fetchMonthlyMetric(agentId: string, month: string, metric: TargetMetric): Promise<number> {
  if (metric === 'total') {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ROUND(SUM(commission_amount), 2) AS amount
       FROM sales_transactions
       WHERE agent_id = ? AND processing_month = ? AND report_type IN ${POLICY_REPORT_TYPES}`,
      [agentId, month],
    );
    return Number(rows[0]?.amount) || 0;
  }

  if (metric === 'nifraim') {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ROUND(SUM(commission_amount), 2) AS amount
       FROM sales_transactions
       WHERE agent_id = ? AND processing_month = ? AND report_type = 'nifraim'`,
      [agentId, month],
    );
    return Number(rows[0]?.amount) || 0;
  }

  if (metric === 'hekef') {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ROUND(SUM(commission_amount), 2) AS amount
       FROM sales_transactions
       WHERE agent_id = ? AND processing_month = ? AND report_type = 'hekef'`,
      [agentId, month],
    );
    return Number(rows[0]?.amount) || 0;
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ROUND(SUM(commission_amount), 2) AS amount
     FROM sales_transactions
     WHERE agent_id = ? AND processing_month = ?
       AND report_type IN ('accumulation_nifraim','accumulation_hekef')`,
    [agentId, month],
  );
  return Number(rows[0]?.amount) || 0;
}

async function fetchYearlyMetric(agentId: string, upToMonth: string, metric: TargetMetric): Promise<number> {
  const year = upToMonth.substring(0, 4);
  const yearStart = `${year}-01`;

  if (metric === 'total') {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ROUND(SUM(commission_amount), 2) AS amount
       FROM sales_transactions
       WHERE agent_id = ?
         AND processing_month >= ? AND processing_month <= ?
         AND report_type IN ${POLICY_REPORT_TYPES}`,
      [agentId, yearStart, upToMonth],
    );
    return Number(rows[0]?.amount) || 0;
  }

  if (metric === 'nifraim') {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ROUND(SUM(commission_amount), 2) AS amount
       FROM sales_transactions
       WHERE agent_id = ?
         AND processing_month >= ? AND processing_month <= ?
         AND report_type = 'nifraim'`,
      [agentId, yearStart, upToMonth],
    );
    return Number(rows[0]?.amount) || 0;
  }

  if (metric === 'hekef') {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ROUND(SUM(commission_amount), 2) AS amount
       FROM sales_transactions
       WHERE agent_id = ?
         AND processing_month >= ? AND processing_month <= ?
         AND report_type = 'hekef'`,
      [agentId, yearStart, upToMonth],
    );
    return Number(rows[0]?.amount) || 0;
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ROUND(SUM(commission_amount), 2) AS amount
     FROM sales_transactions
     WHERE agent_id = ?
       AND processing_month >= ? AND processing_month <= ?
       AND report_type IN ('accumulation_nifraim','accumulation_hekef')`,
    [agentId, yearStart, upToMonth],
  );
  return Number(rows[0]?.amount) || 0;
}

export async function getCurrentProgress(
  agentId: string,
  month?: string,
): Promise<TargetProgress[]> {
  const targets = await getTargets(agentId);
  if (targets.length === 0) return [];

  const effectiveMonth = month ?? resolveCurrentMonth();

  const progressItems = await Promise.all(
    targets.map(async (target) => {
      const currentAmount =
        target.period === 'monthly'
          ? await fetchMonthlyMetric(agentId, effectiveMonth, target.metric)
          : await fetchYearlyMetric(agentId, effectiveMonth, target.metric);

      const progressPct =
        target.targetAmount > 0
          ? Math.round((currentAmount / target.targetAmount) * 10000) / 100
          : 0;

      return {
        metric: target.metric,
        period: target.period,
        targetAmount: target.targetAmount,
        currentAmount,
        progressPct,
      };
    }),
  );

  return progressItems;
}
