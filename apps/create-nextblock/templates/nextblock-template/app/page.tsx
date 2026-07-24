import React from 'react';
import { cookies, draftMode, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient, getSsgSupabaseClient } from '@nextblock-cms/db/server';
import PageClientContent from './[slug]/PageClientContent';
import { getPageDataBySlug } from './[slug]/page.utils';
import BlockRenderer from '../components/BlockRenderer';
import {
  resolveMetaTitle,
  resolvePageMetaDescription,
  stringifyJsonLd,
  buildSocialMetadata,
  toOpenGraphLocale,
} from './lib/seo';
import { getSiteSettings } from './lib/site-settings';
import { getRequestOrigin } from '../lib/visual-editing/edit-info';
import { isSupabaseConfigured } from '../lib/setup/env-status';

const DEFAULT_LOCALE = 'en';
const LANGUAGE_COOKIE_KEY = 'NEXT_USER_LOCALE';

export const revalidate = 360;

interface PageTranslation {
  slug: string;
  languages: {
    code: string;
  }[];
}

// Resolve the homepage for a given locale WITHOUT assuming a per-locale slug.
// The homepage is, by convention, the default-language page at slug "home".
// Its translated versions may use ANY slug (e.g. "accueil"), so we find the
// localized version through the shared translation group. This lets "/" serve
// every language variation of the homepage regardless of what slug it uses.
async function resolveHomepageData(preferredLocale: string) {
  const defaultHome = await getPageDataBySlug('home', DEFAULT_LOCALE);

  // Default locale (or a homepage with no linked translations): serve it directly.
  if (defaultHome && (preferredLocale === DEFAULT_LOCALE || !defaultHome.translation_group_id)) {
    return defaultHome;
  }

  // Resolve the localized homepage via the shared translation group (any slug),
  // so "/" serves every language variation regardless of the slug it uses. In
  // draft (preview) mode we include unpublished siblings; otherwise only published.
  if (defaultHome?.translation_group_id) {
    const draft = await draftMode();
    const supabase = draft.isEnabled ? createClient() : getSsgSupabaseClient();
    let siblingQuery = supabase
      .from('pages')
      .select('slug, languages!inner(code)')
      .eq('translation_group_id', defaultHome.translation_group_id)
      .eq('languages.code', preferredLocale)
      .limit(1);

    if (!draft.isEnabled) {
      siblingQuery = siblingQuery.eq('status', 'published');
    }

    const { data: sibling } = await siblingQuery.maybeSingle();
    const localizedSlug = (sibling as { slug?: string } | null)?.slug;
    if (localizedSlug) {
      const localized = await getPageDataBySlug(localizedSlug, preferredLocale);
      if (localized) {
        return localized;
      }
    }
  }

  // Fallbacks: the preferred locale's own "home" slug (covers a missing or
  // renamed default-language home that the group lookup couldn't anchor on),
  // then the default home. Either may be null — the caller renders notFound().
  if (preferredLocale !== DEFAULT_LOCALE) {
    const localizedHome = await getPageDataBySlug('home', preferredLocale);
    if (localizedHome) {
      return localizedHome;
    }
  }

  return defaultHome;
}

async function getPreferredLocale() {
  let preferredLocale: string | undefined;

  try {
    const store = await cookies();
    preferredLocale =
      store.get(LANGUAGE_COOKIE_KEY)?.value || store.get('NEXT_LOCALE')?.value;
  } catch {
    preferredLocale = undefined;
  }

  if (!preferredLocale) {
    try {
      const hdrs = await headers();
      preferredLocale =
        hdrs.get('x-user-locale') ||
        hdrs.get('accept-language')?.split(',')[0]?.split('-')[0] ||
        undefined;
    } catch {
      preferredLocale = undefined;
    }
  }

  return preferredLocale || DEFAULT_LOCALE;
}

