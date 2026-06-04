import "server-only";

import { getServiceRoleSupabaseClient } from "@nextblock-cms/db/server";
import { syncProductSaleCouponToFreemius } from "@nextblock-cms/ecommerce/server";

import {
  majorToMinor,
  minorToMajor,
  parseCsv,
  priceMapMajorToMinor,
  priceMapMinorToMajor,
  salePriceMapMajorToMinor,
  salePriceMapMinorToMajor,
  stringifyCsv,
  toJsonCell,
} from "../cms-transfer/csv";

export type PromotionKind = "sale" | "price_change";

export interface PromotionImportMessage {
  row: number;
  type: "error" | "warning";
  message: string;
}

export interface PromotionImportPreviewItem {
  row: number;
  action: "update" | "skip";
  identifier: string;
  matched: number;
}

export interface PromotionImportSummary {
  success: boolean;
  totalRows: number;
  applied: number;
  skipped: number;
  errors: PromotionImportMessage[];
  warnings: PromotionImportMessage[];
  preview: PromotionImportPreviewItem[];
}

export interface PromotionTransferResult {
  success: boolean;
  error?: string;
  fileName?: string;
  mimeType?: string;
  content?: string;
}

// Canonical column keys used internally. The CSV is intentionally minimal:
//   - `sku` is the key, looked up in BOTH the products and product_variants
//     tables (one column covers products and variations).
//   - `id` is optional (a convenience pointer; the SKU is what matters).
//   - the price column accepts a single number ("14.99") OR a multi-currency
//     JSON object ('{"USD":14.99,"EUR":13.5}').
const SALE_COLUMNS = ["id", "sku", "sale_price", "sale_start_at", "sale_end_at"] as const;
const PRICE_CHANGE_COLUMNS = ["id", "sku", "new_price", "effective_at"] as const;
const OPTIONAL_COLUMNS = new Set<string>(["id"]);

function toDisplayHeader(column: string) {
  return OPTIONAL_COLUMNS.has(column) ? `${column} (optional)` : column;
}

function getColumns(kind: PromotionKind): readonly string[] {
  return kind === "sale" ? SALE_COLUMNS : PRICE_CHANGE_COLUMNS;
}

function getDisplayHeaders(kind: PromotionKind): string[] {
  return getColumns(kind).map(toDisplayHeader);
}

// Exposed display headers (template + export column order).
export const SALE_CSV_HEADERS = getDisplayHeaders("sale");
export const PRICE_CHANGE_CSV_HEADERS = getDisplayHeaders("price_change");

type ProductRow = {
  id: string;
  sku: string | null;
  price: number | null;
  payment_provider: string | null;
};

type VariantRow = {
  id: string;
  sku: string | null;
  price: number | null;
  product_id: string;
};

type SaleUpdate = {
  sale_price: number | null;
  sale_prices: Record<string, number | null> | null;
  sale_start_at: string | null;
  sale_end_at: string | null;
};

type PriceChangeUpdate = {
  scheduled_price: number | null;
  scheduled_prices: Record<string, number> | null;
  scheduled_price_at: string | null;
};

type ResolvedOperation = {
  rowNumber: number;
  identifier: string;
  productIds: string[];
  variantIds: string[];
  freemiusProductIds: string[];
  saleUpdate?: SaleUpdate;
  priceChangeUpdate?: PriceChangeUpdate;
};

function addMessage(
  list: PromotionImportMessage[],
  row: number,
  type: "error" | "warning",
  message: string
) {
  list.push({ row, type, message });
}

// Map a canonical-keyed object to display headers (e.g. id -> "id (optional)").
function toDisplayRow(
  kind: PromotionKind,
  canonical: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const column of getColumns(kind)) {
    out[toDisplayHeader(column)] = canonical[column] ?? "";
  }
  return out;
}

// Read a parsed CSV row back to canonical keys: strip an optional "(optional)"
// hint from headers and lowercase, so the importer is forgiving of header
// casing and the optional annotation.
function normalizeRowKeys(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const canonical = key
      .replace(/\s*\(optional\)\s*$/i, "")
      .trim()
      .toLowerCase();
    normalized[canonical] = value;
  }
  return normalized;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Normalize a CSV date cell to an ISO-8601 UTC string.
