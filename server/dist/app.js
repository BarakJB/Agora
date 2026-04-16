"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_http_1 = __importDefault(require("pino-http"));
const auth_routes_js_1 = require("./routes/auth.routes.js");
const agent_routes_js_1 = require("./routes/agent.routes.js");
const policy_routes_js_1 = require("./routes/policy.routes.js");
const commission_routes_js_1 = require("./routes/commission.routes.js");
const tax_routes_js_1 = require("./routes/tax.routes.js");
const upload_routes_js_1 = require("./routes/upload.routes.js");
const sales_routes_js_1 = require("./routes/sales.routes.js");
const prediction_routes_js_1 = require("./routes/prediction.routes.js");
const stripe_routes_js_1 = require("./routes/stripe.routes.js");
const rates_routes_js_1 = require("./routes/rates.routes.js");
const commission_template_service_js_1 = require("./services/commission-template.service.js");
const auth_middleware_js_1 = require("./middleware/auth.middleware.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const requestId_js_1 = require("./middleware/requestId.js");
const logger_js_1 = require("./config/logger.js");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173'];
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
}));
app.use(requestId_js_1.requestId);
if (process.env.NODE_ENV !== 'test') {
    app.use((0, pino_http_1.default)({
        logger: logger_js_1.logger,
        genReqId(req, res) {
            return res.locals?.requestId ?? 'unknown';
        },
        customProps(_req, res) {
            return {
                userId: res.locals?.agentId,
            };
        },
        serializers: {
            req(req) {
                return {
                    method: req.method,
                    url: req.url,
                };
            },
            res(res) {
                return { statusCode: res.statusCode };
            },
        },
    }));
}
// Stripe webhook — needs raw body, registered BEFORE express.json()
app.use('/api/v1/stripe/webhook', stripe_routes_js_1.stripeRouter);
app.use(express_1.default.json());
// Health check (public)
app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok', timestamp: new Date().toISOString() }, error: null, meta: null });
});
// Auth routes (public)
app.use('/api/v1/auth', auth_routes_js_1.authRouter);
// Public file downloads — must be before requireAuth
app.get('/api/v1/rates/template', (_req, res) => {
    const buf = (0, commission_template_service_js_1.generateCommissionTemplate)();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="agora_commission_template.xlsx"');
    res.send(buf);
});
app.get('/api/v1/rates/sample', (_req, res) => {
    const buf = (0, commission_template_service_js_1.generateCommissionTemplate)('לדוגמה', true);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="agora_sample_commission_agreement.xlsx"');
    res.send(buf);
});
// Stripe checkout (public, uses JSON body)
app.use('/api/v1/stripe', stripe_routes_js_1.stripeRouter);
// Protected routes — require valid JWT
app.use('/api/v1/agents', auth_middleware_js_1.requireAuth, agent_routes_js_1.agentRouter);
app.use('/api/v1/policies', auth_middleware_js_1.requireAuth, policy_routes_js_1.policyRouter);
app.use('/api/v1/commissions', auth_middleware_js_1.requireAuth, commission_routes_js_1.commissionRouter);
app.use('/api/v1/tax', auth_middleware_js_1.requireAuth, tax_routes_js_1.taxRouter);
app.use('/api/v1/uploads', auth_middleware_js_1.requireAuth, upload_routes_js_1.uploadRouter);
app.use('/api/v1/sales', auth_middleware_js_1.requireAuth, sales_routes_js_1.salesRouter);
app.use('/api/v1/predictions', auth_middleware_js_1.requireAuth, prediction_routes_js_1.predictionRouter);
app.use('/api/v1/rates', auth_middleware_js_1.requireAuth, rates_routes_js_1.ratesRouter);
app.use(errorHandler_js_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map