import 'server-only';

import { getServiceRoleSupabaseClient, verifyPackageOnline } from '@nextblock-cms/db/server';
import {
  getDefaultCurrency,
  inferCurrencyCodeFromLocale,
  normalizeCurrencyRecord,
  normalizePriceMap,
  normalizeSalePriceMap,
  resolveEffectivePriceForCurrency,
  type CurrencyRecord,
} from '@nextblock-cms/ecommerce/currency';
import { mapRawVariantRelations } from '@nextblock-cms/ecommerce/variation-utils';
import type { CartItem, ProductVariant } from '@nextblock-cms/ecommerce/types';
import { resolveMediaUrl } from '../../../lib/media/resolveMediaUrl';
import { resolveProductMetaDescription, stripHtmlToText } from '../seo';

export const UCP_VERSION = '2026-04-08';
export const UCP_REST_BASE_PATH = '/ucp/v1';
export const UCP_SHOPPING_SERVICE = 'dev.ucp.shopping';
export const UCP_CAPABILITIES = {
  catalogSearch: 'dev.ucp.shopping.catalog.search',
  catalogLookup: 'dev.ucp.shopping.catalog.lookup',
  cart: 'dev.ucp.shopping.cart',
  checkout: 'dev.ucp.shopping.checkout',
} as const;

const UCP_SPEC_ROOT = `https://ucp.dev/${UCP_VERSION}`;
const DEFAULT_PAGE_LIMIT = 10;
const MAX_PAGE_LIMIT = 50;
const MAX_LOOKUP_IDS = 50;

const PRODUCT_SELECT = `
  *,
  languages (
    id,
    code,
    is_default
  ),
  product_media (
    media_id,
    sort_order,
    media (
      id,
      file_path,
      object_key,
      file_name,
      blur_data_url,
      width,
      height
    )
  ),
  product_categories (
    category:categories (
      id,
      name,
      slug,
      description,
      name_translations,
      description_translations
    )
  ),
  product_variants (
    id,
    sku,
    upc,
    main_media_id,
    price,
    prices,
    sale_price,
    sale_prices,
    sale_start_at,
    sale_end_at,
    scheduled_price,
    scheduled_prices,
    scheduled_price_at,
    stock_quantity,
    media:main_media_id (
      id,
      file_path,
      object_key,
      description
    ),
    variant_attribute_mapping (
      attribute_term_id,
      product_attribute_terms (
        id,
        attribute_id,
        value,
        slug,
        sort_order,
        value_translations,
        product_attributes (
          id,
          name,
          slug,
          name_translations
        )
      )
    )
  ),
  freemius_plans (
    id,
    name,
    title,
    freemius_pricing (
      id,
      license_quota,
      api_monthly_price,
      api_annual_price,
      api_lifetime_price,
      override_monthly_price,
      override_annual_price,
      override_lifetime_price,
      is_active
    )
  )
`;

type JsonRecord = Record<string, unknown>;
type SupabaseAnyClient = any;

type UcpCapabilityName = (typeof UCP_CAPABILITIES)[keyof typeof UCP_CAPABILITIES];

interface PaginationInput {
  limit: number;
  offset: number;
}

interface ProductMapOptions {
  baseUrl: string;
  currencyCode: string;
  currencies: CurrencyRecord[];
  mode?: 'search' | 'lookup' | 'detail';
  lookupInputs?: string[];
  requestedVariantId?: string | null;
  selected?: Array<{ name?: string; label?: string; value?: string }>;
}

interface CartBuildResult {
  currencyCode: string;
  locale: string | null;
  context: JsonRecord;
  signals: JsonRecord;
  attribution: JsonRecord;
  buyer: JsonRecord;
  lineItems: JsonRecord[];
  totals: Array<{ type: string; amount: number; currency: string; display_text?: string }>;
  messages: JsonRecord[];
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toInteger(value: unknown, fallback: number) {
  const parsed =
    typeof value === 'string'
      ? Number.parseInt(value, 10)
      : typeof value === 'number'
        ? value
        : Number.NaN;

  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function toMoneyAmount(value: unknown) {
  const parsed =
    typeof value === 'string'
      ? Number.parseFloat(value)
      : typeof value === 'number'
        ? value
        : Number.NaN;

  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function getOriginFromRequest(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_URL?.replace(/\/+$/, '');
  if (configuredUrl) {
    return configuredUrl;
  }

  return new URL(request.url).origin;
}

function getUcpSupabaseClient(): SupabaseAnyClient {
  return getServiceRoleSupabaseClient() as SupabaseAnyClient;
}

function getLanguageCode(product: any) {
  const language = Array.isArray(product?.languages)
    ? product.languages[0]
    : product?.languages;

  return typeof language?.code === 'string' ? language.code : null;
}

function normalizeTranslationMap(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (accumulator, [key, entry]) => {
      if (typeof entry === 'string' && entry.trim()) {
        accumulator[key] = entry.trim();
      }

      return accumulator;
    },
    {}
  );
}

function resolveTranslatedCategoryText(
  baseValue: unknown,
  translations: unknown,
  languageCode?: string | null
) {
  const fallback = typeof baseValue === 'string' ? baseValue.trim() : '';
  const normalizedTranslations = normalizeTranslationMap(translations);

  if (!languageCode || !normalizedTranslations) {
    return fallback;
  }

  return normalizedTranslations[languageCode]?.trim() || fallback;
}

function getProductCategoryRecords(product: any) {
  const categoryRows = Array.isArray(product?.product_categories)
    ? product.product_categories
    : [];

  return categoryRows
    .map((row: any) => row?.category)
    .filter((category: any) => category?.id && category?.slug && category?.name);
}

function getProductCategories(product: any, languageCode?: string | null) {
  return getProductCategoryRecords(product).map((category: any) => ({
    id: category.id,
    value: category.slug,
    label: resolveTranslatedCategoryText(
      category.name,
      category.name_translations,
      languageCode
    ),
    name: resolveTranslatedCategoryText(
      category.name,
      category.name_translations,
      languageCode
    ),
    slug: category.slug,
    description:
      resolveTranslatedCategoryText(
        category.description,
        category.description_translations,
        languageCode
      ) || undefined,
  }));
}

function encodeCursor(offset: number) {
  return Buffer.from(JSON.stringify({ offset }), 'utf8').toString('base64url');
}

function decodeCursor(cursor: unknown) {
  const value = asString(cursor);
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    const offset = toInteger(asRecord(parsed).offset, -1);
    return offset >= 0 ? offset : null;
  } catch {
    return null;
  }
}

export function normalizeUcpPagination(body: unknown): PaginationInput {
  const record = asRecord(body);
  const pagination = asRecord(record.pagination);
  const requestedLimit = toInteger(
    pagination.limit ?? pagination.page_size ?? record.limit,
    DEFAULT_PAGE_LIMIT
  );
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_PAGE_LIMIT);
  const cursorOffset = decodeCursor(
    pagination.cursor ?? pagination.after ?? record.cursor ?? record.page_token
  );
  const offset = cursorOffset ?? Math.max(toInteger(pagination.offset ?? record.offset, 0), 0);