//   - date-only "YYYY-MM-DD": inclusive — start-of-day for starts, end-of-day
//     (23:59:59) for ends.
//   - with a time: starts keep :00 seconds; ends are forced to :59 so the
//     selected minute is inclusive.
// Bare values are interpreted in the server's local time (matching the form's
// datetime-local pickers).
export function normalizeDateInput(
  value: string | undefined,
  position: "start" | "end"
): { value: string | null; valid: boolean } {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return { value: null, valid: true };
  }

  let date: Date;
  if (DATE_ONLY.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    date =
      position === "end"
        ? new Date(year, month - 1, day, 23, 59, 59, 0)
        : new Date(year, month - 1, day, 0, 0, 0, 0);
  } else {
    const parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed)) {
      return { value: null, valid: false };
    }
    date = new Date(parsed);
    date.setSeconds(position === "end" ? 59 : 0, 0);
  }

  if (Number.isNaN(date.getTime())) {
    return { value: null, valid: false };
  }
  return { value: date.toISOString(), valid: true };
}

// Parse a price cell that may be a single number or a multi-currency JSON map.
// Amounts are in major units.
export function parsePriceCell(raw: string | undefined): {
  scalar: number | null;
  map: Record<string, number | null> | null;
  error: string | null;
} {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return { scalar: null, map: null, error: null };
  }

  if (trimmed.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return { scalar: null, map: null, error: "is not valid JSON." };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { scalar: null, map: null, error: "JSON must be an object of currency codes." };
    }
    const map: Record<string, number | null> = {};
    for (const [code, amount] of Object.entries(parsed as Record<string, unknown>)) {
      if (amount === null || amount === "") {
        map[code.toUpperCase()] = null;
        continue;
      }
      const num = Number(amount);
      if (!Number.isFinite(num) || num < 0) {
        return { scalar: null, map: null, error: "JSON values must be non-negative numbers." };
      }
      map[code.toUpperCase()] = num;
    }
    return { scalar: null, map, error: null };
  }

  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) {
    return { scalar: null, map: null, error: "must be a non-negative number or a JSON object." };
  }
  return { scalar: num, map: null, error: null };
}

