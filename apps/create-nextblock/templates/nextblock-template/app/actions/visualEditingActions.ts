"use server";

import type { Json } from "@nextblock-cms/db";
import {
  getFullPageContent,
  getFullPostContent,
} from "../cms/revisions/utils";
import {
  createPageRevision,
  createPostRevision,
} from "../cms/revisions/service";
import {
  findDraftBlock,
  getCurrentUserCanEdit,
  getPublicPath,
  normalizeContentDraftRow,
  readPublishedSnapshot,
} from "../../lib/visual-editing/draft-content";
import {
  assertValidVisualEditingRequest,
  formatVisualEditingError,
  requireVisualEditingEditableUser,
  revalidateVisualEditingPath,
  saveVisualEditingBlockDraftMutation,
} from "../../lib/visual-editing/mutations";
import {
  discardProductVisualEditingDraft,
  loadProductVisualEditingField,
  publishProductVisualEditingDraft,
} from "../../lib/visual-editing/product-drafts";
import type {
  ContentDraftRow,
  DraftBlockSnapshot,
  NextblockDocumentType,
  VisualEditingBlockRequest,
  VisualEditingProductFieldRequest,
} from "../../lib/visual-editing/types";

export async function loadVisualEditingBlockContent(request: VisualEditingBlockRequest) {
  try {
    assertValidVisualEditingRequest(request);
    const auth = await requireVisualEditingEditableUser();

    let snapshot: { blocks: DraftBlockSnapshot[]; meta?: Record<string, Json> } | null = null;
    let draftId: number | null = null;

    if (request.parentType === "product") {
      const { getProductDraft, readProductSnapshot } = await import("../../lib/visual-editing/product-drafts");
      const draft = await getProductDraft(request.parentId as string);
      if (draft) {
        snapshot = draft;
        draftId = draft.id;
      } else {
        snapshot = await readProductSnapshot(auth.supabase, request.parentId as string);
      }
    } else {
      let draft: ContentDraftRow | null = null;
      const { data } = await (auth.supabase as any)
        .from("content_drafts")
        .select("*")
        .eq("parent_type", request.parentType)
        .eq("parent_id", request.parentId)
        .maybeSingle();

      if (data) {
        draft = normalizeContentDraftRow(data);
        draftId = draft.id;
      }

      snapshot = draft ?? (await readPublishedSnapshot(auth.supabase, request.parentType as NextblockDocumentType, request.parentId as number));
    }

    const block = findDraftBlock(snapshot as any, request);

    if (!block) {
      return { error: "Block not found." };
    }

    if (request.target.kind === "nested") {
      return {
        success: true,
        content: (block as { content?: Json }).content ?? null,
        draftId,
      };
    }

    return {
      success: true,
      content: (block as DraftBlockSnapshot).content,
      draftId,
    };
  } catch (error) {
    return {
      error: formatVisualEditingError(error, "Failed to load draft block."),
    };
  }
}

export async function saveVisualEditingBlockDraft(
  request: VisualEditingBlockRequest,
  content: Json
) {
  return saveVisualEditingBlockDraftMutation(request, content);
}

export async function loadVisualEditingProductField(
  request: VisualEditingProductFieldRequest
) {
  return loadProductVisualEditingField(request);
}

function buildBlockInsertPayload(
  block: DraftBlockSnapshot,
  parentType: NextblockDocumentType,
  parentId: number,
  index: number
) {
  return {
    page_id: parentType === "page" ? parentId : null,
    post_id: parentType === "post" ? parentId : null,
    language_id: block.language_id,
    block_type: block.block_type,
    content: block.content,
    order: Number.isFinite(block.order) ? block.order : index,
  };
}

function hasDraftMetaValue(draft: ContentDraftRow, key: string) {
  return Object.prototype.hasOwnProperty.call(draft.meta, key);
}

function addStringMeta(
  payload: Record<string, unknown>,
  draft: ContentDraftRow,
  key: string
) {
  const value = draft.meta[key];
  if (typeof value === "string") {
    payload[key] = value;
  }
}

function addNullableStringMeta(
  payload: Record<string, unknown>,
  draft: ContentDraftRow,
  key: string
) {
  if (!hasDraftMetaValue(draft, key)) {
    return;
  }

  const value = draft.meta[key];
  payload[key] = typeof value === "string" ? value : null;
}

function addNumberMeta(
  payload: Record<string, unknown>,
  draft: ContentDraftRow,
  key: string
) {
  const value = draft.meta[key];
  if (typeof value === "number") {
    payload[key] = value;
  }
}

