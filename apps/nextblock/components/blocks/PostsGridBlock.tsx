// components/blocks/PostsGridBlock.tsx
import React from 'react';
import type { Database } from '@nextblock-cms/db';
import { createClient } from '@nextblock-cms/db'; // Added import
import type { PostWithMediaDimensions } from './types';

type Block = Database['public']['Tables']['blocks']['Row'];
// import Link from 'next/link'; // Unused, PostsGridClient handles links
import PostsGridClient from './PostsGridClient';
import { fetchPaginatedPublishedPosts } from '../../app/actions/postActions'; // fetchInitialPublishedPosts removed

interface PostsGridBlockProps {
  block: Block;
  languageId: number;
}

const PostsGridBlock: React.FC<PostsGridBlockProps> = async ({ block, languageId }) => {
  const {
    title = "Recent Posts",
    postsPerPage = 12,
    columns = 3,
    showPagination = true,
  } = block.content as { title?: string, postsPerPage?: number, columns?: number, showPagination?: boolean };

  const supabase = createClient();

  const { data: postsData, error: queryError, count } = await supabase
    .from('posts')
    .select('id, title, slug, excerpt, published_at, language_id, status, created_at, updated_at, translation_group_id, feature_image_id, feature_media_object:media!feature_image_id(object_key, width, height)', { count: 'exact' })
    .eq('status', 'published')
    .eq('language_id', languageId)
    .order('published_at', { ascending: false })
    .limit(postsPerPage);

  let initialPosts: PostWithMediaDimensions[] = [];
  let totalCount = 0;
  let postsError: string | null = null;

  if (queryError) {
    console.error("Error fetching initial posts directly in PostsGridBlock:", queryError);
    postsError = queryError.message;
  } else {
    const buildMediaUrl = (objectKey?: string | null) => {
      if (!objectKey) return null;
      if (objectKey.startsWith('/')) return objectKey;
      const base = process.env.NEXT_PUBLIC_R2_BASE_URL || '';
      return base ? `${base}/${objectKey}` : objectKey;
    };

    initialPosts = (postsData as any)?.map((p: any) => {
      // feature_media_object is an object here, not an array, due to the query structure media!feature_image_id(object_key, width, height)
      // Cast to 'unknown' then to the expected single object type to satisfy TypeScript, reflecting runtime reality.
      const mediaObject = p.feature_media_object as unknown as { object_key: string; width?: number | null; height?: number | null; blur_data_url?: string | null } | null;
      const imageUrl = buildMediaUrl(mediaObject?.object_key);
      return {
        ...p,
        // Convert feature_media_object to array format to match the type
        feature_media_object: mediaObject ? [{ object_key: mediaObject.object_key }] : null,
        feature_image_url: imageUrl,
        feature_image_width: mediaObject?.width || null,
        feature_image_height: mediaObject?.height || null,
        blur_data_url: mediaObject?.blur_data_url || null,
      };
    }) as PostWithMediaDimensions[] || [];
    totalCount = count || 0;
  }

  if (postsError) {
    return <div className="text-red-500">Error loading posts: {postsError}</div>;
  }

  if (!initialPosts || initialPosts.length === 0) {
    return (
      <section className="py-8 container mx-auto">
        {title && <h2 className="text-2xl font-semibold mb-4">{title}</h2>}
        <p>No posts found.</p>
      </section>
    );
  }

  return (
    <section className="py-8 container mx-auto">
      {title && <h2 className="text-2xl font-semibold mb-6">{title}</h2>}
      <PostsGridClient
        initialPosts={initialPosts}
        initialPage={1}
        postsPerPage={postsPerPage}
        totalCount={totalCount}
        columns={columns}
        languageId={languageId}
        showPagination={showPagination}
        fetchAction={fetchPaginatedPublishedPosts} // Pass the server action for pagination
      />
    </section>
  );
};

export default PostsGridBlock;
