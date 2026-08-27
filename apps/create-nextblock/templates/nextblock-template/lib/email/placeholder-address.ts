/**
 * Addresses that look configured but can never receive mail.
 *
 * Seed data has to put *something* in a contact field, and `contact@example.com` is the
 * conventional choice. The trouble is that it is indistinguishable from a real setting to
 * every code path downstream: the form reports success, the transport accepts the
 * message, and it is delivered nowhere. An operator can run that way for months without
 * a single error to notice.
 *
 * The domains here are reserved by RFC 2606 and RFC 6761 precisely so they can never be
 * registered, which is what makes this a safe judgement rather than a guess: nothing at
 * `example.com` is ever a real inbox. Treating them as unset lets the recipient ladder
 * fall through to something that works, and lets the CMS say so out loud.
 *
 * Deliberately dependency-free so both server modules and the CMS can use it.
 */

const RESERVED_DOMAINS = new Set(['example.com', 'example.org', 'example.net', 'example.edu']);
const RESERVED_TLDS = ['.example', '.invalid', '.test', '.localhost', '.local'];

export function isPlaceholderEmail(value: string | null | undefined): boolean {
  const email = value?.trim().toLowerCase() ?? '';
  if (!email) return false;

  const at = email.lastIndexOf('@');
  if (at === -1) return false;

  const domain = email.slice(at + 1);
  if (!domain) return false;

  return RESERVED_DOMAINS.has(domain) || RESERVED_TLDS.some((tld) => domain.endsWith(tld));
}

/** The address if it could actually receive mail, otherwise null. */
export function usableEmail(value: string | null | undefined): string | null {
  const email = value?.trim() ?? '';
  if (!email || isPlaceholderEmail(email)) return null;
  return email;
}
