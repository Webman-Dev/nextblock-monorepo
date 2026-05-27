import "server-only";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import type { Json } from "@nextblock-cms/db";
import {
  createClient,
  getServiceRoleSupabaseClient,
} from "@nextblock-cms/db/server";
import { syncCategoriesForTranslationGroup } from "@nextblock-cms/ecommerce/server";

import {
  createPageRevision,
  createPostRevision,
} from "../../app/cms/revisions/service";
import {
  getFullPageContent,
  getFullPostContent,
  type FullPageContent,
  type FullPostContent,
} from "../../app/cms/revisions/utils";
import {
  getCsvHeaders,
  getTemplateCsv,
  majorToMinor,
  makeUniqueSku,
  makeUniqueSlug,
  minorToMajor,
  normalizeBlocksFromFields,
  parseBoolean,
  parseCsv,
  parseJsonField,
  parseNullableNumber,
  parseNumber,
  priceMapMajorToMinor,
  priceMapMinorToMajor,
  salePriceMapMajorToMinor,
  salePriceMapMinorToMajor,
  splitList,
  stringifyCsv,
  toJsonCell,
} from "./csv";
import type {
  BackupBlockRecord,
  BackupPageRecord,
  BackupPostRecord,
  BackupProductRecord,
  BackupProductVariantRecord,
  CmsBackupBundleV1,
  CmsContentType,
  CmsImportMessage,
  CmsImportOptions,
  CmsImportPreviewItem,
  CmsImportSummary,
} from "./types";

type SupabaseAny = ReturnType<typeof getServiceRoleSupabaseClient>;
type CsvLikeRow = Record<string, string>;
type ImportSourceRow = CsvLikeRow | BackupPageRecord | BackupPostRecord | BackupProductRecord;

const PAGE_STATUSES = new Set(["draft", "published", "archived"]);
const PRODUCT_STATUSES = new Set(["draft", "active", "archived"]);
const PRODUCT_TYPES = new Set(["physical", "digital"]);
const PAYMENT_PROVIDERS = new Set(["stripe", "freemius"]);

interface TransferAuth {
  userId: string;
  role: string;
  supabase: SupabaseAny;
}

interface LanguageRecord {
  id: number;
  code: string;
  name: string | null;
}

interface ExistingContentRecord {
  id: number;
  language_id: number;
  slug: string;
  title: string;
  status: string;
  version?: number | null;
  translation_group_id?: string | null;
}

interface ExistingProductRecord {
  id: string;
  language_id: number;
  slug: string;
  sku: string;
  title: string;
  status: string;
  translation_group_id?: string | null;
}

interface PreparedContentImport {
  contentType: "pages" | "posts";
  rowNumber: number;
  action: "create" | "update";
  targetId: number | null;
  meta: Record<string, unknown>;
  blocks: BackupBlockRecord[];
  oldSlug?: string | null;
}

interface PreparedProductImport {
  contentType: "products";
  rowNumber: number;
  action: "create" | "update";
  targetId: string | null;
  meta: Record<string, unknown>;
  blocks: BackupBlockRecord[];
  categoryIds: string[];
  mediaIds: string[];
  variants: BackupProductVariantRecord[];
  oldSlug?: string | null;
}

type PreparedImport = PreparedContentImport | PreparedProductImport;

function emptySummary(): CmsImportSummary {
  return {
    success: true,
    totalRows: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
    preview: [],
  };
}

function addMessage(
  messages: CmsImportMessage[],
  row: number,
  message: string,
  type: "error" | "warning" = "error"
) {
  messages.push({ row, type, message });
}

function normalizeNullableString(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : null;
}

function normalizeRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeId(value: unknown) {
  const text = normalizeRequiredString(value);
  return text || null;
}

function readRequiredNumber(
  value: unknown,
  fieldName: string,
  rowNumber: number,
  errors: CmsImportMessage[]
) {
  const raw = typeof value === "number" ? String(value) : normalizeRequiredString(value);
  if (!raw) {
    addMessage(errors, rowNumber, `${fieldName} is required.`);
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    addMessage(errors, rowNumber, `${fieldName} must be a valid number.`);
    return null;
  }
  if (parsed < 0) {
    addMessage(errors, rowNumber, `${fieldName} must be zero or greater.`);
    return null;
  }

  return parsed;
}

function readOptionalDate(
  value: unknown,
  fieldName: string,
  rowNumber: number,
  errors: CmsImportMessage[]
) {
  const raw = normalizeNullableString(value);
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    addMessage(errors, rowNumber, `${fieldName} must be a valid date.`);
    return null;
  }

  return date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function requireTransferUser(adminOnly = false): Promise<TransferAuth> {
  const authClient = createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: profile, error } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Could not verify CMS permissions.");
  }

  const role = profile.role;
  const allowed = adminOnly ? role === "ADMIN" : role === "ADMIN" || role === "WRITER";
  if (!allowed) {
    throw new Error(adminOnly ? "Admin role required." : "Writer or admin role required.");
  }

  return {
    userId: user.id,
    role,
    supabase: getServiceRoleSupabaseClient(),
  };
}

