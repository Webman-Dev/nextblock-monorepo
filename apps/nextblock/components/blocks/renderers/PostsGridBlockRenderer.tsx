import React from "react";
import PostsGridBlock from "@/components/blocks/PostsGridBlock";
import type { Database } from "@nextblock-cms/db";

type Block = Database['public']['Tables']['blocks']['Row'];
type PostsGridBlockContent = {
    title?: string;
    postsPerPage?: number;
    columns?: number;
    showPagination?: boolean;
};

interface PostsGridBlockRendererProps {
  content: PostsGridBlockContent;
  languageId: number;
  block: Block;
}

const PostsGridBlockRenderer: React.FC<PostsGridBlockRendererProps> = ({
  content,
  languageId,
  block,
}) => {
  void content;
  return (
    <PostsGridBlock
      block={block}
      languageId={languageId}
    />
  );
};

export default PostsGridBlockRenderer;
