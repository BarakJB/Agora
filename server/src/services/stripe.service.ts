import Stripe from 'stripe';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { createAgentWithPassword } from '../repositories/mysql.repository.js';
import { hashPassword } from './auth.service.js';
import { logger } from '../config/logger.js';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}

function getPriceId(): string {
  const id = process.env.STRIPE_PRICE_ID;
  if (!id) throw new Error('STRIPE_PRICE_ID is not set');
  return id;
}

export async function createCheckoutSession(email?: string): Promise<{ url: string }> {
  const stripe = getStripe();
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const landingUrl = process.env.LANDING_URL || 'http://localhost:3000';

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
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

export function verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, getWebhookSecret());
}

function generatePassword(length = 12): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<{
  email: string;
  password: string;
  agentId: string;
}> {
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
  const passwordHash = await hashPassword(password);
  const id = uuid();
  const agentId = `AG${Date.now().toString(36).toUpperCase()}`;

  await createAgentWithPassword(id, {
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

  logger.info({
    event: 'stripe_checkout_completed',
    email,
    agentId,
    customerId,
    subscriptionId,
  });

  return { email, password, agentId };
}

export async function getSubscriptionStatus(customerId: string): Promise<string> {
  const stripe = getStripe();
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });
  return subscriptions.data.length > 0 ? 'active' : 'inactive';
}
