import Papa from "papaparse";
import type { Json } from "@nextblock-cms/db";

import {
  availableBlockTypes,
  type BlockType,
} from "../blocks/blockTypes";
import type {
  BackupBlockRecord,
  CmsContentType,
} from "./types";

export const PAGE_CSV_HEADERS = [
  "id",
  "translation_group_id",
  "language_code",
  "title",
  "slug",
  "status",
  "meta_title",
  "meta_description",
  "feature_image_id",
  "feature_image_object_key",
  "content_html",
  "blocks_json",
] as const;

export const POST_CSV_HEADERS = [
  ...PAGE_CSV_HEADERS,
  "label",
  "excerpt",
  "subtitle",
  "published_at",
] as const;

export const PRODUCT_CSV_HEADERS = [
  "id",
  "translation_group_id",
  "language_code",
  "product_type",
  "payment_provider",
  "title",
  "slug",
  "sku",
  "upc",
  "status",
  "price",
  "prices_json",
  "sale_price",
  "sale_prices_json",
  "stock",
  "is_taxable",
  "meta_title",
  "meta_description",
  "short_description",
  "description_html",
  "description_blocks_json",
  "description_json",
  "category_slugs",
  "media_ids",
  "media_object_keys",
  "variants_json",
  "freemius_product_id",
  "freemius_plan_id",
  "trial_period_days",
  "trial_requires_payment_method",
] as const;

export type CmsCsvRow = Record<string, string>;

const blockTypeSet = new Set<string>(availableBlockTypes);

export function getCsvHeaders(contentType: CmsContentType): readonly string[] {
  if (contentType === "pages") return PAGE_CSV_HEADERS;
  if (contentType === "posts") return POST_CSV_HEADERS;
  return PRODUCT_CSV_HEADERS;
}

export function getTemplateCsv(contentType: CmsContentType) {
  const headers = getCsvHeaders(contentType);
  const sample = Object.fromEntries(headers.map((header) => [header, ""])) as CmsCsvRow;

  sample.language_code = "en";
  sample.title =
    contentType === "products"
      ? "Example Product"
      : contentType === "posts"
        ? "Example Post"
        : "Example Page";
  sample.slug =
    contentType === "products"
      ? "example-product"
      : contentType === "posts"
        ? "example-post"
        : "example-page";

  if (contentType === "products") {
    sample.product_type = "physical";
    sample.payment_provider = "stripe";
    sample.sku = "EXAMPLE-SKU";
    sample.status = "draft";
    sample.price = "19.99";
    sample.stock = "10";
    sample.is_taxable = "true";
    sample.description_html = "<p>Replace this with product description HTML.</p>";
    sample.category_slugs = "general";
    sample.trial_period_days = "0";
    sample.trial_requires_payment_method = "false";
  } else {
    sample.status = "draft";
    sample.content_html = "<p>Replace this with rich text HTML.</p>";
  }

  if (contentType === "posts") {
    sample.published_at = new Date().toISOString();
  }

  return stringifyCsv([sample], headers);
}

export function parseCsv(content: string) {
  const result = Papa.parse<CmsCsvRow>(content, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
    transform: (value) => (typeof value === "string" ? value.trim() : value),
  });

  const errors = result.errors.map((error) => ({
    row: (error.row ?? 0) + 2,
    message: error.message,
  }));

  return {
    rows: result.data.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").trim() !== "")
    ),
    errors,
  };
}

export function stringifyCsv(rows: Array<Record<string, unknown>>, columns: readonly string[]) {
  return Papa.unparse(rows, { columns: [...columns] });
}

export function parseJsonField<T>(
  value: string | undefined,
  fieldName: string,
  rowNumber: number,
  errors: Array<{ row: number; message: string }>
): T | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    errors.push({
      row: rowNumber,
      message: `${fieldName} must contain valid JSON.`,
    });
    return null;
  }
}

