import 'server-only';

import { createClient, verifyPackageOnline } from '@nextblock-cms/db/server';
import { getStoreReadiness } from '@nextblock-cms/ecommerce/server';

/**
 * A store that has commerce switched on but cannot actually take money. This is easy to
 * end up in — the products, prices and pages all look finished — and the only symptom
 * used to be a shopper hitting a payment error at checkout. The banner makes the gap
 * visible in the CMS instead of on the storefront.
 */
export interface PaymentsReminder {
  /** Providers that are not ready, with what each is missing. */
  blocked: Array<{ provider: 'stripe' | 'freemius'; label: string; missing: string[] }>;
  /** Published products that currently cannot be bought because of the above. */
  affectedProducts: number;
}

/**
 * Best-effort reminder state for the CMS layout. Returns null (no banner) whenever
 * nagging would be wrong or the answer can't be determined — an unmigrated database,
 * an instance without commerce, or the sandbox.
 */
export async function getPaymentsReminder(): Promise<PaymentsReminder | null> {
  // The sandbox refuses to store live credentials at all (savePaymentCredentials throws),
  // so a "finish setting up payments" nag there is noise the operator cannot act on.
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') return null;

  try {
    if (!(await verifyPackageOnline('ecommerce'))) return null;

    const supabase = createClient();

    // Only ADMINs can act on this (the /cms/payments route is admin-only), so don't do
    // the work for anyone else.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role !== 'ADMIN') return null;

    const readiness = await getStoreReadiness();
    const unready = (['stripe', 'freemius'] as const)
      .map((provider) => readiness[provider])
      .filter((entry) => !entry.ready);

    if (unready.length === 0) return null;

    // A provider the store does not sell through is not a problem to be nagged about.
    // Both providers ship DISABLED (baseline seed), so filtering on readiness alone
    // would show a permanent "Freemius still needs setting up" banner to every
    // physical-goods shop that had finished its Stripe setup correctly.
    //
    // "In use" means the admin switched the provider on, or the catalogue already
    // contains products that would need it — counted across ALL statuses, so a shop
    // building a draft catalogue is warned before it publishes rather than after.
    const usage = await Promise.all(
      unready.map(async (entry) => {
        const [{ count: totalCount }, { count: activeCount }] = await Promise.all([
          supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('payment_provider', entry.provider),
          supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active')
            .eq('payment_provider', entry.provider),
        ]);
        return {
          entry,
          inUse: entry.enabled || (totalCount ?? 0) > 0,
          activeProducts: activeCount ?? 0,
        };
      })
    );

    const relevant = usage.filter((item) => item.inUse);
    if (relevant.length === 0) return null;

    return {
      blocked: relevant.map(({ entry }) => ({
        provider: entry.provider,
        label: entry.label,
        missing: entry.missing,
      })),
      affectedProducts: relevant.reduce((total, item) => total + item.activeProducts, 0),
    };
  } catch {
    // Never let a reminder break the CMS shell.
    return null;
  }
}
