// app/[slug]/page.tsx
import React from 'react';
import { getSsgSupabaseClient } from "@nextblock-monorepo/db/server";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from 'next';
import PageClientContent from "./PageClientContent";
import { getPageDataBySlug } from "./page.utils";
import BlockRenderer from "../../components/BlockRenderer";
import type { HeroBlockContent } from '../../lib/blocks/blockRegistry';

export const dynamicParams = true;
export const revalidate = 3600;

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
  parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await paramsPromise;
  const pageData = await getPageDataBySlug(params.slug);

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
  const pageData = await getPageDataBySlug(params.slug);

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

  let lcpImageUrl: string | null = null;
  const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE_URL || "";

  if (pageData && pageData.blocks && r2BaseUrl) {
    const heroBlock = pageData.blocks.find(block => block.block_type === 'hero');
    if (heroBlock) {
      const heroContent = heroBlock.content as unknown as HeroBlockContent;
      if (
        heroContent.background &&
        heroContent.background.type === "image" &&
        heroContent.background.image &&
        heroContent.background.image.object_key
      ) {
        lcpImageUrl = `${r2BaseUrl}/${heroContent.background.image.object_key}`;
      }
    }
  }

  const pageBlocks = pageData ? <BlockRenderer blocks={pageData.blocks} languageId={pageData.language_id} /> : null;

  return (
    <>
      {lcpImageUrl && (
        <link rel="preload" as="image" href={lcpImageUrl} />
      )}
      <PageClientContent initialPageData={pageData} currentSlug={params.slug} translatedSlugs={translatedSlugs}>
        {pageBlocks}
      </PageClientContent>
    </>
  );
}