  return { limit, offset };
}

export function buildPaginationResponse(params: {
  limit: number;
  offset: number;
  count: number;
  totalCount?: number | null;
}) {
  const nextOffset = params.offset + params.count;
  const hasNextPage =
    typeof params.totalCount === 'number'
      ? nextOffset < params.totalCount
      : params.count === params.limit;

  return {
    cursor: hasNextPage ? encodeCursor(nextOffset) : null,
    has_next_page: hasNextPage,
    total_count: params.totalCount ?? undefined,
    limit: params.limit,
  };
}

export function buildUcpMetadata(
  capabilityNames: UcpCapabilityName[] = [
    UCP_CAPABILITIES.catalogSearch,
    UCP_CAPABILITIES.catalogLookup,
    UCP_CAPABILITIES.cart,
  ],
  status: 'success' | 'error' = 'success'
): JsonRecord {
  return {
    version: UCP_VERSION,
    status,
    capabilities: capabilityNames.reduce<Record<string, Array<{ version: string }>>>(
      (accumulator, capabilityName) => {
        accumulator[capabilityName] = [{ version: UCP_VERSION }];
        return accumulator;
      },
      {}
    ),
  };
}

export function buildUcpProfile(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = `${normalizedBaseUrl}${UCP_REST_BASE_PATH}`;

  return {
    ucp: {
      version: UCP_VERSION,
      supported_versions: {
        [UCP_VERSION]: `${normalizedBaseUrl}/.well-known/ucp`,
      },
      services: {
        [UCP_SHOPPING_SERVICE]: [
          {
            version: UCP_VERSION,
            spec: `${UCP_SPEC_ROOT}/specification/overview`,
            transport: 'rest',
            schema: `${UCP_SPEC_ROOT}/services/shopping/rest.openapi.json`,
            endpoint,
          },
        ],
      },
      capabilities: {
        [UCP_CAPABILITIES.catalogSearch]: [
          {
            version: UCP_VERSION,
            spec: `${UCP_SPEC_ROOT}/specification/catalog/search`,
            schema: `${UCP_SPEC_ROOT}/schemas/shopping/catalog_search.json`,
          },
        ],
        [UCP_CAPABILITIES.catalogLookup]: [
          {
            version: UCP_VERSION,
            spec: `${UCP_SPEC_ROOT}/specification/catalog/lookup`,
            schema: `${UCP_SPEC_ROOT}/schemas/shopping/catalog_lookup.json`,
          },
        ],
        [UCP_CAPABILITIES.cart]: [
          {
            version: UCP_VERSION,
            spec: `${UCP_SPEC_ROOT}/specification/cart`,
            schema: `${UCP_SPEC_ROOT}/schemas/shopping/cart.json`,
          },
        ],
      },
    },
    business: {
      name: 'NextBlock',
      url: normalizedBaseUrl,
    },
  };
}

export async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function buildUcpBusinessError(params: {
  capability: UcpCapabilityName;
  code: string;
  content: string;
  severity?: 'recoverable' | 'unrecoverable';
  continueUrl?: string;
}) {
  return {
    ucp: buildUcpMetadata([params.capability], 'error'),
    messages: [
      {
        type: 'error',
        code: params.code,
        content: params.content,
        severity: params.severity ?? 'unrecoverable',
      },
    ],
    continue_url: params.continueUrl,
  };
}

export function buildProtocolError(code: string, content: string) {
  return { code, content };
}

export async function ensureEcommerceOnline() {
  try {
    return await verifyPackageOnline('ecommerce');
  } catch {
    return false;
  }
}

async function fetchCurrencies(client: SupabaseAnyClient): Promise<CurrencyRecord[]> {
  const { data } = await client
    .from('currencies')
    .select(
      'code, symbol, exchange_rate, is_default, is_active, auto_sync_product_prices, rounding_mode, rounding_increment, rounding_charm_amount, auto_update_exchange_rate, exchange_rate_source, exchange_rate_updated_at'
    )
    .eq('is_active', true)
    .order('is_default', { ascending: false });

  const currencies = (data || []).map((currency: any) =>
    normalizeCurrencyRecord(currency)
  );

  return currencies.length > 0
    ? currencies
    : [
        normalizeCurrencyRecord({
          code: 'USD',
          symbol: '$',
          exchange_rate: 1,
          is_default: true,
          is_active: true,
        }),
      ];
}

function resolveRequestedLocale(body: unknown) {
  const record = asRecord(body);
  const context = asRecord(record.context);
  return (
    asString(context.language) ||
    asString(context.locale) ||
    asString(record.locale) ||
    null
  );
}

function resolveRequestedCurrency(
  body: unknown,
  currencies: CurrencyRecord[]
) {
  const record = asRecord(body);
  const context = asRecord(record.context);
  const requestedCurrency =
    asString(context.currency) ||
    asString(record.currency) ||
    asString(record.currencyCode);

  if (requestedCurrency) {
    const normalized = requestedCurrency.toUpperCase();
    if (currencies.some((currency) => currency.code === normalized)) {
      return normalized;
    }
  }

  const locale = resolveRequestedLocale(body);
  return inferCurrencyCodeFromLocale(locale, currencies) || getDefaultCurrency(currencies).code;
}

function buildProductUrl(baseUrl: string, product: any) {
  return `${baseUrl.replace(/\/+$/, '')}/product/${product.slug}`;
}

function buildProductInputValues(product: any, baseUrl: string) {
  return new Set(
    [
      product?.id,
      product?.slug,
      product?.sku,
      product?.upc,
      buildProductUrl(baseUrl, product),
      `${baseUrl.replace(/\/+$/, '')}/products/${product?.slug}`,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())
  );
}

function buildVariantInputValues(variant: ProductVariant) {
  return new Set(
    [variant.id, variant.sku, variant.upc]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())
  );
}

function getLookupInputsForProduct(product: any, baseUrl: string, inputs: string[]) {
  const productValues = buildProductInputValues(product, baseUrl);

  return inputs
    .filter((input) => productValues.has(input.toLowerCase()))
    .map((input) => ({
      id: input,
      match: product.sku === input || product.upc === input ? 'exact' : 'featured',
    }));
}

