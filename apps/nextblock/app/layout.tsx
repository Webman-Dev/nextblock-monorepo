import '@nextblock-cms/ui/styles/globals.css';
import '@nextblock-cms/editor/styles/editor.css';
// app/layout.tsx
import { EnvVarWarning } from "@/components/env-var-warning";
import { SandboxBanner } from "@/components/SandboxBanner";
import { Analytics } from "@vercel/analytics/next"
import { ThemeSwitcher } from '@/components/theme-switcher';
import type { Metadata } from 'next';
import Header from "@/components/Header";
import FooterNavigation from "@/components/FooterNavigation";
import { Providers } from './providers';
import { ToasterProvider } from './ToasterProvider';
import { createClient as createSupabaseServerClient, getProfileWithRoleServerSide } from '@nextblock-cms/db/server';
import { getActiveLanguagesServerSide } from '@nextblock-cms/db/server';
import { getNavigationMenu } from '@/app/cms/navigation/actions';
import { getActiveLogo } from '@/app/cms/settings/logos/actions';
import { getCopyrightSettings } from '@/app/cms/settings/copyright/actions';
import { getTranslations } from '@/app/cms/settings/extra-translations/actions';
import type { Database } from '@nextblock-cms/db';
import { headers, cookies } from 'next/headers';

const defaultUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

const DEFAULT_LOCALE_FOR_LAYOUT = 'en';

type Language = Database['public']['Tables']['languages']['Row'];
type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];

async function loadLayoutData() {
  const supabase = createSupabaseServerClient();

  const headerList = await headers();
  const cookieStore = await cookies();
  const nonce = headerList.get('x-nonce') || '';

  const xUserLocaleHeader = headerList.get('x-user-locale');
  const nextUserLocaleCookie = cookieStore.get('NEXT_USER_LOCALE')?.value;

  let serverDeterminedLocale =
    xUserLocaleHeader ??
    nextUserLocaleCookie ??
    DEFAULT_LOCALE_FOR_LAYOUT;

  const [
    { data: { user } },
    availableLanguagesResult,
    copyrightSettingsResult,
    translationsResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getActiveLanguagesServerSide().catch(() => []),
    getCopyrightSettings().catch(() => ({ en: '© {year} Nextblock CMS. All rights reserved.' })),
    getTranslations().catch(() => []),
  ]);

  const profile = user ? await getProfileWithRoleServerSide(user.id) : null;
  const availableLanguages: Language[] = availableLanguagesResult;
  const defaultLanguage: Language | null =
    availableLanguages.find((lang) => lang.is_default) ?? availableLanguages[0] ?? null;

  if (!availableLanguages.some((lang) => lang.code === serverDeterminedLocale) && defaultLanguage) {
    serverDeterminedLocale = defaultLanguage.code;
  } else if (!availableLanguages.some((lang) => lang.code === serverDeterminedLocale)) {
    serverDeterminedLocale = DEFAULT_LOCALE_FOR_LAYOUT;
  }

  const copyrightSettings = copyrightSettingsResult as Record<string, string>;
  const fallbackTemplate =
    copyrightSettings['en'] ?? '© {year} Nextblock CMS. All rights reserved.';
  const templateForLocale =
    copyrightSettings[serverDeterminedLocale] ?? fallbackTemplate;
  const copyrightText = templateForLocale.replace('{year}', new Date().getFullYear().toString());

  const translations = Array.isArray(translationsResult) ? translationsResult : [];

  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const headerNavItems: NavigationItem[] = await getNavigationMenu('HEADER', serverDeterminedLocale).catch(() => []);
  const footerNavItems: NavigationItem[] = await getNavigationMenu('FOOTER', serverDeterminedLocale).catch(() => []);
  const logo = await getActiveLogo().catch(() => null);

  const role = profile?.role ?? null;
  const canAccessCms = role === 'ADMIN' || role === 'WRITER';
  const siteTitle = logo?.site_title ?? 'Nextblock';

  return {
    user,
    profile,
    serverDeterminedLocale,
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
  };
}

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Nextblock CMS',
  description: 'Nextblock CMS pairs a visual block editor with a blazing-fast Next.js + Supabase architecture.',
  openGraph: {
    title: 'Nextblock CMS',
    description: 'Nextblock CMS pairs a visual block editor with a blazing-fast Next.js + Supabase architecture.',
    url: defaultUrl,
    siteName: 'Nextblock CMS',
    images: [
      {
        url: '/images/metadata_image.webp',
        width: 1200,
        height: 630,
        alt: 'Nextblock CMS',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nextblock CMS',
    description: 'Nextblock CMS pairs a visual block editor with a blazing-fast Next.js + Supabase architecture.',
    images: ['/images/metadata_image.webp'],
  },
  icons: {
    icon: [
      { url: '/favicon/favicon.ico' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png' },
    ],
  },
  manifest: '/favicon/site.webmanifest',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const {
    user,
    profile,
  serverDeterminedLocale,
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
} = await loadLayoutData();

  return (
    <html lang={serverDeterminedLocale} suppressHydrationWarning>
      <head>
        <title>{metadata.title as string}</title>
        <meta name="description" content={metadata.description as string} />
        <link rel="preconnect" href="https://ppcppwsfnrptznvbxnsz.supabase.co" />
        <link rel="dns-prefetch" href="https://ppcppwsfnrptznvbxnsz.supabase.co" />
        <link rel="dns-prefetch" href="https://aws-0-us-east-1.pooler.supabase.com" />
        <link rel="dns-prefetch" href="https://db.ppcppwsfnrptznvbxnsz.supabase.co" />
        <link rel="dns-prefetch" href="https://realtime.supabase.com" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Analytics/>
      </head>
      <body className="bg-background text-foreground min-h-screen flex flex-col">
        <Providers
          serverUser={user}
          serverProfile={profile}
          serverLocale={serverDeterminedLocale}
          initialAvailableLanguages={availableLanguages}
          initialDefaultLanguage={defaultLanguage}
          translations={translations}
          nonce={nonce}
        >
          {process.env.NEXT_PUBLIC_IS_SANDBOX === 'true' && <SandboxBanner />}
          <ToasterProvider />
          <div className="flex-1 w-full flex flex-col items-center">
            <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
              <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
                {!hasSupabaseEnv ? (
                  <EnvVarWarning />
                ) : (
                  <Header
                    navItems={headerNavItems}
                    canAccessCms={canAccessCms}
                    logo={logo}
                    siteTitle={siteTitle}
                  />
                )}
              </div>
            </nav>
            <main className="flex-grow w-full">
              {children}
            </main>
            <footer className="w-full border-t py-8">
              <div className="mx-auto flex flex-col items-center justify-center gap-6 text-center text-xs">
                <FooterNavigation navItems={footerNavItems} />
                <div className="flex flex-row items-center gap-2">
                  <p className="text-muted-foreground">{copyrightText}</p>
                  <ThemeSwitcher />
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
