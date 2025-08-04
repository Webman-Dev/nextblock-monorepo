"use client";

import React, { createContext, useContext, useMemo } from 'react';

type Translations = {
  [key: string]: {
    [lang: string]: string;
  };
};

type TranslationsContextType = {
  translations: Translations;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const TranslationsContext = createContext<TranslationsContextType | undefined>(undefined);

export function TranslationsProvider({
  children,
  translations,
  lang,
}: {
  children: React.ReactNode;
  translations: { key: string; translations: { [lang: string]: string } }[];
  lang: string;
}) {
  const processedTranslations = useMemo(() => {
    const result: Translations = {};
    for (const item of translations) {
      result[item.key] = item.translations;
    }
    return result;
  }, [translations]);

  const translate = (key: string, currentLang: string, params?: Record<string, string | number>): string => {
    const translationSet = processedTranslations[key];
    if (!translationSet) {
      return key; // Return key if not found
    }
    let text = translationSet[currentLang] || translationSet['en'] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, String(value));
      });
    }

    return text;
  };

  const value = {
    translations: processedTranslations,
    t: (key: string, params?: Record<string, string | number>) => translate(key, lang, params),
  };

  return (
    <TranslationsContext.Provider value={value}>
      {children}
    </TranslationsContext.Provider>
  );
}

export function useTranslations() {
  const context = useContext(TranslationsContext);
  if (context === undefined) {
    throw new Error('useTranslations must be used within a TranslationsProvider');
  }
  return context;
}