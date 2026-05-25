// components/blocks/PostsGridBlock.tsx
import React from 'react';
import type { Database } from '@nextblock-cms/db';

type Block = Database['public']['Tables']['blocks']['Row'];
// import Link from 'next/link'; // Unused, PostsGridClient handles links
import PostsGridClient from './PostsGridClient';
import { fetchInitialPublishedPosts, fetchPaginatedPublishedPosts } from '../../app/actions/postActions';

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

  const { posts: initialPosts, totalCount, error: postsError } = await fetchInitialPublishedPosts(languageId, postsPerPage);

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
