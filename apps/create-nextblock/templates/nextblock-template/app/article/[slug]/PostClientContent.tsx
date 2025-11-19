// app/article/[slug]/PostClientContent.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Database } from "@nextblock-cms/db";
import { useLanguage } from '@/context/LanguageContext';

type PostType = Database['public']['Tables']['posts']['Row'];
type BlockType = Database['public']['Tables']['blocks']['Row'];

export type ImageBlockContent = {
  media_id: string | null;
  object_key?: string;
};
import { useCurrentContent } from '@/context/CurrentContentContext';
import Link from 'next/link';

interface PostClientContentProps {
  initialPostData: (PostType & { blocks: BlockType[]; language_code: string; language_id: number; translation_group_id: string; feature_image_url?: string | null; }) | null;
  currentSlug: string; // The slug of the currently viewed page/post
  children: React.ReactNode;
  translatedSlugs?: { [key: string]: string };
}

export default function PostClientContent({ initialPostData, currentSlug, children, translatedSlugs }: PostClientContentProps) {
  const { currentLocale, isLoadingLanguages } = useLanguage();
  const { currentContent, setCurrentContent } = useCurrentContent();
  const router = useRouter();
  
  const currentPrefix = "articles";

  // currentPostData is always for the slug in the URL.
  // It's initially set by the server. It only changes if the URL itself changes (which happens on language switch).
  const [currentPostData, setCurrentPostData] = useState(initialPostData);
  const [isLoadingTargetLang, setIsLoadingTargetLang] = useState(false); // For feedback during navigation

  // Memoize postId and postSlug
  const postId = useMemo(() => currentPostData?.id, [currentPostData?.id]);
  const postSlug = useMemo(() => currentPostData?.slug, [currentPostData?.slug]);

  // This effect handles navigation when the language context changes
  useEffect(() => {
    if (!isLoadingLanguages && currentLocale && initialPostData && initialPostData.language_code !== currentLocale && translatedSlugs) {
      // The current page's language (from initialPostData.language_code)
      // does not match the user's selected language (currentLocale).
      // We need to find the slug for the currentLocale version of this post and navigate.
      setIsLoadingTargetLang(true);
      const targetSlug = translatedSlugs[currentLocale];

      if (targetSlug && targetSlug !== currentSlug) {
        router.push(`/article/${targetSlug}`); // Navigate to the translated slug's URL
      } else if (!targetSlug) {
        console.warn(`No published translation found for post group ${initialPostData.translation_group_id} in language ${currentLocale} using pre-fetched slugs.`);
        // Optionally, provide user feedback here (e.g., a toast message)
        // For now, the user remains on the current page.
      }
      // If targetSlug === currentSlug, we are already on the correct page for the selected language.
      setIsLoadingTargetLang(false);
    }
  }, [currentLocale, isLoadingLanguages, initialPostData, currentSlug, router, translatedSlugs]);

  // This effect updates the document based on the currently displayed data
  useEffect(() => {
    if (currentPostData?.language_code) {
      document.documentElement.lang = currentPostData.language_code;
      if (currentPostData.meta_title || currentPostData.title) {
         document.title = currentPostData.meta_title || currentPostData.title;
      }
    }
  }, [currentPostData]);

  // Update currentPostData if initialPostData changes (e.g., after ISR revalidation of the current slug)
  useEffect(() => {
    setCurrentPostData(initialPostData);
  }, [initialPostData]);

  // Effect for setting or updating the context
  useEffect(() => {
    const newType = 'post' as const;
    const slugToSet = postSlug ?? null; // Ensures slug is string or null

    const needsUpdate = postId &&
                        (currentContent.id !== postId ||
                         currentContent.type !== newType ||
                         currentContent.slug !== slugToSet);

    const needsClearing = !postId &&
                          (currentContent.id !== null ||
                           currentContent.type !== null ||
                           currentContent.slug !== null);

    if (needsUpdate) {
      setCurrentContent({ id: postId, type: newType, slug: slugToSet });
    } else if (needsClearing) {
      setCurrentContent({ id: null, type: null, slug: null });
    }
  }, [postId, postSlug, setCurrentContent, currentContent.id, currentContent.type, currentContent.slug]);

  // Separate useEffect for cleanup
  useEffect(() => {
    const idToClean = postId; // Capture the postId when this effect runs

    return () => {
      // Cleanup logic: only clear context if the current context ID matches the ID this instance was managing
      if (idToClean && currentContent.id === idToClean) {
        setCurrentContent({ id: null, type: null, slug: null });
      }
    };
  }, [postId, setCurrentContent, currentContent.id]);

  if (!currentPostData && !isLoadingLanguages && !isLoadingTargetLang) {
    // This state means the initial slug from the URL didn't resolve to any data.
    // The server component (page.tsx) would have already called notFound().
    // This is a fallback or could indicate an issue if reached.
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
        <p className="text-muted-foreground">The article for slug &quot;{currentSlug}&quot; could not be loaded.</p>
        <p className="mt-4">
          <Link href={`/${currentPrefix}`} className="text-primary hover:underline">Back to Articles</Link>
          <span className="mx-2">|</span>
          <Link href="/" className="text-primary hover:underline">Go to Homepage</Link>
        </p>
      </div>
    );
  }
  
  // If initialPostData was null but we are still loading language context or trying to navigate
  if (!currentPostData && (isLoadingLanguages || isLoadingTargetLang)) {
     return <div className="container mx-auto px-4 py-20 text-center"><p>Loading article content...</p></div>;
  }

  // If after all attempts, currentPostData is still null (should be caught by notFound in server component ideally)
  if (!currentPostData) {
     return <div className="container mx-auto px-4 py-20 text-center"><p>Could not load article content for &quot;{currentSlug}&quot;.</p></div>;
  }

  return (
    <article className="w-full mx-auto">
      {isLoadingTargetLang && <div className="text-center py-2 text-sm text-muted-foreground">Switching language...</div>}
      
      {currentPostData?.feature_image_url && (
        <div className="mb-8 relative"> {/* Adjust negative margins for full-bleed effect if container has padding */}
          <Image
            src={currentPostData.feature_image_url}
            alt={`Hero image for ${currentPostData.title}`}
            width={800}
            height={400}
            className="w-full h-auto max-h-[400px] md:max-h-[500px] object-cover shadow-lg" // Adjust max-h as needed, add rounded corners/shadow
            priority
          />
        </div>
      )}
      <header className="mb-8 text-center border-b pb-6 dark:border-slate-700">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 text-slate-900 dark:text-slate-100">{currentPostData.title}</h1>
        {currentPostData.published_at && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Published on {new Date(currentPostData.published_at).toLocaleDateString(currentPostData.language_code, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
        {currentPostData.excerpt && <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">{currentPostData.excerpt}</p>}
      </header>

      <div className="prose dark:prose-invert lg:prose-xl max-w-none mx-auto">
        {children}
      </div>
    </article>
  );
}
