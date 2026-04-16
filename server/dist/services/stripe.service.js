"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckoutSession = createCheckoutSession;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.handleCheckoutCompleted = handleCheckoutCompleted;
exports.getSubscriptionStatus = getSubscriptionStatus;
const stripe_1 = __importDefault(require("stripe"));
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const mysql_repository_js_1 = require("../repositories/mysql.repository.js");
const auth_service_js_1 = require("./auth.service.js");
const logger_js_1 = require("../config/logger.js");
function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key)
        throw new Error('STRIPE_SECRET_KEY is not set');
    return new stripe_1.default(key);
}
function getWebhookSecret() {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret)
        throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    return secret;
}
function getPriceId() {
    const id = process.env.STRIPE_PRICE_ID;
    if (!id)
        throw new Error('STRIPE_PRICE_ID is not set');
    return id;
}
async function createCheckoutSession(email) {
    const stripe = getStripe();
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const landingUrl = process.env.LANDING_URL || 'http://localhost:3000';
    const sessionParams = {
        mode: 'subscription',
        line_items: [{ price: getPriceId(), quantity: 1 }],
        success_url: `${appUrl}/login?payment=success`,
        cancel_url: `${landingUrl}?payment=cancelled`,
        locale: 'auto',
    };
    if (email) {
        sessionParams.customer_email = email;
    }
    const session = await stripe.checkout.sessions.create(sessionParams);
    if (!session.url) {
        throw new Error('Stripe did not return a checkout URL');
    }
    return { url: session.url };
}
function verifyWebhookSignature(payload, signature) {
    const stripe = getStripe();
    return stripe.webhooks.constructEvent(payload, signature, getWebhookSecret());
}
function generatePassword(length = 12) {
    return crypto_1.default.randomBytes(length).toString('base64url').slice(0, length);
}
async function handleCheckoutCompleted(session) {
    const email = session.customer_email || session.customer_details?.email;
    if (!email) {
        throw new Error('No email found in checkout session');
    }
    const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    const password = generatePassword();
    const passwordHash = await (0, auth_service_js_1.hashPassword)(password);
    const id = (0, uuid_1.v4)();
    const agentId = `AG${Date.now().toString(36).toUpperCase()}`;
    await (0, mysql_repository_js_1.createAgentWithPassword)(id, {
        agentId,
        agencyId: 'AG-NEW',
        name: email.split('@')[0],
        email,
        phone: '',
        licenseNumber: agentId,
        taxId: agentId,
        taxStatus: 'self_employed',
        niiRate: 17.83,
        passwordHash,
    });
    logger_js_1.logger.info({
        event: 'stripe_checkout_completed',
        email,
        agentId,
        customerId,
        subscriptionId,
    });
    return { email, password, agentId };
}
async function getSubscriptionStatus(customerId) {
    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
    });
    return subscriptions.data.length > 0 ? 'active' : 'inactive';
}
//# sourceMappingURL=stripe.service.js.map