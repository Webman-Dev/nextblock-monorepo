import "server-only";

import type { Json } from "@nextblock-cms/db";
import {
  createClient,
  getServiceRoleSupabaseClient,
  getSsgSupabaseClient,
} from "@nextblock-cms/db/server";
import type {
  ContentDraftRow,
  ContentDraftSnapshot,
  DraftBlockSnapshot,
  NextblockDocumentType,
  VisualEditingBlockRequest,
} from "./types";

type SupabaseAny = ReturnType<typeof createClient> | ReturnType<typeof getServiceRoleSupabaseClient>;

type RoleName = "ADMIN" | "WRITER" | string;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeJson(value: unknown): Json {
  if (value === undefined) {
    return null;
  }
  return value as Json;
}

export function normalizeDraftBlocks(value: unknown): DraftBlockSnapshot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index): DraftBlockSnapshot[] => {
    if (!isRecord(item)) {
      return [];
    }

    const languageId = toNumber(item.language_id);
    const blockType = typeof item.block_type === "string" ? item.block_type : null;

    if (!languageId || !blockType) {
      return [];
    }

    return [
      {
        id: toNumber(item.id) ?? undefined,
        page_id: toNumber(item.page_id),
        post_id: toNumber(item.post_id),
        product_id: typeof item.product_id === "string" ? item.product_id : null,
        language_id: languageId,
        block_type: blockType,
        content: normalizeJson(item.content),
        order: toNumber(item.order) ?? index,
        created_at: typeof item.created_at === "string" ? item.created_at : null,
        updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
      },
    ];
  });
}

export function normalizeContentDraftRow(row: Record<string, unknown>): ContentDraftRow {
  return {
    id: Number(row.id),
    parent_type: row.parent_type === "post" ? "post" : "page",
    parent_id: Number(row.parent_id),
    author_id: typeof row.author_id === "string" ? row.author_id : null,
    base_version: Number(row.base_version ?? 1),
    meta: isRecord(row.meta) ? (row.meta as Record<string, Json>) : {},
    blocks: normalizeDraftBlocks(row.blocks),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function getPublicPath(parentType: NextblockDocumentType, slug: string) {
  return parentType === "page" ? `/${slug}` : `/article/${slug}`;
}

export async function getCurrentUserCanEdit() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, canEdit: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as RoleName | undefined;
  return {
    supabase,
    user,
    canEdit: role === "ADMIN" || role === "WRITER",
  };
}

async function readPageSnapshot(
  supabase: SupabaseAny,
  pageId: number
): Promise<ContentDraftSnapshot & { baseVersion: number }> {
  const client = supabase as any;
  const { data: page, error: pageError } = await client
    .from("pages")
    .select("id, title, slug, language_id, status, meta_title, meta_description, custom_canonical, feature_image_id, version, translation_group_id")
    .eq("id", pageId)
    .single();

  if (pageError || !page) {
    throw new Error("Page not found.");
  }

  const { data: blocks, error: blocksError } = await client
    .from("blocks")
    .select("id, page_id, post_id, language_id, block_type, content, order, created_at, updated_at")
    .eq("page_id", pageId)
    .order("order", { ascending: true });

  if (blocksError) {
    throw new Error(`Failed to read page blocks: ${blocksError.message}`);
  }

  return {
    baseVersion: page.version ?? 1,
    meta: {
      title: page.title,
      slug: page.slug,
      language_id: page.language_id,
      status: page.status,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      custom_canonical: page.custom_canonical,
      feature_image_id: page.feature_image_id,
      translation_group_id: page.translation_group_id,
    } as Record<string, Json>,
    blocks: normalizeDraftBlocks(blocks),
  };
}

async function readPostSnapshot(
  supabase: SupabaseAny,
  postId: number
): Promise<ContentDraftSnapshot & { baseVersion: number }> {
  const client = supabase as any;
  const { data: post, error: postError } = await client
    .from("posts")
    .select("id, title, slug, language_id, status, meta_title, meta_description, custom_canonical, label, excerpt, subtitle, published_at, feature_image_id, version, translation_group_id")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    throw new Error("Post not found.");
  }

  const { data: blocks, error: blocksError } = await client
    .from("blocks")
    .select("id, page_id, post_id, language_id, block_type, content, order, created_at, updated_at")
    .eq("post_id", postId)
    .order("order", { ascending: true });

  if (blocksError) {
    throw new Error(`Failed to read post blocks: ${blocksError.message}`);
  }

  return {
    baseVersion: post.version ?? 1,
    meta: {
      title: post.title,
      slug: post.slug,
      language_id: post.language_id,
      status: post.status,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      custom_canonical: post.custom_canonical,
      label: post.label,
      excerpt: post.excerpt,
      subtitle: post.subtitle,
      published_at: post.published_at,
      feature_image_id: post.feature_image_id,
      translation_group_id: post.translation_group_id,
    } as Record<string, Json>,
    blocks: normalizeDraftBlocks(blocks),
  };
}