// Example date in the simple `YYYY-MM-DDTHH:mm` shape (no seconds / ms / Z) so
// the template doesn't confuse users with precision they don't need to type.
function exampleDateTime(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

export function getPromotionsTemplateCsv(kind: PromotionKind) {
  const canonical: Record<string, string> = {};
  for (const column of getColumns(kind)) {
    canonical[column] = "";
  }
  canonical.sku = "EXAMPLE-SKU";

  if (kind === "sale") {
    // A single number or a JSON map are both accepted in the price column.
    canonical.sale_price = "14.99";
    canonical.sale_start_at = exampleDateTime(0);
    canonical.sale_end_at = exampleDateTime(7);
  } else {
    canonical.new_price = "24.99";
    canonical.effective_at = exampleDateTime(0);
  }

  return stringifyCsv([toDisplayRow(kind, canonical)], getDisplayHeaders(kind));
}

export async function exportPromotionsCsv(kind: PromotionKind) {
  const client = getServiceRoleSupabaseClient();
  const canonicalRows: Array<Record<string, string>> = [];

  const salePriceCell = (
    scalarMinor: number | null | undefined,
    map: unknown
  ) => {
    if (map && typeof map === "object" && Object.keys(map as object).length > 0) {
      return toJsonCell(salePriceMapMinorToMajor(map));
    }
    return typeof scalarMinor === "number" ? String(minorToMajor(scalarMinor) ?? "") : "";
  };
  const regularPriceCell = (
    scalarMinor: number | null | undefined,
    map: unknown
  ) => {
    // Prefer the simple scalar; only emit a JSON map for genuinely multi-currency
    // prices (more than one currency configured).
    if (map && typeof map === "object" && Object.keys(map as object).length > 1) {
      return toJsonCell(priceMapMinorToMajor(map));
    }
    return typeof scalarMinor === "number" ? String(minorToMajor(scalarMinor) ?? "") : "";
  };

  if (kind === "sale") {
    const { data: products } = await (client as any)
      .from("products")
      .select("id, sku, sale_price, sale_prices, sale_start_at, sale_end_at")
      .or("sale_price.not.is.null,sale_start_at.not.is.null,sale_end_at.not.is.null")
      .order("sku", { ascending: true });
    for (const product of products || []) {
      canonicalRows.push({
        id: product.id ?? "",
        sku: product.sku ?? "",
        sale_price: salePriceCell(product.sale_price, product.sale_prices),
        sale_start_at: product.sale_start_at ?? "",
        sale_end_at: product.sale_end_at ?? "",
      });
    }

    const { data: variants } = await (client as any)
      .from("product_variants")
      .select("sku, sale_price, sale_prices, sale_start_at, sale_end_at")
      .or("sale_price.not.is.null,sale_start_at.not.is.null,sale_end_at.not.is.null")
      .order("sku", { ascending: true });
    for (const variant of variants || []) {
      canonicalRows.push({
        id: "",
        sku: variant.sku ?? "",
        sale_price: salePriceCell(variant.sale_price, variant.sale_prices),
        sale_start_at: variant.sale_start_at ?? "",
        sale_end_at: variant.sale_end_at ?? "",
      });
    }
  } else {
    // Price changes export a worksheet of every physical (Stripe) SKU with its
    // CURRENT regular price, deduped by SKU. The user only edits `new_price` and
    // `effective_at`, then re-imports. (Freemius/digital prices are owned by
    // Freemius, so they're excluded.)
    const { data: products } = await (client as any)
      .from("products")
      .select("sku, price, prices, product_variants(sku, price, prices)")
      .eq("product_type", "physical")
      .order("sku", { ascending: true });

    const seen = new Set<string>();
    for (const product of products || []) {
      const variants = product.product_variants || [];
      if (variants.length > 0) {
        // Variant products: list each variant SKU + its own price.
        for (const variant of variants) {
          const sku = (variant.sku || "").trim();
          if (!sku || seen.has(sku)) {
            continue;
          }
          seen.add(sku);
          canonicalRows.push({
            id: "",
            sku,
            new_price: regularPriceCell(variant.price, variant.prices),
            effective_at: "",
          });
        }
      } else {
        const sku = (product.sku || "").trim();
        if (!sku || seen.has(sku)) {
          continue;
        }
        seen.add(sku);
        canonicalRows.push({
          id: "",
          sku,
          new_price: regularPriceCell(product.price, product.prices),
          effective_at: "",
        });
      }
    }

    canonicalRows.sort((left, right) => (left.sku || "").localeCompare(right.sku || ""));
  }

  const source =
    canonicalRows.length > 0
      ? canonicalRows
      : [Object.fromEntries(getColumns(kind).map((column) => [column, ""]))];
  return stringifyCsv(
    source.map((row) => toDisplayRow(kind, row)),
    getDisplayHeaders(kind)
  );
}

async function buildPlan(kind: PromotionKind, csvContent: string) {
  const client = getServiceRoleSupabaseClient();
  const parsed = parseCsv(csvContent);
  const rows = parsed.rows.map(normalizeRowKeys);
  const errors: PromotionImportMessage[] = parsed.errors.map((error) => ({
    row: error.row,
    type: "error" as const,
    message: error.message,
  }));
  const warnings: PromotionImportMessage[] = [];
  const preview: PromotionImportPreviewItem[] = [];
  const operations: ResolvedOperation[] = [];

  // Default currency code, used to derive the scalar (default-currency) price
  // when a JSON price map is supplied.
  let defaultCurrencyCode = "USD";
  {
    const { data } = await (client as any)
      .from("currencies")
      .select("code")
      .eq("is_default", true)
      .maybeSingle();
    if (data?.code) {
      defaultCurrencyCode = String(data.code).toUpperCase();
    }
  }

  // Collect SKUs (the key) and ids. An id resolves to its SKU so a single SKU
  // lookup covers it too.
  const idSet = new Set<string>();
  const skuSet = new Set<string>();
  rows.forEach((row) => {
    const id = (row.id || "").trim();
    const sku = (row.sku || "").trim();
    if (sku) {
      skuSet.add(sku);
    } else if (id) {
      idSet.add(id);
    }
  });

  const productsById = new Map<string, ProductRow>();
  if (idSet.size > 0) {
    const { data } = await (client as any)
      .from("products")
      .select("id, sku, price, payment_provider")
      .in("id", [...idSet]);
    for (const product of (data || []) as ProductRow[]) {
      productsById.set(product.id, product);
      const resolvedSku = (product.sku || "").trim();
      if (resolvedSku) {
        skuSet.add(resolvedSku);
      }
    }
  }

  const productsBySku = new Map<string, ProductRow[]>();
  const variantsBySku = new Map<string, VariantRow[]>();
  if (skuSet.size > 0) {
    const skus = [...skuSet];
    const [{ data: productData }, { data: variantData }] = await Promise.all([
      (client as any)
        .from("products")
        .select("id, sku, price, payment_provider")
        .in("sku", skus),
      (client as any)
        .from("product_variants")
        .select("id, sku, price, product_id")
        .in("sku", skus),
    ]);
    for (const product of (productData || []) as ProductRow[]) {
      const key = (product.sku || "").trim();
      const list = productsBySku.get(key) ?? [];
      list.push(product);
      productsBySku.set(key, list);
    }
    for (const variant of (variantData || []) as VariantRow[]) {
      const key = (variant.sku || "").trim();
      const list = variantsBySku.get(key) ?? [];
      list.push(variant);
      variantsBySku.set(key, list);
    }
  }

  // Resolve parent payment_provider for matched variants (Freemius handling).
  const variantParentIds = new Set<string>();
  variantsBySku.forEach((list) => list.forEach((variant) => variantParentIds.add(variant.product_id)));
  const variantParentProviders = new Map<string, string | null>();
  if (variantParentIds.size > 0) {
    const { data } = await (client as any)
      .from("products")
      .select("id, payment_provider")
      .in("id", [...variantParentIds]);
    for (const product of data || []) {
      variantParentProviders.set(product.id, product.payment_provider ?? null);
    }
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // header is row 1
    const id = (row.id || "").trim();
    let sku = (row.sku || "").trim();
    let identifier: string;

    if (!sku && id) {
      const product = productsById.get(id);
      if (!product) {
        addMessage(errors, rowNumber, "error", `No product found with id "${id}".`);
        preview.push({ row: rowNumber, action: "skip", identifier: `id ${id}`, matched: 0 });
        return;
      }
      sku = (product.sku || "").trim();
      identifier = `id ${id} (sku ${sku})`;
    } else if (sku) {
      identifier = `sku ${sku}`;
    } else {
      addMessage(errors, rowNumber, "error", "Provide a SKU (or id) to target.");
      preview.push({ row: rowNumber, action: "skip", identifier: "(none)", matched: 0 });
      return;
    }

    // One SKU resolves against BOTH tables.
    const productMatches = productsBySku.get(sku) ?? [];
    const variantMatches = variantsBySku.get(sku) ?? [];
    if (productMatches.length === 0 && variantMatches.length === 0) {
      addMessage(errors, rowNumber, "error", `No product or variant found with SKU "${sku}".`);
      preview.push({ row: rowNumber, action: "skip", identifier, matched: 0 });
      return;
    }

    const productIds = productMatches.map((product) => product.id);
    const variantIds = variantMatches.map((variant) => variant.id);
    const freemiusProductIds = new Set<string>();
    productMatches.forEach((product) => {
      if (product.payment_provider === "freemius") {
        freemiusProductIds.add(product.id);
      }
    });
    variantMatches.forEach((variant) => {
      if (variantParentProviders.get(variant.product_id) === "freemius") {
        freemiusProductIds.add(variant.product_id);
      }
    });

    const matchedCount = productIds.length + variantIds.length;

    if (kind === "sale") {
      const start = normalizeDateInput(row.sale_start_at, "start");
      const end = normalizeDateInput(row.sale_end_at, "end");
      if (!start.valid) {
        addMessage(errors, rowNumber, "error", "sale_start_at is not a valid date.");
      }
      if (!end.valid) {
        addMessage(errors, rowNumber, "error", "sale_end_at is not a valid date.");
      }
      if (start.value && end.value && Date.parse(start.value) >= Date.parse(end.value)) {
        addMessage(errors, rowNumber, "error", "sale_end_at must be after sale_start_at.");
      }

      const price = parsePriceCell(row.sale_price);
      if (price.error) {
        addMessage(errors, rowNumber, "error", `sale_price ${price.error}`);
      }

      let saleScalarMinor: number | null = null;
      let salePricesMinor: Record<string, number | null> | null = null;
      if (price.map) {
        salePricesMinor = salePriceMapMajorToMinor(price.map);
        const def = price.map[defaultCurrencyCode];
        saleScalarMinor = typeof def === "number" ? majorToMinor(def) : null;
      } else if (price.scalar !== null) {
        saleScalarMinor = majorToMinor(price.scalar);
      }

      if (saleScalarMinor !== null) {
        const threshold = saleScalarMinor;
        const exceeds = [...productMatches, ...variantMatches].some(
          (record) => typeof record.price === "number" && threshold > record.price
        );
        if (exceeds) {
          addMessage(
            warnings,
            rowNumber,
            "warning",
            "sale price exceeds the regular price for at least one match; that sale is ignored at checkout until corrected."
          );
        }
      }

      const saleConfigured =
        saleScalarMinor !== null ||
        (salePricesMinor !== null && Object.keys(salePricesMinor).length > 0);

      const saleUpdate: SaleUpdate = saleConfigured
        ? {
            sale_price: saleScalarMinor,
            sale_prices: salePricesMinor,
            sale_start_at: start.value,
            sale_end_at: end.value,
          }
        : {
            // Empty price clears the scheduled sale entirely.
            sale_price: null,
            sale_prices: null,
            sale_start_at: null,
            sale_end_at: null,
          };

      operations.push({
        rowNumber,
        identifier,
        productIds,
        variantIds,
        freemiusProductIds: [...freemiusProductIds],
        saleUpdate,
      });
    } else {
      const effective = normalizeDateInput(row.effective_at, "start");
      if (!effective.valid) {
        addMessage(errors, rowNumber, "error", "effective_at is not a valid date.");
      }
      if (!effective.value) {
        addMessage(errors, rowNumber, "error", "effective_at is required for a price change.");
      }

      const price = parsePriceCell(row.new_price);
      if (price.error) {
        addMessage(errors, rowNumber, "error", `new_price ${price.error}`);
      }
      if (price.scalar === null && !price.map) {
        addMessage(errors, rowNumber, "error", "new_price is required.");
      }

      let scheduledScalarMinor: number | null = null;
      let scheduledPricesMinor: Record<string, number> | null = null;
      if (price.map) {
        scheduledPricesMinor = priceMapMajorToMinor(price.map);
        const def = price.map[defaultCurrencyCode];
        scheduledScalarMinor = typeof def === "number" ? majorToMinor(def) : null;
      } else if (price.scalar !== null) {
        scheduledScalarMinor = majorToMinor(price.scalar);
      }

      // Freemius products own their regular price; skip them with a warning.
      const applicableProductIds = productIds.filter((pid) => !freemiusProductIds.has(pid));
      if (applicableProductIds.length < productIds.length) {
        addMessage(
          warnings,
          rowNumber,
          "warning",
          "Scheduled price changes do not apply to Freemius products; those are skipped."
        );
      }

      const priceChangeUpdate: PriceChangeUpdate = {
        scheduled_price: scheduledScalarMinor,
        scheduled_prices: scheduledPricesMinor,
        scheduled_price_at: effective.value,
      };

      operations.push({
        rowNumber,
        identifier,
        productIds: applicableProductIds,
        variantIds,
        freemiusProductIds: [...freemiusProductIds],
        priceChangeUpdate,
      });
    }

    preview.push({ row: rowNumber, action: "update", identifier, matched: matchedCount });
  });

  return { client, errors, warnings, preview, operations, totalRows: rows.length };
}

