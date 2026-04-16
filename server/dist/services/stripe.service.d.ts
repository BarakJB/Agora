import Stripe from 'stripe';
export declare function createCheckoutSession(email?: string): Promise<{
    url: string;
}>;
export declare function verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event;
export declare function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<{
    email: string;
    password: string;
    agentId: string;
}>;
export declare function getSubscriptionStatus(customerId: string): Promise<string>;
//# sourceMappingURL=stripe.service.d.ts.map