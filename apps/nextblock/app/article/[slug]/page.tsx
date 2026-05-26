// app/article/[slug]/page.tsx
import React from 'react';
// Remove or alias the problematic import if only used by other functions:
// import { createClient } from "@nextblock-cms/db/server";
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'; // Import base client
import { notFound } from "next/navigation";
import type { Metadata } from 'next';
import PostClientContent from "./PostClientContent";

import { getPostDataBySlug } from "./page.utils";
import BlockRenderer from "../../../components/BlockRenderer";
import { getSsgSupabaseClient } from "@nextblock-cms/db/server"; // Correct import
import type { HeroBlockContent } from '../../../lib/blocks/blockRegistry';
import { resolveMediaUrl } from '../../../lib/media/resolveMediaUrl';
import {
  resolveMetaTitle,
  resolvePostMetaDescription,
  stringifyJsonLd,
} from '../../lib/seo';
import { draftMode, headers } from 'next/headers';

export const dynamicParams = true;
export const revalidate = 3600;

interface ResolvedPostParams {
  slug: string;
}

interface PostPageProps {
  params: Promise<ResolvedPostParams>;
}

interface PostTranslation {
  slug: string;
  languages: {
    code: string;
  }[] | { code: string };
}

const resolveLanguageCode = (languagesField: PostTranslation["languages"]): string | null => {
  if (!languagesField) return null;
  if (Array.isArray(languagesField)) {
    return languagesField[0]?.code ?? null;
  }
  if (typeof languagesField === 'object' && 'code' in languagesField) {
    return (languagesField as { code?: string }).code ?? null;
  }
  return null;
};

export async function generateStaticParams(): Promise<ResolvedPostParams[]> {
  // Use a new Supabase client instance that doesn't rely on cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables in generateStaticParams (Posts)');
    return [];
  }
  
  const supabase = createSupabaseJsClient(supabaseUrl, supabaseAnonKey);

  const { data: posts, error } = await supabase
    .from("posts")
    .select("slug")
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`);

  if (error || !posts) {
    console.error("SSG (Posts): Error fetching post slugs for static params", error);
    return [];
  }
  return posts.map((post) => ({ slug: post.slug }));
}

// Generate metadata for the specific post slug
export async function generateMetadata(
  { params: paramsPromise }: PostPageProps,
): Promise<Metadata> {
  const params = await paramsPromise; // Await the promise to get the actual params
  const postData = await getPostDataBySlug(params.slug);

  if (!postData) {
    return {
      title: "Article Not Found",
      description: "The article you are looking for does not exist or is not yet published.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_URL || "";
  const supabase = getSsgSupabaseClient();
  const { data: languages } = await supabase.from('languages').select('id, code');
  const { data: postTranslations } = await supabase
    .from('posts')
    .select('language_id, slug')
    .eq('translation_group_id', postData.translation_group_id)
    .eq('status', 'published')
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`);

  const alternates: { [key: string]: string } = {};
  if (languages && postTranslations) {
    postTranslations.forEach(pt => {
      const langInfo = languages.find(l => l.id === pt.language_id);
      if (langInfo) {
        alternates[langInfo.code] = `${siteUrl}/article/${pt.slug}`;
      }
    });
  }

  const title = resolveMetaTitle(postData.meta_title, postData.title);
  const description = resolvePostMetaDescription(postData.meta_description, postData.subtitle);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: postData.published_at || postData.created_at,
      url: `${siteUrl}/article/${params.slug}`,
      images: postData.feature_image_url
        ? [
            {
              url: postData.feature_image_url,
              // You can optionally add width, height, and alt here if known
              // width: 1200, // Example
              // height: 630, // Example
              // alt: postData.meta_title || postData.title, // Example
            },
          ]
        : undefined, // Or an empty array if you prefer: [],
    },
    alternates: {
      canonical: `${siteUrl}/article/${params.slug}`,
      languages: Object.keys(alternates).length > 0 ? alternates : undefined,
    },
  };
}

// Server Component: Fetches data for the specific slug and passes to Client Component
export default async function DynamicPostPage({ params: paramsPromise }: PostPageProps) { // Destructure the promise
  const params = await paramsPromise; // Await the promise
  const initialPostData = await getPostDataBySlug(params.slug);

  if (!initialPostData) {
    notFound();
  }

  const supabase = getSsgSupabaseClient(); // Use SSG client
  const translatedSlugs: { [key: string]: string } = {};
  if (initialPostData.translation_group_id) {
    const { data: translations } = await supabase
      .from("posts")
      .select("slug, languages!inner(code)")
      .eq("translation_group_id", initialPostData.translation_group_id)
      .eq("status", "published")
      .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`);

    if (translations) {
      translations.forEach((translation: PostTranslation) => {
        const code = resolveLanguageCode(translation.languages);
        if (code && translation.slug) translatedSlugs[code] = translation.slug;
      });
    }
  }

  let lcpImageUrl: string | null = null;

  if (initialPostData && initialPostData.blocks) {
    const heroBlock = initialPostData.blocks.find(block => block.block_type === 'hero');
    if (heroBlock) {
      const heroContent = heroBlock.content as unknown as HeroBlockContent;
      if (
        heroContent.background &&
        heroContent.background.type === "image" &&
        heroContent.background.image &&
        heroContent.background.image.object_key
      ) {
        lcpImageUrl = resolveMediaUrl(heroContent.background.image.object_key);
      }
    }
  }

  const draft = await draftMode();
  const visualEditingEnabled =
    draft.isEnabled || process.env.NEXTBLOCK_VISUAL_EDITING_ENABLED === 'true';
  const siteUrl = process.env.NEXT_PUBLIC_URL || "";
  const nonce = (await headers()).get('x-nonce') || undefined;
  const title = resolveMetaTitle(initialPostData.meta_title, initialPostData.title);
  const description = resolvePostMetaDescription(
    initialPostData.meta_description,
    initialPostData.subtitle
  );
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image: initialPostData.feature_image_url ? [initialPostData.feature_image_url] : undefined,
    datePublished: initialPostData.published_at || initialPostData.created_at,
    dateModified: initialPostData.updated_at,
    inLanguage: initialPostData.language_code,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/article/${initialPostData.slug}`,
    },
  };
  const postBlocks = initialPostData ? (
    <BlockRenderer
      blocks={initialPostData.blocks}
      languageId={initialPostData.language_id}
      visualEditing={{
        enabled: visualEditingEnabled,
        documentType: "post",
        documentId: initialPostData.id,
        slug: initialPostData.slug,
        languageId: initialPostData.language_id,
        draftId: initialPostData.draft_id ?? null,
      }}
    />
  ) : null;

  return (
    <>
      {lcpImageUrl && (
        <link rel="preload" as="image" href={lcpImageUrl} />
      )}
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(articleJsonLd) }}
      />
      <PostClientContent initialPostData={initialPostData} currentSlug={params.slug} translatedSlugs={translatedSlugs}>
        {postBlocks}
      </PostClientContent>
    </>
  );
}
