// app/[slug]/page.tsx
import React from 'react';
import { getSsgSupabaseClient } from "@nextblock-cms/db/server";
import { notFound } from "next/navigation";
import type { Metadata } from 'next';
import PageClientContent from "./PageClientContent";
import { getPageDataBySlug } from "./page.utils";
import BlockRenderer from "../../components/BlockRenderer";
import { cookies, headers } from "next/headers";

export const dynamicParams = true;
export const revalidate = 360;
export const dynamic = 'force-dynamic'; // keeps per-request locale; paired with short revalidate
export const fetchCache = 'force-no-store';

interface ResolvedPageParams {
  slug: string;
}

interface PageProps {
  params: Promise<ResolvedPageParams>;
}

interface PageTranslation {
  slug: string;
  languages: {
    code: string;
  }[];
}

export async function generateStaticParams(): Promise<ResolvedPageParams[]> {
  const supabase = getSsgSupabaseClient();
  const { data: pages, error } = await supabase
    .from("pages")
    .select("slug")
    .eq("status", "published");

  if (error || !pages) {
    console.error("SSG: Error fetching page slugs for static params:", error);
    return [];
  }
  return pages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata(
  { params: paramsPromise }: PageProps,
): Promise<Metadata> {
  const params = await paramsPromise;
  let preferredLocale: string | undefined;
  try {
    const store = await cookies();
    preferredLocale = store.get("NEXT_USER_LOCALE")?.value || store.get("NEXT_LOCALE")?.value;
  } catch {
    preferredLocale = undefined;
  }
  if (!preferredLocale) {
    try {
      const hdrs = await headers();
      const al = hdrs.get("accept-language");
      if (al) preferredLocale = al.split(",")[0]?.split("-")[0];
    } catch {
      // ignore header lookup errors
    }
  }
  const pageData = await getPageDataBySlug(params.slug, preferredLocale);

  if (!pageData) {
    return { title: "Page Not Found" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const supabase = getSsgSupabaseClient();
  
  // Parallel queries for better performance
  const [languagesResult, pageTranslationsResult] = await Promise.all([
    supabase.from('languages').select('id, code'),
    supabase
      .from('pages')
      .select('language_id, slug')
      .eq('translation_group_id', pageData.translation_group_id)
      .eq('status', 'published')
  ]);

  const { data: languages } = languagesResult;
  const { data: pageTranslations } = pageTranslationsResult;

  const alternates: { [key: string]: string } = {};
  if (languages && pageTranslations) {
    pageTranslations.forEach(pt => {
      const langInfo = languages.find(l => l.id === pt.language_id);
      if (langInfo) {
        alternates[langInfo.code] = `${siteUrl}/${pt.slug}`;
      }
    });
  }

  return {
    title: pageData.meta_title || pageData.title,
    description: pageData.meta_description || "",
    alternates: {
      canonical: `${siteUrl}/${params.slug}`,
      languages: Object.keys(alternates).length > 0 ? alternates : undefined,
    },
  };
}

export default async function DynamicPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  let preferredLocale: string | undefined;
  try {
    const store = await cookies();
    preferredLocale = store.get("NEXT_USER_LOCALE")?.value || store.get("NEXT_LOCALE")?.value;
  } catch {
    preferredLocale = undefined;
  }
  if (!preferredLocale) {
    try {
      const hdrs = await headers();
      const al = hdrs.get("accept-language");
      if (al) preferredLocale = al.split(",")[0]?.split("-")[0];
    } catch {
      // ignore header lookup errors
    }
  }
  const pageData = await getPageDataBySlug(params.slug, preferredLocale);

  if (!pageData) {
    notFound();
  }

  const translatedSlugs: { [key: string]: string } = {};
  if (pageData.translation_group_id) {
    const supabase = getSsgSupabaseClient();
    const { data: translations } = await supabase
      .from("pages")
      .select("slug, languages!inner(code)")
      .eq("translation_group_id", pageData.translation_group_id)
      .eq("status", "published");

    if (translations) {
      translations.forEach((translation: PageTranslation) => {
        if (translation.languages && translation.languages.length > 0 && translation.slug) {
          translatedSlugs[translation.languages[0].code] = translation.slug;
        }
      });
    }
  }



  const pageBlocks = pageData ? <BlockRenderer blocks={pageData.blocks} languageId={pageData.language_id} /> : null;

  return (
    <>

      <PageClientContent initialPageData={pageData} currentSlug={params.slug} translatedSlugs={translatedSlugs}>
        {pageBlocks}
      </PageClientContent>
    </>
  );
}
