import 'libs/ui/src/styles/globals.css';
import '@nextblock-cms/editor/styles/editor.css';
// app/layout.tsx
import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from '@/components/theme-switcher';
import { hasEnvVars } from "@nextblock-cms/utils/server";
import { createClient as createSupabaseServerClient, getProfileWithRoleServerSide } from '@nextblock-cms/db/server';
import { getActiveLanguagesServerSide } from "@nextblock-cms/db/server"; // Import server-side language fetcher
import { getCopyrightSettings } from '@/app/cms/settings/copyright/actions';
import { getTranslations } from '@/app/cms/settings/extra-translations/actions';
import type { Database } from "@nextblock-cms/db"; // Import Language type
import type { Metadata } from 'next';
import Header from "@/components/Header";
import FooterNavigation from "@/components/FooterNavigation";
import { headers, cookies } from 'next/headers';
import { Providers } from './providers';
import { ToasterProvider } from './ToasterProvider';

type Language = Database['public']['Tables']['languages']['Row'];

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

// const themeCss = fs.readFileSync(path.join(process.cwd(), 'app/styles/theme.css'), 'utf8');

const DEFAULT_LOCALE_FOR_LAYOUT = 'en';


export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'My Ultra-Fast CMS',
  description: 'A block-based TypeScript CMS with Next.js and Supabase',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const supabase = createSupabaseServerClient();
  
  // Get headers and cookies first (synchronous operations)
  const headerList = await headers();
  const cookieStore = await cookies();
  const nonce = headerList.get('x-nonce') || '';

  const xUserLocaleHeader = headerList.get('x-user-locale');
  const nextUserLocaleCookie = cookieStore.get('NEXT_USER_LOCALE')?.value;

  let serverDeterminedLocale: string;
  if (xUserLocaleHeader) {
    serverDeterminedLocale = xUserLocaleHeader;
  } else {
    if (nextUserLocaleCookie) {
      serverDeterminedLocale = nextUserLocaleCookie;
    } else {
      serverDeterminedLocale = DEFAULT_LOCALE_FOR_LAYOUT;
    }
  }

  // Parallel execution of all database queries for better performance
  const [
    { data: { user } },
    availableLanguagesResult,
    copyrightSettingsResult,
    translationsResult
  ] = await Promise.all([
    supabase.auth.getUser(),
    getActiveLanguagesServerSide().catch(() => []),
    getCopyrightSettings().catch(() => ({ en: '© {year} My Ultra-Fast CMS. All rights reserved.' })),
    getTranslations().catch(() => [])
  ]);

  // Get profile only if user exists (conditional parallel execution)
  const profile = user ? await getProfileWithRoleServerSide(user.id) : null;
  const availableLanguages: Language[] = availableLanguagesResult;
  const defaultLanguage: Language | null = availableLanguages.find(lang => lang.is_default) || availableLanguages[0] || null;
  
  // Ensure serverDeterminedLocale is valid, fallback to default if not
  if (!availableLanguages.some(lang => lang.code === serverDeterminedLocale) && defaultLanguage) {
    serverDeterminedLocale = defaultLanguage.code;
  } else if (!availableLanguages.some(lang => lang.code === serverDeterminedLocale)) {
    // If still no valid locale (e.g. no languages in DB), keep layout default
    serverDeterminedLocale = DEFAULT_LOCALE_FOR_LAYOUT;
  }

  const copyrightSettings = copyrightSettingsResult;
  const copyrightTemplate = (copyrightSettings as Record<string, string>)[serverDeterminedLocale] || (copyrightSettings as Record<string, string>)['en'] || '© {year} My Ultra-Fast CMS. All rights reserved.';
  const copyrightText = copyrightTemplate.replace('{year}', new Date().getFullYear().toString());

  const translations = Array.isArray(translationsResult) ? translationsResult : [];
  
  return (
    <html lang={serverDeterminedLocale} suppressHydrationWarning>
      <head>
        <title>{metadata.title as string}</title>
        <meta name="description" content={metadata.description as string} />
        <link rel="preconnect" href="https://ppcppwsfnrptznvbxnsz.supabase.co" />
        <link rel="preconnect" href="https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://ppcppwsfnrptznvbxnsz.supabase.co" />
        <link rel="dns-prefetch" href="https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev" />
        <link rel="dns-prefetch" href="https://aws-0-us-east-1.pooler.supabase.com" />
        <link rel="dns-prefetch" href="https://db.ppcppwsfnrptznvbxnsz.supabase.co" />
        <link rel="dns-prefetch" href="https://realtime.supabase.com" />
        <link rel="preload" as="image" href="https://pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev/hero-bg.jpg" fetchPriority="high" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
          <ToasterProvider />
          <div className="flex-1 w-full flex flex-col items-center">
            <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
              <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
                {!await hasEnvVars() ? <EnvVarWarning /> : <Header currentLocale={serverDeterminedLocale} />}
              </div>
            </nav>
            <main className="flex-grow w-full">
              {children}
            </main>
            <footer className="w-full border-t py-8">
              <div className="mx-auto flex flex-col items-center justify-center gap-6 text-center text-xs">
                <FooterNavigation />
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
