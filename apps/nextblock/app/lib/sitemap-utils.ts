import { createClient } from '@nextblock-cms/db/server';

interface SitemapEntry {
  path: string;
  lastModified: string;
}

/**
 * Fetches all published pages from Supabase and formats them for the sitemap.
 * @returns {Promise<Array<SitemapEntry>>} A promise that resolves to an array of sitemap entries for pages.
 */
export async function fetchAllPublishedPages(): Promise<SitemapEntry[]> {
  const supabase = createClient();
  try {
    const { data: pages, error } = await supabase
      .from('pages')
      .select('slug, updated_at')
      .eq('status', 'published');

    if (error) {
      console.error('Error fetching published pages:', error);
      return [];
    }

    if (!pages) {
      return [];
    }

    return pages.map((page) => ({
      path: `/${page.slug}`,
      lastModified: new Date(page.updated_at).toISOString(),
    }));
  } catch (err) {
    console.error('An unexpected error occurred while fetching pages:', err);
    return [];
  }
}

/**
 * Fetches all published posts from Supabase and formats them for the sitemap.
 * @returns {Promise<Array<SitemapEntry>>} A promise that resolves to an array of sitemap entries for posts.
 */
export async function fetchAllPublishedPosts(): Promise<SitemapEntry[]> {
  const supabase = createClient();
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('slug, updated_at')
      .eq('status', 'published');

    if (error) {
      console.error('Error fetching published posts:', error);
      return [];
    }

    if (!posts) {
      return [];
    }

    return posts.map((post) => ({
      path: `/article/${post.slug}`,
      lastModified: new Date(post.updated_at).toISOString(),
    }));
  } catch (err) {
    console.error('An unexpected error occurred while fetching posts:', err);
    return [];
  }
}