export async function readPublishedSnapshot(
  supabase: SupabaseAny,
  parentType: NextblockDocumentType,
  parentId: number
) {
  return parentType === "page"
    ? readPageSnapshot(supabase, parentId)
    : readPostSnapshot(supabase, parentId);
}

export async function getContentDraft(
  parentType: NextblockDocumentType,
  parentId: number
): Promise<ContentDraftRow | null> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("content_drafts")
    .select("*")
    .eq("parent_type", parentType)
    .eq("parent_id", parentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeContentDraftRow(data);
}

export async function getOrCreateContentDraft(
  supabase: SupabaseAny,
  parentType: NextblockDocumentType,
  parentId: number,
  authorId: string
): Promise<ContentDraftRow> {
  const { data: existing, error: existingError } = await (supabase as any)
    .from("content_drafts")
    .select("*")
    .eq("parent_type", parentType)
    .eq("parent_id", parentId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to read content draft: ${existingError.message}`);
  }

  if (existing) {
    return normalizeContentDraftRow(existing);
  }

  const snapshot = await readPublishedSnapshot(supabase, parentType, parentId);
  const { data: created, error: createError } = await (supabase as any)
    .from("content_drafts")
    .insert({
      parent_type: parentType,
      parent_id: parentId,
      author_id: authorId,
      base_version: snapshot.baseVersion,
      meta: snapshot.meta,
      blocks: snapshot.blocks,
    })
    .select("*")
    .single();

  if (createError || !created) {
    throw new Error(`Failed to create content draft: ${createError?.message ?? "unknown error"}`);
  }

  return normalizeContentDraftRow(created);
}

export function findDraftBlock(
  snapshot: ContentDraftSnapshot,
  request: VisualEditingBlockRequest
) {
  const { target } = request;

  if (target.kind === "top-level") {
    return (
      snapshot.blocks.find((block) => block.id === target.blockId) ??
      snapshot.blocks[target.blockIndex] ??
      null
    );
  }

  const parent =
    snapshot.blocks.find((block) => block.id === target.parentBlockId) ??
    snapshot.blocks[target.parentBlockIndex] ??
    null;

  if (!parent || !isRecord(parent.content)) {
    return null;
  }

  const columns = parent.content.column_blocks;
  if (!Array.isArray(columns)) {
    return null;
  }

  const column = columns[target.columnIndex];
  if (!Array.isArray(column)) {
    return null;
  }

  const nested = column[target.blockIndex];
  return isRecord(nested) ? nested : null;
}

export function updateDraftBlockContent(
  snapshot: ContentDraftSnapshot,
  request: VisualEditingBlockRequest,
  content: Json
): ContentDraftSnapshot {
  const blocks = JSON.parse(JSON.stringify(snapshot.blocks)) as DraftBlockSnapshot[];
  const nextSnapshot = { ...snapshot, blocks };
  const { target } = request;

  if (target.kind === "top-level") {
    const blockIndex = blocks.findIndex((block) => block.id === target.blockId);
    const resolvedIndex = blockIndex >= 0 ? blockIndex : target.blockIndex;
    const block = blocks[resolvedIndex];

    if (!block) {
      throw new Error("Draft block not found.");
    }

    if (block.block_type !== target.blockType) {
      throw new Error("Draft block type mismatch.");
    }

    blocks[resolvedIndex] = {
      ...block,
      content,
      updated_at: new Date().toISOString(),
    };
    return nextSnapshot;
  }

  const parentIndex = blocks.findIndex((block) => block.id === target.parentBlockId);
  const resolvedParentIndex = parentIndex >= 0 ? parentIndex : target.parentBlockIndex;
  const parent = blocks[resolvedParentIndex];

  if (!parent || !isRecord(parent.content)) {
    throw new Error("Draft parent block not found.");
  }

  if (parent.block_type !== target.parentBlockType) {
    throw new Error("Draft parent block type mismatch.");
  }

  const parentContent = JSON.parse(JSON.stringify(parent.content)) as Record<string, unknown>;
  const columns = parentContent.column_blocks;
  if (!Array.isArray(columns) || !Array.isArray(columns[target.columnIndex])) {
    throw new Error("Draft nested block column not found.");
  }

  const nested = columns[target.columnIndex][target.blockIndex];
  if (!isRecord(nested) || nested.block_type !== target.blockType) {
    throw new Error("Draft nested block type mismatch.");
  }

  columns[target.columnIndex][target.blockIndex] = {
    ...nested,
    content,
  };

  blocks[resolvedParentIndex] = {
    ...parent,
    content: parentContent as Json,
    updated_at: new Date().toISOString(),
  };

  return nextSnapshot;
}

export function createVerificationClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY) {
    return getServiceRoleSupabaseClient();
  }

  return getSsgSupabaseClient() as ReturnType<typeof getServiceRoleSupabaseClient>;
}
