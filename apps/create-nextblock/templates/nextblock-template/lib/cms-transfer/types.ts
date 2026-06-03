import type { Json } from "@nextblock-cms/db";

export type CmsContentType = "pages" | "posts" | "products";
export type CmsImportConflictMode = "create_new" | "overwrite_existing";
export type CmsImportApplyMode = "draft" | "live";

export interface CmsImportOptions {
  conflictMode: CmsImportConflictMode;
  applyMode: CmsImportApplyMode;
  ignoreBlankFields?: boolean;
  skipUnavailableProductContent?: boolean;
}

export interface CmsImportMessage {
  row: number;
  type: "error" | "warning";
  message: string;
}

export interface CmsImportPreviewItem {
  row: number;
  action: "create" | "update" | "skip";
  identifier: string;
  contentType: CmsContentType;
}

export interface CmsImportSummary {
  success: boolean;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: CmsImportMessage[];
  warnings: CmsImportMessage[];
  preview: CmsImportPreviewItem[];
}

export interface CmsTransferActionResult {
  success: boolean;
  error?: string;
  fileName?: string;
  mimeType?: string;
  content?: string;
}

export interface CmsBackupBundleV1 {
  version: 1;
  exported_at: string;
  languages: Array<{
    id: number;
    code: string;
    name: string | null;
  }>;
  content: {
    pages: BackupPageRecord[];
    posts: BackupPostRecord[];
    products: BackupProductRecord[];
  };
  // Optional for backward compatibility with bundles exported before the
  // Blocks Library was added to the content backup.
  custom_blocks?: BackupCustomBlockRecord[];
}

export interface BackupBlockRecord {
  language_id?: number;
  block_type: string;
  content: Json;
  order?: number;
}

export interface BackupCustomBlockRecord {
  slug: string;
  name: string;
  description?: string;
  fields: Json;
  layout_schema: Json;
  is_original?: boolean;
}

export interface BackupPageRecord {
  id?: number | string | null;
  translation_group_id?: string | null;
  language_code: string;
  title: string;
  slug: string;
  status: string;
  meta_title?: string | null;
  meta_description?: string | null;
  feature_image_id?: string | null;
  feature_image_object_key?: string | null;
  blocks: BackupBlockRecord[];
}

export interface BackupPostRecord extends BackupPageRecord {
  label?: string | null;
  excerpt?: string | null;
  subtitle?: string | null;
  published_at?: string | null;
}

export interface BackupProductVariantRecord {
  id?: string | null;
  sku: string;
  upc?: string | null;
  price: number;
  prices?: Record<string, number>;
  sale_price?: number | null;
  sale_prices?: Record<string, number | null> | null;
  stock_quantity: number;
  main_media_id?: string | null;
  main_media_object_key?: string | null;
  attribute_term_ids?: string[];
}

export interface BackupProductRecord {
  id?: string | null;
  translation_group_id?: string | null;
  language_code: string;
  product_type: string;
  payment_provider: string;
  title: string;
  slug: string;
  sku: string;
  upc?: string | null;
  status: string;
  price: number;
  prices?: Record<string, number>;
  sale_price?: number | null;
  sale_prices?: Record<string, number | null> | null;
  stock: number;
  is_taxable: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  short_description?: string | null;
  description_json?: Json;
  description_blocks: BackupBlockRecord[];
  category_slugs?: string[];
  media_ids?: string[];
  media_object_keys?: string[];
  variants?: BackupProductVariantRecord[];
  freemius_product_id?: string | null;
  freemius_plan_id?: string | null;
  trial_period_days?: number;
  trial_requires_payment_method?: boolean;
}