function summarize(
  plan: Awaited<ReturnType<typeof buildPlan>>,
  applied: number,
  skipped: number
): PromotionImportSummary {
  return {
    success: plan.errors.length === 0,
    totalRows: plan.totalRows,
    applied,
    skipped,
    errors: plan.errors,
    warnings: plan.warnings,
    preview: plan.preview,
  };
}

export async function dryRunPromotionsImport(
  kind: PromotionKind,
  csvContent: string
): Promise<PromotionImportSummary> {
  const plan = await buildPlan(kind, csvContent);
  const skipped = plan.preview.filter((item) => item.action === "skip").length;
  return summarize(plan, 0, skipped);
}

export async function applyPromotionsImport(
  kind: PromotionKind,
  csvContent: string
): Promise<PromotionImportSummary> {
  const plan = await buildPlan(kind, csvContent);

  if (plan.errors.length > 0) {
    const skipped = plan.preview.filter((item) => item.action === "skip").length;
    return summarize(plan, 0, skipped);
  }

  const client = plan.client;
  let applied = 0;
  let skipped = plan.preview.filter((item) => item.action === "skip").length;
  const freemiusProductIdsToSync = new Set<string>();

  for (const operation of plan.operations) {
    const update = kind === "sale" ? operation.saleUpdate : operation.priceChangeUpdate;
    if (!update) {
      continue;
    }
    try {
      const now = new Date().toISOString();
      let touched = false;
      if (operation.productIds.length > 0) {
        await (client as any)
          .from("products")
          .update({ ...update, updated_at: now })
          .in("id", operation.productIds);
        touched = true;
      }
      if (operation.variantIds.length > 0) {
        await (client as any)
          .from("product_variants")
          .update({ ...update, updated_at: now })
          .in("id", operation.variantIds);
        touched = true;
      }
      if (touched) {
        applied += 1;
        if (kind === "sale") {
          operation.freemiusProductIds.forEach((pid) => freemiusProductIdsToSync.add(pid));
        }
      } else {
        skipped += 1;
      }
    } catch (error) {
      addMessage(
        plan.errors,
        operation.rowNumber,
        "error",
        error instanceof Error ? error.message : "Failed to apply row."
      );
    }
  }

  // Reconcile Freemius sale coupons for affected Freemius products.
  for (const productId of freemiusProductIdsToSync) {
    try {
      await syncProductSaleCouponToFreemius({ productId, client: client as any });
    } catch (error) {
      console.error("Failed to sync Freemius sale coupon during promotions import:", error);
    }
  }

  return summarize(plan, applied, skipped);
}
