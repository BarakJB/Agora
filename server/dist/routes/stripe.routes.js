"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeRouter = void 0;
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const stripe_service_js_1 = require("../services/stripe.service.js");
const logger_js_1 = require("../config/logger.js");
exports.stripeRouter = (0, express_1.Router)();
// POST /api/v1/stripe/create-checkout
// Creates a Stripe Checkout Session and returns the redirect URL
exports.stripeRouter.post('/create-checkout', async (req, res, next) => {
    try {
        const email = req.body?.email;
        const { url } = await (0, stripe_service_js_1.createCheckoutSession)(email);
        res.json({ data: { url }, error: null, meta: null });
    }
    catch (err) {
        logger_js_1.logger.error({ err, route: 'create-checkout' }, 'Failed to create checkout session');
        next(err);
    }
});
// POST /api/v1/stripe/webhook
// Stripe sends raw body — must use express.raw() middleware
exports.stripeRouter.post('/webhook', express_2.default.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        res.status(400).json({ data: null, error: 'Missing stripe-signature header', meta: null });
        return;
    }
    try {
        const event = (0, stripe_service_js_1.verifyWebhookSignature)(req.body, signature);
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const result = await (0, stripe_service_js_1.handleCheckoutCompleted)(session);
                logger_js_1.logger.info({
                    event: 'webhook_checkout_completed',
                    email: result.email,
                    agentId: result.agentId,
                });
                // TODO: Send welcome email with password to result.email
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                logger_js_1.logger.info({
                    event: 'webhook_subscription_cancelled',
                    subscriptionId: subscription.id,
                    customerId: subscription.customer,
                });
                // TODO: Deactivate agent account
                break;
            }
            default:
                logger_js_1.logger.info({ event: 'webhook_unhandled', type: event.type });
        }
        res.json({ received: true });
    }
    catch (err) {
        logger_js_1.logger.error({ err }, 'Webhook signature verification failed');
        res.status(400).json({ data: null, error: 'Webhook signature verification failed', meta: null });
    }
});
//# sourceMappingURL=stripe.routes.js.map