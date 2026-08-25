'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { getProductPaymentProvider } from './types';
import type { Product } from './types';

/**
 * Which payment providers the store can actually charge through, shared with every
 * client component that renders a buy control.
 *
 * This is a context rather than a prop threaded down from each block because the buy
 * CTA appears in five unrelated places (detail page, grid card, featured block,
 * subscription selector, quick add) and product grids re-fetch later pages through a
 * server action — a prop passed with page one would not reach page two. It is
 * store-level, not per-product, so pagination cannot invalidate it.
 *
 * Booleans only. Nothing here is sensitive: it says whether the shop can take money,
 * never anything about the credentials that let it.
 */
export interface PaymentReadiness {
  stripe: boolean;
  freemius: boolean;
}

/**
 * Defaults to "everything works". A store whose readiness could not be resolved must
 * behave exactly as it did before this feature existed — degrading a working shop to an
 * enquiry form because of a failed lookup would be far worse than the bug being fixed.
 */
const DEFAULT_READINESS: PaymentReadiness = { stripe: true, freemius: true };

const PaymentReadinessContext = createContext<PaymentReadiness>(DEFAULT_READINESS);

export function PaymentReadinessProvider({
  readiness,
  children,
}: {
  readiness?: PaymentReadiness | null;
  children: ReactNode;
}) {
  const value = useMemo<PaymentReadiness>(
    () => ({
      stripe: readiness?.stripe ?? true,
      freemius: readiness?.freemius ?? true,
    }),
    [readiness?.stripe, readiness?.freemius]
  );

  return (
    <PaymentReadinessContext.Provider value={value}>{children}</PaymentReadinessContext.Provider>
  );
}

export function usePaymentReadiness(): PaymentReadiness {
  return useContext(PaymentReadinessContext);
}

/** Whether this specific product can be bought, given its provider. */
export function useCanPurchase(
  product: Pick<Product, 'payment_provider' | 'product_type' | 'freemius_product_id'>
): boolean {
  const readiness = usePaymentReadiness();
  // Falls back to Stripe when the row carries neither field, matching the DB's
  // physical->stripe default.
  const provider = getProductPaymentProvider(product) ?? 'stripe';
  return readiness[provider] ?? true;
}
