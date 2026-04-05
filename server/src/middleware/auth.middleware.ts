import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.service.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ data: null, error: 'Missing or invalid Authorization header', meta: null });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = verifyToken(token);
    res.locals.agentId = decoded.agentId;
    res.locals.sub = decoded.sub;
    next();
  } catch {
    res.status(401).json({ data: null, error: 'Invalid or expired token', meta: null });
  }
}
