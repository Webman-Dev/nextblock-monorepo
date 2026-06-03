"use server";

import { createClient } from "@nextblock-cms/db/server";
import type { Database, Json } from "@nextblock-cms/db";
import {
  customBlockDefinitionCreateSchema,
  customBlockDefinitionRowSchema,
  customBlockDefinitionUpdateSchema,
  type CustomBlockDefinition,
  type CustomBlockDefinitionCreateInput,
  type CustomBlockDefinitionUpdateInput,
} from "@nextblock-cms/utils";
import { revalidatePath, revalidateTag } from "next/cache";

import {
  CUSTOM_BLOCK_DEFINITIONS_CACHE_TAG,
  getCustomBlockDefinitionCacheTag,
} from "../../../lib/custom-block-definitions";
import {
  applyBlocksLibraryImport,
  dryRunBlocksLibraryImport,
  exportBlocksLibraryBundle,
} from "../../../lib/cms-transfer/server";
import type {
  CmsImportConflictMode,
  CmsImportSummary,
  CmsTransferActionResult,
} from "../../../lib/cms-transfer/types";

type SupabaseServerClient = ReturnType<typeof createClient>;
type CustomBlockDefinitionRow = Database["public"]["Tables"]["custom_block_definitions"]["Row"];

type CustomBlockActionResult<T> =
  | { data: T; success: true }
  | { code?: string; error: string; issues?: string[]; success: false };

const CUSTOM_BLOCK_SELECT = "id, slug, name, description, fields, layout_schema, is_original";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function formatIssues(issues: Array<{ message: string; path: Array<PropertyKey> }>) {
  return issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "An unknown error occurred.";
}

function parseDefinitionRow(row: unknown): CustomBlockDefinition {
  return customBlockDefinitionRowSchema.parse(row);
}

function revalidateCustomBlockDefinition(definition?: Pick<CustomBlockDefinitionRow, "id" | "slug"> | null) {
  revalidateTag(CUSTOM_BLOCK_DEFINITIONS_CACHE_TAG, "max");

  if (definition) {
    revalidateTag(getCustomBlockDefinitionCacheTag(definition.id), "max");
    revalidateTag(getCustomBlockDefinitionCacheTag(definition.slug), "max");
  }

  revalidatePath("/cms/blocks");
  revalidatePath("/cms/custom-blocks");
}

async function requireCmsWriter(supabase: SupabaseServerClient): Promise<CustomBlockActionResult<{ userId: string }>> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      code: "UNAUTHENTICATED",
      error: "User not authenticated.",
      success: false,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !["ADMIN", "WRITER"].includes(profile.role)) {
    return {
      code: "UNAUTHORIZED",
      error: "Unauthorized to manage custom block definitions.",
      success: false,
    };
  }

  return {
    data: { userId: user.id },
    success: true,
  };
}

async function fetchDefinitionForUpdate(
  supabase: SupabaseServerClient,
  id: string
): Promise<CustomBlockActionResult<CustomBlockDefinition>> {
  const { data, error } = await supabase
    .from("custom_block_definitions")
    .select(CUSTOM_BLOCK_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) {
    return {
      code: "NOT_FOUND",
      error: error?.message ?? "Custom block definition not found.",
      success: false,
    };
  }

  return {
    data: parseDefinitionRow(data),
    success: true,
  };
}

export async function listCustomBlockDefinitions(): Promise<CustomBlockActionResult<CustomBlockDefinition[]>> {
  try {
    const supabase = createClient();
    const actor = await requireCmsWriter(supabase);

    if (!actor.success) {
      return actor;
    }

    const { data, error } = await supabase
      .from("custom_block_definitions")
      .select(CUSTOM_BLOCK_SELECT)
      .order("name", { ascending: true });

    if (error) {
      return {
        code: error.code,
        error: `Failed to load custom block definitions: ${error.message}`,
        success: false,
      };
    }

    return {
      data: (data ?? []).map(parseDefinitionRow),
      success: true,
    };
  } catch (error) {
    console.error("Unexpected custom block list error:", error);
    return {
      error: getSafeErrorMessage(error),
      success: false,
    };
  }
}

