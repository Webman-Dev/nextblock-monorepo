import '@nextblock-cms/ui/styles/globals.css';
// app/layout.tsx

import type { Metadata } from 'next';
import Script from 'next/script';
import { Providers } from './providers';
import { DeferredCartDrawer } from '../components/DeferredCartDrawer';
import { CURRENCY_COOKIE_NAME } from '@nextblock-cms/ecommerce/currency-constants';
import { ToasterProvider } from './ToasterProvider';
import { AppShell } from '../components/AppShell';
import { PublicEnvBootstrap } from '../components/PublicEnvBootstrap';
import { ConsentGatedAnalytics } from '../components/privacy/ConsentGatedAnalytics';
import { ConsentBanner } from '../components/privacy/ConsentBanner';
import { getPrivacySettings } from '../lib/privacy/settings';
import { DEFAULT_PRIVACY_SETTINGS } from '../lib/privacy/types';
import { DeferredSpeedInsights } from '../components/DeferredSpeedInsights';
import { DeferredVisualEditing } from '../components/visual-editing/DeferredVisualEditing';
import {
  createClient as createSupabaseServerClient,
  getProfileWithRoleServerSide,
} from '@nextblock-cms/db/server';
import { getActiveLanguagesServerSide } from '@nextblock-cms/db/server';
import type { Database } from '@nextblock-cms/db';
import { headers, cookies, draftMode } from 'next/headers';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { unstable_cache } from 'next/cache';
import { createStaticSupabaseClient, getSiteSettings } from './lib/site-settings';
import { DEFAULT_OG_IMAGE } from './lib/seo';
import { resolveActiveLogo } from '../lib/logos/active-logo';
import {
  isSupabaseConfigured,
  resolveSupabaseAnonKey,
  resolveSupabaseUrl,
} from '../lib/setup/env-status';
import { resolveMediaBaseUrl } from '../lib/storage/provider';

const defaultUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

const DEFAULT_LOCALE_FOR_LAYOUT = 'en';
const PUBLIC_LAYOUT_REVALIDATE_SECONDS = 60;
const PUBLIC_LAYOUT_LOGO_CACHE_TAG = 'public-layout-logo';
const TRUSTED_TYPES_SCRIPT_STRATEGY =
  process.env.NODE_ENV === 'production' ? 'beforeInteractive' : 'afterInteractive';
const TRUSTED_TYPES_BOOTSTRAP = `
(function () {
  if (!window.trustedTypes || window.__nextblockTrustedTypesPolicy) return;
  try {
    window.__nextblockTrustedTypesPolicy = window.trustedTypes.createPolicy('default', {
      createHTML: function (value) { return value; },
      createScript: function (value) { return value; },
      createScriptURL: function (value) { return value; }
    });
  } catch (error) {
    window.__nextblockTrustedTypesPolicy = true;
  }
})();
`;

type Language = Database['public']['Tables']['languages']['Row'];
type StoreCurrency = Database['public']['Tables']['currencies']['Row'];
type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];
type MenuLocation = Database['public']['Enums']['menu_location'];
type HeaderLogo = Database['public']['Tables']['logos']['Row'] & {
  media: (Database['public']['Tables']['media']['Row'] & { alt_text: string | null }) | null;
};

const getCachedLanguages = unstable_cache(
  async (): Promise<Language[]> => {
    const supabase = createStaticSupabaseClient();
    const { data, error } = await supabase
      .from('languages')
      .select('id, code, name, is_default, is_active, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching cached languages:', error.message);
      return [];
    }

    return data || [];
  },
  ['public-layout-languages'],
  { revalidate: PUBLIC_LAYOUT_REVALIDATE_SECONDS }
);

const getCachedCopyrightSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const supabase = createStaticSupabaseClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'footer_copyright')
      .single();

    if (error || !data) {
      console.error('Error fetching cached copyright settings:', error);
      return { en: '(c) {year} Nextblock CMS. All rights reserved.' };
    }

    return data.value as Record<string, string>;
  },
  ['public-layout-copyright'],
  { revalidate: PUBLIC_LAYOUT_REVALIDATE_SECONDS }
);

const getCachedFooterAttribution = unstable_cache(
  async (): Promise<boolean> => {
    const supabase = createStaticSupabaseClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'footer_show_attribution')
      .maybeSingle();

    // Absent row = enabled (default); only an explicit `false` disables it.
    return data ? data.value !== false : true;
  },
  ['public-layout-footer-attribution'],
  { revalidate: PUBLIC_LAYOUT_REVALIDATE_SECONDS }
);