async function loadLanguages(supabase: SupabaseAny) {
  const { data, error } = await supabase
    .from("languages")
    .select("id, code, name")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Failed to load languages: ${error.message}`);
  }

  const languages = (data || []) as LanguageRecord[];
  const byCode = new Map(languages.map((language) => [language.code.toLowerCase(), language]));
  const byId = new Map(languages.map((language) => [language.id, language]));

  return { languages, byCode, byId };
}

async function loadMediaMaps(supabase: SupabaseAny) {
  const { data, error } = await supabase
    .from("media")
    .select("id, object_key");

  if (error) {
    throw new Error(`Failed to load media references: ${error.message}`);
  }

  const byId = new Map<string, { id: string; object_key: string | null }>();
  const byObjectKey = new Map<string, { id: string; object_key: string | null }>();

  for (const media of data || []) {
    const id = String((media as any).id);
    const objectKey = typeof (media as any).object_key === "string" ? (media as any).object_key : null;
    byId.set(id, { id, object_key: objectKey });
    if (objectKey) {
      byObjectKey.set(objectKey, { id, object_key: objectKey });
    }
  }

  return { byId, byObjectKey };
}

function resolveMediaId(params: {
  id?: string | null;
  objectKey?: string | null;
  rowNumber: number;
  fieldLabel: string;
  mediaById: Map<string, { id: string; object_key: string | null }>;
  mediaByObjectKey: Map<string, { id: string; object_key: string | null }>;
  warnings: CmsImportMessage[];
}) {
  const id = normalizeId(params.id);
  const objectKey = normalizeId(params.objectKey);

  if (id) {
    if (params.mediaById.has(id)) {
      return id;
    }

    addMessage(params.warnings, params.rowNumber, `${params.fieldLabel} "${id}" was not found and will be skipped.`, "warning");
    return null;
  }

  if (objectKey) {
    const media = params.mediaByObjectKey.get(objectKey);
    if (media) {
      return media.id;
    }

    addMessage(params.warnings, params.rowNumber, `${params.fieldLabel} object key "${objectKey}" was not found and will be skipped.`, "warning");
  }

  return null;
}

function getLanguageId(
  row: ImportSourceRow,
  rowNumber: number,
  languagesByCode: Map<string, LanguageRecord>,
  errors: CmsImportMessage[]
) {
  const languageCode = normalizeRequiredString((row as any).language_code).toLowerCase();
  if (!languageCode) {
    addMessage(errors, rowNumber, "language_code is required.");
    return null;
  }

  const language = languagesByCode.get(languageCode);
  if (!language) {
    addMessage(errors, rowNumber, `Language "${languageCode}" does not exist.`);
    return null;
  }

  return language.id;
}

function parseBlocksForContent(
  row: ImportSourceRow,
  rowNumber: number,
  languageId: number,
  errors: CmsImportMessage[]
) {
  const localErrors: Array<{ row: number; message: string }> = [];
  const backupBlocks = Array.isArray((row as BackupPageRecord).blocks)
    ? (row as BackupPageRecord).blocks
    : undefined;
  const parsedBlocks =
    backupBlocks ??
    parseJsonField<unknown>(
      (row as CsvLikeRow).blocks_json,
      "blocks_json",
      rowNumber,
      localErrors
    );

  const blocks = normalizeBlocksFromFields({
    blocksJson: parsedBlocks,
    html: (row as CsvLikeRow).content_html,
    languageId,
    rowNumber,
    errors: localErrors,
  });

  for (const error of localErrors) {
    addMessage(errors, error.row, error.message);
  }

  return blocks;
}

function parseBlocksForProduct(
  row: ImportSourceRow,
  rowNumber: number,
  languageId: number,
  errors: CmsImportMessage[]
) {
  const localErrors: Array<{ row: number; message: string }> = [];
  const backupBlocks = Array.isArray((row as BackupProductRecord).description_blocks)
    ? (row as BackupProductRecord).description_blocks
    : undefined;
  const parsedBlocks =
    backupBlocks ??
    parseJsonField<unknown>(
      (row as CsvLikeRow).description_blocks_json,
      "description_blocks_json",
      rowNumber,
      localErrors
    );

  const blocks = normalizeBlocksFromFields({
    blocksJson: parsedBlocks,
    html: (row as CsvLikeRow).description_html,
    languageId,
    rowNumber,
    errors: localErrors,
  });

  for (const error of localErrors) {
    addMessage(errors, error.row, error.message);
  }

  return blocks;
}

async function loadExistingContent(supabase: SupabaseAny, contentType: "pages" | "posts") {
  const table = contentType === "pages" ? "pages" : "posts";
  const { data, error } = await supabase
    .from(table)
    .select("id, language_id, slug, title, status, version, translation_group_id");

  if (error) {
    throw new Error(`Failed to load existing ${contentType}: ${error.message}`);
  }

  const byId = new Map<number, ExistingContentRecord>();
  const bySlug = new Map<string, ExistingContentRecord>();

  for (const item of (data || []) as ExistingContentRecord[]) {
    byId.set(Number(item.id), item);
    bySlug.set(`${item.language_id}:${item.slug}`, item);
  }

  return { byId, bySlug };
}

async function loadExistingProducts(supabase: SupabaseAny) {
  const { data, error } = await supabase
    .from("products")
    .select("id, language_id, slug, sku, title, status, translation_group_id");

  if (error) {
    throw new Error(`Failed to load existing products: ${error.message}`);
  }

  const byId = new Map<string, ExistingProductRecord>();
  const bySlug = new Map<string, ExistingProductRecord>();
  const bySku = new Map<string, ExistingProductRecord>();

  for (const item of (data || []) as ExistingProductRecord[]) {
    byId.set(item.id, item);
    bySlug.set(`${item.language_id}:${item.slug}`, item);
    bySku.set(`${item.language_id}:${item.sku}`, item);
  }

  return { byId, bySlug, bySku };
}

function createPreview(
  prepared: PreparedImport[],
  summary: CmsImportSummary
) {
  summary.preview = prepared.map((item) => ({
    row: item.rowNumber,
    action: item.action,
    identifier:
      item.contentType === "products"
        ? String(item.meta.sku || item.meta.slug || item.meta.title || item.targetId || "Product")
        : String(item.meta.slug || item.meta.title || item.targetId || "Content"),
    contentType: item.contentType,
  })) satisfies CmsImportPreviewItem[];
  summary.created = prepared.filter((item) => item.action === "create").length;
  summary.updated = prepared.filter((item) => item.action === "update").length;
  summary.skipped = 0;
}

async function prepareContentImports(params: {
  supabase: SupabaseAny;
  contentType: "pages" | "posts";
  rows: ImportSourceRow[];
  options: CmsImportOptions;
}) {
  const summary = emptySummary();
  summary.totalRows = params.rows.length;
  const prepared: PreparedContentImport[] = [];
  const { byCode: languagesByCode } = await loadLanguages(params.supabase);
  const mediaMaps = await loadMediaMaps(params.supabase);
  const existing = await loadExistingContent(params.supabase, params.contentType);
  const slugSets = new Map<number, Set<string>>();
  const translationGroupMap = new Map<string, string>();

  for (const item of existing.byId.values()) {
    const set = slugSets.get(item.language_id) ?? new Set<string>();
    set.add(item.slug);
    slugSets.set(item.language_id, set);
  }

  for (const [index, row] of params.rows.entries()) {
    const rowNumber = index + 2;
    const languageId = getLanguageId(row, rowNumber, languagesByCode, summary.errors);
    const title = normalizeRequiredString((row as any).title);
    const incomingSlug = normalizeRequiredString((row as any).slug);
    const status = normalizeRequiredString((row as any).status || "draft");

    if (!title) addMessage(summary.errors, rowNumber, "title is required.");
    if (!incomingSlug) addMessage(summary.errors, rowNumber, "slug is required.");
    if (!PAGE_STATUSES.has(status)) {
      addMessage(summary.errors, rowNumber, `status must be one of: ${Array.from(PAGE_STATUSES).join(", ")}.`);
    }
    if (!languageId || !title || !incomingSlug || !PAGE_STATUSES.has(status)) {
      continue;
    }

    const numericId = Number((row as any).id);
    const matchedById =
      params.options.conflictMode === "overwrite_existing" && Number.isFinite(numericId)
        ? existing.byId.get(numericId)
        : undefined;
    const matchedBySlug =
      params.options.conflictMode === "overwrite_existing"
        ? existing.bySlug.get(`${languageId}:${incomingSlug}`)
        : undefined;
    const target = matchedById ?? matchedBySlug ?? null;
    const action = target ? "update" : "create";
    const slugSet = slugSets.get(languageId) ?? new Set<string>();
    const slug =
      params.options.conflictMode === "create_new" || action === "create"
        ? makeUniqueSlug(incomingSlug, slugSet)
        : incomingSlug;
    slugSets.set(languageId, slugSet);

    const slugOwner = existing.bySlug.get(`${languageId}:${slug}`);
    if (action === "update" && slugOwner && slugOwner.id !== target?.id) {
      addMessage(summary.errors, rowNumber, `Slug "${slug}" already belongs to another ${params.contentType.slice(0, -1)} in this language.`);
      continue;
    }

    const importedGroupId = normalizeId((row as any).translation_group_id);
    const translationGroupId =
      action === "update"
        ? importedGroupId || target?.translation_group_id || uuidv4()
        : importedGroupId
          ? translationGroupMap.get(importedGroupId) ?? translationGroupMap.set(importedGroupId, uuidv4()).get(importedGroupId)
          : uuidv4();

    const featureImageId = resolveMediaId({
      id: normalizeId((row as any).feature_image_id),
      objectKey: normalizeId((row as any).feature_image_object_key),
      rowNumber,
      fieldLabel: "Feature image",
      mediaById: mediaMaps.byId,
      mediaByObjectKey: mediaMaps.byObjectKey,
      warnings: summary.warnings,
    });

    const blocks = parseBlocksForContent(row, rowNumber, languageId, summary.errors);
    const meta: Record<string, unknown> = {
      language_id: languageId,
      title,
      slug,
      status,
      meta_title: normalizeNullableString((row as any).meta_title),
      meta_description: normalizeNullableString((row as any).meta_description),
      feature_image_id: featureImageId,
      translation_group_id: translationGroupId,
    };

    if (params.contentType === "posts") {
      meta.label = normalizeNullableString((row as any).label);
      meta.excerpt = normalizeNullableString((row as any).excerpt);
      meta.subtitle = normalizeNullableString((row as any).subtitle);
      meta.published_at = readOptionalDate(
        (row as any).published_at,
        "published_at",
        rowNumber,
        summary.errors
      );
    }

    prepared.push({
      contentType: params.contentType,
      rowNumber,
      action,
      targetId: target?.id ?? null,
      meta,
      blocks,
      oldSlug: target?.slug ?? null,
    });
  }

  createPreview(prepared, summary);
  summary.success = summary.errors.length === 0;
  return { summary, prepared };
}

async function loadCategories(supabase: SupabaseAny) {
  const { data, error } = await supabase
    .from("categories" as any)
    .select("id, slug");

  if (error) {
    throw new Error(`Failed to load product categories: ${error.message}`);
  }

  return new Map((data || []).map((category: any) => [String(category.slug), String(category.id)]));
}

function normalizePriceMapValue(value: unknown) {
  return isRecord(value) ? (value as Record<string, number>) : {};
}

function normalizeSalePriceMapValue(value: unknown) {
  return isRecord(value) ? (value as Record<string, number | null>) : {};
}

async function prepareProductImports(params: {
  supabase: SupabaseAny;
  rows: ImportSourceRow[];
  options: CmsImportOptions;
}) {
  const summary = emptySummary();
  summary.totalRows = params.rows.length;
  const prepared: PreparedProductImport[] = [];
  const { byCode: languagesByCode } = await loadLanguages(params.supabase);
  const mediaMaps = await loadMediaMaps(params.supabase);
  const categoryMap = await loadCategories(params.supabase);
  const existing = await loadExistingProducts(params.supabase);
  const slugSets = new Map<number, Set<string>>();
  const skuSets = new Map<number, Set<string>>();
  const translationGroupMap = new Map<string, string>();

  for (const item of existing.byId.values()) {
    const slugSet = slugSets.get(item.language_id) ?? new Set<string>();
    const skuSet = skuSets.get(item.language_id) ?? new Set<string>();
    slugSet.add(item.slug);
    skuSet.add(item.sku);
    slugSets.set(item.language_id, slugSet);
    skuSets.set(item.language_id, skuSet);
  }

  for (const [index, row] of params.rows.entries()) {
    const rowNumber = index + 2;
    const languageId = getLanguageId(row, rowNumber, languagesByCode, summary.errors);
    const title = normalizeRequiredString((row as any).title);
    const incomingSlug = normalizeRequiredString((row as any).slug);
    const incomingSku = normalizeRequiredString((row as any).sku);
    const productType = normalizeRequiredString((row as any).product_type || "physical");
    const paymentProvider = normalizeRequiredString((row as any).payment_provider || (productType === "digital" ? "freemius" : "stripe"));
    const status = normalizeRequiredString((row as any).status || "draft");

    if (!title) addMessage(summary.errors, rowNumber, "title is required.");
    if (!incomingSlug) addMessage(summary.errors, rowNumber, "slug is required.");
    if (!incomingSku) addMessage(summary.errors, rowNumber, "sku is required.");
    if (!PRODUCT_TYPES.has(productType)) {
      addMessage(summary.errors, rowNumber, "product_type must be physical or digital.");
    }
    if (!PAYMENT_PROVIDERS.has(paymentProvider)) {
      addMessage(summary.errors, rowNumber, "payment_provider must be stripe or freemius.");
    }
    if (productType === "physical" && paymentProvider !== "stripe") {
      addMessage(summary.errors, rowNumber, "physical products must use stripe.");
    }
    if (productType === "digital" && paymentProvider !== "freemius") {
      addMessage(summary.errors, rowNumber, "digital products must use freemius.");
    }
    if (!PRODUCT_STATUSES.has(status)) {
      addMessage(summary.errors, rowNumber, `status must be one of: ${Array.from(PRODUCT_STATUSES).join(", ")}.`);
    }
    const price = readRequiredNumber((row as any).price, "price", rowNumber, summary.errors);
    const stock = readRequiredNumber((row as any).stock, "stock", rowNumber, summary.errors);
    if (!languageId || !title || !incomingSlug || !incomingSku || !PRODUCT_TYPES.has(productType) || !PAYMENT_PROVIDERS.has(paymentProvider) || !PRODUCT_STATUSES.has(status) || price === null || stock === null) {
      continue;
    }

    const rowId = normalizeId((row as any).id);
    const matchedById =
      params.options.conflictMode === "overwrite_existing" && rowId
        ? existing.byId.get(rowId)
        : undefined;
    const matchedBySku =
      params.options.conflictMode === "overwrite_existing"
        ? existing.bySku.get(`${languageId}:${incomingSku}`)
        : undefined;
    const matchedBySlug =
      params.options.conflictMode === "overwrite_existing"
        ? existing.bySlug.get(`${languageId}:${incomingSlug}`)
        : undefined;

    if (matchedBySku && matchedBySlug && matchedBySku.id !== matchedBySlug.id) {
      addMessage(summary.errors, rowNumber, `SKU "${incomingSku}" and slug "${incomingSlug}" match different products.`);
      continue;
    }

    const target = matchedById ?? matchedBySku ?? matchedBySlug ?? null;
    const action = target ? "update" : "create";
    const slugSet = slugSets.get(languageId) ?? new Set<string>();
    const skuSet = skuSets.get(languageId) ?? new Set<string>();
    const slug =
      params.options.conflictMode === "create_new" || action === "create"
        ? makeUniqueSlug(incomingSlug, slugSet)
        : incomingSlug;
    const sku =
      params.options.conflictMode === "create_new" || action === "create"
        ? makeUniqueSku(incomingSku, skuSet)
        : incomingSku;
    slugSets.set(languageId, slugSet);
    skuSets.set(languageId, skuSet);

    const slugOwner = existing.bySlug.get(`${languageId}:${slug}`);
    const skuOwner = existing.bySku.get(`${languageId}:${sku}`);
    if (action === "update" && slugOwner && slugOwner.id !== target?.id) {
      addMessage(summary.errors, rowNumber, `Slug "${slug}" already belongs to another product in this language.`);
      continue;
    }
    if (action === "update" && skuOwner && skuOwner.id !== target?.id) {
      addMessage(summary.errors, rowNumber, `SKU "${sku}" already belongs to another product in this language.`);
      continue;
    }

    const localErrors: Array<{ row: number; message: string }> = [];
    const prices =
      (row as BackupProductRecord).prices ??
      parseJsonField<Record<string, number>>((row as CsvLikeRow).prices_json, "prices_json", rowNumber, localErrors) ??
      {};
    const salePrices =
      (row as BackupProductRecord).sale_prices ??
      parseJsonField<Record<string, number | null>>((row as CsvLikeRow).sale_prices_json, "sale_prices_json", rowNumber, localErrors) ??
      {};
    const descriptionJson =
      (row as BackupProductRecord).description_json ??
      parseJsonField<Json>((row as CsvLikeRow).description_json, "description_json", rowNumber, localErrors);
    const rawVariants =
      (row as BackupProductRecord).variants ??
      parseJsonField<BackupProductVariantRecord[]>((row as CsvLikeRow).variants_json, "variants_json", rowNumber, localErrors) ??
      [];

    for (const error of localErrors) {
      addMessage(summary.errors, error.row, error.message);
    }
    if (localErrors.length > 0) continue;
    if (!Array.isArray(rawVariants)) {
      addMessage(summary.errors, rowNumber, "variants_json must be an array.");
      continue;
    }

    const categorySlugs = Array.isArray((row as BackupProductRecord).category_slugs)
      ? ((row as BackupProductRecord).category_slugs || [])
      : splitList((row as CsvLikeRow).category_slugs);
    const categoryIds: string[] = [];
    for (const categorySlug of categorySlugs) {
      const categoryId = categoryMap.get(categorySlug);
      if (!categoryId) {
        addMessage(summary.errors, rowNumber, `Category slug "${categorySlug}" does not exist.`);
      } else {
        categoryIds.push(categoryId);
      }
    }
    if (summary.errors.some((error) => error.row === rowNumber)) continue;

    const explicitMediaIds = Array.isArray((row as BackupProductRecord).media_ids)
      ? ((row as BackupProductRecord).media_ids || [])
      : splitList((row as CsvLikeRow).media_ids);
    const mediaObjectKeys = Array.isArray((row as BackupProductRecord).media_object_keys)
      ? ((row as BackupProductRecord).media_object_keys || [])
      : splitList((row as CsvLikeRow).media_object_keys);
    const mediaIds = new Set<string>();
    for (const mediaId of explicitMediaIds) {
      const resolved = resolveMediaId({
        id: mediaId,
        rowNumber,
        fieldLabel: "Product media",
        mediaById: mediaMaps.byId,
        mediaByObjectKey: mediaMaps.byObjectKey,
        warnings: summary.warnings,
      });
      if (resolved) mediaIds.add(resolved);
    }
    for (const objectKey of mediaObjectKeys) {
      const resolved = resolveMediaId({
        objectKey,
        rowNumber,
        fieldLabel: "Product media",
        mediaById: mediaMaps.byId,
        mediaByObjectKey: mediaMaps.byObjectKey,
        warnings: summary.warnings,
      });
      if (resolved) mediaIds.add(resolved);
    }

    const variants = rawVariants.map((variant) => {
      const mainMediaId = resolveMediaId({
        id: variant.main_media_id,
        objectKey: variant.main_media_object_key,
        rowNumber,
        fieldLabel: `Variant media for ${variant.sku}`,
        mediaById: mediaMaps.byId,
        mediaByObjectKey: mediaMaps.byObjectKey,
        warnings: summary.warnings,
      });

      return {
        ...variant,
        main_media_id: mainMediaId,
        prices: normalizePriceMapValue(variant.prices),
        sale_prices: normalizeSalePriceMapValue(variant.sale_prices),
        attribute_term_ids: Array.isArray(variant.attribute_term_ids) ? variant.attribute_term_ids : [],
      };
    });

    const importedGroupId = normalizeId((row as any).translation_group_id);
    const translationGroupId =
      action === "update"
        ? importedGroupId || target?.translation_group_id || uuidv4()
        : importedGroupId
          ? translationGroupMap.get(importedGroupId) ?? translationGroupMap.set(importedGroupId, uuidv4()).get(importedGroupId)
          : uuidv4();

    const blocks = parseBlocksForProduct(row, rowNumber, languageId, summary.errors);
    const meta: Record<string, unknown> = {
      language_id: languageId,
      translation_group_id: translationGroupId,
      product_type: productType,
      payment_provider: paymentProvider,
      title,
      slug,
      sku,
      upc: normalizeNullableString((row as any).upc),
      status,
      price,
      prices,
      sale_price: parseNullableNumber(String((row as any).sale_price ?? "")),
      sale_prices: salePrices,
      stock,
      is_taxable: parseBoolean(String((row as any).is_taxable ?? ""), true),
      meta_title: normalizeNullableString((row as any).meta_title),
      meta_description: normalizeNullableString((row as any).meta_description),
      short_description: normalizeNullableString((row as any).short_description),
      description_json: descriptionJson ?? null,
      freemius_product_id: normalizeNullableString((row as any).freemius_product_id),
      freemius_plan_id: normalizeNullableString((row as any).freemius_plan_id),
      trial_period_days: parseNumber(String((row as any).trial_period_days ?? ""), 0),
      trial_requires_payment_method: parseBoolean(String((row as any).trial_requires_payment_method ?? ""), false),
      product_media: Array.from(mediaIds).map((media_id) => ({ media_id })),
      category_ids: categoryIds,
      variants,
    };

    prepared.push({
      contentType: "products",
      rowNumber,
      action,
      targetId: target?.id ?? null,
      meta,
      blocks,
      categoryIds,
      mediaIds: Array.from(mediaIds),
      variants,
      oldSlug: target?.slug ?? null,
    });
  }

  createPreview(prepared, summary);
  summary.success = summary.errors.length === 0;
  return { summary, prepared };
}

function buildBlockPayload(block: BackupBlockRecord, parent: { type: CmsContentType; id: number | string }, index: number) {
  return {
    page_id: parent.type === "pages" ? parent.id : null,
    post_id: parent.type === "posts" ? parent.id : null,
    product_id: parent.type === "products" ? parent.id : null,
    language_id: block.language_id,
    block_type: block.block_type,
    content: block.content,
    order: typeof block.order === "number" && Number.isFinite(block.order) ? block.order : index,
  };
}

async function replaceBlocks(
  supabase: SupabaseAny,
  contentType: CmsContentType,
  parentId: number | string,
  blocks: BackupBlockRecord[]
) {
  const column = contentType === "pages" ? "page_id" : contentType === "posts" ? "post_id" : "product_id";
  const { error: deleteError } = await supabase.from("blocks").delete().eq(column, parentId as any);
  if (deleteError) {
    throw new Error(`Failed to clear ${contentType} blocks: ${deleteError.message}`);
  }

  if (blocks.length === 0) return;

  const payload = blocks.map((block, index) => buildBlockPayload(block, { type: contentType, id: parentId }, index));
  const { error: insertError } = await supabase.from("blocks").insert(payload as any);
  if (insertError) {
    throw new Error(`Failed to insert ${contentType} blocks: ${insertError.message}`);
  }
}

async function applyContentImport(params: {
  auth: TransferAuth;
  item: PreparedContentImport;
  options: CmsImportOptions;
}) {
  const { auth, item, options } = params;
  const table = item.contentType === "pages" ? "pages" : "posts";
  const parentType = item.contentType === "pages" ? "page" : "post";
  let parentId = item.targetId;
  let previousContent: FullPageContent | FullPostContent | null = null;

  if (options.applyMode === "live" && parentId) {
    previousContent =
      item.contentType === "pages"
        ? await getFullPageContent(parentId)
        : await getFullPostContent(parentId);
  }

  if (!parentId) {
    const insertMeta = {
      ...item.meta,
      status: options.applyMode === "draft" ? "draft" : item.meta.status,
      author_id: auth.userId,
    };
    const { data, error } = await auth.supabase
      .from(table)
      .insert(insertMeta as any)
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create ${item.contentType.slice(0, -1)} from row ${item.rowNumber}: ${error?.message ?? "unknown error"}`);
    }

    parentId = Number((data as any).id);
  }

  if (options.applyMode === "draft") {
    const { error } = await (auth.supabase as any)
      .from("content_drafts")
      .upsert(
        {
          parent_type: parentType,
          parent_id: parentId,
          author_id: auth.userId,
          meta: item.meta,
          blocks: item.blocks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "parent_type,parent_id" }
      );

    if (error) {
      throw new Error(`Failed to save draft from row ${item.rowNumber}: ${error.message}`);
    }
  } else {
    const { error } = await auth.supabase
      .from(table)
      .update(item.meta as any)
      .eq("id", parentId);

    if (error) {
      throw new Error(`Failed to update ${item.contentType.slice(0, -1)} from row ${item.rowNumber}: ${error.message}`);
    }

    await replaceBlocks(auth.supabase, item.contentType, parentId, item.blocks);
    await (auth.supabase as any)
      .from("content_drafts")
      .delete()
      .eq("parent_type", parentType)
      .eq("parent_id", parentId);

    if (previousContent) {
      const nextContent =
        item.contentType === "pages"
          ? await getFullPageContent(parentId)
          : await getFullPostContent(parentId);
      if (nextContent) {
        if (item.contentType === "pages") {
          await createPageRevision(parentId, auth.userId, previousContent as FullPageContent, nextContent as FullPageContent);
        } else {
          await createPostRevision(parentId, auth.userId, previousContent as FullPostContent, nextContent as FullPostContent);
        }
      }
    }
  }

  revalidatePath(item.contentType === "pages" ? "/cms/pages" : "/cms/posts");
  const slug = typeof item.meta.slug === "string" ? item.meta.slug : null;
  if (item.contentType === "pages") {
    if (slug) revalidatePath(`/${slug}`);
    if (item.oldSlug && item.oldSlug !== slug) revalidatePath(`/${item.oldSlug}`);
  } else {
    revalidatePath("/articles");
    if (slug) revalidatePath(`/article/${slug}`);
    if (item.oldSlug && item.oldSlug !== slug) revalidatePath(`/article/${item.oldSlug}`);
  }
}