function getLookupInputsForVariant(variant: ProductVariant, inputs: string[]) {
  const variantValues = buildVariantInputValues(variant);

  return inputs
    .filter((input) => variantValues.has(input.toLowerCase()))
    .map((input) => ({
      id: input,
      match: 'exact',
    }));
}

function getProductImages(product: any) {
  const mediaRows = Array.isArray(product?.product_media)
    ? [...product.product_media].sort(
        (left, right) => (left?.sort_order ?? 0) - (right?.sort_order ?? 0)
      )
    : [];

  return mediaRows
    .map((row) => {
      const media = row?.media;
      const url = resolveMediaUrl(media?.file_path ?? media?.object_key ?? null);
      if (!url) {
        return null;
      }

      return {
        type: 'image',
        url,
        alt_text: media?.file_name || product.title,
        width: media?.width ?? undefined,
        height: media?.height ?? undefined,
      };
    })
    .filter(Boolean);
}

function resolveEffectivePrice(params: {
  price: number;
  prices?: unknown;
  salePrice?: number | null;
  salePrices?: unknown;
  saleStartAt?: string | null;
  saleEndAt?: string | null;
  scheduledPrice?: number | null;
  scheduledPrices?: unknown;
  scheduledPriceAt?: string | null;
  currencyCode: string;
  currencies: CurrencyRecord[];
}) {
  const resolvedPrice = resolveEffectivePriceForCurrency({
    prices: normalizePriceMap(params.prices),
    salePrices: normalizeSalePriceMap(params.salePrices),
    fallbackPrice: params.price,
    fallbackSalePrice: params.salePrice,
    saleStartAt: params.saleStartAt,
    saleEndAt: params.saleEndAt,
    scheduledPrice: params.scheduledPrice,
    scheduledPrices: normalizePriceMap(params.scheduledPrices),
    scheduledPriceAt: params.scheduledPriceAt,
    currencyCode: params.currencyCode,
    currencies: params.currencies,
  });

  return {
    regularAmount: resolvedPrice.price,
    saleAmount: resolvedPrice.sale_price,
    amount: resolvedPrice.sale_price ?? resolvedPrice.price,
    currency: resolvedPrice.currencyCode,
  };
}

function getProductPriceRange(product: any, variants: ProductVariant[], options: ProductMapOptions) {
  const entries =
    variants.length > 0
      ? variants.map((variant) => ({
          price: variant.price,
          prices: variant.prices,
          sale_price: variant.sale_price,
          sale_prices: variant.sale_prices,
          sale_start_at: variant.sale_start_at,
          sale_end_at: variant.sale_end_at,
          scheduled_price: variant.scheduled_price,
          scheduled_prices: variant.scheduled_prices,
          scheduled_price_at: variant.scheduled_price_at,
        }))
      : [
          {
            price: product.price ?? 0,
            prices: product.prices,
            sale_price: product.sale_price,
            sale_prices: product.sale_prices,
            sale_start_at: product.sale_start_at,
            sale_end_at: product.sale_end_at,
            scheduled_price: product.scheduled_price,
            scheduled_prices: product.scheduled_prices,
            scheduled_price_at: product.scheduled_price_at,
          },
        ];

  const amounts = entries.map((entry) =>
    resolveEffectivePrice({
      price: entry.price ?? 0,
      prices: entry.prices,
      salePrice: entry.sale_price,
      salePrices: entry.sale_prices,
      saleStartAt: entry.sale_start_at,
      saleEndAt: entry.sale_end_at,
      scheduledPrice: entry.scheduled_price,
      scheduledPrices: entry.scheduled_prices,
      scheduledPriceAt: entry.scheduled_price_at,
      currencyCode: options.currencyCode,
      currencies: options.currencies,
    }).amount
  );

  return {
    min: { amount: Math.min(...amounts), currency: options.currencyCode },
    max: { amount: Math.max(...amounts), currency: options.currencyCode },
  };
}

function getVariantAvailability(product: any, variant?: ProductVariant | null) {
  if (product?.product_type === 'digital') {
    return { available: true };
  }

  const stockQuantity =
    typeof variant?.stock_quantity === 'number'
      ? variant.stock_quantity
      : typeof product?.stock === 'number'
        ? product.stock
        : null;

  return {
    available: stockQuantity === null || stockQuantity > 0,
    quantity: stockQuantity ?? undefined,
  };
}

function matchesSelectedOptions(
  variant: ProductVariant,
  selected: ProductMapOptions['selected']
) {
  if (!selected?.length) {
    return true;
  }

  return selected.every((selection) => {
    const name = selection.name?.toLowerCase();
    const label = (selection.label || selection.value || '').toLowerCase();

    if (!name || !label) {
      return true;
    }

    return variant.selected_options.some(
      (option) =>
        option.attribute_name.toLowerCase() === name &&
        option.term_value.toLowerCase() === label
    );
  });
}

function buildUcpOptions(attributes: any[], variants: ProductVariant[], selected: ProductMapOptions['selected']) {
  return attributes.map((attribute) => ({
    name: attribute.name,
    values: attribute.terms.map((term: any) => {
      const exists = variants.some((variant) =>
        variant.selected_options.some((option) => option.term_id === term.id)
      );
      const available = variants.some(
        (variant) =>
          variant.stock_quantity > 0 &&
          matchesSelectedOptions(variant, selected) &&
          variant.selected_options.some((option) => option.term_id === term.id)
      );

      return {
        label: term.value,
        value: term.id,
        available,
        exists,
      };
    }),
  }));
}

function buildDefaultVariant(product: any, options: ProductMapOptions): ProductVariant {
  return {
    id: product.id,
    combination_key: product.id,
    sku: product.sku || product.id,
    upc: product.upc ?? null,
    price: product.price ?? 0,
    prices: normalizePriceMap(product.prices),
    sale_price: product.sale_price ?? null,
    sale_prices: normalizeSalePriceMap(product.sale_prices),
    sale_start_at: product.sale_start_at ?? null,
    sale_end_at: product.sale_end_at ?? null,
    scheduled_price: product.scheduled_price ?? null,
    scheduled_prices: normalizePriceMap(product.scheduled_prices),
    scheduled_price_at: product.scheduled_price_at ?? null,
    stock_quantity:
      typeof product.stock === 'number'
        ? product.stock
        : product.product_type === 'digital'
          ? 999999
          : 0,
    attribute_term_ids: [],
    selected_options: [],
    label: product.title,
    image_url: getProductImages(product)[0]?.url as string | undefined,
  };
}