const getCachedGlobalCss = unstable_cache(
  async (): Promise<string> => {
    const supabase = createStaticSupabaseClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'global_css')
      .single();

    if (error || !data || !data.value) {
      return '';
    }
    if (typeof data.value === 'string') {
        if (data.value.startsWith('"') && data.value.endsWith('"')) {
            try { return JSON.parse(data.value); } catch { return data.value; }
        }
        return data.value;
    }
    return String(data.value);
  },
  ['public-layout-global-css'],
  { revalidate: PUBLIC_LAYOUT_REVALIDATE_SECONDS }
);

const getCachedTranslations = unstable_cache(
  async () => {
    const supabase = createStaticSupabaseClient();
    const { data, error } = await supabase
      .from('translations')
      .select('key, translations, created_at, updated_at')
      .order('key');

    if (error) {
      console.error('Error fetching cached translations:', error.message);
      return [];
    }

    return data || [];
  },
  ['public-layout-translations'],
  {
    revalidate: PUBLIC_LAYOUT_REVALIDATE_SECONDS,
    tags: ['public-layout-translations'],
  }
);

const getCachedCurrencies = unstable_cache(
  async (): Promise<StoreCurrency[]> => {
    const supabase = createStaticSupabaseClient();
    const { data, error } = await supabase
      .from('currencies')
      .select(
        'id, code, symbol, exchange_rate, is_default, is_active, auto_sync_product_prices, auto_update_exchange_rate, exchange_rate_source, exchange_rate_updated_at, rounding_mode, rounding_increment, rounding_charm_amount, created_at, updated_at'
      )
      .eq('is_active', true)
      .order('code', { ascending: true });

    if (error) {
      console.error('Error fetching cached currencies:', error.message);
      return [];
    }

    return data || [];
  },
  ['public-layout-currencies'],
  { revalidate: PUBLIC_LAYOUT_REVALIDATE_SECONDS }
);

const getCachedNavigationMenu = unstable_cache(
  async (menuKey: MenuLocation, languageCode: string): Promise<NavigationItem[]> => {
    const supabase = createStaticSupabaseClient();

    const { data: language, error: langError } = await supabase
      .from('languages')
      .select('id')
      .eq('code', languageCode)
      .single();

    if (langError || !language) {
      console.error(
        `Error fetching cached navigation language ${languageCode} for ${menuKey}:`,
        langError
      );
      return [];
    }

    const { data: items, error: itemsError } = await supabase
      .from('navigation_items')
      .select('*, pages(slug)')
      .eq('menu_key', menuKey)
      .eq('language_id', language.id)
      .order('parent_id', { nullsFirst: true })
      .order('order');

    if (itemsError) {
      console.error(
        `Error fetching cached navigation items for ${menuKey} (${languageCode}):`,
        itemsError
      );
      return [];
    }

    return (items || []).map((item) => ({ ...item, id: Number(item.id) }));
  },
  ['public-layout-navigation'],
  { revalidate: PUBLIC_LAYOUT_REVALIDATE_SECONDS }
);

const getCachedActiveLogo = unstable_cache(
  async (): Promise<HeaderLogo | null> => {
    try {
      const supabase = createStaticSupabaseClient();
      // Honor the admin-pinned active logo (site_settings.active_logo_id), else newest.
      const logo = await resolveActiveLogo(supabase);
      return (logo as HeaderLogo | null) ?? null;
    } catch (error) {
      console.error('Error fetching cached active logo:', error);
      return null;
    }
  },
  ['public-layout-logo'],
  { revalidate: PUBLIC_LAYOUT_REVALIDATE_SECONDS, tags: [PUBLIC_LAYOUT_LOGO_CACHE_TAG] }
);

