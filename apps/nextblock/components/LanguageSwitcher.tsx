// components/LanguageSwitcher.tsx
'use client';

import { useLanguage } from '@/context/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nextblock-cms/ui';
import { useRouter, usePathname } from 'next/navigation';
import { getPageTranslations, getPageMetadataBySlugAndLocale } from '@/app/actions/languageActions';
import type { Language } from '@/app/actions/languageActions';

interface CurrentPageInfo {
  slug: string;
  translation_group_id: string | null;
}

interface LanguageSwitcherProps {
  currentPageData?: CurrentPageInfo;
}

export default function LanguageSwitcher({ currentPageData }: LanguageSwitcherProps) {
  const { currentLocale, setCurrentLocale, availableLanguages, isLoadingLanguages } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  if (isLoadingLanguages || availableLanguages.length <= 1) {
    return null;
  }

  const handleValueChange = async (newLocaleCode: string) => {
    await setCurrentLocale(newLocaleCode);

    let targetPath = pathname; // Default to current path

    // Determine if it's a homepage (e.g., /en, /fr, or just /)
    const isHomePage = pathname === '/' || availableLanguages.some(lang => pathname === `/${lang.code}`);

    if (isHomePage) {
      targetPath = '/'; // For any homepage, new language path is root
    } else {
      // Extract slug from pathname (remove leading slash)
      const currentSlug = pathname.startsWith('/') ? pathname.slice(1) : pathname;
      
      let pageMetadata = currentPageData;
      
      // If currentPageData is not provided, try to fetch it
      if (!pageMetadata && currentSlug) {
        try {
          const fetchedMetadata = await getPageMetadataBySlugAndLocale(currentSlug, currentLocale);
          if (fetchedMetadata) {
            pageMetadata = fetchedMetadata;
          }
        } catch (error) {
          console.error('Error fetching current page metadata:', error);
        }
      }

      if (pageMetadata?.translation_group_id) {
        try {
          const translations = await getPageTranslations(pageMetadata.translation_group_id);
          const foundTranslation = translations.find(t => t.language_code === newLocaleCode);

          if (foundTranslation) {
            targetPath = `/${foundTranslation.slug}`;
          } else {
            // Original warning, without the [LanguageSwitcher] prefix
            console.warn(`No translation found for ${pageMetadata.slug} to ${newLocaleCode}. Falling back to current path.`);
          }
        } catch (error) {
          // Original error, without the [LanguageSwitcher] prefix
          console.error("Error fetching page translations:", error);
        }
      } else {
        // Original warning, without the [LanguageSwitcher] prefix
        console.warn(`No translation_group_id for page: ${pageMetadata?.slug || currentSlug}. Current path will be used.`);
      }
    }

    setTimeout(() => {
      if (pathname !== targetPath) {
        router.push(targetPath);
      } else {
        // If path is the same, refresh to ensure content updates for the new locale
        router.refresh();
      }
    }, 50); // Adjust delay as needed
  };

  return (
    <div className="flex items-center">
      <Select value={currentLocale} onValueChange={handleValueChange} aria-label="Language Switcher">
        <SelectTrigger className="h-9 text-xs sm:text-sm" aria-label="Language Switcher">
          <SelectValue placeholder="Language" aria-label="Language Switcher"/>
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map((lang: Language) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