function toLiveProductPayload(meta: Record<string, unknown>) {
  return {
    language_id: meta.language_id,
    translation_group_id: meta.translation_group_id,
    product_type: meta.product_type,
    payment_provider: meta.payment_provider,
    title: meta.title,
    slug: meta.slug,
    sku: meta.sku,
    upc: meta.upc,
    status: meta.status,
    price: majorToMinor(meta.price as number) ?? 0,
    prices: priceMapMajorToMinor(meta.prices as Record<string, number>),
    sale_price: majorToMinor(meta.sale_price as number | null),
    sale_prices: salePriceMapMajorToMinor(meta.sale_prices as Record<string, number | null>),
    stock: meta.stock,
    is_taxable: meta.is_taxable,
    meta_title: meta.meta_title,
    meta_description: meta.meta_description,
    short_description: meta.short_description,
    description_json: meta.description_json,
    freemius_product_id: meta.freemius_product_id,
    freemius_plan_id: meta.freemius_plan_id,
    trial_period_days: meta.trial_period_days,
    trial_requires_payment_method: meta.trial_requires_payment_method,
    updated_at: new Date().toISOString(),
  };
}

async function replaceProductMedia(supabase: SupabaseAny, productId: string, mediaIds: string[]) {
  const { error: deleteError } = await supabase
    .from("product_media")
    .delete()
    .eq("product_id", productId);
  if (deleteError) {
    throw new Error(`Failed to clear product media: ${deleteError.message}`);
  }

  if (mediaIds.length === 0) return;

  const { error } = await supabase.from("product_media").insert(
    mediaIds.map((mediaId, index) => ({
      product_id: productId,
      media_id: mediaId,
      sort_order: index,
    })) as any
  );
  if (error) {
    throw new Error(`Failed to insert product media: ${error.message}`);
  }
}

