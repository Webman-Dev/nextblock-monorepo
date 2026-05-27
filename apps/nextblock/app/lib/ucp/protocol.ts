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

type JsonRecord = Record<string, unknown>;
type UcpCapabilityName = (typeof UCP_CAPABILITIES)[keyof typeof UCP_CAPABILITIES];

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

export function normalizeUcpPagination(body: unknown) {
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
