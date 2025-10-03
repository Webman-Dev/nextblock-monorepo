'use server';

import { createClient } from '@nextblock-cms/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLanguageByCode } from '@/app/cms/settings/languages/actions';

export interface Language {
  id: number;
  name: string;
  code: string;
  is_default: boolean;
  created_at?: string;
}

export async function getAvailableLanguages(): Promise<Language[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('languages').select('id, code, name, is_default, is_active, created_at, updated_at').order('name');
  if (error) {
    console.error('Error fetching languages:', error);
    return [];
  }
  return data as Language[];
}

export async function getCurrentLocale(defaultLocale = 'en'): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get('NEXT_LOCALE')?.value || defaultLocale;
}

export async function setCurrentLocaleCookie(locale: string) {
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, { path: '/' });
}

export async function getPageTranslations(translationGroupId: string): Promise<{ slug: string, language_code: string }[]> {
  if (!translationGroupId) {
    console.warn('getPageTranslations called without translationGroupId');
    return [];
  }
  const supabase = createClient();

  const { data, error } = await supabase
    .from('pages')
    .select('slug, status, languages(code)') // Use actual table name for join
    .eq('translation_group_id', translationGroupId)
    .eq('status', 'published');

  if (error) {
    console.error('Error fetching page translations:', error);
    return [];
  }

  interface PageWithLanguage {
    slug: string;
    status: string; // Or your actual status type
    languages: { code: string } | { code: string }[] | null; // Can be object, array of objects, or null
  }

  // Map the data to the expected format { slug: string, language_code: string }
  const formattedTranslations = data
    ? (data as PageWithLanguage[]).map(page => {
        let langCode = '';
        if (page.languages) {
          if (Array.isArray(page.languages)) {
            langCode = page.languages[0]?.code || '';
          } else { // It's an object
            langCode = page.languages.code || '';
          }
        }
        return {
          slug: page.slug,
          language_code: langCode,
        };
      }).filter(t => t.language_code)
    : [];
  
  return formattedTranslations;
}

// Helper to get language details by code, potentially used by LanguageSwitcher or other components
export async function getLanguageDetails(localeCode: string): Promise<Language | null> {
    const { data, error } = await getLanguageByCode(localeCode);
    if (error || !data) {
        // Optionally log the error or handle it more gracefully
        console.warn(`Could not fetch language details for ${localeCode}: ${error}`);
        return null;
    }
    return data;
}

export async function getPageMetadataBySlugAndLocale(slug: string, localeCode: string): Promise<{ slug: string; translation_group_id: string | null } | null> {
  if (!slug || !localeCode) {
    console.warn('getPageMetadataBySlugAndLocale called without slug or localeCode');
    return null;
  }
  const supabase = createClient();
  const { data: languageData, error: langError } = await getLanguageByCode(localeCode);

  if (langError || !languageData) {
    console.warn(`Language with code ${localeCode} not found or error fetching: ${langError}`);
    return null;
  }

  const { data: page, error } = await supabase
    .from('pages')
    .select('slug, translation_group_id')
    .eq('slug', slug)
    .eq('language_id', languageData.id)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching page metadata for slug ${slug} and locale ${localeCode}:`, error);
    return null;
  }
  if (!page) {
    // It's possible the slug is for a different content type (e.g. blog post) or doesn't exist.
    // For now, we only search 'pages'. This might need to be expanded or handled gracefully.
    console.warn(`No page found for slug ${slug} and locale ${localeCode}`);
    return null;
  }
  return page;
}

export async function changeLanguage(newLocale: string, currentPath: string) {
    await setCurrentLocaleCookie(newLocale);
    // This is a basic redirect, LanguageSwitcher will have more complex logic
    // For finding translated slugs.
    redirect(currentPath); // Or redirect to a translated path if available
}