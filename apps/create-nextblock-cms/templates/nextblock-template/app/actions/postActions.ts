'use server';

import { cache } from 'react';
import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import type { PostWithMediaDimensions } from '../../components/blocks/types';

export async function fetchPaginatedPublishedPosts(languageId: number, page: number, limit: number): Promise<{ posts: PostWithMediaDimensions[], totalCount: number, error?: string }> {
  const supabase = createClient();
  const offset = (page - 1) * limit;

  const { data: posts, error, count } = await supabase
    .from('posts')
    .select('*, media:media!feature_image_id(*)', { count: 'exact' })
    .eq('status', 'published')
    .eq('language_id', languageId)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching paginated posts:", error);
    return { posts: [], totalCount: 0, error: error.message };
  }
  
  return { posts: posts as PostWithMediaDimensions[], totalCount: count || 0, error: undefined }; // Return error: undefined on success
}

// You could also move fetchInitialPublishedPosts here if it makes sense for organization
export const fetchInitialPublishedPosts = cache(async (languageId: number, limit: number): Promise<{ posts: PostWithMediaDimensions[], totalCount: number, error?: string | null }> => {
  const supabase = createClient(); // This createClient is from utils/supabase/server
  const { data: posts, error, count } = await supabase
    .from('posts')
    .select('*, media:media!feature_image_id(*)', { count: 'exact' })
    .eq('status', 'published')
    .eq('language_id', languageId)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching initial posts:", error);
    return { posts: [], totalCount: 0, error: error.message };
  }
  
  return { posts: posts as PostWithMediaDimensions[], totalCount: count || 0, error: null };
});
export async function revalidateAndLog(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Revalidate the path
    revalidatePath(path);

    // Step 2: Log the revalidation by calling the API route
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_BASE_URL is not set in environment variables.');
    }
    
    const logUrl = new URL('/api/revalidate-log', baseUrl);

    const response = await fetch(logUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`Failed to log revalidation: ${response.status} ${response.statusText} - ${errorBody.error}`);
    }

    console.log(`Successfully revalidated and logged path: ${path}`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error in revalidateAndLog for path "${path}":`, errorMessage);
    return { success: false, error: errorMessage };
  }
}