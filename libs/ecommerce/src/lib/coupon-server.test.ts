import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@nextblock-cms/db/server', () => ({
  createClient: () => ({}),
  getServiceRoleSupabaseClient: () => ({}),
}));

vi.mock('@nextblock-cms/utils', () => ({
  formatPrice: (amount: number, currencyCode?: string | null) =>
    `${currencyCode || 'USD'} ${amount}`,
  getCurrencyMinorUnitFactor: () => 100,
  majorUnitAmountToMinor: (amount: number) => Math.round(amount * 100),
  minorUnitAmountToMajor: (amount: number) => amount / 100,
  normalizeCurrencyCode: (code?: string | null) => (code || 'USD').trim().toUpperCase(),
}));

vi.mock('server-only', () => ({}));

import { getCouponQuote } from './coupon-server';
import { syncCouponToFreemius } from './freemius-coupons';
import { normalizeCouponCode } from './coupons';

type TableRows = Record<string, any[]>;

class MockQuery {
  private filters: Array<(row: any) => boolean> = [];
  private pendingUpdate: Record<string, unknown> | null = null;

  constructor(
    private readonly rows: TableRows,
    private readonly table: string
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  ilike(column: string, value: string) {
    const normalized = String(value).toLowerCase();
    this.filters.push((row) => String(row[column] || '').toLowerCase() === normalized);
    return this;
  }

  in(column: string, values: unknown[]) {
    const allowed = new Set(values);
    this.filters.push((row) => allowed.has(row[column]));
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === 'is' && value === null) {
      this.filters.push((row) => row[column] !== null && row[column] !== undefined);
    }
    return this;
  }

  order() {
    return this;
  }

  insert(value: Record<string, unknown> | Record<string, unknown>[]) {
    const rows = Array.isArray(value) ? value : [value];
    this.rows[this.table].push(...rows);
    return Promise.resolve({ data: rows, error: null });
  }

  update(value: Record<string, unknown>) {
    this.pendingUpdate = value;
    return this;
  }

  upsert(value: Record<string, unknown>) {
    const tableRows = this.rows[this.table];
    const existingIndex =
      typeof value.id === 'string'
        ? tableRows.findIndex((row) => row.id === value.id)
        : tableRows.findIndex(
            (row) =>
              row.coupon_id === value.coupon_id &&
              row.freemius_product_id === value.freemius_product_id
          );

    if (existingIndex >= 0) {
      tableRows[existingIndex] = { ...tableRows[existingIndex], ...value };
    } else {
      tableRows.push({
        id: `${this.table}_${tableRows.length + 1}`,
        ...value,
      });
    }

    return Promise.resolve({ data: value, error: null });
  }

  maybeSingle() {
    return Promise.resolve({ data: this.applyFilters()[0] ?? null, error: null });
  }

  single() {
    return Promise.resolve({ data: this.applyFilters()[0] ?? null, error: null });
  }

  then(resolve: (value: { data: any[]; error: null }) => void) {
    if (this.pendingUpdate) {
      for (const row of this.applyFilters()) {
        Object.assign(row, this.pendingUpdate);
      }
    }

    return Promise.resolve(resolve({ data: this.applyFilters(), error: null }));
  }

  private applyFilters() {
    return (this.rows[this.table] || []).filter((row) =>
      this.filters.every((filter) => filter(row))
    );
  }
}

function createMockClient(overrides: Partial<TableRows> = {}) {
  const rows: TableRows = {
    currencies: [
      {
        code: 'USD',
        symbol: '$',
        exchange_rate: 1,
        is_default: true,
        is_active: true,
      },
    ],
    coupons: [],
    coupon_products: [],
    coupon_freemius_mappings: [],
    coupon_redemptions: [],
    products: [
      {
        id: 'stripe-product',
        title: 'Theme Kit',
        price: 10000,
        prices: { USD: 10000 },
        sale_price: null,
        sale_prices: {},
        product_type: 'physical',
        payment_provider: 'stripe',
        freemius_product_id: null,
        freemius_plan_id: null,
      },
      {
        id: 'freemius-product',
        title: 'Plugin Pro',
        price: 20000,
        prices: { USD: 20000 },
        sale_price: null,
        sale_prices: {},
        product_type: 'digital',
        payment_provider: 'freemius',
        freemius_product_id: '1234',
        freemius_plan_id: '5678',
      },
    ],
    product_variants: [],
    ...overrides,
  };

  return {
    rows,
    client: {
      from(table: string) {
        if (!rows[table]) {
          rows[table] = [];
        }
        return new MockQuery(rows, table);
      },
    },
  };
}

const mixedCart = [
  {
    id: 'stripe-product',
    product_id: 'stripe-product',
    title: 'Theme Kit',
    slug: 'theme-kit',
    sku: 'THEME',
    price: 10000,
    quantity: 2,
    language_id: 1,
    translation_group_id: 'stripe-product',
  },
  {
    id: 'freemius-product',
    product_id: 'freemius-product',
    title: 'Plugin Pro',
    slug: 'plugin-pro',
    sku: 'PLUGIN',
    price: 20000,
    quantity: 1,
    language_id: 1,
    translation_group_id: 'freemius-product',
  },
] as any[];

