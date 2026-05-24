import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database.js';

const SALT_ROUNDS = 10;
const EXPIRY_MS = 10 * 60 * 1000;

export async function createOTP(agentId: string): Promise<{ otp: string; expiresAt: Date }> {
  await pool.execute<ResultSetHeader>(
    'DELETE FROM password_resets WHERE agent_id = ? AND used_at IS NULL',
    [agentId],
  );

  const otp = crypto.randomInt(100000, 999999).toString();
  const tokenHash = await bcrypt.hash(otp, SALT_ROUNDS);
  const id = uuid();
  const expiresAt = new Date(Date.now() + EXPIRY_MS);

  await pool.execute<ResultSetHeader>(
    'INSERT INTO password_resets (id, agent_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [id, agentId, tokenHash, expiresAt],
  );

  return { otp, expiresAt };
}

interface ResetTokenRow extends RowDataPacket {
  id: string;
  agent_id: string;
  token_hash: string;
}

export async function findValidOTPByEmail(
  email: string,
  otp: string,
): Promise<{ id: string; agentId: string } | null> {
  const [rows] = await pool.execute<ResetTokenRow[]>(
    `SELECT pr.id, pr.agent_id, pr.token_hash
     FROM password_resets pr
     INNER JOIN agents a ON a.id = pr.agent_id
     WHERE a.email = ?
       AND pr.used_at IS NULL
       AND pr.expires_at > NOW()
     ORDER BY pr.expires_at DESC
     LIMIT 5`,
    [email],
  );

  for (const row of rows) {
    const match = await bcrypt.compare(otp, row.token_hash);
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
