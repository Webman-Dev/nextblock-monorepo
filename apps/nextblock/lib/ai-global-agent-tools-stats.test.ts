import { describe, expect, it, vi } from 'vitest';
import { executeFetchEcommerceStats } from './ai-global-agent-tools';

describe('fetch_ecommerce_stats tool executor', () => {
  it('fetches ecommerce stats and aggregates revenue by product', async () => {
    const mockData = [
      {
        quantity: 2,
        price_at_purchase: 5000,
        products: { id: 'p1', title: 'Digital Art', product_type: 'digital' },
        orders: { id: 'o1', status: 'paid', paid_at: '2026-04-15T10:00:00Z', currency: 'USD' }
      },
      {
        quantity: 1,
        price_at_purchase: 3000,
        products: { id: 'p2', title: 'Physical Tee', product_type: 'physical' },
        orders: { id: 'o2', status: 'paid', paid_at: '2026-04-16T10:00:00Z', currency: 'USD' }
      }
    ];

    const supabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      then: (cb: any) => cb({ data: mockData, error: null })
    };

    const result = await executeFetchEcommerceStats(
      {
        query: 'Which product generated most revenue?',
        reportType: 'revenue',
        timeRange: 'this_month',
      },
      { supabase: supabase as any }
    );

    expect(result.success).toBe(true);
    expect(result.report.totalOrders).toBe(2);
    expect(result.report.totalRevenue).toBe(130); // (2*50) + (1*30)
    expect(result.report.topProducts).toHaveLength(2);
    expect(result.report.topProducts[0].title).toBe('Digital Art');
    expect(result.report.topProducts[0].revenue).toBe(100);
    expect(result.report.topProducts[1].title).toBe('Physical Tee');
    expect(result.report.topProducts[1].revenue).toBe(30);
  });

  it('handles errors from supabase', async () => {
    const supabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      then: (cb: any) => cb({ data: null, error: { message: 'Database error' } })
    };

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
