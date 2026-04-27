import '@nextblock-cms/ui/styles/globals.css';
// eslint-disable-next-line @nx/enforce-module-boundaries
import '@nextblock-cms/editor/styles/editor.css';
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

import type { Metadata } from 'next';
import { Providers } from './providers';
import { CartDrawer } from '@nextblock-cms/ecommerce';
import { CURRENCY_COOKIE_NAME } from '@nextblock-cms/ecommerce/server';
import { ToasterProvider } from './ToasterProvider';
import { AppShell } from '../components/AppShell';
import { DeferredGoogleTagManager } from '../components/DeferredGoogleTagManager';
import {
  createClient as createSupabaseServerClient,
  getProfileWithRoleServerSide,
} from '@nextblock-cms/db/server';
import { getActiveLanguagesServerSide } from '@nextblock-cms/db/server';
import type { Database } from '@nextblock-cms/db';
import { headers, cookies } from 'next/headers';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';

const defaultUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

const DEFAULT_LOCALE_FOR_LAYOUT = 'en';
const PUBLIC_LAYOUT_REVALIDATE_SECONDS = 60;

type Language = Database['public']['Tables']['languages']['Row'];
type StoreCurrency = Database['public']['Tables']['currencies']['Row'];
type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];
type MenuLocation = Database['public']['Enums']['menu_location'];
type HeaderLogo = Database['public']['Tables']['logos']['Row'] & {
  site_title?: string | null;
  media: (Database['public']['Tables']['media']['Row'] & { alt_text: string | null }) | null;
};

function normalizePotentialMojibake(value: string): string {
  if (!/[ÃÂ]/.test(value)) {
    return value;
  }

  return value
    .replaceAll('Ãƒâ€šÃ‚Â©', '©')
    .replaceAll('Ã‚Â©', '©')
    .replaceAll('Â©', '©')
    .replaceAll('Tous droits rÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â©s.', 'Tous droits réservés.')
    .replaceAll('Tous droits rÃƒÂ©servÃƒÂ©s.', 'Tous droits réservés.')
    .replaceAll('Tous droits rÃ©servÃ©s.', 'Tous droits réservés.')
    .replaceAll('rÃƒÆ’Ã‚Â©servÃƒÆ’Ã‚Â©s', 'réservés')
    .replaceAll('rÃƒÂ©servÃƒÂ©s', 'réservés')
    .replaceAll('rÃ©servÃ©s', 'réservés');
}

function createStaticSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables for public layout data');
  }

  return createSupabaseJsClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

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

    const rawValue = data.value as Record<string, string>;

    return Object.fromEntries(
      Object.entries(rawValue).map(([locale, text]) => [
        locale,
        typeof text === 'string' ? normalizePotentialMojibake(text) : text,
      ])
    ) as Record<string, string>;
  },
  ['public-layout-copyright'],
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

const getCachedSiteSettings = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const supabase = createStaticSupabaseClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['site_title', 'site_description']);

    if (error || !data) {
      console.error('Error fetching cached site settings:', error);
      return {
        site_title: 'Nextblock CMS',
        site_description: 'Nextblock CMS pairs a visual block editor with a blazing-fast Next.js + Supabase architecture.'
      };
    }

    const settings: Record<string, string> = {};
    data.forEach(item => {
      if (typeof item.value === 'string') {
        settings[item.key] = item.value;
      }
    });

    return {
      site_title: settings.site_title || 'Nextblock CMS',
      site_description: settings.site_description || 'Nextblock CMS pairs a visual block editor with a blazing-fast Next.js + Supabase architecture.'
    };
  },
  ['public-site-settings'],
  { revalidate: PUBLIC_LAYOUT_REVALIDATE_SECONDS }
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
    const supabase = createStaticSupabaseClient();
    const { data, error } = await supabase
      .from('logos')
      .select(
        `
        *,
        media:media_id (*)
      `
      )
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching cached active logo:', error.message);
      return null;
    }

    return data as HeaderLogo | null;
  },
  ['public-layout-logo'],
  { revalidate: PUBLIC_LAYOUT_REVALIDATE_SECONDS }
);

async function loadLayoutData() {
  const supabase = createSupabaseServerClient();

  const headerList = await headers();
  const cookieStore = await cookies();
  const nonce = headerList.get('x-nonce') || '';

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
    translationsResult,
    isEcommerceActive,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getCachedLanguages().catch(() => getActiveLanguagesServerSide().catch(() => [])),
    getCachedCurrencies().catch(() => []),
    getCachedCopyrightSettings().catch(() => ({
      en: '(c) {year} Nextblock CMS. All rights reserved.',
    })),
    getCachedTranslations().catch(() => []),
    verifyPackageOnline('ecommerce').catch(() => false),
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

  const translations = Array.isArray(translationsResult) ? translationsResult : [];

  const hasSupabaseEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [profile, headerNavItems, footerNavItems, logo] = await Promise.all([
    user ? getProfileWithRoleServerSide(user.id) : Promise.resolve(null),
    getCachedNavigationMenu('HEADER', serverDeterminedLocale).catch(() => []),
    getCachedNavigationMenu('FOOTER', serverDeterminedLocale).catch(() => []),
    getCachedActiveLogo().catch(() => null),
  ]);

  const role = profile?.role ?? null;
  const canAccessCms = role === 'ADMIN' || role === 'WRITER';
  const siteTitle = logo?.site_title ?? 'Nextblock';

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
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getCachedSiteSettings();
  const isSandbox = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true';

  return {
    metadataBase: new URL(defaultUrl),
    title: {
      default: siteSettings.site_title,
      template: `%s | ${siteSettings.site_title}`,
    },
    description: siteSettings.site_description,
    openGraph: {
      title: siteSettings.site_title,
      description: siteSettings.site_description,
      url: defaultUrl,
      siteName: siteSettings.site_title,
      images: [
        {
          url: '/images/metadata_image.webp',
          width: 1200,
          height: 630,
          alt: siteSettings.site_title,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: siteSettings.site_title,
      description: siteSettings.site_description,
      images: ['/images/metadata_image.webp'],
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
    robots: isSandbox ? { index: false, follow: false } : { index: true, follow: true },
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
  } = await loadLayoutData();

  return (
    <html lang={serverDeterminedLocale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://ppcppwsfnrptznvbxnsz.supabase.co" />
        <link rel="dns-prefetch" href="https://ppcppwsfnrptznvbxnsz.supabase.co" />
        <link rel="dns-prefetch" href="https://aws-0-us-east-1.pooler.supabase.com" />
        <link rel="dns-prefetch" href="https://db.ppcppwsfnrptznvbxnsz.supabase.co" />
        <link rel="dns-prefetch" href="https://realtime.supabase.com" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* @ts-expect-error - SpeedInsights version might have missing nonce in types but supports it in runtime */}
        <SpeedInsights nonce={nonce} />
      </head>
      <body className="min-h-screen">
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
            footerNavItems={footerNavItems}
            hasSupabaseEnv={hasSupabaseEnv}
            headerNavItems={headerNavItems}
            isEcommerceActive={isEcommerceActive}
            logo={logo}
            siteTitle={siteTitle}
          >
            {children}
          </AppShell>

          {isEcommerceActive && <CartDrawer />}
        </Providers>
        <DeferredGoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} nonce={nonce} />
      </body>
    </html>
  );
}