export async function getCustomBlockDefinition(
  idOrSlug: string
): Promise<CustomBlockActionResult<CustomBlockDefinition>> {
  try {
    const supabase = createClient();
    const actor = await requireCmsWriter(supabase);

    if (!actor.success) {
      return actor;
    }

    const queryColumn = UUID_PATTERN.test(idOrSlug) ? "id" : "slug";
    const { data, error } = await supabase
      .from("custom_block_definitions")
      .select(CUSTOM_BLOCK_SELECT)
      .eq(queryColumn, idOrSlug)
      .single();

    if (error || !data) {
      return {
        code: error?.code ?? "NOT_FOUND",
        error: error?.message ?? "Custom block definition not found.",
        success: false,
      };
    }

    return {
      data: parseDefinitionRow(data),
      success: true,
    };
  } catch (error) {
    console.error("Unexpected custom block read error:", error);
    return {
      error: getSafeErrorMessage(error),
      success: false,
    };
  }
}

export async function createCustomBlockDefinition(
  input: CustomBlockDefinitionCreateInput
): Promise<CustomBlockActionResult<CustomBlockDefinition>> {
  const parsed = customBlockDefinitionCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: "Invalid custom block definition.",
      issues: formatIssues(parsed.error.issues),
      success: false,
    };
  }

  try {
    const supabase = createClient();
    const actor = await requireCmsWriter(supabase);

    if (!actor.success) {
      return actor;
    }

    const payload: Database["public"]["Tables"]["custom_block_definitions"]["Insert"] = {
      description: parsed.data.description,
      fields: toJson(parsed.data.fields),
      is_original: parsed.data.is_original,
      layout_schema: toJson(parsed.data.layout_schema),
      name: parsed.data.name,
      slug: parsed.data.slug,
    };

    const { data, error } = await supabase
      .from("custom_block_definitions")
      .insert(payload)
      .select(CUSTOM_BLOCK_SELECT)
      .single();

    if (error || !data) {
      return {
        code: error?.code,
        error: error?.message ?? "Failed to create custom block definition.",
        success: false,
      };
    }

    revalidateCustomBlockDefinition(data);

    return {
      data: parseDefinitionRow(data),
      success: true,
    };
  } catch (error) {
    console.error("Unexpected custom block create error:", error);
    return {
      error: getSafeErrorMessage(error),
      success: false,
    };
  }
}

export async function updateCustomBlockDefinition(
  id: string,
  input: CustomBlockDefinitionUpdateInput
): Promise<CustomBlockActionResult<CustomBlockDefinition>> {
  const updateParsed = customBlockDefinitionUpdateSchema.safeParse(input);

  if (!updateParsed.success) {
    return {
      error: "Invalid custom block update.",
      issues: formatIssues(updateParsed.error.issues),
      success: false,
    };
  }

  try {
    const supabase = createClient();
    const actor = await requireCmsWriter(supabase);

    if (!actor.success) {
      return actor;
    }

    const existing = await fetchDefinitionForUpdate(supabase, id);

    if (!existing.success) {
      return existing;
    }

    const merged = customBlockDefinitionCreateSchema.safeParse({
      description: updateParsed.data.description ?? existing.data.description,
      fields: updateParsed.data.fields ?? existing.data.fields,
      is_original: updateParsed.data.is_original ?? existing.data.is_original,
      layout_schema: updateParsed.data.layout_schema ?? existing.data.layout_schema,
      name: updateParsed.data.name ?? existing.data.name,
      slug: updateParsed.data.slug ?? existing.data.slug,
    });

    if (!merged.success) {
      return {
        error: "Invalid merged custom block definition.",
        issues: formatIssues(merged.error.issues),
        success: false,
      };
    }

    const payload: Database["public"]["Tables"]["custom_block_definitions"]["Update"] = {};

    if (updateParsed.data.description !== undefined) {
      payload.description = updateParsed.data.description;
    }
    if (updateParsed.data.fields !== undefined) {
      payload.fields = toJson(updateParsed.data.fields);
    }
    if (updateParsed.data.is_original !== undefined) {
      payload.is_original = updateParsed.data.is_original;
    }
    if (updateParsed.data.layout_schema !== undefined) {
      payload.layout_schema = toJson(updateParsed.data.layout_schema);
    }
    if (updateParsed.data.name !== undefined) {
      payload.name = updateParsed.data.name;
    }
    if (updateParsed.data.slug !== undefined) {
      payload.slug = updateParsed.data.slug;
    }

    const { data, error } = await supabase
      .from("custom_block_definitions")
      .update(payload)
      .eq("id", id)
      .select(CUSTOM_BLOCK_SELECT)
      .single();

    if (error || !data) {
      return {
        code: error?.code,
        error: error?.message ?? "Failed to update custom block definition.",
        success: false,
      };
    }

    revalidateCustomBlockDefinition(existing.data);
    revalidateCustomBlockDefinition(data);

    return {
      data: parseDefinitionRow(data),
      success: true,
    };
  } catch (error) {
    console.error("Unexpected custom block update error:", error);
    return {
      error: getSafeErrorMessage(error),
      success: false,
    };
  }
}

