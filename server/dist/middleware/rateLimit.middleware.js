"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimit = createRateLimit;
function createRateLimit(options) {
    const buckets = new Map();
    return (req, res, next) => {
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
//# sourceMappingURL=rateLimit.middleware.js.map