async function replaceProductVariants(
  supabase: SupabaseAny,
  productId: string,
  variants: BackupProductVariantRecord[]
) {
  const { error: deleteError } = await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", productId);
  if (deleteError) {
    throw new Error(`Failed to clear product variants: ${deleteError.message}`);
  }

  for (const variant of variants) {
    const { data, error } = await supabase
      .from("product_variants")
      .insert({
        product_id: productId,
        sku: variant.sku,
        upc: variant.upc ?? null,
        price: majorToMinor(variant.price) ?? 0,
        prices: priceMapMajorToMinor(variant.prices),
        sale_price: majorToMinor(variant.sale_price ?? null),
        sale_prices: salePriceMapMajorToMinor(variant.sale_prices),
        stock_quantity: variant.stock_quantity ?? 0,
        main_media_id: variant.main_media_id ?? null,
      } as any)
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Failed to insert product variant "${variant.sku}": ${error?.message ?? "unknown error"}`);
    }

    const termIds = Array.isArray(variant.attribute_term_ids) ? variant.attribute_term_ids : [];
    if (termIds.length > 0) {
      const { error: mappingError } = await supabase
        .from("variant_attribute_mapping")
        .insert(
          termIds.map((termId) => ({
            variant_id: (data as any).id,
            attribute_term_id: termId,
          })) as any
        );

      if (mappingError) {
        throw new Error(`Failed to insert variant attributes for "${variant.sku}": ${mappingError.message}`);
      }
    }
  }
}

async function applyProductImport(params: {
  auth: TransferAuth;
  item: PreparedProductImport;
  options: CmsImportOptions;
}) {
  const { auth, item, options } = params;
  let productId = item.targetId;

  if (!productId) {
    const payload = {
      ...toLiveProductPayload(item.meta),
      status: options.applyMode === "draft" ? "draft" : item.meta.status,
      metadata: {},
      created_at: new Date().toISOString(),
    };
    const { data, error } = await auth.supabase
      .from("products")
      .insert(payload as any)
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create product from row ${item.rowNumber}: ${error?.message ?? "unknown error"}`);
    }

    productId = String((data as any).id);
  }

  if (options.applyMode === "draft") {
    const { error } = await (auth.supabase as any)
      .from("product_drafts")
      .upsert(
        {
          product_id: productId,
          author_id: auth.userId,
          meta: item.meta,
          blocks: item.blocks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id" }
      );

    if (error) {
      throw new Error(`Failed to save product draft from row ${item.rowNumber}: ${error.message}`);
    }
  } else {
    const { error } = await auth.supabase
      .from("products")
      .update(toLiveProductPayload(item.meta) as any)
      .eq("id", productId);

    if (error) {
      throw new Error(`Failed to update product from row ${item.rowNumber}: ${error.message}`);
    }

    await replaceBlocks(auth.supabase, "products", productId, item.blocks);
    await replaceProductMedia(auth.supabase, productId, item.mediaIds);
    await replaceProductVariants(auth.supabase, productId, item.variants);
    await syncCategoriesForTranslationGroup(auth.supabase as any, productId, item.categoryIds);
    await (auth.supabase as any).from("product_drafts").delete().eq("product_id", productId);
  }

  revalidatePath("/cms/products");
  const slug = typeof item.meta.slug === "string" ? item.meta.slug : null;
  if (slug) revalidatePath(`/product/${slug}`);
  if (item.oldSlug && item.oldSlug !== slug) revalidatePath(`/product/${item.oldSlug}`);
}