async function loadLayoutData() {
  const headerList = await headers();
  const nonce = headerList.get('x-nonce') || '';
  const requestPath = headerList.get('x-nextblock-path') || '';

  // Skip the public-chrome data loading when there's nothing to render it on: an
  // unconfigured instance, OR the standalone /setup wizard. On /setup, AppShell shows no
  // header/footer anyway, and the DB schema may not exist yet (configured-but-pre-migrate)
  // — querying it just produces noisy "table not found" errors for data nobody displays.
  if (!isSupabaseConfigured() || requestPath.startsWith('/setup')) {
    return {
      user: null,
      profile: null,
      serverDeterminedLocale: DEFAULT_LOCALE_FOR_LAYOUT,
      availableCurrencies: [] as StoreCurrency[],
      serverCurrencyCode: null,
      availableLanguages: [] as Language[],
      defaultLanguage: null,
      translations: [] as Awaited<ReturnType<typeof getCachedTranslations>>,
      copyrightText: '',
      nonce,
      hasSupabaseEnv: false,
      headerNavItems: [] as NavigationItem[],
      footerNavItems: [] as NavigationItem[],
      logo: null as HeaderLogo | null,
      canAccessCms: false,
      siteTitle: 'NextBlock',
      isEcommerceActive: false,
      globalCss: '',
      privacySettings: DEFAULT_PRIVACY_SETTINGS,
      footerAttributionEnabled: true,
    };
  }

  const supabase = createSupabaseServerClient();
  const cookieStore = await cookies();

  const xUserLocaleHeader = headerList.get('x-user-locale');
  const nextUserLocaleCookie = cookieStore.get('NEXT_USER_LOCALE')?.value;
  const serverCurrencyCode = cookieStore.get(CURRENCY_COOKIE_NAME)?.value ?? null;

  let serverDeterminedLocale =
    xUserLocaleHeader ??
    nextUserLocaleCookie ??
    DEFAULT_LOCALE_FOR_LAYOUT;

  const [
    {
      data: { user },
    },
    availableLanguagesResult,
    currenciesResult,
    copyrightSettingsResult,
    globalCssResult,
    translationsResult,
    isEcommerceActive,
    privacySettings,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getCachedLanguages().catch(() => getActiveLanguagesServerSide().catch(() => [])),
    getCachedCurrencies().catch(() => []),
    getCachedCopyrightSettings().catch(() => ({
      en: '(c) {year} Nextblock CMS. All rights reserved.',
    })),
    getCachedGlobalCss().catch(() => ''),
    getCachedTranslations().catch(() => []),
    verifyPackageOnline('ecommerce').catch(() => false),
    getPrivacySettings().catch(() => DEFAULT_PRIVACY_SETTINGS),
  ]);

  const availableLanguages: Language[] = availableLanguagesResult;
  const availableCurrencies: StoreCurrency[] = currenciesResult;
  const defaultLanguage: Language | null =
    availableLanguages.find((lang) => lang.is_default) ?? availableLanguages[0] ?? null;

  if (!availableLanguages.some((lang) => lang.code === serverDeterminedLocale) && defaultLanguage) {
    serverDeterminedLocale = defaultLanguage.code;
  } else if (!availableLanguages.some((lang) => lang.code === serverDeterminedLocale)) {
    serverDeterminedLocale = DEFAULT_LOCALE_FOR_LAYOUT;
  }

  const copyrightSettings = copyrightSettingsResult as Record<string, string>;
  const fallbackTemplate =
    copyrightSettings.en ?? '(c) {year} Nextblock CMS. All rights reserved.';
  const templateForLocale = copyrightSettings[serverDeterminedLocale] ?? fallbackTemplate;
  const copyrightText = templateForLocale.replace('{year}', new Date().getFullYear().toString());

  const globalCss = typeof globalCssResult === 'string' ? globalCssResult : '';
  const translations = Array.isArray(translationsResult) ? translationsResult : [];

  const hasSupabaseEnv = isSupabaseConfigured();

  const [profile, headerNavItems, footerNavItems, logo] = await Promise.all([
    user ? getProfileWithRoleServerSide(user.id) : Promise.resolve(null),
    getCachedNavigationMenu('HEADER', serverDeterminedLocale).catch(() => []),
    getCachedNavigationMenu('FOOTER', serverDeterminedLocale).catch(() => []),
    getCachedActiveLogo().catch(() => null),
  ]);

  const role = profile?.role ?? null;
  const canAccessCms = role === 'ADMIN' || role === 'WRITER';
  const { siteTitle } = await getSiteSettings();
  const footerAttributionEnabled = await getCachedFooterAttribution().catch(() => true);

  return {
    user,
    profile,
    serverDeterminedLocale,
    availableCurrencies,
    serverCurrencyCode,
    availableLanguages,
    defaultLanguage,
    translations,
    copyrightText,
    nonce,
    hasSupabaseEnv,
    headerNavItems,
    footerNavItems,
    logo,
    canAccessCms,
    siteTitle,
    isEcommerceActive,
    globalCss,
    privacySettings,
    footerAttributionEnabled,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { siteTitle, siteDescription, siteKeywords } = await getSiteSettings();
  const isSandbox = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true';

  return {
    metadataBase: new URL(defaultUrl),
    title: {
      default: siteTitle,
      template: `%s | ${siteTitle}`,
    },
    description: siteDescription,
    keywords: siteKeywords,
    applicationName: siteTitle,
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: defaultUrl,
      siteName: siteTitle,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: siteTitle,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description: siteDescription,
      images: [DEFAULT_OG_IMAGE],
    },
    icons: {
      icon: [
        { url: '/favicon/favicon.ico' },
        { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: [{ url: '/favicon/apple-touch-icon.png' }],
    },
    manifest: '/favicon/site.webmanifest',
    // Sandbox is a copy of production, so keep it out of the index. Use
    // `noindex, follow` (not nofollow) so Googlebot still follows internal links,
    // recrawls every page, and drops them all — paired with an allow-crawl
    // robots.txt (see app/robots.txt/route.ts) so the noindex is actually seen.
    robots: isSandbox ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const {
    user,
    profile,
    serverDeterminedLocale,
    availableCurrencies,
    serverCurrencyCode,
    availableLanguages,
    defaultLanguage,
    translations,
    copyrightText,
    nonce,
    hasSupabaseEnv,
    headerNavItems,
    logo,
    footerNavItems,
    canAccessCms,
    siteTitle,
    isEcommerceActive,
    globalCss,
    privacySettings,
    footerAttributionEnabled,
  } = await loadLayoutData();
  const draft = await draftMode();
  // GTM container id comes solely from the privacy settings row (site_settings).
  // There is intentionally no NEXT_PUBLIC_GTM_ID env fallback — analytics is
  // configured in the CMS (Settings -> Privacy), not via build-time env.
  const resolvedGtmId = privacySettings.gtm_id || '';
  const visualEditingEnabled =
    draft.isEnabled || process.env.NEXTBLOCK_VISUAL_EDITING_ENABLED === 'true';
  const isVercelDeployment = process.env.VERCEL === '1';
  const toolbarEnabled =
    process.env.NEXTBLOCK_VERCEL_TOOLBAR_ENABLED === 'true' ||
    (isVercelDeployment && visualEditingEnabled);
  const Toolbar = toolbarEnabled
    ? (await import('@vercel/toolbar/next')).VercelToolbar
    : null;

  // Expose the PUBLIC Supabase values (url + anon key — both safe to ship to the browser)
  // to the client at runtime via <PublicEnvBootstrap>. In production the client uses the
  // build-time-inlined NEXT_PUBLIC_* and these just match; it only matters in local dev,
  // where the wizard writes those vars at runtime and the loaded bundle would otherwise
  // hold stale empties until a dev-server restart. Read from server process.env (fresh).
  const publicSupabaseUrl = resolveSupabaseUrl() || '';
  const publicSupabaseAnonKey = resolveSupabaseAnonKey() || '';

  return (
    <html lang={serverDeterminedLocale} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {globalCss && <style dangerouslySetInnerHTML={{ __html: globalCss }} />}
      </head>
      <body className="min-h-screen">
        {/* Sets window.__NEXTBLOCK_PUBLIC_ENV__ synchronously during render, before any
            descendant calls the browser Supabase client — the local-dev runtime fallback. */}
        <PublicEnvBootstrap
          url={publicSupabaseUrl}
          anonKey={publicSupabaseAnonKey}
          r2Base={resolveMediaBaseUrl()}
        />
        {/* In development this loads after hydration to avoid browser-hidden nonce comparisons. */}
        <Script
          id="trusted-types-bootstrap"
          strategy={TRUSTED_TYPES_SCRIPT_STRATEGY}
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: TRUSTED_TYPES_BOOTSTRAP }}
        />
        <Providers
          serverUser={user}
          serverProfile={profile}
          serverLocale={serverDeterminedLocale}
          initialCurrencies={availableCurrencies}
          initialCurrencyCode={serverCurrencyCode}
          initialAvailableLanguages={availableLanguages}
          initialDefaultLanguage={defaultLanguage}
          translations={translations}
          nonce={nonce}
        >
          <ToasterProvider />
          <AppShell
            canAccessCms={canAccessCms}
            copyrightText={copyrightText}
            corporateFooter={{
              legalName: privacySettings.corporate.legal_name,
              address: privacySettings.corporate.address,
              supportEmail: privacySettings.corporate.support_email,
            }}
            footerNavItems={footerNavItems}
            hasSupabaseEnv={hasSupabaseEnv}
            headerNavItems={headerNavItems}
            isDraftModeEnabled={draft.isEnabled}
            isEcommerceActive={isEcommerceActive}
            logo={logo}
            showFooterAttribution={footerAttributionEnabled}
            siteTitle={siteTitle}
          >
            {children}
          </AppShell>

          {isEcommerceActive && <DeferredCartDrawer />}
          {visualEditingEnabled && <DeferredVisualEditing />}
          {Toolbar && <Toolbar nonce={nonce} />}
          {privacySettings.banner_enabled && <ConsentBanner />}
        </Providers>
        <DeferredSpeedInsights />
        <ConsentGatedAnalytics
          gtmId={resolvedGtmId}
          gaMeasurementId={privacySettings.ga_measurement_id || ''}
          customScripts={privacySettings.custom_scripts}
          nonce={nonce}
        />
      </body>
    </html>
  );
}
