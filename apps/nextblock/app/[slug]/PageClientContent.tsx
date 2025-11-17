// app/[slug]/PageClientContent.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation'; // For navigation on lang switch
import type { Database } from "@nextblock-cms/db";
import { useLanguage } from '@/context/LanguageContext';
import { useCurrentContent } from '@/context/CurrentContentContext';
import Link from 'next/link';
import { createClient } from '@nextblock-cms/db';

type PageType = Database['public']['Tables']['pages']['Row'];
type BlockType = Database['public']['Tables']['blocks']['Row'];

interface PageClientContentProps {
  initialPageData: (PageType & { blocks: BlockType[]; language_code: string; language_id: number; translation_group_id: string; }) | null;
  currentSlug: string; // The slug of the currently viewed page
  children: React.ReactNode;
  translatedSlugs?: { [key: string]: string };
}

// Fetches the slug for a given translation_group_id and target language_code
// This function is no longer needed here as slugs are pre-fetched.
// async function getSlugForTranslatedPage(
//   translationGroupId: string,
//   targetLanguageCode: string,
//   supabase: ReturnType<typeof createClient>
// ): Promise<string | null> {
//   const { data: langInfo, error: langErr } = await supabase
//     .from("languages").select("id").eq("code", targetLanguageCode).single();
//   if (langErr || !langInfo) return null;

//   const { data: page, error: pageErr } = await supabase
//     .from("pages")
//     .select("slug")
//     .eq("translation_group_id", translationGroupId)
//     .eq("language_id", langInfo.id)
//     .eq("status", "published")
//     .single();
  
//   if (pageErr || !page) return null;
//   return page.slug;
// }


export default function PageClientContent({ initialPageData, currentSlug, children, translatedSlugs }: PageClientContentProps) {
  const { currentLocale, isLoadingLanguages } = useLanguage();
  const { currentContent, setCurrentContent } = useCurrentContent();
  const router = useRouter();
  // currentPageData is the data for the slug currently in the URL.
  // It's initially set by the server for the slug it resolved.
  const [currentPageData, setCurrentPageData] = useState(initialPageData);
  const [isLoadingTargetLang, setIsLoadingTargetLang] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  // Memoize pageId and pageSlug
  const pageId = useMemo(() => currentPageData?.id, [currentPageData?.id]);
  const pageSlug = useMemo(() => currentPageData?.slug, [currentPageData?.id, currentLocale]); // include locale so updates propagate

  useEffect(() => {
    if (currentLocale && currentPageData && currentPageData.language_code !== currentLocale && translatedSlugs) {
      // Current page's language doesn't match context, try to navigate to translated version
      setIsLoadingTargetLang(true);
      const targetSlug = translatedSlugs[currentLocale];
      
      if (targetSlug && targetSlug !== currentSlug) {
        router.push(`/${targetSlug}`); // Navigate to the translated slug's URL
      } else if (targetSlug && targetSlug === currentSlug) {
        // Same slug across languages - refetch the page in the target language and update content
        (async () => {
          const { data, error } = await supabase
            .from("pages")
            .select("*, languages!inner(code), blocks(*)")
            .eq("slug", targetSlug)
            .eq("languages.code", currentLocale)
            .eq("status", "published")
            .order('order', { foreignTable: 'blocks', ascending: true })
            .maybeSingle();

          if (!error && data) {
            const langInfo = Array.isArray(data.languages) ? data.languages[0] : (data.languages as unknown as { code?: string });
            setCurrentPageData({
              ...(data as PageType),
              blocks: (data as any).blocks || [],
              language_code: langInfo?.code || currentLocale,
              language_id: data.language_id,
              translation_group_id: data.translation_group_id || currentPageData.translation_group_id,
            } as typeof currentPageData);
          } else {
            // fallback to refresh if fetch fails
            router.refresh();
          }
          setIsLoadingTargetLang(false);
        })();
      } else {
        console.warn(`No published translation found for group ${currentPageData.translation_group_id} in language ${currentLocale} using pre-fetched slugs.`);
        // Optionally, provide feedback to the user that translation is not available
        setIsLoadingTargetLang(false);
      }
    }
  }, [currentLocale, currentPageData, currentSlug, router, initialPageData, translatedSlugs]); // Rerun if initialPageData changes (e.g. after revalidation)

  // Update HTML lang attribute based on the *actually displayed* content's language
  useEffect(() => {
    if (currentPageData?.language_code) {
      document.documentElement.lang = currentPageData.language_code;
      if (currentPageData.meta_title || currentPageData.title) {
         document.title = currentPageData.meta_title || currentPageData.title;
      }
    }
  }, [currentPageData]);

  // Effect for setting or updating the context
  useEffect(() => {
    const newType = 'page' as const;
    const slugToSet = pageSlug ?? null; // Ensures slug is string or null

    const needsUpdate = pageId &&
                        (currentContent.id !== pageId ||
                         currentContent.type !== newType ||
                         currentContent.slug !== slugToSet);

    const needsClearing = !pageId &&
                          (currentContent.id !== null ||
                           currentContent.type !== null ||
                           currentContent.slug !== null);

    if (needsUpdate) {
      setCurrentContent({ id: pageId, type: newType, slug: slugToSet });
    } else if (needsClearing) {
      setCurrentContent({ id: null, type: null, slug: null });
    }
  }, [pageId, pageSlug, setCurrentContent, currentContent.id, currentContent.type, currentContent.slug]);

  // Separate useEffect for cleanup
  useEffect(() => {
    const idToClean = pageId; // Capture the pageId when this effect runs

    return () => {
      // Cleanup logic: only clear context if the current context ID matches the ID this instance was managing
      if (idToClean && currentContent.id === idToClean) {
        setCurrentContent({ id: null, type: null, slug: null });
      }
    };
  }, [pageId, setCurrentContent, currentContent.id]);

  if (!currentPageData && !isLoadingLanguages && !isLoadingTargetLang) { // If initial data was null and no target lang found
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground">The page for slug &quot;{currentSlug}&quot; could not be loaded or is not available in any language.</p>
        <p className="mt-4"><Link href="/" className="text-primary hover:underline">Go to Homepage</Link></p>
      </div>
    );
  }
  
  if (!currentPageData && (isLoadingLanguages || isLoadingTargetLang)) {
     return <div className="container mx-auto px-4 py-20 text-center"><p>Loading page content...</p></div>;
  }
  
  if (!currentPageData) { // Fallback if still no data after loading attempts
     return <div className="container mx-auto px-4 py-20 text-center"><p>Could not load page content.</p></div>;
  }


  return (
    <article className="w-full mx-auto">
      {isLoadingTargetLang && <div className="text-center py-2 text-sm text-muted-foreground">Switching language...</div>}
      
      {/* Render blocks passed as children */}
      {children}
    </article>
  );
}
