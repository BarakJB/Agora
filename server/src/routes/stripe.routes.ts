import { Router, type Request, type Response, type NextFunction } from 'express';
import express from 'express';
import {
  createCheckoutSession,
  verifyWebhookSignature,
  handleCheckoutCompleted,
} from '../services/stripe.service.js';
import { logger } from '../config/logger.js';

export const stripeRouter = Router();

// POST /api/v1/stripe/create-checkout
// Creates a Stripe Checkout Session and returns the redirect URL
stripeRouter.post('/create-checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.body?.email as string | undefined;
    const { url } = await createCheckoutSession(email);

    res.json({ data: { url }, error: null, meta: null });
  } catch (err) {
    logger.error({ err, route: 'create-checkout' }, 'Failed to create checkout session');
    next(err);
  }
});

// POST /api/v1/stripe/webhook
// Stripe sends raw body — must use express.raw() middleware
stripeRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(400).json({ data: null, error: 'Missing stripe-signature header', meta: null });
      return;
    }

    try {
      const event = verifyWebhookSignature(req.body as Buffer, signature);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const result = await handleCheckoutCompleted(session);

          logger.info({
            event: 'webhook_checkout_completed',
            email: result.email,
            agentId: result.agentId,
          });

          // TODO: Send welcome email with password to result.email
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          logger.info({
            event: 'webhook_subscription_cancelled',
            subscriptionId: subscription.id,
            customerId: subscription.customer,
          });
          // TODO: Deactivate agent account
          break;
        }

        default:
          logger.info({ event: 'webhook_unhandled', type: event.type });
      }

      res.json({ received: true });
    } catch (err) {
      logger.error({ err }, 'Webhook signature verification failed');
      res.status(400).json({ data: null, error: 'Webhook signature verification failed', meta: null });
    }
  },
);