async function applyPreparedImports(
  auth: TransferAuth,
  prepared: PreparedImport[],
  options: CmsImportOptions
) {
  for (const item of prepared) {
    if (item.contentType === "products") {
      await applyProductImport({ auth, item, options });
    } else {
      await applyContentImport({ auth, item, options });
    }
  }
}

async function prepareImports(params: {
  supabase: SupabaseAny;
  contentType: CmsContentType;
  rows: ImportSourceRow[];
  options: CmsImportOptions;
}) {
  if (params.contentType === "products") {
    return prepareProductImports({
      supabase: params.supabase,
      rows: params.rows,
      options: params.options,
    });
  }

  return prepareContentImports({
    supabase: params.supabase,
    contentType: params.contentType,
    rows: params.rows,
    options: params.options,
  });
}

export function buildCsvTemplate(contentType: CmsContentType) {
  return getTemplateCsv(contentType);
}

export async function dryRunCsvImport(params: {
  contentType: CmsContentType;
  csv: string;
  options: CmsImportOptions;
}) {
  const auth = await requireTransferUser(false);
  const parsed = parseCsv(params.csv);
  const { summary } = await prepareImports({
    supabase: auth.supabase,
    contentType: params.contentType,
    rows: parsed.rows,
    options: params.options,
  });

  for (const parseError of parsed.errors) {
    addMessage(summary.errors, parseError.row, parseError.message);
  }
  summary.success = summary.errors.length === 0;
  return summary;
}

