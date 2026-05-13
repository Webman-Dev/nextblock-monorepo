import { describe, expect, it, vi } from 'vitest';
import { executeFetchEcommerceStats } from './ai-global-agent-tools';

type MockRow = Record<string, any>;
type MockDatabase = Record<string, MockRow[]>;

class MockQuery {
  private equalsFilters: Array<{ column: string; value: unknown }> = [];
  private gteFilters: Array<{ column: string; value: string }> = [];
  private lteFilters: Array<{ column: string; value: string }> = [];

  constructor(
    private readonly database: MockDatabase,
    private readonly table: string,
    private readonly errors: Record<string, unknown> = {}
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.equalsFilters.push({ column, value });
    return this;
  }

  gte(column: string, value: string) {
    this.gteFilters.push({ column, value });
    return this;
  }

  lte(column: string, value: string) {
    this.lteFilters.push({ column, value });
    return this;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private getValue(row: MockRow, column: string) {
    return column.split('.').reduce((value: any, key) => {
      const target = Array.isArray(value) ? value[0] : value;
      return target?.[key];
    }, row);
  }

  private matches(row: MockRow) {
    return (
      this.equalsFilters.every((filter) => this.getValue(row, filter.column) === filter.value) &&
      this.gteFilters.every((filter) => String(this.getValue(row, filter.column)) >= filter.value) &&
      this.lteFilters.every((filter) => String(this.getValue(row, filter.column)) <= filter.value)
    );
  }

  private async execute() {
    const error = this.errors[this.table];

    if (error) {
      return { data: null, error };
    }

    return {
      data: (this.database[this.table] || []).filter((row) => this.matches(row)),
      error: null,
    };
  }
}

function createMockSupabase(database: MockDatabase, errors: Record<string, unknown> = {}) {
  return {
    from: vi.fn((table: string) => new MockQuery(database, table, errors)),
  };
}

describe('fetch_ecommerce_stats tool executor', () => {
  it('fetches ecommerce stats and aggregates revenue by product', async () => {
    const supabase = createMockSupabase({
      order_items: [
        {
          quantity: 2,
          price_at_purchase: 5000,
          products: { id: 'p1', title: 'Digital Art', product_type: 'digital' },
          orders: {
            id: 'o1',
            status: 'paid',
            paid_at: '2026-04-15T10:00:00Z',
            currency: 'USD',
          },
        },
        {
          quantity: 1,
          price_at_purchase: 3000,
          products: { id: 'p2', title: 'Physical Tee', product_type: 'physical' },
          orders: {
            id: 'o2',
            status: 'paid',
            paid_at: '2026-04-16T10:00:00Z',
            currency: 'USD',
          },
        },
      ],
      orders: [
        { id: 'o1', status: 'paid', created_at: '2026-04-15T10:00:00Z', currency: 'USD' },
        { id: 'o2', status: 'paid', created_at: '2026-04-16T10:00:00Z', currency: 'USD' },
      ],
    });

    const result = await executeFetchEcommerceStats(
      {
        query: 'Which product generated most revenue?',
        reportType: 'revenue',
        timeRange: 'all_time',
      },
      { supabase: supabase as any }
    );

    expect(result.success).toBe(true);
    expect(result.report.totalOrders).toBe(2);
    expect(result.report.paidOrderCount).toBe(2);
    expect(result.report.totalRevenue).toBe(130);
    expect(result.report.revenueByCurrency).toEqual({ USD: 130 });
    expect(result.report.topProducts).toHaveLength(2);
    expect(result.report.topProducts[0].title).toBe('Digital Art');
    expect(result.report.topProducts[0].revenue).toBe(100);
    expect(result.report.topProducts[1].title).toBe('Physical Tee');
    expect(result.report.topProducts[1].revenue).toBe(30);
  });

  it('counts trial and pending orders directly from order statuses', async () => {
    const supabase = createMockSupabase({
      order_items: [],
      orders: [
        { id: 'o1', status: 'trial', created_at: '2026-04-15T10:00:00Z', currency: 'USD' },
        { id: 'o2', status: 'Pending', created_at: '2026-04-16T10:00:00Z', currency: 'CAD' },
      ],
    });

    const trialResult = await executeFetchEcommerceStats(
      {
        query: 'How many orders are trials?',
        reportType: 'orders',
      },
      { supabase: supabase as any }
    );

    expect(trialResult.report.timeRange).toBe('all_time');
    expect(trialResult.report.currencyFiltered).toBe(false);
    expect(trialResult.report.totalOrders).toBe(2);
    expect(trialResult.report.orderStatusCounts.trial).toBe(1);
    expect(trialResult.report.orderStatusCounts.pending).toBe(1);
    expect(trialResult.report.matchingOrderStatus).toEqual({
      allTimeCount: 1,
      count: 1,
      status: 'trial',
      timeRange: 'all_time',
    });

    const pendingResult = await executeFetchEcommerceStats(
      {
        query: 'How many orders are pending?',
        reportType: 'orders',
      },
      { supabase: supabase as any }
    );

    expect(pendingResult.report.matchingOrderStatus).toEqual({
      allTimeCount: 1,
      count: 1,
      status: 'pending',
      timeRange: 'all_time',
    });
  });

  it('includes all-time status counts for scoped status questions', async () => {
    const supabase = createMockSupabase({
      order_items: [],
      orders: [
        { id: 'o1', status: 'trial', created_at: '2026-04-15T10:00:00Z', currency: 'USD' },
        { id: 'o2', status: 'pending', created_at: '2026-05-07T10:00:00Z', currency: 'USD' },
      ],
    });

    const result = await executeFetchEcommerceStats(
      {
        query: 'How many trial orders are there in the last 7 days?',
        reportType: 'orders',
        timeRange: 'last_7_days',
      },
      { supabase: supabase as any }
    );

    expect(result.report.orderStatusCounts.trial).toBe(0);
    expect(result.report.allTimeOrderStatusCounts.trial).toBe(1);
    expect(result.report.matchingOrderStatus).toEqual({
      allTimeCount: 1,
      count: 0,
      status: 'trial',
      timeRange: 'last_7_days',
    });
  });

  it('handles errors from supabase', async () => {
    const supabase = createMockSupabase(
      { order_items: [], orders: [] },
      { orders: { message: 'Database error' } }
    );

    await expect(
      executeFetchEcommerceStats(
        {
          query: 'Show me revenue',
          reportType: 'revenue',
          timeRange: 'last_30_days',
        },
        { supabase: supabase as any }
      )
    ).rejects.toThrow('Failed to fetch ecommerce stats: Database error');
  });
});
