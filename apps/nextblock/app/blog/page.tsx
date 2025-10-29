// app/blog/page.tsx
import React from 'react';
import { getSsgSupabaseClient } from "@nextblock-cms/db";
import { notFound } from "next/navigation";
import type { Metadata } from 'next';
import PageClientContent from "../[slug]/PageClientContent";
import { getPageDataBySlug } from "../[slug]/page.utils";
import BlockRenderer from "../../components/BlockRenderer";
import { getPageTranslations } from '@/app/actions/languageActions'; // Added import

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const slug = "blog"; // Hardcoded slug
  const pageData = await getPageDataBySlug(slug);

  if (!pageData) {
    return { title: "Blog Page Not Found" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const supabase = getSsgSupabaseClient();
  const { data: languages } = await supabase.from('languages').select('id, code');
  const { data: pageTranslations } = await supabase
    .from('pages')
    .select('language_id, slug')
    .eq('translation_group_id', pageData.translation_group_id)
    .eq('status', 'published');

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
      canonical: `${siteUrl}/${slug}`,
      languages: Object.keys(alternates).length > 0 ? alternates : undefined,
    },
  };
}

export default async function BlogPage() {
  const slug = "blog"; // Hardcoded slug
  const pageData = await getPageDataBySlug(slug);

  if (!pageData) {
    notFound();
  }

  const translatedSlugs: { [key: string]: string } = {};
  // Ensure pageData and translation_group_id are available before fetching translations
  if (pageData && pageData.translation_group_id) {
    const translations = await getPageTranslations(pageData.translation_group_id);
    translations.forEach(t => {
      if (t.language_code && t.slug) { // Ensure both properties exist
        translatedSlugs[t.language_code] = t.slug;
      }
    });
  }

  const pageBlocks = pageData ? <BlockRenderer blocks={pageData.blocks} languageId={pageData.language_id} /> : null;

  return (
    <PageClientContent initialPageData={pageData} currentSlug={slug} translatedSlugs={translatedSlugs}>
      {pageBlocks}
    </PageClientContent>
  );
}
