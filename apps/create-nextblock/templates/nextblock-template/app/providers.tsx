"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { CurrentContentProvider } from "@/context/CurrentContentContext";
import { TranslationsProvider } from '@nextblock-cms/utils';

export function Providers({ children, ...props }: { children: React.ReactNode;[key: string]: any; }) {
  const {
    serverUser,
    serverProfile,
    serverLocale,
    initialAvailableLanguages,
    initialDefaultLanguage,
    translations,
    nonce
  } = props;

  return (
    <AuthProvider serverUser={serverUser} serverProfile={serverProfile}>
      <LanguageProvider
        serverLocale={serverLocale}
        initialAvailableLanguages={initialAvailableLanguages}
        initialDefaultLanguage={initialDefaultLanguage}
      >
        <CurrentContentProvider>
          <TranslationsProvider translations={translations} lang={serverLocale}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
              nonce={nonce}
              themes={['light', 'dark', 'vibrant']}
            >
              {children}
            </ThemeProvider>
          </TranslationsProvider>
        </CurrentContentProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
