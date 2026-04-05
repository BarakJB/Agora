import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';

const SALT_ROUNDS = 12;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: { agentId: string; sub: string }): string {
  const opts: SignOptions = { expiresIn: '24h' };
  return jwt.sign(payload, getJwtSecret(), opts);
}

export function verifyToken(token: string): { agentId: string; sub: string } {
  return jwt.verify(token, getJwtSecret()) as { agentId: string; sub: string };
}
