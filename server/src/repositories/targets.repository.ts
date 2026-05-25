import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuid } from 'uuid';
import pool from '../config/database.js';

export type TargetMetric = 'total' | 'nifraim' | 'hekef' | 'accumulation';
export type TargetPeriod = 'monthly' | 'yearly';

export interface AgentTarget {
  id: string;
  metric: TargetMetric;
  period: TargetPeriod;
  targetAmount: number;
}

export async function getTargets(agentId: string): Promise<AgentTarget[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, metric, period, target_amount FROM agent_targets WHERE agent_id = ?',
    [agentId],
  );
  return rows.map((r) => ({
    id: r.id as string,
    metric: r.metric as TargetMetric,
    period: r.period as TargetPeriod,
    targetAmount: Number(r.target_amount),
  }));
}

export async function upsertTarget(
  agentId: string,
  data: { metric: TargetMetric; period: TargetPeriod; targetAmount: number },
): Promise<void> {
  const id = uuid();
  await pool.query<ResultSetHeader>(
    `INSERT INTO agent_targets (id, agent_id, metric, period, target_amount)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       target_amount = VALUES(target_amount),
       updated_at    = CURRENT_TIMESTAMP`,
    [id, agentId, data.metric, data.period, data.targetAmount],
  );
}

export async function deleteTarget(
  agentId: string,
  metric: TargetMetric,
  period: TargetPeriod,
): Promise<void> {
  await pool.query<ResultSetHeader>(
    'DELETE FROM agent_targets WHERE agent_id = ? AND metric = ? AND period = ?',
    [agentId, metric, period],
  );
}
