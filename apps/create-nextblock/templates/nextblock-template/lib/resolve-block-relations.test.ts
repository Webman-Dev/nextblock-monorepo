import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@nextblock-cms/db/server', () => ({
  getSsgSupabaseClient: vi.fn(),
}));

import type { CustomBlockField } from '@nextblock-cms/utils';
import { resolveBlockRelations } from './resolve-block-relations';

class MockSupabaseQuery {
  operations: Array<{ args: unknown[]; op: string }> = [];

  constructor(private readonly rows: Array<Record<string, unknown>>) {}

  select(...args: unknown[]) {
    this.operations.push({ args, op: 'select' });
    return this;
  }

  limit(...args: unknown[]) {
    this.operations.push({ args, op: 'limit' });
    return this;
  }

  eq(...args: unknown[]) {
    this.operations.push({ args, op: 'eq' });
    return this;
  }

  in(...args: unknown[]) {
    this.operations.push({ args, op: 'in' });
    return this;
  }

  order(...args: unknown[]) {
    this.operations.push({ args, op: 'order' });
    return this;
  }

  then(resolve: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown) {
    return Promise.resolve({ data: this.rows, error: null }).then(resolve);
  }
}

const relationFields: CustomBlockField[] = [
  {
    display_column: 'title',
    key: 'featured_page',
    label: 'Featured Page',
    multiple: false,
    required: false,
    table: 'pages',
    type: 'db_relation',
    value_column: 'id',
  },
  {
    display_column: 'title',
    key: 'featured_products',
    label: 'Featured Products',
    multiple: true,
    required: false,
    table: 'products',
    type: 'db_relation',
    value_column: 'id',
  },
];

describe('resolveBlockRelations', () => {
  it('hydrates single and multi-value relation fields without replacing raw IDs', async () => {
    const pageQuery = new MockSupabaseQuery([
      { id: 1, slug: 'home', status: 'published', title: 'Home' },
    ]);
    const productQuery = new MockSupabaseQuery([
      { id: 'prod-1', sku: 'SKU-1', status: 'active', title: 'Starter' },
      { id: 'prod-2', sku: 'SKU-2', status: 'active', title: 'Pro' },
    ]);
    const from = vi.fn((table: string) => (table === 'pages' ? pageQuery : productQuery));

    const hydrated = await resolveBlockRelations(
      [
        {
          data: {
            featured_page: '1',
            featured_products: ['prod-1', 'prod-2'],
          },
          fields: relationFields,
          id: 'block-1',
        },
      ],
      { supabase: { from } as any }
    );

    expect(from).toHaveBeenCalledTimes(2);
    expect(pageQuery.operations).toContainEqual({ args: ['id', [1]], op: 'in' });
    expect(productQuery.operations).toContainEqual({
      args: ['id', ['prod-1', 'prod-2']],
      op: 'in',
    });
    expect(hydrated[0].data).toEqual({
      featured_page: '1',
      featured_products: ['prod-1', 'prod-2'],
    });
    expect(hydrated[0].resolved_relations?.featured_page).toMatchObject({
      record: { id: 1, title: 'Home' },
      table: 'pages',
      value: '1',
    });
    expect(hydrated[0].resolved_relations?.featured_products).toMatchObject([
      { record: { id: 'prod-1', title: 'Starter' }, table: 'products', value: 'prod-1' },
      { record: { id: 'prod-2', title: 'Pro' }, table: 'products', value: 'prod-2' },
    ]);
  });

  it('fails softly for invalid relation tables', async () => {
    const hydrated = await resolveBlockRelations(
      {
        data: { customer: 'user-1' },
        fields: [
          {
            display_column: 'full_name',
            key: 'customer',
            label: 'Customer',
            multiple: false,
            required: false,
            table: 'unknown_table',
            type: 'db_relation',
            value_column: 'id',
          },
        ],
      },
      { supabase: { from: vi.fn() } as any }
    );

    expect(hydrated.resolved_relations?.customer).toEqual({
      error: 'Relation table is not available.',
      record: null,
      table: 'unknown_table',
      value: 'user-1',
    });
  });
});