function sortFeaturedVariantFirst(
  variants: ProductVariant[],
  requestedVariantId?: string | null
) {
  const requested = requestedVariantId
    ? variants.find((variant) => variant.id === requestedVariantId)
    : null;

  if (requested) {
    return [requested, ...variants.filter((variant) => variant.id !== requested.id)];
  }

  const inStock = variants.find((variant) => variant.stock_quantity > 0);
  if (inStock) {
    return [inStock, ...variants.filter((variant) => variant.id !== inStock.id)];
  }

  return variants;
}

function mapVariantToUcp(
  product: any,
  variant: ProductVariant,
  options: ProductMapOptions,
  lookupInputs: Array<{ id: string; match: string }> = []
) {
  const price = resolveEffectivePrice({
    price: variant.price ?? product.price ?? 0,
    prices: variant.prices ?? product.prices,
    salePrice: variant.sale_price ?? product.sale_price ?? null,
    salePrices: variant.sale_prices ?? product.sale_prices,
    saleStartAt: variant.sale_start_at ?? product.sale_start_at,
    saleEndAt: variant.sale_end_at ?? product.sale_end_at,
    scheduledPrice: variant.scheduled_price ?? product.scheduled_price,
    scheduledPrices: variant.scheduled_prices ?? product.scheduled_prices,
    scheduledPriceAt: variant.scheduled_price_at ?? product.scheduled_price_at,
    currencyCode: options.currencyCode,
    currencies: options.currencies,
  });
  const imageUrl =
    variant.image_url || (getProductImages(product)[0]?.url as string | undefined);
  const title =
    variant.label && variant.label !== product.title
      ? `${product.title} - ${variant.label}`
      : product.title;

  return {
    id: variant.id,
    product_id: product.id,
    sku: variant.sku || product.sku,
    gtin: variant.upc || product.upc || undefined,
    title,
    description: { plain: variant.label || product.title },
    price: { amount: price.amount, currency: price.currency },
    compare_at_price:
      price.saleAmount && price.regularAmount > price.saleAmount
        ? { amount: price.regularAmount, currency: price.currency }
        : undefined,
    availability: getVariantAvailability(product, variant),
    options: variant.selected_options.map((option) => ({
      name: option.attribute_name,
      label: option.term_value,
      value: option.term_id,
    })),
    media: imageUrl
      ? [
          {
            type: 'image',
            url: imageUrl,
            alt_text: title,
          },
        ]
      : [],
    inputs: lookupInputs.length > 0 ? lookupInputs : undefined,
  };
}

export function productToUcpProduct(product: any, options: ProductMapOptions) {
  const languageCode = getLanguageCode(product);
  const categories = getProductCategories(product, languageCode);
  const { attributes, variants: mappedVariants } = mapRawVariantRelations(
    product?.product_variants || [],
    languageCode
  );
  const variants =
    mappedVariants.length > 0
      ? sortFeaturedVariantFirst(mappedVariants, options.requestedVariantId)
      : [buildDefaultVariant(product, options)];
  const selectedVariants =
    options.mode === 'detail'
      ? variants.filter((variant) =>
          options.requestedVariantId
            ? variant.id === options.requestedVariantId ||
              matchesSelectedOptions(variant, options.selected)
            : matchesSelectedOptions(variant, options.selected)
        )
      : variants;
  const displayVariants = selectedVariants.length > 0 ? selectedVariants : variants.slice(0, 1);
  const productInputs = getLookupInputsForProduct(
    product,
    options.baseUrl,
    options.lookupInputs ?? []
  );
  const isLookupMode = options.mode === 'lookup';
  const featuredVariantId = variants[0]?.id;

  const ucpVariants = displayVariants
    .map((variant) => {
      const variantInputs = getLookupInputsForVariant(variant, options.lookupInputs ?? []);
      const inputs =
        variantInputs.length > 0
          ? variantInputs
          : isLookupMode && variant.id === featuredVariantId
            ? productInputs
            : [];

      if (isLookupMode && inputs.length === 0) {
        return null;
      }

      return mapVariantToUcp(product, variant, options, inputs);
    })
    .filter(Boolean);

  return {
    id: product.id,
    handle: product.slug,
    sku: product.sku || undefined,
    gtin: product.upc || undefined,
    title: product.title,
    description: {
      plain: resolveProductMetaDescription(
        product.meta_description,
        product.short_description
      ),
    },
    url: buildProductUrl(options.baseUrl, product),
    language: languageCode || undefined,
    status: product.status,
    categories,
    price_range: getProductPriceRange(product, variants, options),
    media: getProductImages(product),
    options: buildUcpOptions(attributes, variants, options.selected),
    variants: ucpVariants,
    seller: {
      name: 'NextBlock',
      url: options.baseUrl,
    },
    metadata: {
      product_type: product.product_type ?? null,
      payment_provider: product.payment_provider ?? null,
      category_ids: categories.map((category: any) => category.id),
      category_slugs: categories.map((category: any) => category.slug),
      translation_group_id: product.translation_group_id ?? null,
      short_description: stripHtmlToText(product.short_description || ''),
    },
  };
}

function normalizeSearchText(value: unknown) {
  return asString(value)?.replace(/[,%()]/g, ' ').trim() || '';
}

function getPriceFilter(body: unknown) {
  const filters = asRecord(asRecord(body).filters);
  const price = asRecord(filters.price);

  return {
    min: toMoneyAmount(asRecord(price.min).amount ?? price.min),
    max: toMoneyAmount(asRecord(price.max).amount ?? price.max),
  };
}

function normalizeCategoryFilterValues(body: unknown) {
  const filters = asRecord(asRecord(body).filters);
  const rawCategories = filters.categories;
  const values = Array.isArray(rawCategories)
    ? rawCategories
    : rawCategories
      ? [rawCategories]
      : [];

  return [
    ...new Set(
      values
        .map((value) =>
          typeof value === 'string' || typeof value === 'number'
            ? String(value).trim()
            : ''
        )
        .filter(Boolean)
    ),
  ];
}

function normalizeCategoryToken(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().toLowerCase()
    : '';
}

function categoryMatchesFilterValue(
  category: any,
  filterTokens: Set<string>,
  languageCode?: string | null
) {
  const translatedName = resolveTranslatedCategoryText(
    category.name,
    category.name_translations,
    languageCode
  );
  const translatedDescription = resolveTranslatedCategoryText(
    category.description,
    category.description_translations,
    languageCode
  );
  const translationValues = [
    ...Object.values(normalizeTranslationMap(category.name_translations) ?? {}),
    ...Object.values(normalizeTranslationMap(category.description_translations) ?? {}),
  ];
  const candidates = [
    category.id,
    category.slug,
    category.name,
    category.description,
    translatedName,
    translatedDescription,
    ...translationValues,
  ]
    .map(normalizeCategoryToken)
    .filter(Boolean);

  return candidates.some((candidate) => filterTokens.has(candidate));
}

