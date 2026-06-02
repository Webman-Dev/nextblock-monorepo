import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getCustomBlockRelationTarget,
  listCustomBlockRelationTargets,
} from './custom-block-relation-registry';
import { searchCustomBlockRelationRows } from './custom-block-relations';

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

  or(...args: unknown[]) {
    this.operations.push({ args, op: 'or' });
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

describe('custom block relation registry and search', () => {
  it('exposes a curated allowlist of relation targets', () => {
    expect(listCustomBlockRelationTargets().map((target) => target.table)).toEqual([
      'pages',
      'posts',
      'products',
      'product_variants',
      'media',
      'categories',
      'profiles',
      'languages',
    ]);
    expect(getCustomBlockRelationTarget('orders')).toBeUndefined();
  });

  it('rejects tables outside the allowlist', async () => {
    const result = await searchCustomBlockRelationRows({} as any, {
      table: 'orders',
    });

    expect(result).toEqual({
      error: 'Relation table "orders" is not available.',
      status: 400,
    });
  });

  it('searches allowed tables with capped limits and active filters', async () => {
    const query = new MockSupabaseQuery([
      {
        id: 1,
        slug: 'home',
        status: 'published',
        title: 'Home',
      },
    ]);
    const from = vi.fn(() => query);

    const result = await searchCustomBlockRelationRows({ from } as any, {
      limit: '500',
      query: 'home',
      table: 'pages',
    });

    expect(from).toHaveBeenCalledWith('pages');
    expect(query.operations).toContainEqual({ args: [50], op: 'limit' });
    expect(query.operations).toContainEqual({ args: ['status', 'published'], op: 'eq' });
    expect(query.operations.some((operation) => operation.op === 'or')).toBe(true);
    expect(result).toMatchObject({
      items: [
        {
          description: 'home - published',
          label: 'Home',
          table: 'pages',
          value: '1',
        },
      ],
    });
  });

  it('fetches requested values with normalized numeric IDs', async () => {
    const query = new MockSupabaseQuery([
      {
        code: 'en',
        id: 1,
        is_active: true,
        name: 'English',
      },
    ]);
    const result = await searchCustomBlockRelationRows({ from: () => query } as any, {
      table: 'languages',
      values: ['1', 'not-a-number'],
    });

    expect(query.operations).toContainEqual({ args: ['id', [1]], op: 'in' });
    expect(result).toMatchObject({
      items: [
        {
          description: 'en',
          label: 'English',
          value: '1',
        },
      ],
    });
  });

  it('maps products product_media joins to a flat virtual images list and default image', async () => {
    const query = new MockSupabaseQuery([
      {
        id: 'p-1',
        title: 'Wireless Headphones',
        short_description: 'Premium headphones',
        product_media: [
          {
            media: {
              id: 'm-1',
              object_key: 'headphone-image.png',
              file_name: 'headphones.png',
              file_type: 'image/png',
            },
          },
        ],
      },
    ]);
    const result = await searchCustomBlockRelationRows({ from: () => query } as any, {
      table: 'products',
      values: ['p-1'],
    });

    expect(result).toMatchObject({
      items: [
        {
          label: 'Wireless Headphones',
          value: 'p-1',
          record: {
            images: [
              {
                id: 'm-1',
                object_key: 'headphone-image.png',
                file_name: 'headphones.png',
                file_type: 'image/png',
              },
            ],
            image: {
              id: 'm-1',
              object_key: 'headphone-image.png',
            },
            object_key: 'headphone-image.png',
            main_image: 'headphone-image.png',
          },
        },
      ],
    });
  });

  it('maps product_variants parent products (as object or array) to a friendly label', async () => {
    const query = new MockSupabaseQuery([
      {
        id: 'v-1',
        sku: 'NB-SIGNAL-CAP-L',
        price: 2600,
        products: {
          id: 'p-1',
          title: 'Signal Cap',
        },
      },
      {
        id: 'v-2',
        sku: 'NB-STUDIO-TEE-M',
        price: 3200,
        products: [
          {
            id: 'p-2',
            title: 'Studio Tee',
          },
        ],
      },
    ]);

    const result = await searchCustomBlockRelationRows({ from: () => query } as any, {
      table: 'product_variants',
      values: ['v-1', 'v-2'],
    });

    expect(result).toMatchObject({
      items: [
        {
          label: 'Signal Cap (NB-SIGNAL-CAP-L)',
          value: 'v-1',
        },
        {
          label: 'Studio Tee (NB-STUDIO-TEE-M)',
          value: 'v-2',
        },
      ],
    });
  });
});