export async function applyCsvImport(params: {
  contentType: CmsContentType;
  csv: string;
  options: CmsImportOptions;
}) {
  const auth = await requireTransferUser(false);
  const parsed = parseCsv(params.csv);
  const { summary, prepared } = await prepareImports({
    supabase: auth.supabase,
    contentType: params.contentType,
    rows: parsed.rows,
    options: params.options,
  });

  for (const parseError of parsed.errors) {
    addMessage(summary.errors, parseError.row, parseError.message);
  }
  summary.success = summary.errors.length === 0;
  if (!summary.success) {
    return summary;
  }

  await applyPreparedImports(auth, prepared, params.options);
  return summary;
}

async function fetchBlocksByParent(supabase: SupabaseAny, parentColumn: "page_id" | "post_id" | "product_id", ids: Array<number | string>) {
  if (ids.length === 0) {
    return new Map<string, BackupBlockRecord[]>();
  }

  const { data, error } = await supabase
    .from("blocks")
    .select("id, page_id, post_id, product_id, language_id, block_type, content, order")
    .in(parentColumn, ids as any)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load blocks: ${error.message}`);
  }

  const map = new Map<string, BackupBlockRecord[]>();
  for (const block of data || []) {
    const parentId = String((block as any)[parentColumn]);
    const list = map.get(parentId) ?? [];
    list.push({
      language_id: (block as any).language_id,
      block_type: (block as any).block_type,
      content: (block as any).content,
      order: (block as any).order,
    });
    map.set(parentId, list);
  }

  return map;
}

async function exportPages(supabase: SupabaseAny, languageId?: number) {
  let query = supabase
    .from("pages")
    .select("*, languages(code), media(object_key)")
    .order("created_at", { ascending: false });

  if (languageId) query = query.eq("language_id", languageId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to export pages: ${error.message}`);

  const pages = data || [];
  const blockMap = await fetchBlocksByParent(
    supabase,
    "page_id",
    pages.map((page: any) => page.id)
  );

  return pages.map((page: any): BackupPageRecord => ({
    id: page.id,
    translation_group_id: page.translation_group_id,
    language_code: page.languages?.code || "",
    title: page.title,
    slug: page.slug,
    status: page.status,
    meta_title: page.meta_title,
    meta_description: page.meta_description,
    feature_image_id: page.feature_image_id,
    feature_image_object_key: page.media?.object_key ?? null,
    blocks: blockMap.get(String(page.id)) || [],
  }));
}

