import 'server-only';

import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';

import { isPlaceholderEmail, usableEmail } from '../email/placeholder-address';
import { resolveSellerContactEmail } from '../commerce/seller-contact';

/**
 * A contact form that appears to work but delivers nowhere.
 *
 * The starter content ships a contact page whose form is addressed to
 * `contact@example.com`. That is the worst kind of default: every layer downstream treats
 * it as a real setting, the visitor is thanked, the transport accepts the message, and it
 * is delivered to a domain RFC 2606 reserves so that it can never exist. There is no
 * error anywhere for the operator to notice — which is exactly how a site runs for months
 * quietly discarding enquiries.
 *
 * Submissions are still recorded as threads, so nothing is actually lost. But the owner
 * is not being told about them, and they have no way to know that.
 */
export interface ContactReminder {
  /** Forms addressed to a reserved placeholder domain. */
  placeholderForms: Array<{ formKey: string; label: string; recipient: string }>;
  /** True when nothing anywhere resolves to a deliverable address. */
  noFallback: boolean;
}

export async function getContactReminder(): Promise<ContactReminder | null> {
  // The sandbox is re-seeded on a schedule, so its placeholder is expected and permanent.
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') return null;

  try {
    const supabase = getServiceRoleSupabaseClient();
    const { data: endpoints } = await supabase
      .from('form_endpoints')
      .select('form_key, label, recipient_email');

    const placeholderForms = (endpoints ?? [])
      .filter((endpoint) => isPlaceholderEmail(endpoint.recipient_email))
      .map((endpoint) => ({
        formKey: endpoint.form_key,
        label: endpoint.label || 'Contact form',
        recipient: endpoint.recipient_email as string,
      }));

    // Forms with no deliverable address of their own lean on the site-wide ladder.
    // Whether a missing fallback matters depends entirely on whether anything needs it:
    // an install whose every form carries its own real address is correctly configured,
    // and warning it about an empty fallback would be noise.
    const dependsOnFallback = (endpoints ?? []).some(
      (endpoint) => !usableEmail(endpoint.recipient_email)
    );

    const { email: fallback } = await resolveSellerContactEmail();
    const noFallback = dependsOnFallback && !fallback;

    if (placeholderForms.length === 0 && !noFallback) return null;

    return { placeholderForms, noFallback };
  } catch {
    // Never let a reminder break the CMS shell.
    return null;
  }
}
