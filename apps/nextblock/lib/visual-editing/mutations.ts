import "server-only";

import { revalidatePath } from "next/cache";
import type { Json } from "@nextblock-cms/db";
import {
  getCurrentUserCanEdit,
  getOrCreateContentDraft,
  getPublicPath,
  normalizeContentDraftRow,
  updateDraftBlockContent,
} from "./draft-content";
import type {
  NextblockDocumentType,
  NextblockVisualDocumentType,
  VisualEditingBlockRequest,
} from "./types";

export type VisualEditingMutationResult =
  | { success: true }
  | { error: string };

export function isValidParentType(value: string): value is NextblockVisualDocumentType {
  return value === "page" || value === "post" || value === "product";
}

export function assertValidVisualEditingRequest(request: VisualEditingBlockRequest) {
  if (!isValidParentType(request.parentType)) {
    throw new Error("Invalid parent type.");
  }

  if (request.parentType === "product") {
    const PRODUCT_ID_PATTERN =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof request.parentId !== "string" || !PRODUCT_ID_PATTERN.test(request.parentId)) {
      throw new Error("Invalid product ID.");
    }
  } else {
    if (typeof request.parentId !== "number" || !Number.isFinite(request.parentId) || request.parentId <= 0) {
      throw new Error("Invalid parent ID.");
    }
  }

  const { target } = request;
  if (target.kind === "top-level") {
    if (!Number.isFinite(target.blockId) || !Number.isFinite(target.blockIndex)) {
      throw new Error("Invalid block target.");
    }
    return;
  }

  if (
    !Number.isFinite(target.parentBlockId) ||
    !Number.isFinite(target.parentBlockIndex) ||
    !Number.isFinite(target.columnIndex) ||
    !Number.isFinite(target.blockIndex)
  ) {
    throw new Error("Invalid nested block target.");
  }
}

export async function requireVisualEditingEditableUser() {
  const auth = await getCurrentUserCanEdit();

  if (!auth.user || !auth.canEdit) {
    throw new Error("Unauthorized.");
  }

  return auth;
}

export function revalidateVisualEditingPath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.warn("[visual-editing] Failed to revalidate path after draft mutation.", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function isMissingDraftStorageError(message: string, tableName: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes(tableName) &&
    (normalized.includes("could not find") ||
      normalized.includes("schema cache") ||
      normalized.includes("does not exist") ||
      normalized.includes("relation"))
  );
}

export function formatVisualEditingError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (isMissingDraftStorageError(message, "content_drafts")) {
    return "Draft storage is not set up in this database. Apply the schema (npm run db:migrate or the /setup wizard); content_drafts is created by the baseline schema migration.";
  }

  if (isMissingDraftStorageError(message, "product_drafts")) {
    return "Product draft storage is not set up in this database. Apply the schema (npm run db:migrate or the /setup wizard); product_drafts is created by the baseline schema migration.";
  }

  return message;
}

export async function saveVisualEditingBlockDraftMutation(
  request: VisualEditingBlockRequest,
  content: Json
): Promise<VisualEditingMutationResult> {
  try {
    assertValidVisualEditingRequest(request);
    const auth = await requireVisualEditingEditableUser();

    if (request.parentType === "product") {
      const { getOrCreateProductDraft } = await import("./product-drafts");
      const draft = await getOrCreateProductDraft(
        auth.supabase,
        request.parentId as string,
        auth.user.id
      );

      const nextSnapshot = updateDraftBlockContent(draft, request as any, content);
      const { data, error } = await (auth.supabase as any)
        .from("product_drafts")
        .update({
          author_id: auth.user.id,
          blocks: nextSnapshot.blocks,
        })
        .eq("id", draft.id)
        .select("*")
        .single();

      if (error || !data) {
        return {
          error: formatVisualEditingError(
            new Error(`Failed to save product draft: ${error?.message ?? "unknown error"}`),
            "Failed to save product draft."
          ),
        };
      }

      const slug = typeof data.meta?.slug === "string" ? data.meta.slug : "";
      if (slug) {
        revalidateVisualEditingPath(`/product/${slug}`);
      }

      return { success: true };
    } else {
      const draft = await getOrCreateContentDraft(
        auth.supabase,
        request.parentType as NextblockDocumentType,
        request.parentId as number,
        auth.user.id
      );

      const nextSnapshot = updateDraftBlockContent(draft, request as any, content);
      const { data, error } = await (auth.supabase as any)
        .from("content_drafts")
        .update({
          author_id: auth.user.id,
          blocks: nextSnapshot.blocks,
        })
        .eq("id", draft.id)
        .select("*")
        .single();

      if (error || !data) {
        return {
          error: formatVisualEditingError(
            new Error(`Failed to save draft: ${error?.message ?? "unknown error"}`),
            "Failed to save draft."
          ),
        };
      }

      const savedDraft = normalizeContentDraftRow(data);
      const slug = typeof savedDraft.meta.slug === "string" ? savedDraft.meta.slug : "";
      if (slug) {
        revalidateVisualEditingPath(getPublicPath(request.parentType as NextblockDocumentType, slug));
      }

      return { success: true };
    }
  } catch (error) {
    return {
      error: formatVisualEditingError(error, "Failed to save draft."),
    };
  }
}
