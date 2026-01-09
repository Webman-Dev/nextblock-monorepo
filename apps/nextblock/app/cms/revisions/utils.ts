// apps/nextblock/app/cms/revisions/utils.ts
import { createClient } from "@nextblock-cms/db/server";
import type { Database, Json } from "@nextblock-cms/db";

type BlockRow = Database['public']['Tables']['blocks']['Row'];

export interface PageMetaContent {
  title: string;
  slug: string;
  language_id: number;
  status: Database['public']['Enums']['page_status'];
  meta_title: string | null;
  meta_description: string | null;
}

export interface PostMetaContent extends PageMetaContent {
  excerpt: string | null;
  published_at: string | null;
  feature_image_id: string | null;
}

export interface SimpleBlockContent {
  language_id: number;
  block_type: BlockRow['block_type'];
  content: Json;
  order: number;
}

export interface FullPageContent {
  meta: PageMetaContent;
  blocks: SimpleBlockContent[];
}

export interface FullPostContent {
  meta: PostMetaContent;
  blocks: SimpleBlockContent[];
}

export async function getFullPageContent(
  pageId: number,
  opts?: { overrideBlockId?: number; overrideBlockContent?: unknown; excludeDeletedBlockId?: number }
): Promise<FullPageContent | null> {
  const supabase = createClient();
  const { data: page, error: pageError } = await supabase
    .from('pages')
    .select('id, title, slug, language_id, status, meta_title, meta_description')
    .eq('id', pageId)
    .single();
  if (pageError || !page) return null;

  const { data: blocks, error: blocksError } = await supabase
    .from('blocks')
    .select('id, language_id, block_type, content, order, page_id, post_id')
    .eq('page_id', pageId)
    .order('order', { ascending: true });
  if (blocksError) return null;

  const processed = (blocks || [])
    .filter(b => opts?.excludeDeletedBlockId ? b.id !== opts.excludeDeletedBlockId : true)
    .map(b => ({
      language_id: b.language_id,
      block_type: b.block_type,
      content: (opts?.overrideBlockId && b.id === opts.overrideBlockId)
        ? (opts.overrideBlockContent as Json)
        : (b.content as Json),
      order: b.order,
    } satisfies SimpleBlockContent));

  return {
    meta: {
      title: page.title,
      slug: page.slug,
      language_id: page.language_id,
      status: page.status,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
    },
    blocks: processed,
  };
}

export async function getFullPostContent(
  postId: number,
  opts?: { overrideBlockId?: number; overrideBlockContent?: unknown; excludeDeletedBlockId?: number }
): Promise<FullPostContent | null> {
  const supabase = createClient();
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, title, slug, language_id, status, meta_title, meta_description, excerpt, published_at, feature_image_id')
    .eq('id', postId)
    .single();
  if (postError || !post) return null;

  const { data: blocks, error: blocksError } = await supabase
    .from('blocks')
    .select('id, language_id, block_type, content, order, page_id, post_id')
    .eq('post_id', postId)
    .order('order', { ascending: true });
  if (blocksError) return null;

  const processed = (blocks || [])
    .filter(b => opts?.excludeDeletedBlockId ? b.id !== opts.excludeDeletedBlockId : true)
    .map(b => ({
      language_id: b.language_id,
      block_type: b.block_type,
      content: (opts?.overrideBlockId && b.id === opts.overrideBlockId)
        ? (opts.overrideBlockContent as Json)
        : (b.content as Json),
      order: b.order,
    } satisfies SimpleBlockContent));

  return {
    meta: {
      title: post.title,
      slug: post.slug,
      language_id: post.language_id,
      status: post.status,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      excerpt: post.excerpt,
      published_at: post.published_at ? new Date(post.published_at).toISOString() : null,
      feature_image_id: post.feature_image_id ?? null,
    },
    blocks: processed,
  };
}