async function exportPosts(supabase: SupabaseAny, languageId?: number) {
  let query = supabase
    .from("posts")
    .select("*, languages(code), media(object_key)")
    .order("created_at", { ascending: false });

  if (languageId) query = query.eq("language_id", languageId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to export posts: ${error.message}`);

  const posts = data || [];
  const blockMap = await fetchBlocksByParent(
    supabase,
    "post_id",
    posts.map((post: any) => post.id)
  );

  return posts.map((post: any): BackupPostRecord => ({
    id: post.id,
    translation_group_id: post.translation_group_id,
    language_code: post.languages?.code || "",
    title: post.title,
    slug: post.slug,
    status: post.status,
    meta_title: post.meta_title,
    meta_description: post.meta_description,
    feature_image_id: post.feature_image_id,
    feature_image_object_key: post.media?.object_key ?? null,
    label: post.label,
    excerpt: post.excerpt,
    subtitle: post.subtitle,
    published_at: post.published_at,
    blocks: blockMap.get(String(post.id)) || [],
  }));
}

async function exportProducts(supabase: SupabaseAny, languageId?: number) {
  let query = supabase
    .from("products")
    .select("*, languages(code)")
    .order("created_at", { ascending: false });

  if (languageId) query = query.eq("language_id", languageId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to export products: ${error.message}`);

  const products = data || [];
  const productIds = products.map((product: any) => String(product.id));
  const blockMap = await fetchBlocksByParent(supabase, "product_id", productIds);

  const [mediaResult, categoryResult, variantResult] = await Promise.all([
    supabase
      .from("product_media")
      .select("product_id, media_id, sort_order, media(object_key)")
      .in("product_id", productIds),
    supabase
      .from("product_categories" as any)
      .select("product_id, category:categories(slug)")
      .in("product_id", productIds),
    supabase
      .from("product_variants")
      .select("id, product_id, sku, upc, price, prices, sale_price, sale_prices, stock_quantity, main_media_id, media:main_media_id(object_key), variant_attribute_mapping(attribute_term_id)")
      .in("product_id", productIds),
  ]);

  if (mediaResult.error) throw new Error(`Failed to export product media: ${mediaResult.error.message}`);
  if (categoryResult.error) throw new Error(`Failed to export product categories: ${categoryResult.error.message}`);
  if (variantResult.error) throw new Error(`Failed to export product variants: ${variantResult.error.message}`);

  const mediaMap = new Map<string, Array<{ id: string; objectKey: string | null; sortOrder: number }>>();
  for (const media of mediaResult.data || []) {
    const productId = String((media as any).product_id);
    const list = mediaMap.get(productId) ?? [];
    list.push({
      id: String((media as any).media_id),
      objectKey: (media as any).media?.object_key ?? null,
      sortOrder: Number((media as any).sort_order ?? 0),
    });
    mediaMap.set(productId, list);
  }

  const categoryMap = new Map<string, string[]>();
  for (const categoryRow of categoryResult.data || []) {
    const productId = String((categoryRow as any).product_id);
    const list = categoryMap.get(productId) ?? [];
    if ((categoryRow as any).category?.slug) list.push((categoryRow as any).category.slug);
    categoryMap.set(productId, list);
  }

  const variantMap = new Map<string, BackupProductVariantRecord[]>();
  for (const variant of variantResult.data || []) {
    const productId = String((variant as any).product_id);
    const list = variantMap.get(productId) ?? [];
    list.push({
      id: (variant as any).id,
      sku: (variant as any).sku,
      upc: (variant as any).upc,
      price: minorToMajor((variant as any).price) ?? 0,
      prices: priceMapMinorToMajor((variant as any).prices),
      sale_price: minorToMajor((variant as any).sale_price),
      sale_prices: salePriceMapMinorToMajor((variant as any).sale_prices),
      stock_quantity: Number((variant as any).stock_quantity ?? 0),
      main_media_id: (variant as any).main_media_id,
      main_media_object_key: (variant as any).media?.object_key ?? null,
      attribute_term_ids: ((variant as any).variant_attribute_mapping || [])
        .map((mapping: any) => mapping.attribute_term_id)
        .filter(Boolean),
    });
    variantMap.set(productId, list);
  }

  return products.map((product: any): BackupProductRecord => {
    const media = (mediaMap.get(String(product.id)) || []).sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      id: product.id,
      translation_group_id: product.translation_group_id,
      language_code: product.languages?.code || "",
      product_type: product.product_type,
      payment_provider: product.payment_provider,
      title: product.title,
      slug: product.slug,
      sku: product.sku,
      upc: product.upc,
      status: product.status,
      price: minorToMajor(product.price) ?? 0,
      prices: priceMapMinorToMajor(product.prices),
      sale_price: minorToMajor(product.sale_price),
      sale_prices: salePriceMapMinorToMajor(product.sale_prices),
      stock: Number(product.stock ?? 0),
      is_taxable: Boolean(product.is_taxable),
      meta_title: product.meta_title,
      meta_description: product.meta_description,
      short_description: product.short_description,
      description_json: product.description_json,
      description_blocks: blockMap.get(String(product.id)) || [],
      category_slugs: categoryMap.get(String(product.id)) || [],
      media_ids: media.map((item) => item.id),
      media_object_keys: media.map((item) => item.objectKey).filter(Boolean) as string[],
      variants: variantMap.get(String(product.id)) || [],
      freemius_product_id: product.freemius_product_id,
      freemius_plan_id: product.freemius_plan_id,
      trial_period_days: Number(product.trial_period_days ?? 0),
      trial_requires_payment_method: Boolean(product.trial_requires_payment_method),
    };
  });
}