export async function generateMetadata(): Promise<Metadata> {
  // Unconfigured instance (pre-/setup): skip all DB work so metadata generation
  // can't crash the boot. The proxy redirects unconfigured traffic to /setup anyway.
  if (!isSupabaseConfigured()) {
    return { title: 'NextBlock' };
  }

  const preferredLocale = await getPreferredLocale();
  const pageData = await resolveHomepageData(preferredLocale);

  if (!pageData) {
    return { title: 'Homepage Not Found' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_URL || '';
  const supabase = getSsgSupabaseClient();

  const [languagesResult, pageTranslationsResult] = await Promise.all([
    supabase.from('languages').select('id, code'),
    supabase
      .from('pages')
      .select('language_id, slug')
      .eq('translation_group_id', pageData.translation_group_id)
      .eq('status', 'published'),
  ]);

  const { data: languages } = languagesResult;
  const { data: pageTranslations } = pageTranslationsResult;

  const alternates: { [key: string]: string } = {};
  if (languages && pageTranslations) {
    pageTranslations.forEach((pageTranslation) => {
      const language = languages.find((candidate) => candidate.id === pageTranslation.language_id);
      if (language) {
        alternates[language.code] = `${siteUrl}/${pageTranslation.slug}`;
      }
    });
  }

  const title = resolveMetaTitle(pageData.meta_title, pageData.title);
  const description = resolvePageMetaDescription(pageData.meta_description, pageData.blocks);
  const { siteTitle } = await getSiteSettings();

  return {
    title,
    description,
    ...buildSocialMetadata({
      title,
      description,
      url: `${siteUrl}`,
      siteTitle,
      imageUrl: pageData.feature_image_url,
      type: 'website',
      locale: toOpenGraphLocale(pageData.language_code),
    }),
    alternates: {
      canonical: `${siteUrl}`,
      languages: Object.keys(alternates).length > 0 ? alternates : undefined,
    },
  };
}

export default async function RootPage() {
  const preferredLocale = await getPreferredLocale();
  const pageData = await resolveHomepageData(preferredLocale);

  if (!pageData) {
    console.error(`Homepage data not found (locale: ${preferredLocale})`);
    notFound();
  }

  const homepageSlug = pageData.slug;

  const translatedSlugs: { [key: string]: string } = {};
  if (pageData.translation_group_id) {
    const supabase = getSsgSupabaseClient();
    const { data: translations } = await supabase
      .from('pages')
      .select('slug, languages!inner(code)')
      .eq('translation_group_id', pageData.translation_group_id)
      .eq('status', 'published');

    if (translations) {
      translations.forEach((translation: PageTranslation) => {
        if (translation.languages && translation.languages.length > 0 && translation.slug) {
          translatedSlugs[translation.languages[0].code] = translation.slug;
        }
      });
    }
  }

  const requestOrigin = await getRequestOrigin();
  const draft = await draftMode();
  const visualEditingEnabled =
    draft.isEnabled || process.env.NEXTBLOCK_VISUAL_EDITING_ENABLED === 'true';
  const siteUrl = process.env.NEXT_PUBLIC_URL || '';
  const nonce = (await headers()).get('x-nonce') || undefined;
  const title = resolveMetaTitle(pageData.meta_title, pageData.title);
  const description = resolvePageMetaDescription(pageData.meta_description, pageData.blocks);
  const pageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: `${siteUrl}/`,
    inLanguage: pageData.language_code,
  };
  const pageBlocks = (
    <BlockRenderer
      blocks={pageData.blocks}
      languageId={pageData.language_id}
      visualEditing={{
        enabled: visualEditingEnabled,
        documentType: "page",
        documentId: pageData.id,
        slug: pageData.slug,
        languageId: pageData.language_id,
        draftId: pageData.draft_id ?? null,
        pageOrigin: requestOrigin,
      }}
    />
  );

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(pageJsonLd) }}
      />
      <PageClientContent
        initialPageData={pageData}
        currentSlug={homepageSlug}
        translatedSlugs={translatedSlugs}
      >
        {pageBlocks}
      </PageClientContent>
    </>
  );
}
