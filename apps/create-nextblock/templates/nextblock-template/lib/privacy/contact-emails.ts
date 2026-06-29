// Server-only resolution of the public-facing contact addresses that used to be
// hard-coded into seed data. The goal: a downloaded/self-hosted copy of NextBlock
// must NEVER route mail to the original authors. Real addresses live only in
// sandbox env vars (never committed); committed seeds use neutral @example.com
// placeholders.
//
// Resolution precedence (highest first):
//   1. The admin-configured value (CMS Settings -> Privacy "Support email").
//   2. The sandbox env var, but only when NEXT_PUBLIC_IS_SANDBOX === 'true'.
//   3. A neutral @example.com placeholder.
//
// Sandbox DB resets re-seed dummy values on every run, so a static seed value
// could never stay correct for the hosted demo — hence env-var-backed resolution
// at render time instead of baking the address into the migration.
import 'server-only';
import { cache } from 'react';
import { getPrivacySettings } from './settings';

/** Neutral placeholder shown when nothing is configured (real installs). */
const DUMMY_PRIVACY_EMAIL = 'privacy@example.com';

/** Merge tag seeded into the Privacy Policy / Terms page copy. */
export const PRIVACY_EMAIL_TAG = '{{privacy_email}}';

function isSandbox(): boolean {
  return process.env.NEXT_PUBLIC_IS_SANDBOX === 'true';
}

/**
 * Resolve the privacy/legal contact address. `supportEmail` is the admin-set
 * value from privacy settings (reused as the legal contact per product choice).
 */
export function resolvePrivacyEmail(supportEmail: string): string {
  const configured = supportEmail.trim();
  if (configured) return configured;

  if (isSandbox()) {
    const fromEnv = process.env.SANDBOX_PRIVACY_EMAIL?.trim();
    if (fromEnv) return fromEnv;
  }

  return DUMMY_PRIVACY_EMAIL;
}

/**
 * Per-request cached read of the resolved privacy email. Wrapped in React
 * `cache()` so the many text blocks on a legal page share a single settings
 * lookup within one render.
 */
export const getPrivacyMergeEmail = cache(async (): Promise<string> => {
  const settings = await getPrivacySettings();
  return resolvePrivacyEmail(settings.corporate.support_email);
});

/**
 * Substitute supported merge tags in a block's HTML. Callers should guard with a
 * cheap `html.includes('{{')` check first so normal blocks pay nothing.
 * Currently supports `{{privacy_email}}` (text and `mailto:` href forms).
 */
export async function substitutePrivacyMergeTags(html: string): Promise<string> {
  if (!html.includes(PRIVACY_EMAIL_TAG)) return html;
  const email = await getPrivacyMergeEmail();
  return html.split(PRIVACY_EMAIL_TAG).join(email);
}