function pageToCsvRow(page: BackupPageRecord) {
  const firstText = page.blocks.find((block) => block.block_type === "text" && isRecord(block.content));
  return {
    ...page,
    content_html: isRecord(firstText?.content) ? String(firstText?.content.html_content ?? "") : "",
    blocks_json: toJsonCell(page.blocks),
  };
}

function postToCsvRow(post: BackupPostRecord) {
  return {
    ...pageToCsvRow(post),
    label: post.label ?? "",
    excerpt: post.excerpt ?? "",
    subtitle: post.subtitle ?? "",
    published_at: post.published_at ?? "",
  };
}

function productToCsvRow(product: BackupProductRecord) {
  const firstText = product.description_blocks.find((block) => block.block_type === "text" && isRecord(block.content));
  return {
    id: product.id ?? "",
    translation_group_id: product.translation_group_id ?? "",
    language_code: product.language_code,
    product_type: product.product_type,
    payment_provider: product.payment_provider,
    title: product.title,
    slug: product.slug,
    sku: product.sku,
    upc: product.upc ?? "",
    status: product.status,
    price: product.price,
    prices_json: toJsonCell(product.prices),
    sale_price: product.sale_price ?? "",
    sale_prices_json: toJsonCell(product.sale_prices),
    stock: product.stock,
    is_taxable: String(product.is_taxable),
    meta_title: product.meta_title ?? "",
    meta_description: product.meta_description ?? "",
    short_description: product.short_description ?? "",
    description_html: isRecord(firstText?.content) ? String(firstText?.content.html_content ?? "") : "",
    description_blocks_json: toJsonCell(product.description_blocks),
    description_json: toJsonCell(product.description_json),
    category_slugs: (product.category_slugs || []).join(";"),
    media_ids: (product.media_ids || []).join(";"),
    media_object_keys: (product.media_object_keys || []).join(";"),
    variants_json: toJsonCell(product.variants),
    freemius_product_id: product.freemius_product_id ?? "",
    freemius_plan_id: product.freemius_plan_id ?? "",
    trial_period_days: product.trial_period_days ?? 0,
    trial_requires_payment_method: String(Boolean(product.trial_requires_payment_method)),
  };
}

export async function exportCsv(params: {
  contentType: CmsContentType;
  languageId?: number;
}) {
  const auth = await requireTransferUser(false);
  const records =
    params.contentType === "pages"
      ? await exportPages(auth.supabase, params.languageId)
      : params.contentType === "posts"
        ? await exportPosts(auth.supabase, params.languageId)
        : await exportProducts(auth.supabase, params.languageId);

  const rows =
    params.contentType === "pages"
      ? (records as BackupPageRecord[]).map(pageToCsvRow)
      : params.contentType === "posts"
        ? (records as BackupPostRecord[]).map(postToCsvRow)
        : (records as BackupProductRecord[]).map(productToCsvRow);

  return stringifyCsv(rows, getCsvHeaders(params.contentType));
}

export async function exportBackupBundle() {
  const auth = await requireTransferUser(true);
  const { languages } = await loadLanguages(auth.supabase);
  const bundle: CmsBackupBundleV1 = {
    version: 1,
    exported_at: new Date().toISOString(),
    languages,
    content: {
      pages: await exportPages(auth.supabase),
      posts: await exportPosts(auth.supabase),
      products: await exportProducts(auth.supabase),
    },
  };

  return JSON.stringify(bundle, null, 2);
}

function parseBundle(content: string): CmsBackupBundleV1 {
  const parsed = JSON.parse(content) as CmsBackupBundleV1;
  if (!parsed || parsed.version !== 1 || !isRecord(parsed.content)) {
    throw new Error("Backup bundle must be a NextBlock content backup with version 1.");
  }

  return parsed;
}

export async function dryRunBundleImport(params: {
  bundleJson: string;
  contentTypes: CmsContentType[];
  options: CmsImportOptions;
}) {
  const auth = await requireTransferUser(true);
  const bundle = parseBundle(params.bundleJson);
  const summary = emptySummary();

  for (const contentType of params.contentTypes) {
    const rows = bundle.content[contentType] || [];
    const result = await prepareImports({
      supabase: auth.supabase,
      contentType,
      rows: rows as ImportSourceRow[],
      options: params.options,
    });

    summary.totalRows += result.summary.totalRows;
    summary.created += result.summary.created;
    summary.updated += result.summary.updated;
    summary.skipped += result.summary.skipped;
    summary.errors.push(...result.summary.errors);
    summary.warnings.push(...result.summary.warnings);
    summary.preview.push(...result.summary.preview);
  }

  summary.success = summary.errors.length === 0;
  return summary;
}

export async function applyBundleImport(params: {
  bundleJson: string;
  contentTypes: CmsContentType[];
  options: CmsImportOptions;
}) {
  const auth = await requireTransferUser(true);
  const bundle = parseBundle(params.bundleJson);
  const summary = emptySummary();
  const allPrepared: PreparedImport[] = [];

  for (const contentType of params.contentTypes) {
    const rows = bundle.content[contentType] || [];
    const result = await prepareImports({
      supabase: auth.supabase,
      contentType,
      rows: rows as ImportSourceRow[],
      options: params.options,
    });

    summary.totalRows += result.summary.totalRows;
    summary.created += result.summary.created;
    summary.updated += result.summary.updated;
    summary.skipped += result.summary.skipped;
    summary.errors.push(...result.summary.errors);
    summary.warnings.push(...result.summary.warnings);
    summary.preview.push(...result.summary.preview);
    allPrepared.push(...(result.prepared as PreparedImport[]));
  }

  summary.success = summary.errors.length === 0;
  if (!summary.success) {
    return summary;
  }

  await applyPreparedImports(auth, allPrepared, params.options);
  return summary;
}
