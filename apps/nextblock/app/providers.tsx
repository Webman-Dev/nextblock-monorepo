"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { CurrentContentProvider } from '../context/CurrentContentContext';
import { CartTranslator } from '../components/CartTranslator';
import { TranslationsProvider } from '@nextblock-cms/utils';

function TranslationBridge({
  children,
  translations,
}: {
  children: React.ReactNode;
  translations: { key: string; translations: Record<string, string> }[];
}) {
  const { currentLocale } = useLanguage();

  return (
    <TranslationsProvider translations={translations} lang={currentLocale}>
      {children}
    </TranslationsProvider>
  );
}

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
          <CartTranslator />
          <TranslationBridge translations={translations}>
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
          </TranslationBridge>
        </CurrentContentProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
