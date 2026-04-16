"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const auth_service_js_1 = require("../services/auth.service.js");
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ data: null, error: 'Missing or invalid Authorization header', meta: null });
        return;
    }
    const token = header.slice(7);
    try {
        const decoded = (0, auth_service_js_1.verifyToken)(token);
        res.locals.agentId = decoded.agentId;
        res.locals.sub = decoded.sub;
        next();
    }
    catch {
        res.status(401).json({ data: null, error: 'Invalid or expired token', meta: null });
    }
}
//# sourceMappingURL=auth.middleware.js.map