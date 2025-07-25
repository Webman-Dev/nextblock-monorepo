import 'libs/ui/src/styles/globals.css';
// app/layout.tsx
import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from '@/components/theme-switcher';
import { hasEnvVars } from "@nextblock-monorepo/utils";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { createClient as createSupabaseServerClient, getProfileWithRoleServerSide } from '@nextblock-monorepo/db/server';
import { CurrentContentProvider } from "@/context/CurrentContentContext"; // Import CurrentContentProvider
import { getActiveLanguagesServerSide } from "@nextblock-monorepo/db/server"; // Import server-side language fetcher
import { getCopyrightSettings } from '@/app/cms/settings/copyright/actions';
import { getTranslations } from '@/app/cms/settings/extra-translations/actions';
import { TranslationsProvider } from '@nextblock-monorepo/utils';
import type { Database } from "@nextblock-monorepo/db"; // Import Language type
import type { Metadata } from 'next';
import Header from "@/components/Header";
import FooterNavigation from "@/components/FooterNavigation";
import { headers, cookies } from 'next/headers';

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
  const startTime = Date.now();
  console.log('[PERF] Layout render started at:', startTime);

  const supabase = createSupabaseServerClient();
  
  // Get headers and cookies first (synchronous operations)
  const headerStart = Date.now();
  const headerList = await headers();
  const cookieStore = await cookies();
  const nonce = headerList.get('x-nonce') || '';
  console.log('[PERF] Headers/cookies completed in:', Date.now() - headerStart, 'ms');

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
  const queryStart = Date.now();
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
  console.log('[PERF] Parallel database queries completed in:', Date.now() - queryStart, 'ms');

  // Get profile only if user exists (conditional parallel execution)
  const profileStart = Date.now();
  const profile = user ? await getProfileWithRoleServerSide(user.id) : null;
  if (user) {
    console.log('[PERF] Profile query completed in:', Date.now() - profileStart, 'ms');
  }

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
  
  const totalTime = Date.now() - startTime;
  console.log('[PERF] Layout render completed in:', totalTime, 'ms');
  
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
        <AuthProvider serverUser={user} serverProfile={profile}>
          <LanguageProvider
            serverLocale={serverDeterminedLocale}
            initialAvailableLanguages={availableLanguages}
            initialDefaultLanguage={defaultLanguage}
          >
            <CurrentContentProvider>
              <TranslationsProvider translations={translations} lang={serverDeterminedLocale}>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                enableSystem
                disableTransitionOnChange
                nonce={nonce}
              >
                <div className="flex-1 w-full flex flex-col items-center">
                  <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
                    <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
                      {!hasEnvVars ? <EnvVarWarning /> : <Header currentLocale={serverDeterminedLocale} />}
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
                </ThemeProvider>
              </TranslationsProvider>
            </CurrentContentProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