async function resolveCategoryFilterProductIds(params: {
  client: SupabaseAnyClient;
  values: string[];
  languageCode?: string | null;
}) {
  const filterTokens = new Set(params.values.map(normalizeCategoryToken).filter(Boolean));
  if (filterTokens.size === 0) {
    return {
      productIds: null as string[] | null,
      matchedCategoryIds: [] as string[],
      messages: [] as JsonRecord[],
    };
  }

  const { data: categories, error: categoryError } = await params.client
    .from('categories')
    .select('id, name, slug, description, name_translations, description_translations');

  if (categoryError) {
    throw categoryError;
  }

  const matchedCategories = (categories || []).filter((category: any) =>
    categoryMatchesFilterValue(category, filterTokens, params.languageCode)
  );

  if (matchedCategories.length === 0) {
    return {
      productIds: [],
      matchedCategoryIds: [],
      messages: [
        {
          type: 'info',
          code: 'category_filter_no_match',
          content: `No categories matched: ${params.values.join(', ')}`,
        },
      ],
    };
  }

  const matchedCategoryIds = matchedCategories.map((category: any) => category.id);
  const { data: productCategoryRows, error: productCategoryError } = await params.client
    .from('product_categories')
    .select('product_id')
    .in('category_id', matchedCategoryIds);

  if (productCategoryError) {
    throw productCategoryError;
  }

  return {
    productIds: [
      ...new Set(
        (productCategoryRows || [])
          .map((row: any) => row.product_id)
          .filter(Boolean)
      ),
    ],
    matchedCategoryIds,
    messages: [] as JsonRecord[],
  };
}

function productPassesPriceFilter(product: any, priceFilter: ReturnType<typeof getPriceFilter>) {
  if (priceFilter.min === null && priceFilter.max === null) {
    return true;
  }

  const minAmount = product?.price_range?.min?.amount;
  const maxAmount = product?.price_range?.max?.amount;

  if (typeof maxAmount === 'number' && priceFilter.min !== null && maxAmount < priceFilter.min) {
    return false;
  }

  if (typeof minAmount === 'number' && priceFilter.max !== null && minAmount > priceFilter.max) {
    return false;
  }

  return true;
}

