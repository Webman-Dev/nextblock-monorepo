import { describe, expect, it } from 'vitest';
import {
  UCP_REST_BASE_PATH,
  UCP_VERSION,
  buildPaginationResponse,
  buildUcpProfile,
  normalizeUcpPagination,
} from './protocol';

describe('UCP server helpers', () => {
  it('advertises the REST shopping service and catalog/cart capabilities', () => {
    const profile = buildUcpProfile('https://example.com/');

    expect(profile.ucp.version).toBe(UCP_VERSION);
    expect(profile.ucp.services['dev.ucp.shopping'][0].endpoint).toBe(
      `https://example.com${UCP_REST_BASE_PATH}`
    );
    expect(profile.ucp.capabilities['dev.ucp.shopping.catalog.search'][0].schema).toContain(
      'catalog_search.json'
    );
    expect(profile.ucp.capabilities['dev.ucp.shopping.catalog.lookup'][0].schema).toContain(
      'catalog_lookup.json'
    );
    expect(profile.ucp.capabilities['dev.ucp.shopping.cart'][0].schema).toContain(
      'cart.json'
    );
  });

  it('normalizes pagination limits and offsets', () => {
    expect(
      normalizeUcpPagination({
        pagination: {
          limit: 500,
          offset: 12,
        },
      })
    ).toEqual({ limit: 50, offset: 12 });

    expect(normalizeUcpPagination({ pagination: { limit: 0 } })).toEqual({
      limit: 1,
      offset: 0,
    });
  });

  it('returns an opaque cursor when another page exists', () => {
    const pagination = buildPaginationResponse({
      limit: 10,
      offset: 0,
      count: 10,
      totalCount: 11,
    });

    expect(pagination.has_next_page).toBe(true);
    expect(pagination.cursor).toEqual(expect.any(String));
  });
});
