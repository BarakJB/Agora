"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advisorRouter = void 0;
const express_1 = require("express");
const validate_js_1 = require("../middleware/validate.js");
const rateLimit_middleware_js_1 = require("../middleware/rateLimit.middleware.js");
const advisor_schemas_js_1 = require("../validators/advisor.schemas.js");
const advisor_service_js_1 = require("../services/advisor/advisor.service.js");
const advisor_repository_js_1 = require("../repositories/advisor.repository.js");
exports.advisorRouter = (0, express_1.Router)();
const perMinuteLimit = (0, rateLimit_middleware_js_1.createRateLimit)({
    keyFromReq: (_req, res) => `advisor:min:${res.locals.agentId}`,
    max: parseInt(process.env.ADVISOR_RATE_LIMIT_PER_MIN || '10', 10),
    windowMs: 60 * 1000,
    message: 'חרגת ממגבלת הבקשות לדקה. אנא המתן מעט.',
});
const perDayLimit = (0, rateLimit_middleware_js_1.createRateLimit)({
    keyFromReq: (_req, res) => `advisor:day:${res.locals.agentId}`,
    max: parseInt(process.env.ADVISOR_RATE_LIMIT_PER_DAY || '200', 10),
    windowMs: 24 * 60 * 60 * 1000,
    message: 'חרגת ממגבלת הבקשות היומית.',
});
exports.advisorRouter.post('/chat', perMinuteLimit, perDayLimit, (0, validate_js_1.validate)({ body: advisor_schemas_js_1.chatBodySchema }), async (req, res, next) => {
    try {
        const agentId = res.locals.agentId;
        const { message, conversationId } = req.body;
        const result = await (0, advisor_service_js_1.chat)({ agentId, userMessage: message, conversationId });
        res.json({
            data: result,
            error: null,
            meta: null,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.advisorRouter.get('/conversations', async (req, res, next) => {
    try {
        const agentId = res.locals.agentId;
        const conversations = await (0, advisor_repository_js_1.listConversationsByAgent)(agentId);
        res.json({
            data: conversations,
            error: null,
            meta: { count: conversations.length },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.advisorRouter.get('/conversations/:id', (0, validate_js_1.validate)({ params: advisor_schemas_js_1.conversationIdParamSchema }), async (req, res, next) => {
    try {
        const agentId = res.locals.agentId;
        const id = req.params.id;
        const conversation = await (0, advisor_repository_js_1.getConversationById)(id, agentId);
        if (!conversation) {
            res.status(404).json({ data: null, error: 'Conversation not found', meta: null });
            return;
        }
        const messages = await (0, advisor_repository_js_1.getMessagesByConversation)(id);
        res.json({
            data: { conversation, messages },
            error: null,
            meta: { messageCount: messages.length },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.advisorRouter.delete('/conversations/:id', (0, validate_js_1.validate)({ params: advisor_schemas_js_1.conversationIdParamSchema }), async (req, res, next) => {
    try {
        const agentId = res.locals.agentId;
        const id = req.params.id;
        const deleted = await (0, advisor_repository_js_1.deleteConversation)(id, agentId);
        if (!deleted) {
            res.status(404).json({ data: null, error: 'Conversation not found', meta: null });
            return;
        }
        res.json({ data: { deleted: true }, error: null, meta: null });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=advisor.routes.js.map