export async function deleteCustomBlockDefinition(
  id: string
): Promise<CustomBlockActionResult<{ id: string; slug: string }>> {
  try {
    const supabase = createClient();
    const actor = await requireCmsWriter(supabase);

    if (!actor.success) {
      return actor;
    }

    const existing = await fetchDefinitionForUpdate(supabase, id);

    if (!existing.success) {
      return existing;
    }

    const { error } = await supabase
      .from("custom_block_definitions")
      .delete()
      .eq("id", id);

    if (error) {
      return {
        code: error.code,
        error: `Failed to delete custom block definition: ${error.message}`,
        success: false,
      };
    }

    revalidateCustomBlockDefinition(existing.data);

    return {
      data: {
        id: existing.data.id,
        slug: existing.data.slug,
      },
      success: true,
    };
  } catch (error) {
    console.error("Unexpected custom block delete error:", error);
    return {
      error: getSafeErrorMessage(error),
      success: false,
    };
  }
}

export async function duplicateCustomBlockDefinition(
  id: string
): Promise<CustomBlockActionResult<CustomBlockDefinition>> {
  try {
    const supabase = createClient();
    const actor = await requireCmsWriter(supabase);

    if (!actor.success) {
      return actor;
    }

    const { data, error } = await supabase.rpc("duplicate_block_definition", {
      target_id: id,
    });

    if (error || !data) {
      return {
        code: error?.code,
        error: error?.message ?? "Failed to duplicate custom block definition.",
        success: false,
      };
    }

    const duplicated = Array.isArray(data) ? data[0] : data;
    const parsed = parseDefinitionRow(duplicated);

    revalidateCustomBlockDefinition(parsed);

    return {
      data: parsed,
      success: true,
    };
  } catch (error) {
    console.error("Unexpected custom block duplicate error:", error);
    return {
      error: getSafeErrorMessage(error),
      success: false,
    };
  }
}

function blocksLibraryDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function blocksLibraryErrorSummary(message: string): CmsImportSummary {
  return {
    success: false,
    totalRows: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    preview: [],
    warnings: [],
    errors: [{ row: 0, type: "error", message }],
  };
}

export async function exportBlocksLibraryAction(): Promise<CmsTransferActionResult> {
  try {
    return {
      success: true,
      fileName: `nextblock-blocks-library-${blocksLibraryDateStamp()}.json`,
      mimeType: "application/json",
      content: await exportBlocksLibraryBundle(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export blocks library.",
    };
  }
}

export async function dryRunBlocksLibraryImportAction(params: {
  bundleJson: string;
  conflictMode: CmsImportConflictMode;
}): Promise<CmsImportSummary> {
  try {
    return await dryRunBlocksLibraryImport({
      bundleJson: params.bundleJson,
      options: { conflictMode: params.conflictMode },
    });
  } catch (error) {
    return blocksLibraryErrorSummary(
      error instanceof Error ? error.message : "Failed to review blocks library import."
    );
  }
}

export async function applyBlocksLibraryImportAction(params: {
  bundleJson: string;
  conflictMode: CmsImportConflictMode;
}): Promise<CmsImportSummary> {
  try {
    return await applyBlocksLibraryImport({
      bundleJson: params.bundleJson,
      options: { conflictMode: params.conflictMode },
    });
  } catch (error) {
    return blocksLibraryErrorSummary(
      error instanceof Error ? error.message : "Failed to apply blocks library import."
    );
  }
}
