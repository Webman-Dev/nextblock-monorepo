import "server-only";

import type { Json } from "@nextblock-cms/db";
import { createClient, getServiceRoleSupabaseClient } from "@nextblock-cms/db/server";
import { updateProduct, syncProductSaleCouponToFreemius } from "@nextblock-cms/ecommerce/server";
import { getCurrentUserCanEdit, normalizeDraftBlocks } from "./draft-content";
import {
  formatVisualEditingError,
  requireVisualEditingEditableUser,
  revalidateVisualEditingPath,
  type VisualEditingMutationResult,
} from "./mutations";
import type {
  ProductVisualEditingField,
  VisualEditingProductFieldRequest,
  DraftBlockSnapshot,
} from "./types";

type SupabaseAny = ReturnType<typeof createClient>;

export interface ProductDraftRow {
  id: number;
  product_id: string;
  author_id: string | null;
  meta: Record<string, Json>;
  blocks: DraftBlockSnapshot[];
  created_at: string;
  updated_at: string;
}

type ProductSnapshot = {
  meta: Record<string, Json>;
  blocks: DraftBlockSnapshot[];
};

const PRODUCT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const productEditableFields = new Set<ProductVisualEditingField>([
  "title",
  "short_description",
  "description_json",
]);

const productSnapshotFields = [
  "id",
  "title",
  "slug",
  "sku",
  "upc",
  "price",
  "prices",
  "sale_price",
  "sale_prices",
  "is_taxable",
  "product_type",
  "payment_provider",
  "short_description",
  "stock",
  "status",
  "language_id",
  "translation_group_id",
  "meta_title",
  "meta_description",
  "custom_canonical",
  "freemius_product_id",
  "freemius_plan_id",
  "trial_period_days",
  "trial_requires_payment_method",
].join(", ");

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeProductDraftRow(row: Record<string, unknown>): ProductDraftRow {
  return {
    id: Number(row.id),
    product_id: String(row.product_id ?? ""),
    author_id: typeof row.author_id === "string" ? row.author_id : null,
    meta: isRecord(row.meta) ? (row.meta as Record<string, Json>) : {},
    blocks: normalizeDraftBlocks(row.blocks),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function getProductPublicPath(slug: string) {
  return `/product/${slug}`;
}

function isProductVisualEditingField(value: unknown): value is ProductVisualEditingField {
  return typeof value === "string" && productEditableFields.has(value as ProductVisualEditingField);
}

export function assertValidProductFieldRequest(request: VisualEditingProductFieldRequest) {
  if (request.parentType !== "product") {
    throw new Error("Invalid product draft target.");
  }

  if (!request.parentId || !PRODUCT_ID_PATTERN.test(request.parentId)) {
    throw new Error("Invalid product ID.");
  }

  if (request.target?.kind !== "product-field" || !isProductVisualEditingField(request.target.field)) {
    throw new Error("Invalid product field target.");
  }

  if (request.target.field === "description_json") {
    if (request.target.input !== "tiptap") {
      throw new Error("Invalid product field editor.");
    }
  } else {
    if (request.target.input !== "plain-text") {
      throw new Error("Invalid product field editor.");
    }
  }
}

function normalizeProductFieldContent(
  field: ProductVisualEditingField,
  content: Json
): Json {
  if (field === "title") {
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Product title cannot be empty.");
    }

    return content.trim();
  }

  if (field === "short_description") {
    if (content === null) {
      return null;
    }

    if (typeof content !== "string") {
      throw new Error("Product short description must be text.");
    }

    return content;
  }

  if (field === "description_json") {
    if (content !== null && typeof content !== "object") {
      throw new Error("Product description must be a rich-text JSON document.");
    }
    return content;
  }

  return content;
}

export async function readProductSnapshot(
  supabase: SupabaseAny,
  productId: string
): Promise<ProductSnapshot> {
  const { data, error } = await (supabase as any)
    .from("products")
    .select(productSnapshotFields)
    .eq("id", productId)
    .single();

  if (error || !data) {
    throw new Error(`Product not found: ${error?.message ?? "unknown error"}`);
  }

  const { data: blocks, error: blocksError } = await (supabase as any)
    .from("blocks")
    .select("id, page_id, post_id, product_id, language_id, block_type, content, order, created_at, updated_at")
    .eq("product_id", productId)
    .order("order", { ascending: true });

  if (blocksError) {
    throw new Error(`Failed to read product blocks: ${blocksError.message}`);
  }

  return {
    meta: data as Record<string, Json>,
    blocks: normalizeDraftBlocks(blocks),
  };
}

export async function getProductDraft(productId: string): Promise<ProductDraftRow | null> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("product_drafts")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeProductDraftRow(data);
}

