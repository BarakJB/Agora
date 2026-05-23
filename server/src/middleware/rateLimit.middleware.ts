import type { Request, Response, NextFunction } from 'express';

interface BucketEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  keyFromReq: (req: Request, res: Response) => string;
  max: number;
  windowMs: number;
  message: string;
}

export function createRateLimit(options: RateLimitOptions) {
  const buckets = new Map<string, BucketEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = options.keyFromReq(req, res);
    const now = Date.now();

    let entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, entry);
    }

    entry.count++;

    if (entry.count > options.max) {
      res.status(429).json({
        data: null,
        error: options.message,
        meta: { retryAfterMs: entry.resetAt - now },
      });
      return;
    }

    next();
  };
}
