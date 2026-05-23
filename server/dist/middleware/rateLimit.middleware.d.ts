import type { Request, Response, NextFunction } from 'express';
interface RateLimitOptions {
    keyFromReq: (req: Request, res: Response) => string;
    max: number;
    windowMs: number;
    message: string;
}
export declare function createRateLimit(options: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=rateLimit.middleware.d.ts.map