async function publishPageDraft(draft: ContentDraftRow, authorId: string) {
  const auth = await getCurrentUserCanEdit();
  const supabase = auth.supabase;
  const previousContent = await getFullPageContent(draft.parent_id);
  const pageUpdate: Record<string, unknown> = {};
  addStringMeta(pageUpdate, draft, "title");
  addStringMeta(pageUpdate, draft, "slug");
  addNumberMeta(pageUpdate, draft, "language_id");
  addStringMeta(pageUpdate, draft, "status");
  addNullableStringMeta(pageUpdate, draft, "meta_title");
  addNullableStringMeta(pageUpdate, draft, "meta_description");
  addNullableStringMeta(pageUpdate, draft, "custom_canonical");
  addNullableStringMeta(pageUpdate, draft, "feature_image_id");

  const { error: pageError } = await supabase
    .from("pages")
    .update(pageUpdate as any)
    .eq("id", draft.parent_id);

  if (pageError) {
    throw new Error(`Failed to update page: ${pageError.message}`);
  }

  const { error: deleteError } = await supabase.from("blocks").delete().eq("page_id", draft.parent_id);
  if (deleteError) {
    throw new Error(`Failed to clear page blocks: ${deleteError.message}`);
  }

  const blocks = draft.blocks.map((block, index) =>
    buildBlockInsertPayload(block, "page", draft.parent_id, index)
  );

  if (blocks.length > 0) {
    const { error: insertError } = await supabase.from("blocks").insert(blocks as any);
    if (insertError) {
      throw new Error(`Failed to insert page blocks: ${insertError.message}`);
    }
  }

  const nextContent = await getFullPageContent(draft.parent_id);
  if (previousContent && nextContent) {
    await createPageRevision(draft.parent_id, authorId, previousContent, nextContent);
  }
}

async function publishPostDraft(draft: ContentDraftRow, authorId: string) {
  const auth = await getCurrentUserCanEdit();
  const supabase = auth.supabase;
  const previousContent = await getFullPostContent(draft.parent_id);
  const postUpdate: Record<string, unknown> = {};
  addStringMeta(postUpdate, draft, "title");
  addStringMeta(postUpdate, draft, "slug");
  addNumberMeta(postUpdate, draft, "language_id");
  addStringMeta(postUpdate, draft, "status");
  addNullableStringMeta(postUpdate, draft, "meta_title");
  addNullableStringMeta(postUpdate, draft, "meta_description");
  addNullableStringMeta(postUpdate, draft, "custom_canonical");
  addNullableStringMeta(postUpdate, draft, "label");
  addNullableStringMeta(postUpdate, draft, "excerpt");
  addNullableStringMeta(postUpdate, draft, "subtitle");
  addNullableStringMeta(postUpdate, draft, "published_at");
  addNullableStringMeta(postUpdate, draft, "feature_image_id");

  const { error: postError } = await supabase
    .from("posts")
    .update(postUpdate as any)
    .eq("id", draft.parent_id);

  if (postError) {
    throw new Error(`Failed to update post: ${postError.message}`);
  }

  const { error: deleteError } = await supabase.from("blocks").delete().eq("post_id", draft.parent_id);
  if (deleteError) {
    throw new Error(`Failed to clear post blocks: ${deleteError.message}`);
  }

  const blocks = draft.blocks.map((block, index) =>
    buildBlockInsertPayload(block, "post", draft.parent_id, index)
  );

  if (blocks.length > 0) {
    const { error: insertError } = await supabase.from("blocks").insert(blocks as any);
    if (insertError) {
      throw new Error(`Failed to insert post blocks: ${insertError.message}`);
    }
  }

  const nextContent = await getFullPostContent(draft.parent_id);
  if (previousContent && nextContent) {
    await createPostRevision(draft.parent_id, authorId, previousContent, nextContent);
  }
}

export async function publishVisualEditingDraft(parentType: NextblockDocumentType, parentId: number) {
  try {
    const auth = await requireVisualEditingEditableUser();
    const { data, error } = await (auth.supabase as any)
      .from("content_drafts")
      .select("*")
      .eq("parent_type", parentType)
      .eq("parent_id", parentId)
      .maybeSingle();

    if (error) {
      return {
        error: formatVisualEditingError(
          new Error(`Failed to read content draft: ${error.message}`),
          "Failed to read content draft."
        ),
      };
    }

    if (!data) {
      return { error: "No draft exists for this content." };
    }

    const draft = normalizeContentDraftRow(data);

    if (parentType === "page") {
      await publishPageDraft(draft, auth.user.id);
    } else {
      await publishPostDraft(draft, auth.user.id);
    }

    const { error: deleteError } = await (auth.supabase as any)
      .from("content_drafts")
      .delete()
      .eq("id", draft.id);

    if (deleteError) {
      return { error: `Published, but failed to remove draft: ${deleteError.message}` };
    }

    const slug = typeof draft.meta.slug === "string" ? draft.meta.slug : "";
    if (slug) {
      revalidateVisualEditingPath(getPublicPath(parentType, slug));
    }
    revalidateVisualEditingPath(parentType === "page" ? `/cms/pages/${parentId}/edit` : `/cms/posts/${parentId}/edit`);

    return { success: true };
  } catch (error) {
    return {
      error: formatVisualEditingError(error, "Failed to publish draft."),
    };
  }
}

export async function discardVisualEditingDraft(parentType: NextblockDocumentType, parentId: number) {
  try {
    const auth = await requireVisualEditingEditableUser();
    const { error } = await (auth.supabase as any)
      .from("content_drafts")
      .delete()
      .eq("parent_type", parentType)
      .eq("parent_id", parentId);

    if (error) {
      return {
        error: formatVisualEditingError(
          new Error(`Failed to discard draft: ${error.message}`),
          "Failed to discard draft."
        ),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      error: formatVisualEditingError(error, "Failed to discard draft."),
    };
  }
}

export async function publishVisualEditingProductDraft(productId: string) {
  return publishProductVisualEditingDraft(productId);
}

export async function discardVisualEditingProductDraft(productId: string) {
  return discardProductVisualEditingDraft(productId);
}
