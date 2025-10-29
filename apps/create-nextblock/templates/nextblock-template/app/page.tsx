// app/page.tsx (New Approach)
import React from 'react';
import { cookies, headers } from 'next/headers'; // Import headers
import { notFound } from "next/navigation";
import type { Metadata } from 'next';
import PageClientContent from "./[slug]/PageClientContent"; // Reuse your existing client content component
import { getPageDataBySlug } from "./[slug]/page.utils";   // Reuse your existing data fetching utility
import BlockRenderer from "../components/BlockRenderer";  // Adjust path as needed

const DEFAULT_LOCALE = 'en';
const LANGUAGE_COOKIE_KEY = 'NEXT_USER_LOCALE';

// Helper to determine the correct homepage slug based on locale
async function getHomepageSlugForLocale(locale: string): Promise<string> {
  // This logic assumes you have specific slugs for homepages, e.g., 'home' for 'en', 'accueil' for 'fr'
  // You might fetch this from a 'settings' table or have it hardcoded
  // Your seed data uses 'home' for EN and 'accueil' for FR.
  // The navigation items also link '/' to these specific page IDs.
  // We need to find the page with a specific "home" role/flag or use known slugs.

  // Option 1: Hardcoded mapping (simplest if slugs are fixed)
  if (locale === 'fr') {
    return 'accueil';
  }
  return 'home'; // Default to English homepage slug

  // Option 2: Query based on a "is_homepage" flag or a known title/tag in your 'pages' table
  // (This would require schema modification or a convention)
  // const supabase = createClient();
  // const { data, error } = await supabase
  //   .from('pages')
  //   .select('slug')
  //   .eq('language_code', locale) // Assuming you add a language_code column or join with languages
  //   .eq('is_homepage_flag', true) // Hypothetical flag
  //   .single();
  // if (data?.slug) return data.slug;
  // return locale === 'fr' ? 'accueil' : 'home'; // Fallback
}

export async function generateMetadata(): Promise<Metadata> {
  const head = await headers();
  let currentLocale = head.get('x-user-locale') || DEFAULT_LOCALE;

  // Simplified locale detection for metadata
  if (!head.get('x-user-locale')) {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
    if (cookieLocale) {
      currentLocale = cookieLocale;
    }
  }

  const homepageSlug = await getHomepageSlugForLocale(currentLocale);
  const pageData = await getPageDataBySlug(homepageSlug);

  if (!pageData) {
    return { title: "Homepage Not Found" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  // Simplified metadata without complex hreflang queries for better performance
  return {
    title: pageData.meta_title || pageData.title,
    description: pageData.meta_description || "",
    alternates: {
      canonical: `${siteUrl}/`,
    },
  };
}

export default async function RootPage() {
  
  const head = await headers();
  let currentLocale = head.get('x-user-locale') || DEFAULT_LOCALE;

  // Simplified locale detection - prioritize header/cookie over database query
  if (!head.get('x-user-locale')) {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
    if (cookieLocale) {
      currentLocale = cookieLocale;
    }
    // Skip database query for default language - use fallback
  }

  const homepageSlug = await getHomepageSlugForLocale(currentLocale);
  
  const pageData = await getPageDataBySlug(homepageSlug);

  if (!pageData) {
    // This scenario means that for the detected locale, the corresponding homepage slug ('home' or 'accueil')
    // does not exist or is not published.
    // Your seed migration (20250521143933_seed_homepage_and_nav.sql) creates these.
    // Ensure they remain published.
    console.error(`Homepage data not found for slug: ${homepageSlug} (locale: ${currentLocale})`);
    notFound();
  }

  const pageBlocks = pageData ? <BlockRenderer blocks={pageData.blocks} languageId={pageData.language_id} /> : null;

  // Pass currentSlug as homepageSlug to PageClientContent, so it knows what content it's rendering.
  // PageClientContent's logic for language switching will still work if the user changes language via the switcher.
  return (
    <PageClientContent initialPageData={pageData} currentSlug={homepageSlug}>
      {pageBlocks}
    </PageClientContent>
  );
}