export function splitList(value: string | undefined) {
  return (value || "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseBoolean(value: string | undefined, fallback = false) {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return fallback;
  return ["1", "true", "yes", "y", "on"].includes(normalized);
}

export function parseNumber(value: string | undefined, fallback = 0) {
  const normalized = (value || "").trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseNullableNumber(value: string | undefined) {
  const normalized = (value || "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function majorToMinor(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 100);
}

export function minorToMajor(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Number((value / 100).toFixed(2));
}

export function priceMapMajorToMinor(
  value: Record<string, number | null | undefined> | null | undefined
) {
  const output: Record<string, number> = {};
  for (const [currencyCode, amount] of Object.entries(value || {})) {
    const minor = majorToMinor(typeof amount === "number" ? amount : null);
    if (minor !== null) {
      output[currencyCode.toUpperCase()] = minor;
    }
  }

  return output;
}

export function priceMapMinorToMajor(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>(
    (accumulator, [currencyCode, amount]) => {
      if (typeof amount === "number" && Number.isFinite(amount)) {
        accumulator[currencyCode.toUpperCase()] = minorToMajor(amount) ?? 0;
      }
      return accumulator;
    },
    {}
  );
}

export function salePriceMapMajorToMinor(
  value: Record<string, number | null | undefined> | null | undefined
) {
  const output: Record<string, number | null> = {};
  for (const [currencyCode, amount] of Object.entries(value || {})) {
    output[currencyCode.toUpperCase()] =
      typeof amount === "number" && Number.isFinite(amount) ? Math.round(amount * 100) : null;
  }

  return output;
}

export function salePriceMapMinorToMajor(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number | null>>(
    (accumulator, [currencyCode, amount]) => {
      accumulator[currencyCode.toUpperCase()] =
        typeof amount === "number" && Number.isFinite(amount)
          ? minorToMajor(amount)
          : null;
      return accumulator;
    },
    {}
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateNestedBlocks(value: unknown, rowNumber: number, errors: Array<{ row: number; message: string }>) {
  if (!Array.isArray(value)) return;

  for (const item of value) {
    if (!isRecord(item)) continue;
    const blockType = item.block_type;
    if (typeof blockType === "string" && !blockTypeSet.has(blockType)) {
      errors.push({
        row: rowNumber,
        message: `Nested block type "${blockType}" is not registered.`,
      });
    }
  }
}

export function normalizeBlocksFromFields(params: {
  blocksJson?: unknown;
  html?: string | null;
  languageId: number;
  rowNumber: number;
  errors: Array<{ row: number; message: string }>;
}) {
  const { blocksJson, html, languageId, rowNumber, errors } = params;
  const blocks: BackupBlockRecord[] = [];

  if (blocksJson !== null && blocksJson !== undefined) {
    if (!Array.isArray(blocksJson)) {
      errors.push({ row: rowNumber, message: "Block JSON must be an array." });
      return blocks;
    }

    blocksJson.forEach((block, index) => {
      if (!isRecord(block)) {
        errors.push({ row: rowNumber, message: `Block ${index + 1} must be an object.` });
        return;
      }

      const blockType = block.block_type;
      if (typeof blockType !== "string" || !blockTypeSet.has(blockType)) {
        errors.push({
          row: rowNumber,
          message: `Block ${index + 1} has an unknown block_type.`,
        });
        return;
      }

      if (isRecord(block.content)) {
        validateNestedBlocks(block.content.column_blocks, rowNumber, errors);
      }

      blocks.push({
        language_id: languageId,
        block_type: blockType as BlockType,
        content: (block.content ?? null) as Json,
        order:
          typeof block.order === "number" && Number.isFinite(block.order)
            ? block.order
            : index,
      });
    });

    return blocks;
  }

  const htmlContent = html?.trim();
  if (htmlContent) {
    return [
      {
        language_id: languageId,
        block_type: "text",
        content: { html_content: htmlContent } as Json,
        order: 0,
      },
    ];
  }

  return blocks;
}

export function makeUniqueSlug(base: string, existing: Set<string>) {
  const fallback = "imported-content";
  const normalized =
    base
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || fallback;

  if (!existing.has(normalized)) {
    existing.add(normalized);
    return normalized;
  }

  let index = 2;
  let candidate = `${normalized}-copy`;
  while (existing.has(candidate)) {
    candidate = `${normalized}-copy-${index}`;
    index += 1;
  }

  existing.add(candidate);
  return candidate;
}

export function makeUniqueSku(base: string, existing: Set<string>) {
  const normalized = (base || "IMPORTED-SKU").trim().toUpperCase();
  if (!existing.has(normalized)) {
    existing.add(normalized);
    return normalized;
  }

  let index = 2;
  let candidate = `${normalized}-COPY`;
  while (existing.has(candidate)) {
    candidate = `${normalized}-COPY-${index}`;
    index += 1;
  }

  existing.add(candidate);
  return candidate;
}

export function toJsonCell(value: unknown) {
  if (value === undefined || value === null) return "";
  return JSON.stringify(value);
}
