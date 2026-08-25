import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * The readiness predicate is what four separate surfaces branch on — the publish
 * warning, the CMS banner, the storefront buy CTA and the checkout preflight. If they
 * disagree, a shopper sees "Add to cart" on a product checkout will refuse.
 *
 * The case that matters most: a store that configured Stripe but not Freemius must keep
 * selling physical goods normally while digital ones fall back to the enquiry form.
 */

const mocks = vi.hoisted(() => ({
  getPaymentConfigStatus: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@nextblock-cms/db/server', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
        }),
      }),
    }),
  }),
}));

vi.mock('../../../payment-config', () => ({
  getPaymentConfigStatus: mocks.getPaymentConfigStatus,
}));

import { getProviderReadiness, getStoreReadiness, getReadinessForProductType } from './queries';

function withConfig(options: {
  stripeKeys: boolean;
  freemiusKeys: boolean;
  stripeEnabled: boolean;
  freemiusEnabled: boolean;
}) {
  mocks.getPaymentConfigStatus.mockResolvedValue({
    stripe: {
      hasKeys: options.stripeKeys,
      missing: options.stripeKeys ? [] : ['Secret key', 'Webhook secret'],
    },
    freemius: {
      hasKeys: options.freemiusKeys,
      missing: options.freemiusKeys ? [] : ['Public key', 'Secret key'],
    },
  });
  mocks.maybeSingle.mockResolvedValue({
    data: { value: { stripe: options.stripeEnabled, freemius: options.freemiusEnabled } },
    error: null,
  });
}

describe('provider readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is ready only when the provider is both enabled and fully keyed', async () => {
    withConfig({
      stripeKeys: true,
      freemiusKeys: true,
      stripeEnabled: true,
      freemiusEnabled: true,
    });

    const readiness = await getStoreReadiness();
    expect(readiness.stripe.ready).toBe(true);
    expect(readiness.freemius.ready).toBe(true);
  });

  it('keeps a Stripe-only store selling physical goods while digital ones fall back', async () => {
    withConfig({
      stripeKeys: true,
      freemiusKeys: false,
      stripeEnabled: true,
      freemiusEnabled: false,
    });

    await expect(getReadinessForProductType('physical')).resolves.toMatchObject({
      provider: 'stripe',
      ready: true,
    });
    await expect(getReadinessForProductType('digital')).resolves.toMatchObject({
      provider: 'freemius',
      ready: false,
    });
  });

  it('reports the missing credentials so the CMS can name them', async () => {
    withConfig({
      stripeKeys: false,
      freemiusKeys: true,
      stripeEnabled: true,
      freemiusEnabled: true,
    });

    const stripe = await getProviderReadiness('stripe');
    expect(stripe.ready).toBe(false);
    expect(stripe.missing).toEqual(['Secret key', 'Webhook secret']);
    expect(stripe.label).toBe('Stripe');
  });

  it('distinguishes "keys present but never switched on" from "no credentials"', async () => {
    withConfig({
      stripeKeys: true,
      freemiusKeys: true,
      stripeEnabled: false,
      freemiusEnabled: true,
    });

    const stripe = await getProviderReadiness('stripe');
    expect(stripe.ready).toBe(false);
    expect(stripe.hasKeys).toBe(true);
    expect(stripe.missing).toEqual(['Not enabled in CMS → Payments']);
  });

  it('treats an unreadable enabled-providers row as nothing enabled', async () => {
    mocks.getPaymentConfigStatus.mockResolvedValue({
      stripe: { hasKeys: true, missing: [] },
      freemius: { hasKeys: true, missing: [] },
    });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const readiness = await getStoreReadiness();
    expect(readiness.stripe.ready).toBe(false);
    expect(readiness.freemius.ready).toBe(false);
  });
});
