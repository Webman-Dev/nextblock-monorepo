import 'server-only';

import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';

import { isEmailConfigured } from '../config/email-settings';
import { isPlaceholderEmail } from '../email/placeholder-address';
import { getPrivacySettings } from '../privacy/settings';

/**
 * Where a storefront enquiry should be delivered.
 *
 * This address MUST NEVER reach the browser. The public enquiry form posts a product id
 * and the visitor's own details; the server resolves the destination here. That is the
 * whole point of the form — a `mailto:` to the shop owner would publish a working inbox
 * address to every scraper that visits the catalogue.
 *
 * Resolution order, most specific first:
 *   1. The explicit "seller contact email" an ADMIN set in CMS → Payments.
 *   2. The invoice/merchant email — already the business address printed on invoices.
 *   3. The privacy/support email from CMS Settings → Privacy (skipping the neutral
 *      @example.com placeholder that ships with a fresh install).
 *   4. The oldest ADMIN account's login address, as a last resort so a store that
 *      configured nothing still reaches a human.
 *
 * The sandbox overrides everything: its database is wiped and re-seeded on a schedule,
 * so any address stored there is dummy data by construction.
 */
export const STORE_CONTACT_SETTINGS_KEY = 'store_contact';

export interface SellerContactResolution {
  email: string | null;
  /** Which rung of the ladder answered — for CMS diagnostics, never shown publicly. */
  source: 'sandbox' | 'store_contact' | 'invoice' | 'privacy' | 'first_admin' | 'none';
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * An address is only usable if it can actually receive mail. Seeded @example.com values
 * look configured to every check downstream while delivering nowhere, so they are
 * treated as unset and the ladder continues past them.
 */
function usable(value: string): boolean {
  return value.length > 0 && !isPlaceholderEmail(value);
}

/** The ADMIN-set override, or '' when unset. Safe to render inside the CMS. */
export async function getStoreContactEmail(): Promise<string> {
  try {
    const supabase = getServiceRoleSupabaseClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', STORE_CONTACT_SETTINGS_KEY)
      .maybeSingle();
    const value = data?.value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return clean((value as Record<string, unknown>)['contactEmail']);
    }
  } catch {
    // Unconfigured or unmigrated instance — fall through to the other sources.
  }
  return '';
}

/** Only ever a handful of admins; bounded so a pathological role assignment can't fan out. */
const MAX_ADMIN_LOOKUPS = 10;

/**
 * The founding ADMIN's login address. Kept last in the ladder because it mails a
 * personal account rather than a business address.
 *
 * `public.profiles` carries neither an email nor a created_at column, so "oldest" has
 * to come from auth: read the ADMIN ids, then resolve each one individually. That is
 * deliberately not `auth.admin.listUsers()`, which would page through every user on the
 * instance to answer a question about two or three of them.
 */
async function getFirstAdminEmail(): Promise<string> {
  try {
    const supabase = getServiceRoleSupabaseClient();
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'ADMIN')
      .limit(MAX_ADMIN_LOOKUPS);

    if (!admins || admins.length === 0) return '';

    const resolved = await Promise.all(
      admins.map(async ({ id }) => {
        const { data } = await supabase.auth.admin.getUserById(id);
        const email = clean(data?.user?.email);
        return email ? { email, createdAt: data?.user?.created_at ?? '' } : null;
      })
    );

    const candidates = resolved.filter(
      (entry): entry is { email: string; createdAt: string } => entry !== null
    );
    if (candidates.length === 0) return '';

    // Earliest signup wins, so the answer is stable as staff come and go.
    candidates.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return candidates[0].email;
  } catch {
    return '';
  }
}

export async function resolveSellerContactEmail(): Promise<SellerContactResolution> {
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    const sandbox = clean(process.env['SANDBOX_CONTACT_EMAIL']);
    if (sandbox) return { email: sandbox, source: 'sandbox' };
  }

  const configured = await getStoreContactEmail();
  if (usable(configured)) return { email: configured, source: 'store_contact' };

  try {
    const supabase = getServiceRoleSupabaseClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'invoice_settings')
      .maybeSingle();
    const value = data?.value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const invoiceEmail = clean((value as Record<string, unknown>)['email']);
      if (usable(invoiceEmail)) return { email: invoiceEmail, source: 'invoice' };
    }
  } catch {
    // Fall through.
  }

  try {
    const privacy = await getPrivacySettings();
    const supportEmail = clean(privacy.corporate.support_email);
    if (usable(supportEmail)) return { email: supportEmail, source: 'privacy' };
  } catch {
    // Fall through.
  }

  const adminEmail = await getFirstAdminEmail();
  if (usable(adminEmail)) return { email: adminEmail, source: 'first_admin' };

  return { email: null, source: 'none' };
}

/**
 * Whether an enquiry sent right now would actually reach someone by email. Used by the
 * CMS to warn an admin, and to decide whether a stored enquiry is the only record.
 * Never exposes the address itself.
 */
export async function canNotifySeller(): Promise<boolean> {
  const [{ email }, smtpReady] = await Promise.all([
    resolveSellerContactEmail(),
    isEmailConfigured().catch(() => false),
  ]);
  return Boolean(email) && smtpReady;
}
