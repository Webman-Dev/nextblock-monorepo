import Stripe from 'stripe';
import { stripe } from './client';
import { syncStripeOrderFromSession } from './order-sync';

export const handleStripeWebhook = async (
  signature: string,
  body: string | Buffer
): Promise<{ received: boolean; error?: string }> => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return { received: false, error: 'Server configuration error' };
  }

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
