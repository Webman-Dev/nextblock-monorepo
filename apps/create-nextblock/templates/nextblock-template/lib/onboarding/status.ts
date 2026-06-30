import 'server-only';
// Derives the dashboard onboarding checklist live from configuration state. Every check
// reads public/service-role data only, so it works for both ADMIN and WRITER dashboards.
import { createClient } from '@nextblock-cms/db/server';
import { getStoreConfigStatus } from '@nextblock-cms/ecommerce/server';
import { getEmailPublicSettings } from '../config/email-settings';
import { getPrivacySettings } from '../privacy/settings';

export type OnboardingStep = {
  key: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
  optional: boolean;
};

export type OnboardingStatus = {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  dismissed: boolean;
};

// Seeded defaults (libs/db migrations 008 + 010). The branding/copyright steps count as
// "done" only when the value has been customized away from these — a fresh install ships
// with the seeds, so a plain presence check would mark every step complete immediately.
const SEEDED_SITE_TITLE = 'NextBlock™ CMS';
const SEEDED_LOGO_OBJECT_KEY = 'images/nextblock-logo-small.webp';
const SEEDED_COPYRIGHT: Record<string, string> = {
  en: '© {year} Nextblock CMS. All rights reserved.',
  fr: '© {year} Nextblock CMS. Tous droits réservés.',
};

/** True when at least one language's copyright text is set AND differs from the seed. */
function hasCustomCopyright(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value as Record<string, unknown>).some(([lang, v]) => {
    if (typeof v !== 'string') return false;
    const trimmed = v.trim();
    return trimmed.length > 0 && trimmed !== (SEEDED_COPYRIGHT[lang] ?? '');
  });
}

/** Pull the active logo's media object_key from the (to-one) embedded relation. */
function extractLogoObjectKey(logoRow: unknown): string | null {
  if (!logoRow || typeof logoRow !== 'object') return null;
  const media = (logoRow as { media?: unknown }).media;
  const record = Array.isArray(media) ? media[0] : media;
  if (!record || typeof record !== 'object') return null;
  const key = (record as { object_key?: unknown }).object_key;
  return typeof key === 'string' ? key : null;
}

export async function getOnboardingStatus(opts: {
  isEcommerceActive: boolean;
}): Promise<OnboardingStatus> {
  const supabase = createClient();

  const [{ data: settingRows }, { data: logoRow }, emailPublic, privacy] = await Promise.all([
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['footer_copyright', 'bot_protection_public', 'onboarding_state', 'site_title']),
    supabase
      .from('logos')
      .select('media:media_id(object_key)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getEmailPublicSettings(),
    getPrivacySettings(),
  ]);

  const rows = new Map((settingRows ?? []).map((r) => [r.key, r.value]));
  const botPublic = (rows.get('bot_protection_public') ?? {}) as Record<string, unknown>;
  const onboardingState = (rows.get('onboarding_state') ?? {}) as Record<string, unknown>;

  const siteTitleRaw = rows.get('site_title');
  const siteTitle = typeof siteTitleRaw === 'string' ? siteTitleRaw.trim() : '';
  const siteTitleCustomized = siteTitle.length > 0 && siteTitle !== SEEDED_SITE_TITLE;
  const logoObjectKey = extractLogoObjectKey(logoRow);
  const logoCustomized = Boolean(logoObjectKey) && logoObjectKey !== SEEDED_LOGO_OBJECT_KEY;

  // Branding is "done" once the user renames the site or uploads their own logo — not merely
  // because the seeded NextBlock title/logo exist.
  const brandingDone = siteTitleCustomized || logoCustomized;
  const copyrightDone = hasCustomCopyright(rows.get('footer_copyright'));
  const emailDone = Boolean(emailPublic.host) || Boolean(process.env['SMTP_HOST']);
  const analyticsDone = Boolean(privacy.gtm_id);
  const botProvider = typeof botPublic['provider'] === 'string' ? (botPublic['provider'] as string) : 'none';
  const botDone = botProvider !== 'none' && botProvider !== '';

  const steps: OnboardingStep[] = [
    {
      key: 'admin',
      title: 'Create your admin account',
      description: 'Your administrator account is set up.',
      href: '/cms/users',
      done: true,
      optional: false,
    },
    {
      key: 'branding',
      title: 'Add your branding',
      description: 'Upload your logo and set your site identity.',
      href: '/cms/settings/logos',
      done: brandingDone,
      optional: false,
    },
    {
      key: 'copyright',
      title: 'Set your copyright / footer',
      description: 'Configure the footer copyright shown across your site.',
      href: '/cms/settings/copyright',
      done: copyrightDone,
      optional: false,
    },
    {
      key: 'email',
      title: 'Configure email (SMTP)',
      description: 'Enable verification emails, password resets, and notifications.',
      href: '/cms/settings/email',
      done: emailDone,
      optional: false,
    },
    {
      key: 'analytics',
      title: 'Connect analytics',
      description: 'Add a Google Tag Manager ID for consent-gated analytics.',
      href: '/cms/settings/google-analytics',
      done: analyticsDone,
      optional: true,
    },
    {
      key: 'bot',
      title: 'Enable bot protection',
      description: 'Protect your sign-up and sign-in forms with a CAPTCHA.',
      href: '/cms/settings/bot-protection',
      done: botDone,
      optional: true,
    },
  ];

  if (opts.isEcommerceActive) {
    let paymentsDone = false;
    try {
      const storeStatus = await getStoreConfigStatus();
      paymentsDone = storeStatus.stripe.hasKeys || storeStatus.freemius.hasKeys;
    } catch {
      paymentsDone = false;
    }
    // Insert Payments before the optional steps.
    steps.splice(4, 0, {
      key: 'payments',
      title: 'Set up payment providers',
      description: 'Add your Stripe and/or Freemius API keys to accept payments.',
      href: '/cms/payments',
      done: paymentsDone,
      optional: false,
    });
  }

  const completed = steps.filter((s) => s.done).length;

  return {
    steps,
    completed,
    total: steps.length,
    dismissed: onboardingState['dismissed'] === true,
  };
}
