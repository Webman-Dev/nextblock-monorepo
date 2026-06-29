import Stripe from 'stripe';
import { getStripeClient } from './client';
import { resolveStripeWebhookSecret } from '../payment-config';
import { syncStripeOrderFromSession } from './order-sync';

export const handleStripeWebhook = async (
  signature: string,
  body: string | Buffer
): Promise<{ received: boolean; error?: string }> => {
  // Resolve the webhook secret DB-first (CMS), falling back to STRIPE_WEBHOOK_SECRET.
  const webhookSecret = await resolveStripeWebhookSecret();

  if (!webhookSecret) {
    console.error('Missing Stripe webhook secret (configure it in CMS or STRIPE_WEBHOOK_SECRET)');
    return { received: false, error: 'Server configuration error' };
  }

  const stripe = await getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return { received: false, error: `Webhook Error: ${error.message}` };
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      try {
        await syncStripeOrderFromSession(session);
      } catch (error: any) {
        console.error('[Stripe Webhook Error] Failed to sync completed session:', error);
        return { received: false, error: error.message || 'Failed to sync Stripe session' };
      }
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return { received: true };
};
