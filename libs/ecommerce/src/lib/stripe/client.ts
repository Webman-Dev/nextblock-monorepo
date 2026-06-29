import Stripe from 'stripe';
import { resolveStripeSecretKey } from '../payment-config';

// The Stripe client is created lazily (not at module load) so the secret key can be
// resolved DB-first from the CMS, with an env fallback. Cached per resolved key so a
// rotation re-initializes the client.
let cachedClient: Stripe | null = null;
let cachedKey: string | null = null;

export async function getStripeClient(): Promise<Stripe> {
  const secret = (await resolveStripeSecretKey()) || 'sk_test_dummy';
  if (cachedClient && cachedKey === secret) {
    return cachedClient;
  }
  cachedClient = new Stripe(secret, { typescript: true });
  cachedKey = secret;
  return cachedClient;
}
