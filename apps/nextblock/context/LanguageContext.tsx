// context/LanguageContext.tsx
'use client'; // This directive applies to the rest of the file.

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Database } from '@nextblock-cms/db';
import { getActiveLanguagesClientSide } from '@nextblock-cms/db';

type Language = Database['public']['Tables']['languages']['Row'];
import Cookies from 'js-cookie';

const LANGUAGE_STORAGE_KEY = 'preferred_locale_storage';
const LANGUAGE_COOKIE_KEY = 'NEXT_USER_LOCALE';
const DEFAULT_FALLBACK_LOCALE = 'en'; // Your ultimate fallback

interface LanguageContextType {
  currentLocale: string;
  setCurrentLocale: (localeCode: string) => void;
  availableLanguages: Language[];
  defaultLanguage: Language | null;
  isLoadingLanguages: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  serverLocale?: string; // Locale determined on the server (from X-User-Locale header)
  initialAvailableLanguages?: Language[]; // Languages fetched on the server
  initialDefaultLanguage?: Language | null; // Default language determined on the server
}

export const LanguageProvider = ({
  children,
  serverLocale,
  initialAvailableLanguages,
  initialDefaultLanguage
}: LanguageProviderProps) => {

  const [currentLocale, _setCurrentLocale] = useState<string>(() => {
    let initialVal = DEFAULT_FALLBACK_LOCALE;
    if (serverLocale) {
      initialVal = serverLocale;
    } else {
        const cookieVal = Cookies.get(LANGUAGE_COOKIE_KEY);
        if (cookieVal) {
            initialVal = cookieVal;
        } else {
            const storageVal = typeof window !== 'undefined' ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
            if (storageVal) {
                initialVal = storageVal;
            }
        }
    }
    return initialVal;
  });

  const [availableLanguages, setAvailableLanguages] = useState<Language[]>(initialAvailableLanguages || []);
  const [defaultLanguage, setDefaultLanguage] = useState<Language | null>(initialDefaultLanguage || null);
  // isLoadingLanguages is true if server didn't provide initial languages, or if they were empty.
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(!initialAvailableLanguages || initialAvailableLanguages.length === 0);
  const [clientSelectedLocale, setClientSelectedLocale] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // Track mount status

    const initializeLanguages = async () => {
      setIsLoadingLanguages(true); // Set loading true at the start of initialization

      let languagesToUse = initialAvailableLanguages;
      let defaultLangToUse = initialDefaultLanguage;

      // If server didn't provide languages, or they were empty, fetch client-side as a fallback.
      if (!languagesToUse || languagesToUse.length === 0) {
        try {
          const fetchedLangs = await getActiveLanguagesClientSide();
          if (isMounted) { // Check mount status before setting state
            languagesToUse = fetchedLangs;
            setAvailableLanguages(fetchedLangs);
            defaultLangToUse = fetchedLangs.find(lang => lang.is_default) || fetchedLangs[0] || null;
            setDefaultLanguage(defaultLangToUse ?? null);
          }
        } catch (error) {
          console.error("LanguageContext: Error fetching languages client-side", error);
          if (isMounted) { // Still ensure we update loading state on error
             languagesToUse = []; // Fallback to empty array
             defaultLangToUse = null;
          }
        }
      }
      
      if (!isMounted) return; // Early exit if component unmounted or deps changed

      // Determine effective locale based on serverLocale, cookies, localStorage, or DB default
      const isValidLang = (lc: string | undefined) => lc && languagesToUse && languagesToUse.some(lang => lang.code === lc);
      const cookieLocale = Cookies.get(LANGUAGE_COOKIE_KEY);
      const storedLocale = typeof window !== 'undefined' ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;

      let effectiveLocale = DEFAULT_FALLBACK_LOCALE; // Start with a fallback

      if (clientSelectedLocale) {
        // User has made a direct, recent selection. This is the new source of truth for effectiveLocale.
        effectiveLocale = clientSelectedLocale;

        // If the server has caught up AND this choice is recognized as valid by current availableLanguages,
        // then we can clear clientSelectedLocale. Otherwise, keep it set to ensure it's enforced.
        if (clientSelectedLocale === serverLocale && isValidLang(clientSelectedLocale)) {
          if (isMounted) {
            setClientSelectedLocale(null);
          }
        }
        // If clientSelectedLocale is not yet in availableLanguages (isValidLang is false),
        // or serverLocale hasn't caught up, clientSelectedLocale remains set,
        // and effectiveLocale is already correctly set to clientSelectedLocale.
      } else {
        // No recent client selection, use existing prioritization
        effectiveLocale = serverLocale && isValidLang(serverLocale) ? serverLocale
                      : (cookieLocale && isValidLang(cookieLocale) ? cookieLocale
                      : (storedLocale && isValidLang(storedLocale) ? storedLocale
                      : (defaultLangToUse ? defaultLangToUse.code : DEFAULT_FALLBACK_LOCALE)));
      }
      
      if (!isMounted) return; // Early exit

      if (isMounted) { // Check mount status before final state updates
        _setCurrentLocale(effectiveLocale);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, effectiveLocale);
          document.documentElement.lang = effectiveLocale;
        }
        Cookies.set(LANGUAGE_COOKIE_KEY, effectiveLocale, { path: '/', expires: 365, sameSite: 'Lax' });
        setIsLoadingLanguages(false); // Done loading/initializing
      }
    };

    initializeLanguages();

    return () => {
      isMounted = false; // Cleanup function to set isMounted to false
    };
  }, [serverLocale, initialAvailableLanguages, initialDefaultLanguage, clientSelectedLocale]);

  const setCurrentLocaleCallback = useCallback(async (localeCode: string) => { // Add async here
    let localeToSet = DEFAULT_FALLBACK_LOCALE;
    let isValidForRouterRefresh = false;
    
    const currentAvailableLangs = availableLanguages; // Use state value which might have been updated by client-side fetch

    if (currentAvailableLangs.some(lang => lang.code === localeCode)) {
      localeToSet = localeCode;
      isValidForRouterRefresh = true;
    } else if (currentAvailableLangs.length > 0) {
      const dbDefault = currentAvailableLangs.find(lang => lang.is_default);
      localeToSet = dbDefault?.code || currentAvailableLangs[0]?.code || DEFAULT_FALLBACK_LOCALE;
      isValidForRouterRefresh = true;
    } else {
      // No available languages known, still attempt refresh with fallback
      isValidForRouterRefresh = true;
    }

    _setCurrentLocale(localeToSet);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, localeToSet);
      document.documentElement.lang = localeToSet;
    }
    Cookies.set(LANGUAGE_COOKIE_KEY, localeToSet, { path: '/', expires: 365, sameSite: 'Lax' });

    // The LanguageSwitcher component is responsible for navigation (push or refresh).
    // We only set the clientSelectedLocale here to ensure the main useEffect
    // in LanguageProvider can pick up this explicit choice if needed during initialization
    // or if the serverLocale hasn't caught up yet.
    if (isValidForRouterRefresh) { // This check might still be useful for setClientSelectedLocale
      setClientSelectedLocale(localeToSet);
    }
    // router.refresh(); // REMOVED: LanguageSwitcher will handle navigation/refresh.
  }, [availableLanguages]);

  useEffect(() => {
    if (currentLocale && typeof window !== 'undefined') {
      document.documentElement.lang = currentLocale;
    }
  }, [currentLocale]);

  const contextValue = React.useMemo(() => {
    return {
      currentLocale: currentLocale,
      setCurrentLocale: setCurrentLocaleCallback,
      availableLanguages,
      defaultLanguage,
      isLoadingLanguages,
    };
  }, [currentLocale, setCurrentLocaleCallback, availableLanguages, defaultLanguage, isLoadingLanguages]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
