export const CUSTOM_BLOCK_RELATION_MAX_RESULTS = 50;
export const CUSTOM_BLOCK_RELATION_DEFAULT_RESULTS = 20;

export type CustomBlockRelationValueType = 'number' | 'string';

export type CustomBlockRelationTarget = {
  activeFilters?: Array<{
    column: string;
    value: boolean | number | string;
  }>;
  descriptionColumns: readonly string[];
  displayColumn: string;
  label: string;
  orderBy: string;
  searchableColumns: readonly string[];
  selectColumns: readonly string[];
  table: string;
  valueColumn: string;
  valueType: CustomBlockRelationValueType;
};

export type CustomBlockRelationTargetSummary = Pick<
  CustomBlockRelationTarget,
  | 'descriptionColumns'
  | 'displayColumn'
  | 'label'
  | 'searchableColumns'
  | 'table'
  | 'valueColumn'
  | 'valueType'
  | 'selectColumns'
>;

const RELATION_TARGETS: readonly CustomBlockRelationTarget[] = [
  {
    activeFilters: [{ column: 'status', value: 'published' }],
    descriptionColumns: ['slug', 'status'],
    displayColumn: 'title',
    label: 'Pages',
    orderBy: 'title',
    searchableColumns: ['title', 'slug'],
    selectColumns: ['id', 'title', 'slug', 'status', 'feature_image_id', 'updated_at', 'language_id'],
    table: 'pages',
    valueColumn: 'id',
    valueType: 'number',
  },
  {
    activeFilters: [{ column: 'status', value: 'published' }],
    descriptionColumns: ['slug', 'status'],
    displayColumn: 'title',
    label: 'Posts',
    orderBy: 'title',
    searchableColumns: ['title', 'slug', 'excerpt', 'subtitle'],
    selectColumns: ['id', 'title', 'slug', 'excerpt', 'subtitle', 'status', 'feature_image_id', 'published_at', 'language_id'],
    table: 'posts',
    valueColumn: 'id',
    valueType: 'number',
  },
  {
    activeFilters: [{ column: 'status', value: 'active' }],
    descriptionColumns: ['sku', 'slug', 'status'],
    displayColumn: 'title',
    label: 'Products',
    orderBy: 'title',
    searchableColumns: ['title', 'slug', 'sku', 'short_description'],
    selectColumns: [
      'id',
      'language_id',
      'translation_group_id',
      'sku',
      'title',
      'slug',
      'product_type',
      'payment_provider',
      'price',
      'prices',
      'sale_price',
      'sale_prices',
      'stock',
      'status',
      'trial_period_days',
      'trial_requires_payment_method',
      'is_taxable',
      'meta_title',
      'meta_description',
      'short_description',
      'description_json',
      'metadata',
      'freemius_plan_id',
      'freemius_product_id',
      'upc',
      'created_at',
      'updated_at',
      'main_image',
      'object_key',
    ],
    table: 'products',
    valueColumn: 'id',
    valueType: 'string',
  },
  {
    descriptionColumns: ['sku', 'price', 'stock_quantity'],
    displayColumn: 'sku',
    label: 'Product Variations',
    orderBy: 'sku',
    searchableColumns: ['sku', 'upc'],
    selectColumns: [
      'id',
      'product_id',
      'sku',
      'price_adjustment',
      'price',
      'prices',
      'sale_price',
      'sale_prices',
      'stock_quantity',
      'upc',
      'main_media_id',
      'created_at',
      'updated_at',
    ],
    table: 'product_variants',
    valueColumn: 'id',
    valueType: 'string',
  },
  {
    descriptionColumns: ['object_key', 'file_type'],
    displayColumn: 'file_name',
    label: 'Media',
    orderBy: 'file_name',
    searchableColumns: ['file_name', 'description', 'object_key'],
    selectColumns: [
      'id',
      'file_name',
      'description',
      'object_key',
      'file_type',
      'width',
      'height',
      'updated_at',
    ],
    table: 'media',
    valueColumn: 'id',
    valueType: 'string',
  },
  {
    descriptionColumns: ['slug'],
    displayColumn: 'name',
    label: 'Categories',
    orderBy: 'name',
    searchableColumns: ['name', 'slug', 'description'],
    selectColumns: ['id', 'name', 'slug', 'description'],
    table: 'categories',
    valueColumn: 'id',
    valueType: 'string',
  },
  {
    descriptionColumns: ['github_username', 'website'],
    displayColumn: 'full_name',
    label: 'Profiles',
    orderBy: 'full_name',
    searchableColumns: ['full_name', 'github_username', 'website'],
    selectColumns: ['id', 'full_name', 'avatar_url', 'github_username', 'website', 'role'],
    table: 'profiles',
    valueColumn: 'id',
    valueType: 'string',
  },
  {
    activeFilters: [{ column: 'is_active', value: true }],
    descriptionColumns: ['code'],
    displayColumn: 'name',
    label: 'Languages',
    orderBy: 'name',
    searchableColumns: ['name', 'code'],
    selectColumns: ['id', 'name', 'code', 'is_default', 'is_active'],
    table: 'languages',
    valueColumn: 'id',
    valueType: 'number',
  },
] as const;

const RELATION_TARGET_BY_TABLE = new Map(
  RELATION_TARGETS.map((target) => [target.table, target])
);

export function listCustomBlockRelationTargets(): CustomBlockRelationTargetSummary[] {
  return RELATION_TARGETS.map(
    ({
      descriptionColumns,
      displayColumn,
      label,
      searchableColumns,
      table,
      valueColumn,
      valueType,
      selectColumns,
    }) => ({
      descriptionColumns: [...descriptionColumns],
      displayColumn,
      label,
      searchableColumns: [...searchableColumns],
      table,
      valueColumn,
      valueType,
      selectColumns: [...selectColumns],
    })
  );
}

export function getCustomBlockRelationTarget(table: string) {
  return RELATION_TARGET_BY_TABLE.get(table);
}

export function isAllowedCustomBlockRelationTable(table: string) {
  return RELATION_TARGET_BY_TABLE.has(table);
}

export function clampCustomBlockRelationLimit(limit: unknown) {
  const parsed =
    typeof limit === 'number'
      ? limit
      : typeof limit === 'string'
        ? Number.parseInt(limit, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return CUSTOM_BLOCK_RELATION_DEFAULT_RESULTS;
  }

  return Math.min(Math.floor(parsed), CUSTOM_BLOCK_RELATION_MAX_RESULTS);
}

export function resolveCustomBlockRelationColumn(
  target: CustomBlockRelationTarget,
  column: string | null | undefined,
  fallback: string
) {
  const candidate = column?.trim() || fallback;
  return target.selectColumns.includes(candidate) ? candidate : null;
}

export function normalizeCustomBlockRelationValue(
  target: CustomBlockRelationTarget,
  value: unknown
) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (target.valueType === 'number') {
    const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return String(value);
}
