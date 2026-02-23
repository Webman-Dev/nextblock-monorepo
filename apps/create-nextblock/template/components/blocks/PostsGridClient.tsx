// components/blocks/PostsGridClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { Database } from '@nextblock-cms/db';
import Link from 'next/link';

type PostWithMediaDimensions = Database['public']['Tables']['posts']['Row'] & {
    feature_image_url: string | null;
    feature_image_width: number | null;
    feature_image_height: number | null;
    blur_data_url: string | null;
};
import Image from 'next/image';
import { Button } from '@nextblock-cms/ui'; // Adjusted path
import PostCardSkeleton from './PostCardSkeleton'; // Added import

interface PostsGridClientProps {
  initialPosts: PostWithMediaDimensions[];
  initialPage: number;
  postsPerPage: number;
  totalCount: number;
  columns: number;
  languageId: number;
  showPagination: boolean;
  fetchAction: (languageId: number, page: number, limit: number) => Promise<{ posts: PostWithMediaDimensions[], totalCount: number, error?: string }>;
}

const DEFAULT_FEATURE_IMAGE_WIDTH = 1600;
const DEFAULT_FEATURE_IMAGE_HEIGHT = 900;

const PostsGridClient: React.FC<PostsGridClientProps> = ({
  initialPosts,
  initialPage,
  postsPerPage,
  totalCount,
  columns,
  languageId,
  showPagination,
  fetchAction,
}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [posts, setPosts] = useState<PostWithMediaDimensions[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Initialize skeletonCount to postsPerPage, or a sensible minimum if initialPosts is empty.
  const [skeletonCount, setSkeletonCount] = useState(initialPosts.length > 0 ? initialPosts.length : postsPerPage);

  const totalPages = Math.ceil(totalCount / postsPerPage);

  useEffect(() => {
    setPosts(initialPosts); // Sync if initialPosts change due to parent re-render
    setCurrentPage(initialPage);
    // When initialPosts change, update skeletonCount to reflect the number of items actually rendered initially,
    // or fall back to postsPerPage if initialPosts is empty (e.g., for a client-side initial fetch)
    setSkeletonCount(initialPosts.length > 0 ? initialPosts.length : postsPerPage);
  }, [initialPosts, initialPage, postsPerPage]);

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || isLoading) return;
    
    // For subsequent page loads, always show `postsPerPage` skeletons
    setSkeletonCount(postsPerPage);
    setIsLoading(true);
    setError(null);
    // Don't clear posts here immediately, skeletons will cover the loading state
    try {
      const result = await fetchAction(languageId, newPage, postsPerPage);

      if (result.error) {
        setError(result.error);
        setPosts([]); // Clear posts on error
      } else {
        setPosts(result.posts);
        setCurrentPage(newPage);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch posts.");
      setPosts([]); // Clear posts on error
    }
    setIsLoading(false);
  };

  const columnClasses: { [key: number]: string } = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };
  const gridColsClass = columnClasses[columns] || columnClasses[3];

  const getImageSizes = (cols: number): string => {
    switch (cols) {
      case 1:
        return '100vw';
      case 2:
        return '(max-width: 767px) 100vw, 50vw';
      case 4:
        return '(max-width: 639px) 100vw, (max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw';
      case 3:
      default:
        return '(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw';
    }
  };

  const imageSizes = getImageSizes(columns);

  if (error && !isLoading) { // Only show full error if not also loading (e.g. initial load error after skeletons)
    return <div className="text-red-500 py-10 text-center">Error: {error}</div>;
  }

  return (
    <div>
      <div className={`grid ${gridColsClass} gap-6`}>
        {isLoading ? (
          Array.from({ length: skeletonCount }).map((_, index) => (
            <PostCardSkeleton key={`skeleton-${index}`} />
          ))
        ) : posts.length > 0 ? (
          posts.map((post, index) => (
            <Link href={`/article/${post.slug}`} key={post.id} className="block group">
              <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-card text-card-foreground">
                {/* Basic Post Card Structure - Enhanced with Feature Image */}
                {post.feature_image_url ? (
                  <div className="aspect-video overflow-hidden">
                    <Image
                      src={post.feature_image_url}
                      alt={`Feature image for ${post.title}`}
                      width={post.feature_image_width && post.feature_image_width > 0 ? post.feature_image_width : DEFAULT_FEATURE_IMAGE_WIDTH}
                      height={post.feature_image_height && post.feature_image_height > 0 ? post.feature_image_height : DEFAULT_FEATURE_IMAGE_HEIGHT}
                      sizes={imageSizes}
                      priority={index === 0}
                      placeholder={post.blur_data_url ? 'blur' : 'empty'}
                      blurDataURL={post.blur_data_url ?? undefined}
                      quality={60}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : null}
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-primary">{post.title}</h3>
                  {post.excerpt && <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{post.excerpt}</p>}
                  <span className="text-xs text-primary group-hover:underline">Read more</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          !error && <div className="col-span-full text-center py-10">No posts found.</div> // Show if no posts and no error, and not loading
        )}
      </div>

      {showPagination && totalPages > 1 && (
        <div className="flex justify-center items-center mt-8 space-x-2">
          <Button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
      {/* {isLoading && <p className="text-center mt-4 text-sm text-muted-foreground">Fetching posts...</p>} */}
    </div>
  );
};

export default PostsGridClient;