function coupon(overrides: Record<string, unknown>) {
  return {
    id: 'coupon-1',
    code: 'SAVE10',
    name: 'Save 10',
    provider_scope: 'all',
    discount_type: 'percent',
    discount_amount: 10,
    is_active: true,
    starts_at: null,
    ends_at: null,
    redemption_limit: null,
    redemptions_count: 0,
    ...overrides,
  };
}

describe('commerce coupon validation', () => {
  it('normalizes shopper-entered coupon codes', () => {
    expect(normalizeCouponCode(' save 10 ')).toBe('SAVE10');
    expect(normalizeCouponCode('Spring Sale')).toBe('SPRINGSALE');
  });

  it('rejects inactive, future, expired, and exhausted coupons', async () => {
    const cases = [
      [coupon({ is_active: false }), 'ecommerce.coupon_inactive'],
      [coupon({ starts_at: '2999-01-01T00:00:00.000Z' }), 'ecommerce.coupon_not_started'],
      [coupon({ ends_at: '2000-01-01T00:00:00.000Z' }), 'ecommerce.coupon_expired'],
      [
        coupon({ redemption_limit: 5, redemptions_count: 5 }),
        'ecommerce.coupon_limit_reached',
      ],
    ];

    for (const [row, errorKey] of cases) {
      const { client } = createMockClient({ coupons: [row] });
      const result = await getCouponQuote({
        client: client as any,
        code: 'SAVE10',
        items: mixedCart,
        currencyCode: 'USD',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorKey).toBe(errorKey);
      }
    }
  });

  it('calculates percent discounts across mixed providers', async () => {
    const { client } = createMockClient({ coupons: [coupon({})] });
    const result = await getCouponQuote({
      client: client as any,
      code: 'save10',
      items: mixedCart,
      currencyCode: 'USD',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.quote.eligibleSubtotal).toBe(40000);
      expect(result.quote.discountTotal).toBe(4000);
      expect(result.quote.providerDiscounts).toEqual({
        stripe: 2000,
        freemius: 2000,
      });
    }
  });

  it('honors provider and product scopes', async () => {
    const { client } = createMockClient({
      coupons: [coupon({ provider_scope: 'all', discount_amount: 25 })],
      coupon_products: [{ coupon_id: 'coupon-1', product_id: 'stripe-product' }],
    });
    const result = await getCouponQuote({
      client: client as any,
      code: 'SAVE10',
      items: mixedCart,
      currencyCode: 'USD',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.quote.eligibleSubtotal).toBe(20000);
      expect(result.quote.discountTotal).toBe(5000);
      expect(result.quote.providerDiscounts).toEqual({
        stripe: 5000,
        freemius: 0,
      });
    }
  });

  it('allocates fixed discounts proportionally across eligible lines', async () => {
    const { client } = createMockClient({
      coupons: [coupon({ discount_type: 'fixed', discount_amount: 5000 })],
    });
    const result = await getCouponQuote({
      client: client as any,
      code: 'SAVE10',
      items: mixedCart,
      currencyCode: 'USD',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.quote.discountTotal).toBe(5000);
      expect(result.quote.providerDiscounts).toEqual({
        stripe: 2500,
        freemius: 2500,
      });
    }
  });
});

describe('Freemius coupon sync', () => {
  beforeEach(() => {
    process.env.FREEMIUS_API_KEY = 'test-token';
    vi.restoreAllMocks();
  });

  it('creates Freemius coupons with product-scoped payloads and stores mappings', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ coupon: { id: 'remote-coupon-1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { client, rows } = createMockClient({
      coupons: [coupon({ provider_scope: 'freemius', discount_amount: 15 })],
    });

    const result = await syncCouponToFreemius({
      client: client as any,
      couponId: 'coupon-1',
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.freemius.com/v1/products/1234/coupons.json',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
        body: expect.stringContaining('"discount_type":"percentage"'),
      })
    );
    expect(rows.coupon_freemius_mappings[0]).toMatchObject({
      coupon_id: 'coupon-1',
      freemius_product_id: '1234',
      freemius_coupon_id: 'remote-coupon-1',
      sync_status: 'synced',
    });
    expect(rows.coupons[0].freemius_sync_status).toBe('synced');
  });

  it('captures Freemius sync errors without throwing away local coupon changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Invalid coupon payload' }),
      })
    );
    const { client, rows } = createMockClient({
      coupons: [coupon({ provider_scope: 'freemius' })],
    });

    const result = await syncCouponToFreemius({
      client: client as any,
      couponId: 'coupon-1',
    });

    expect(result.success).toBe(true);
    expect(rows.coupon_freemius_mappings[0]).toMatchObject({
      sync_status: 'failed',
      sync_error: 'Invalid coupon payload',
    });
    expect(rows.coupons[0].freemius_sync_status).toBe('failed');
  });

  it('converts fixed minor-unit coupons to major amounts for Freemius payloads', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ coupon: { id: 'remote-coupon-2' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { client } = createMockClient({
      coupons: [
        coupon({
          provider_scope: 'freemius',
          discount_type: 'fixed',
          discount_amount: 1000,
        }),
      ],
    });

    await syncCouponToFreemius({
      client: client as any,
      couponId: 'coupon-1',
    });

    const request = fetchMock.mock.calls[0]?.[1] as { body?: string };
    expect(JSON.parse(request.body || '{}')).toMatchObject({
      discount: 10,
      discount_type: 'dollar',
    });
  });
});