export async function getOrCreateProductDraft(
  supabase: SupabaseAny,
  productId: string,
  authorId: string
): Promise<ProductDraftRow> {
  const { data: existing, error: existingError } = await (supabase as any)
    .from("product_drafts")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to read product draft: ${existingError.message}`);
  }

  if (existing) {
    return normalizeProductDraftRow(existing);
  }

  const snapshot = await readProductSnapshot(supabase, productId);
  const { data: created, error: createError } = await (supabase as any)
    .from("product_drafts")
    .insert({
      product_id: productId,
      author_id: authorId,
      meta: snapshot.meta,
      blocks: snapshot.blocks,
    })
    .select("*")
    .single();

  if (createError || !created) {
    throw new Error(`Failed to create product draft: ${createError?.message ?? "unknown error"}`);
  }

  return normalizeProductDraftRow(created);
}

export function applyProductDraftToProductRecord<T extends Record<string, unknown>>(
  product: T,
  draft: ProductDraftRow | null
): T {
  if (!draft) {
    return product;
  }

  const next: Record<string, unknown> = { ...product };
  for (const field of productEditableFields) {
    if (hasOwn(draft.meta, field)) {
      next[field] = draft.meta[field];
    }
  }

  return next as T;
}

export async function loadProductVisualEditingField(request: VisualEditingProductFieldRequest) {
  try {
    assertValidProductFieldRequest(request);
    const auth = await requireVisualEditingEditableUser();
    const { data } = await (auth.supabase as any)
      .from("product_drafts")
      .select("*")
      .eq("product_id", request.parentId)
      .maybeSingle();

    const draft = data ? normalizeProductDraftRow(data) : null;
    const snapshot = draft ?? (await readProductSnapshot(auth.supabase, request.parentId));
    const content = snapshot.meta[request.target.field] ?? null;

    return {
      success: true,
      content,
      draftId: draft?.id ?? null,
    };
  } catch (error) {
    return {
      error: formatVisualEditingError(error, "Failed to load product draft field."),
    };
  }
}

export async function saveProductVisualEditingDraftMutation(
  request: VisualEditingProductFieldRequest,
  content: Json
): Promise<VisualEditingMutationResult> {
  try {
    assertValidProductFieldRequest(request);
    const auth = await requireVisualEditingEditableUser();
    const draft = await getOrCreateProductDraft(auth.supabase, request.parentId, auth.user.id);
    const nextMeta = {
      ...draft.meta,
      [request.target.field]: normalizeProductFieldContent(request.target.field, content),
    };

    const { data, error } = await (auth.supabase as any)
      .from("product_drafts")
      .update({
        author_id: auth.user.id,
        meta: nextMeta,
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

    const savedDraft = normalizeProductDraftRow(data);
    const slug = typeof savedDraft.meta.slug === "string" ? savedDraft.meta.slug : "";
    if (slug) {
      revalidateVisualEditingPath(getProductPublicPath(slug));
    }

    return { success: true };
  } catch (error) {
    return {
      error: formatVisualEditingError(error, "Failed to save product draft."),
    };
  }
}

function addStringUpdate(
  payload: Record<string, unknown>,
  draft: ProductDraftRow,
  key: ProductVisualEditingField
) {
  const value = draft.meta[key];
  if (typeof value === "string") {
    payload[key] = value;
  }
}

function addNullableStringUpdate(
  payload: Record<string, unknown>,
  draft: ProductDraftRow,
  key: ProductVisualEditingField
) {
  if (!hasOwn(draft.meta, key)) {
    return;
  }

  const value = draft.meta[key];
  payload[key] = typeof value === "string" ? value : null;
}

export async function publishProductVisualEditingDraft(
  productId: string
): Promise<VisualEditingMutationResult> {
  try {
    const auth = await requireVisualEditingEditableUser();
    const { data, error } = await (auth.supabase as any)
      .from("product_drafts")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle();

    if (error) {
      return {
        error: formatVisualEditingError(
          new Error(`Failed to read product draft: ${error.message}`),
          "Failed to read product draft."
        ),
      };
    }

    if (!data) {
      return { error: "No draft exists for this product." };
    }

    const draft = normalizeProductDraftRow(data);
    const hasFullProductFormValues =
      draft.meta &&
      (typeof draft.meta.sku === "string" || typeof draft.meta.price === "number");

    if (hasFullProductFormValues) {
      await updateProduct(auth.supabase as any, productId, draft.meta as any);
      if ((draft.meta as any)?.payment_provider === "freemius") {
        try {
          await syncProductSaleCouponToFreemius({
            productId,
            client: getServiceRoleSupabaseClient() as any,
          });
        } catch (couponError) {
          console.error("Failed to sync Freemius sale coupon on publish:", couponError);
        }
      }
    } else {
      const productUpdate: Record<string, unknown> = {};
      addStringUpdate(productUpdate, draft, "title");
      addNullableStringUpdate(productUpdate, draft, "short_description");
      if (hasOwn(draft.meta, "description_json")) {
        const val = draft.meta["description_json"];
        productUpdate["description_json"] = (val !== null && typeof val === "object") ? val : null;
      }


      if (Object.keys(productUpdate).length > 0) {
        const { error: updateError } = await (auth.supabase as any)
          .from("products")
          .update(productUpdate)
          .eq("id", productId);

        if (updateError) {
          throw new Error(`Failed to update product: ${updateError.message}`);
        }
      }
    }

    // Publish blocks
    const { error: deleteBlocksError } = await (auth.supabase as any)
      .from("blocks")
      .delete()
      .eq("product_id", productId);

    if (deleteBlocksError) {
      throw new Error(`Failed to clear product blocks: ${deleteBlocksError.message}`);
    }

    const blocksToInsert = draft.blocks.map((block, index) => ({
      page_id: null,
      post_id: null,
      product_id: productId,
      language_id: block.language_id,
      block_type: block.block_type,
      content: block.content,
      order: Number.isFinite(block.order) ? block.order : index,
    }));

    if (blocksToInsert.length > 0) {
      const { error: insertBlocksError } = await (auth.supabase as any)
        .from("blocks")
        .insert(blocksToInsert as any);

      if (insertBlocksError) {
        throw new Error(`Failed to insert product blocks: ${insertBlocksError.message}`);
      }
    }

    const { error: deleteError } = await (auth.supabase as any)
      .from("product_drafts")
      .delete()
      .eq("id", draft.id);

    if (deleteError) {
      return { error: `Published, but failed to remove product draft: ${deleteError.message}` };
    }

    const slug = typeof draft.meta.slug === "string" ? draft.meta.slug : "";
    if (slug) {
      revalidateVisualEditingPath(getProductPublicPath(slug));
    }
    revalidateVisualEditingPath(`/cms/products/${productId}/edit`);

    return { success: true };
  } catch (error) {
    return {
      error: formatVisualEditingError(error, "Failed to publish product draft."),
    };
  }
}

export async function discardProductVisualEditingDraft(
  productId: string
): Promise<VisualEditingMutationResult> {
  try {
    const auth = await requireVisualEditingEditableUser();
    const { data } = await (auth.supabase as any)
      .from("product_drafts")
      .select("meta")
      .eq("product_id", productId)
      .maybeSingle();
    const { error } = await (auth.supabase as any)
      .from("product_drafts")
      .delete()
      .eq("product_id", productId);

    if (error) {
      return {
        error: formatVisualEditingError(
          new Error(`Failed to discard product draft: ${error.message}`),
          "Failed to discard product draft."
        ),
      };
    }

    const meta = isRecord(data?.meta) ? data.meta : {};
    const slug = typeof meta.slug === "string" ? meta.slug : "";
    if (slug) {
      revalidateVisualEditingPath(getProductPublicPath(slug));
    }

    return { success: true };
  } catch (error) {
    return {
      error: formatVisualEditingError(error, "Failed to discard product draft."),
    };
  }
}

export async function currentUserCanReadProductDrafts() {
  const auth = await getCurrentUserCanEdit();
  return auth.canEdit;
}
