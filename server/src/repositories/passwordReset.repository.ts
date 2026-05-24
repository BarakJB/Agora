import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database.js';

const SALT_ROUNDS = 10;
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function createResetToken(agentId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(token, SALT_ROUNDS);
  const id = uuid();
  const expiresAt = new Date(Date.now() + EXPIRY_MS);

  await pool.execute<ResultSetHeader>(
    'INSERT INTO password_resets (id, agent_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [id, agentId, tokenHash, expiresAt],
  );

  return { token, expiresAt };
}

interface ResetTokenRow extends RowDataPacket {
  id: string;
  agent_id: string;
}

export async function findValidToken(token: string): Promise<{ id: string; agentId: string } | null> {
  const [rows] = await pool.execute<ResetTokenRow[]>(
    `SELECT id, agent_id
     FROM password_resets
     WHERE used_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 50`,
  );

  for (const row of rows) {
    const match = await bcrypt.compare(token, row.id);
    if (match) {
      return { id: row.id, agentId: row.agent_id };
    }
  }

  // bcrypt compare against token_hash
  const [allRows] = await pool.execute<ResetTokenRow[]>(
    `SELECT id, agent_id, token_hash
     FROM password_resets
     WHERE used_at IS NULL AND expires_at > NOW()`,
  ) as unknown as [Array<ResetTokenRow & { token_hash: string }>, unknown];

  for (const row of (allRows as Array<ResetTokenRow & { token_hash: string }>)) {
    const match = await bcrypt.compare(token, row.token_hash);
    if (match) {
      return { id: row.id, agentId: row.agent_id };
    }
  }

  return null;
}

export async function markUsed(id: string): Promise<void> {
  await pool.execute<ResultSetHeader>(
    'UPDATE password_resets SET used_at = NOW() WHERE id = ?',
    [id],
  );
}