export async function searchCatalogProducts(body: unknown, request: Request) {
  const client = getUcpSupabaseClient();
  const baseUrl = getOriginFromRequest(request);
  const currencies = await fetchCurrencies(client);
  const currencyCode = resolveRequestedCurrency(body, currencies);
  const pagination = normalizeUcpPagination(body);
  const queryText = normalizeSearchText(asRecord(body).query ?? asRecord(body).q);
  const priceFilter = getPriceFilter(body);
  const categoryFilterValues = normalizeCategoryFilterValues(body);
  const categoryFilter = await resolveCategoryFilterProductIds({
    client,
    values: categoryFilterValues,
    languageCode: resolveRequestedLocale(body),
  });

  if (categoryFilter.productIds && categoryFilter.productIds.length === 0) {
    return {
      ucp: buildUcpMetadata([UCP_CAPABILITIES.catalogSearch]),
      products: [],
      pagination: buildPaginationResponse({
        ...pagination,
        count: 0,
        totalCount: 0,
      }),
      messages: categoryFilter.messages,
    };
  }

  let query = client
    .from('products')
    .select(PRODUCT_SELECT, { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(pagination.offset, pagination.offset + pagination.limit - 1);

  if (queryText) {
    query = query.or(
      `title.ilike.%${queryText}%,sku.ilike.%${queryText}%,slug.ilike.%${queryText}%`
    );
  }

  if (categoryFilter.productIds) {
    query = query.in('id', categoryFilter.productIds);
  }

  const { data, error, count } = await query;
  if (error) {
    throw error;
  }

  const products = (data || [])
    .map((product: any) =>
      productToUcpProduct(product, {
        baseUrl,
        currencyCode,
        currencies,
        mode: 'search',
      })
    )
    .filter((product: any) => productPassesPriceFilter(product, priceFilter));

  return {
    ucp: buildUcpMetadata([UCP_CAPABILITIES.catalogSearch]),
    products,
    pagination: buildPaginationResponse({
      ...pagination,
      count: data?.length ?? 0,
      totalCount: count,
    }),
    messages:
      queryText || Object.keys(asRecord(asRecord(body).filters)).length > 0
        ? categoryFilter.messages
        : [
            {
              type: 'info',
              code: 'browse_default',
              content: 'No search query was supplied; returning the latest active products.',
            },
          ],
  };
}

function normalizeLookupIds(value: unknown) {
  const rawIds = Array.isArray(value) ? value : [];
  const ids = rawIds
    .map((id) => (typeof id === 'string' || typeof id === 'number' ? String(id).trim() : ''))
    .filter(Boolean);

  return [...new Set(ids)].slice(0, MAX_LOOKUP_IDS);
}

function expandIdentifierCandidates(id: string) {
  const candidates = new Set([id]);

  try {
    const url = new URL(id);
    const segments = url.pathname.split('/').filter(Boolean);
    const productIndex = segments.findIndex((segment) => segment === 'product' || segment === 'products');
    if (productIndex >= 0 && segments[productIndex + 1]) {
      candidates.add(decodeURIComponent(segments[productIndex + 1]));
    }
  } catch {
    // Not a URL; the original identifier is already included.
  }

  return [...candidates];
}

async function selectRowsByField(
  client: SupabaseAnyClient,
  table: 'products' | 'product_variants',
  field: string,
  values: string[]
): Promise<any[]> {
  if (values.length === 0) {
    return [];
  }

  const select =
    table === 'products'
      ? 'id, slug, sku, upc, status'
      : 'id, product_id, sku, upc';

  let query = client.from(table).select(select).in(field, values);
  if (table === 'products') {
    query = query.eq('status', 'active');
  }

  const { data } = await query;
  return (data || []) as any[];
}

async function resolveProductRowsByIdentifiers(ids: string[]): Promise<{
  rows: any[];
  variantMatches: any[];
}> {
  const client = getUcpSupabaseClient();
  const expandedIds = [...new Set(ids.flatMap(expandIdentifierCandidates))];
  const [
    productsById,
    productsBySlug,
    productsBySku,
    productsByUpc,
    variantsById,
    variantsBySku,
    variantsByUpc,
  ] = await Promise.all([
    selectRowsByField(client, 'products', 'id', expandedIds),
    selectRowsByField(client, 'products', 'slug', expandedIds),
    selectRowsByField(client, 'products', 'sku', expandedIds),
    selectRowsByField(client, 'products', 'upc', expandedIds),
    selectRowsByField(client, 'product_variants', 'id', expandedIds),
    selectRowsByField(client, 'product_variants', 'sku', expandedIds),
    selectRowsByField(client, 'product_variants', 'upc', expandedIds),
  ]);
  const productMatches = [
    ...productsById,
    ...productsBySlug,
    ...productsBySku,
    ...productsByUpc,
  ];
  const variantMatches = [
    ...variantsById,
    ...variantsBySku,
    ...variantsByUpc,
  ];
  const productIds = [
    ...new Set([
      ...productMatches.map((product: any) => product.id),
      ...variantMatches.map((variant: any) => variant.product_id),
    ]),
  ];

  if (productIds.length === 0) {
    return {
      rows: [],
      variantMatches,
    };
  }

  const { data, error } = await client
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'active')
    .in('id', productIds);

  if (error) {
    throw error;
  }

  return {
    rows: (data || []) as any[],
    variantMatches: variantMatches as any[],
  };
}

function getFoundLookupIds(params: {
  ids: string[];
  rows: any[];
  variantMatches: any[];
  baseUrl: string;
}) {
  const found = new Set<string>();

  for (const id of params.ids) {
    const expanded = expandIdentifierCandidates(id).map((candidate) => candidate.toLowerCase());
    const productFound = params.rows.some((product) => {
      const values = buildProductInputValues(product, params.baseUrl);
      return expanded.some((candidate) => values.has(candidate));
    });
    const variantFound = params.variantMatches.some((variant) => {
      const values = [variant.id, variant.sku, variant.upc]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return expanded.some((candidate) => values.includes(candidate));
    });

    if (productFound || variantFound) {
      found.add(id);
    }
  }

  return found;
}

export async function lookupCatalogProducts(body: unknown, request: Request) {
  const record = asRecord(body);
  const ids = normalizeLookupIds(record.ids);
  if (Array.isArray(record.ids) && record.ids.length > MAX_LOOKUP_IDS) {
    return {
      status: 400,
      body: buildProtocolError(
        'request_too_large',
        `Catalog lookup accepts at most ${MAX_LOOKUP_IDS} identifiers.`
      ),
    };
  }

  if (ids.length === 0) {
    return {
      status: 400,
      body: buildProtocolError('invalid_request', 'Catalog lookup requires ids[].'),
    };
  }

  const baseUrl = getOriginFromRequest(request);
  const client = getUcpSupabaseClient();
  const currencies = await fetchCurrencies(client);
  const currencyCode = resolveRequestedCurrency(body, currencies);
  const { rows, variantMatches } = await resolveProductRowsByIdentifiers(ids);
  const foundIds = getFoundLookupIds({ ids, rows, variantMatches, baseUrl });
  const requestedVariantIds = new Set(
    variantMatches
      .filter((variant) => ids.some((id) => expandIdentifierCandidates(id).includes(variant.id)))
      .map((variant) => variant.id)
  );
  const products = rows.map((product) =>
    productToUcpProduct(product, {
      baseUrl,
      currencyCode,
      currencies,
      mode: 'lookup',
      lookupInputs: ids,
      requestedVariantId:
        product.product_variants?.find((variant: any) =>
          requestedVariantIds.has(variant.id)
        )?.id ?? null,
    })
  );
  const messages = ids
    .filter((id) => !foundIds.has(id))
    .map((id) => ({
      type: 'info',
      code: 'not_found',
      content: id,
    }));

  return {
    status: 200,
    body: {
      ucp: buildUcpMetadata([UCP_CAPABILITIES.catalogLookup]),
      products,
      messages,
    },
  };
}

export async function getCatalogProduct(body: unknown, request: Request) {
  const record = asRecord(body);
  const id = asString(record.id ?? record.product_id ?? record.productId);
  if (!id) {
    return {
      status: 400,
      body: buildProtocolError('invalid_request', 'Catalog product lookup requires id.'),
    };
  }

  const baseUrl = getOriginFromRequest(request);
  const client = getUcpSupabaseClient();
  const currencies = await fetchCurrencies(client);
  const currencyCode = resolveRequestedCurrency(body, currencies);
  const { rows, variantMatches } = await resolveProductRowsByIdentifiers([id]);
  const product = rows[0];

  if (!product) {
    return {
      status: 200,
      body: buildUcpBusinessError({
        capability: UCP_CAPABILITIES.catalogLookup,
        code: 'not_found',
        content: `Product not found: ${id}`,
      }),
    };
  }

  const requestedVariantId =
    variantMatches.find((variant) =>
      expandIdentifierCandidates(id).includes(variant.id)
    )?.id ?? null;
  const selected = Array.isArray(record.selected)
    ? (record.selected as ProductMapOptions['selected'])
    : undefined;

  return {
    status: 200,
    body: {
      ucp: buildUcpMetadata([UCP_CAPABILITIES.catalogLookup]),
      product: productToUcpProduct(product, {
        baseUrl,
        currencyCode,
        currencies,
        mode: 'detail',
        lookupInputs: [id],
        requestedVariantId,
        selected,
      }),
    },
  };
}

function normalizeCartLineItems(body: unknown) {
  const items = asRecord(body).line_items ?? asRecord(body).items;
  return Array.isArray(items) ? items.map(asRecord) : [];
}

function normalizeQuantity(value: unknown) {
  return Math.max(1, Math.min(toInteger(value, 1), 999));
}

function getLineItemIdentity(lineItem: JsonRecord) {
  const item = asRecord(lineItem.item);
  return {
    requestedId:
      asString(item.id) ||
      asString(lineItem.product_id) ||
      asString(lineItem.productId) ||
      asString(lineItem.variant_id) ||
      asString(lineItem.variantId) ||
      asString(item.product_id) ||
      asString(item.variant_id) ||
      asString(lineItem.sku) ||
      asString(item.sku),
    variantId:
      asString(lineItem.variant_id) ||
      asString(lineItem.variantId) ||
      asString(item.variant_id),
    sku: asString(lineItem.sku) || asString(item.sku),
  };
}

function resolveCheckoutProvider(product: any) {
  if (product.payment_provider === 'stripe' || product.payment_provider === 'freemius') {
    return product.payment_provider;
  }

  return product.product_type === 'digital' || product.freemius_product_id
    ? 'freemius'
    : 'stripe';
}

function buildCheckoutCartItem(params: {
  product: any;
  variant: ProductVariant;
  price: ReturnType<typeof resolveEffectivePrice>;
  quantity: number;
  currencyCode: string;
  imageUrl?: string | null;
}): CartItem {
  const { product, variant, price } = params;
  const title =
    variant.label && variant.label !== product.title
      ? `${product.title} - ${variant.label}`
      : product.title;

  return {
    id: variant.id,
    product_id: product.id,
    title,
    slug: product.slug,
    sku: variant.sku || product.sku || variant.id,
    upc: variant.upc || product.upc || undefined,
    price: price.regularAmount,
    prices: { [params.currencyCode]: price.regularAmount },
    sale_price: price.saleAmount,
    sale_prices:
      price.saleAmount !== null ? { [params.currencyCode]: price.saleAmount } : {},
    is_taxable: product.is_taxable ?? true,
    product_type: product.product_type ?? undefined,
    payment_provider: resolveCheckoutProvider(product),
    provider: resolveCheckoutProvider(product),
    short_description: product.short_description || undefined,
    stock:
      product.product_type === 'digital'
        ? undefined
        : typeof variant.stock_quantity === 'number'
          ? variant.stock_quantity
          : typeof product.stock === 'number'
            ? product.stock
            : undefined,
    image_url: params.imageUrl || undefined,
    images: params.imageUrl ? [{ url: params.imageUrl, alt: title }] : [],
    freemius_product_id: product.freemius_product_id || undefined,
    freemius_plan_id: product.freemius_plan_id || undefined,
    trial_period_days: product.trial_period_days ?? 0,
    trial_requires_payment_method: product.trial_requires_payment_method ?? false,
    language_id: product.language_id,
    translation_group_id: product.translation_group_id || '',
    has_variants: Array.isArray(product.product_variants) && product.product_variants.length > 0,
    variant_id: variant.id,
    variant_label: variant.label,
    selected_options: variant.selected_options,
    quantity: params.quantity,
    currency_code: params.currencyCode,
  };
}

async function resolveCartProductForLineItem(lineItem: JsonRecord) {
  const identity = getLineItemIdentity(lineItem);
  if (!identity.requestedId) {
    return null;
  }

  const { rows, variantMatches } = await resolveProductRowsByIdentifiers([
    identity.variantId || identity.sku || identity.requestedId,
  ]);
  const product = rows[0];
  if (!product) {
    return null;
  }

  const languageCode = getLanguageCode(product);
  const { variants: mappedVariants } = mapRawVariantRelations(
    product.product_variants || [],
    languageCode
  );
  const variants =
    mappedVariants.length > 0 ? mappedVariants : [buildDefaultVariant(product, {
      baseUrl: '',
      currencyCode: 'USD',
      currencies: [],
    })];
  const variantMatch = variantMatches[0];
  const variant =
    (identity.variantId &&
      variants.find((candidate) => candidate.id === identity.variantId)) ||
    (identity.sku &&
      variants.find((candidate) => candidate.sku === identity.sku)) ||
    (variantMatch &&
      variants.find((candidate) => candidate.id === variantMatch.id)) ||
    variants.find((candidate) => candidate.stock_quantity > 0) ||
    variants[0];

  return { product, variant };
}

async function buildCartFromRequest(body: unknown): Promise<CartBuildResult> {
  const client = getUcpSupabaseClient();
  const currencies = await fetchCurrencies(client);
  const currencyCode = resolveRequestedCurrency(body, currencies);
  const locale = resolveRequestedLocale(body);
  const context = asRecord(asRecord(body).context);
  const signals = asRecord(asRecord(body).signals);
  const attribution = asRecord(asRecord(body).attribution);
  const buyer = asRecord(asRecord(body).buyer);
  const inputLineItems = normalizeCartLineItems(body);
  const lineItems: JsonRecord[] = [];
  const messages: JsonRecord[] = [];

  for (const inputLineItem of inputLineItems) {
    const resolved = await resolveCartProductForLineItem(inputLineItem);
    const requestedId = getLineItemIdentity(inputLineItem).requestedId;

    if (!resolved) {
      messages.push({
        type: 'error',
        code: 'not_found',
        content: requestedId
          ? `Product or variant not found: ${requestedId}`
          : 'Line item is missing item.id, product_id, variant_id, or sku.',
        severity: 'recoverable',
      });
      continue;
    }

    const quantity = normalizeQuantity(inputLineItem.quantity);
    const imageUrl =
      resolved.variant.image_url || (getProductImages(resolved.product)[0]?.url as string | undefined);
    const price = resolveEffectivePrice({
      price: resolved.variant.price ?? resolved.product.price ?? 0,
      prices: resolved.variant.prices ?? resolved.product.prices,
      salePrice: resolved.variant.sale_price ?? resolved.product.sale_price ?? null,
      salePrices: resolved.variant.sale_prices ?? resolved.product.sale_prices,
      saleStartAt: resolved.variant.sale_start_at ?? resolved.product.sale_start_at,
      saleEndAt: resolved.variant.sale_end_at ?? resolved.product.sale_end_at,
      scheduledPrice: resolved.variant.scheduled_price ?? resolved.product.scheduled_price,
      scheduledPrices: resolved.variant.scheduled_prices ?? resolved.product.scheduled_prices,
      scheduledPriceAt: resolved.variant.scheduled_price_at ?? resolved.product.scheduled_price_at,
      currencyCode,
      currencies,
    });
    const subtotal = price.amount * quantity;
    const title =
      resolved.variant.label && resolved.variant.label !== resolved.product.title
        ? `${resolved.product.title} - ${resolved.variant.label}`
        : resolved.product.title;
    const cartItem = buildCheckoutCartItem({
      product: resolved.product,
      variant: resolved.variant,
      price,
      quantity,
      currencyCode,
      imageUrl,
    });

    lineItems.push({
      id: asString(inputLineItem.id) || `li_${crypto.randomUUID()}`,
      item: {
        id: resolved.variant.id,
        product_id: resolved.product.id,
        variant_id:
          resolved.variant.id !== resolved.product.id ? resolved.variant.id : undefined,
        handle: resolved.product.slug,
        sku: resolved.variant.sku || resolved.product.sku,
        title,
        description: {
          plain: stripHtmlToText(resolved.product.short_description || title),
        },
        url: buildProductUrl(process.env.NEXT_PUBLIC_URL || '', resolved.product),
        price: price.amount,
        price_object: { amount: price.amount, currency: price.currency },
        image: imageUrl || undefined,
      },
      quantity,
      totals: [
        { type: 'subtotal', amount: subtotal, currency: price.currency },
        { type: 'total', amount: subtotal, currency: price.currency },
      ],
      cart_item: cartItem,
    });
  }

  const subtotal = lineItems.reduce((sum, lineItem) => {
    const totals = Array.isArray(lineItem.totals) ? lineItem.totals : [];
    const subtotalLine = totals.find((total: any) => total?.type === 'subtotal');
    return sum + (typeof subtotalLine?.amount === 'number' ? subtotalLine.amount : 0);
  }, 0);

  return {
    currencyCode,
    locale,
    context,
    signals,
    attribution,
    buyer,
    lineItems,
    totals: [
      { type: 'subtotal', amount: subtotal, currency: currencyCode },
      {
        type: 'total',
        amount: subtotal,
        currency: currencyCode,
        display_text: 'Estimated total. Taxes, shipping, and discounts are finalized at checkout.',
      },
    ],
    messages,
  };
}

function buildCartContinueUrl(baseUrl: string, cartId: string) {
  return `${baseUrl.replace(/\/+$/, '')}/checkout?ucp_cart=${encodeURIComponent(cartId)}`;
}

function rowToUcpCart(row: any, baseUrl: string) {
  return {
    ucp: buildUcpMetadata([UCP_CAPABILITIES.cart]),
    id: row.id,
    line_items: row.line_items || [],
    context: row.context || {},
    signals: row.signals || {},
    attribution: row.attribution || {},
    buyer: row.buyer_identity || {},
    currency: row.currency,
    totals: row.totals || [],
    messages: [],
    links: [
      {
        type: 'self',
        url: `${baseUrl.replace(/\/+$/, '')}${UCP_REST_BASE_PATH}/carts/${row.id}`,
      },
    ],
    continue_url: row.checkout_url || buildCartContinueUrl(baseUrl, row.id),
    expires_at: row.expires_at,
  };
}

export async function createUcpCart(body: unknown, request: Request) {
  const baseUrl = getOriginFromRequest(request);
  const cart = await buildCartFromRequest(body);

  if (cart.lineItems.length === 0) {
    return {
      status: 200,
      body: {
        ucp: buildUcpMetadata([UCP_CAPABILITIES.cart], 'error'),
        messages:
          cart.messages.length > 0
            ? cart.messages
            : [
                {
                  type: 'error',
                  code: 'empty_cart',
                  content: 'At least one valid line item is required to create a cart.',
                  severity: 'unrecoverable',
                },
              ],
        continue_url: baseUrl,
      },
    };
  }

  const client = getUcpSupabaseClient();
  const { data, error } = await client
    .from('ucp_cart_sessions')
    .insert({
      status: 'active',
      currency: cart.currencyCode,
      locale: cart.locale,
      buyer_identity: cart.buyer,
      context: cart.context,
      signals: cart.signals,
      attribution: cart.attribution,
      line_items: cart.lineItems,
      totals: cart.totals,
      checkout_url: null,
      metadata: {
        source: 'ucp',
        version: UCP_VERSION,
      },
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const checkoutUrl = buildCartContinueUrl(baseUrl, data.id);
  const { data: updatedRow, error: updateError } = await client
    .from('ucp_cart_sessions')
    .update({ checkout_url: checkoutUrl })
    .eq('id', data.id)
    .select('*')
    .single();

  if (updateError) {
    throw updateError;
  }

  return {
    status: 201,
    body: {
      ...rowToUcpCart(updatedRow, baseUrl),
      messages: cart.messages,
    },
  };
}

async function fetchActiveCartRow(id: string) {
  const client = getUcpSupabaseClient();
  const { data, error } = await client
    .from('ucp_cart_sessions')
    .select('*')
    .eq('id', id)
    .neq('status', 'cancelled')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUcpCart(id: string, request: Request) {
  const baseUrl = getOriginFromRequest(request);
  const row = await fetchActiveCartRow(id);

  if (!row) {
    return {
      status: 200,
      body: buildUcpBusinessError({
        capability: UCP_CAPABILITIES.cart,
        code: 'not_found',
        content: 'Cart not found or has expired',
        continueUrl: baseUrl,
      }),
    };
  }

  return {
    status: 200,
    body: rowToUcpCart(row, baseUrl),
  };
}

export async function updateUcpCart(id: string, body: unknown, request: Request) {
  const baseUrl = getOriginFromRequest(request);
  const existing = await fetchActiveCartRow(id);

  if (!existing) {
    return {
      status: 200,
      body: buildUcpBusinessError({
        capability: UCP_CAPABILITIES.cart,
        code: 'not_found',
        content: 'Cart not found or has expired',
        continueUrl: baseUrl,
      }),
    };
  }

  const cart = await buildCartFromRequest(body);
  if (cart.lineItems.length === 0) {
    return {
      status: 200,
      body: {
        ucp: buildUcpMetadata([UCP_CAPABILITIES.cart], 'error'),
        messages:
          cart.messages.length > 0
            ? cart.messages
            : [
                {
                  type: 'error',
                  code: 'empty_cart',
                  content: 'A full cart replacement must include at least one valid line item.',
                  severity: 'unrecoverable',
                },
              ],
        continue_url: existing.checkout_url || buildCartContinueUrl(baseUrl, existing.id),
      },
    };
  }

  const client = getUcpSupabaseClient();
  const { data, error } = await client
    .from('ucp_cart_sessions')
    .update({
      currency: cart.currencyCode,
      locale: cart.locale,
      buyer_identity: cart.buyer,
      context: cart.context,
      signals: cart.signals,
      attribution: cart.attribution,
      line_items: cart.lineItems,
      totals: cart.totals,
      checkout_url: existing.checkout_url || buildCartContinueUrl(baseUrl, existing.id),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return {
    status: 200,
    body: {
      ...rowToUcpCart(data, baseUrl),
      messages: cart.messages,
    },
  };
}

export async function cancelUcpCart(id: string, request: Request) {
  const baseUrl = getOriginFromRequest(request);
  const existing = await fetchActiveCartRow(id);

  if (!existing) {
    return {
      status: 200,
      body: buildUcpBusinessError({
        capability: UCP_CAPABILITIES.cart,
        code: 'not_found',
        content: 'Cart not found or has expired',
        continueUrl: baseUrl,
      }),
    };
  }

  const client = getUcpSupabaseClient();
  const { data, error } = await client
    .from('ucp_cart_sessions')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return {
    status: 200,
    body: rowToUcpCart(data, baseUrl),
  };
}

export async function getUcpCartCheckoutItems(cartId: string | null | undefined) {
  if (!cartId) {
    return [];
  }

  try {
    const row = await fetchActiveCartRow(cartId);
    const lineItems = Array.isArray(row?.line_items) ? row.line_items : [];

    return lineItems
      .map((lineItem: any) => lineItem?.cart_item)
      .filter(Boolean) as CartItem[];
  } catch {
    return [];
  }
}
