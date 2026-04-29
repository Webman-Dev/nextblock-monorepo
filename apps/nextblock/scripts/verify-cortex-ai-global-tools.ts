import assert from 'node:assert/strict';

import {
  executeSearchDocumentation,
  executeUpdateFooter,
  executeUpdateNavigationBar,
} from '../lib/ai-global-agent-tools';

type MockRow = Record<string, any>;

type MockDatabase = {
  languages: MockRow[];
  navigation_items: MockRow[];
  pages: MockRow[];
  posts: MockRow[];
  site_settings: MockRow[];
};

class MockQuery {
  private filters: Array<{ column: string; value: unknown }> = [];
  private limitCount: number | null = null;
  private operation: 'delete' | 'insert' | 'select' | 'update' | 'upsert' = 'select';
  private payload: MockRow | MockRow[] | null = null;

  constructor(
    private readonly database: MockDatabase,
    private readonly table: keyof MockDatabase
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  insert(payload: MockRow | MockRow[]) {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: MockRow) {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  upsert(payload: MockRow | MockRow[]) {
    this.operation = 'upsert';
    this.payload = payload;
    return this;
  }

  maybeSingle() {
    return this.execute().then((result) => ({
      data: result.data?.[0] ?? null,
      error: result.error,
    }));
  }

  single() {
    return this.execute().then((result) => ({
      data: Array.isArray(result.data) ? result.data[0] : result.data,
      error: result.error,
    }));
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private matchesFilters(row: MockRow) {
    return this.filters.every((filter) => row[filter.column] === filter.value);
  }

  private async execute() {
    if (this.operation === 'delete') {
      this.database[this.table] = this.database[this.table].filter(
        (row) => !this.matchesFilters(row)
      );
      return { data: null, error: null };
    }

    if (this.operation === 'insert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = rows.filter(Boolean).map((row) => {
        const nextId =
          this.database[this.table].reduce(
            (max, current) => Math.max(max, Number(current.id) || 0),
            0
          ) + 1;
        return { id: nextId, ...row };
      });
      this.database[this.table].push(...inserted);
      return { data: inserted, error: null };
    }

    if (this.operation === 'update') {
      const payload = Array.isArray(this.payload) ? this.payload[0] : this.payload;
      const updated: MockRow[] = [];

      this.database[this.table] = this.database[this.table].map((row) => {
        if (!this.matchesFilters(row)) {
          return row;
        }

        const nextRow = { ...row, ...payload };
        updated.push(nextRow);
        return nextRow;
      });

      return { data: updated, error: null };
    }

    if (this.operation === 'upsert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
      rows.filter(Boolean).forEach((row) => {
        const existingIndex = this.database[this.table].findIndex(
          (current) => current.key && current.key === row.key
        );

        if (existingIndex >= 0) {
          this.database[this.table][existingIndex] = {
            ...this.database[this.table][existingIndex],
            ...row,
          };
        } else {
          this.database[this.table].push(row);
        }
      });
      return { data: rows, error: null };
    }

    let data = this.database[this.table].filter((row) => this.matchesFilters(row));

    if (this.limitCount !== null) {
      data = data.slice(0, this.limitCount);
    }

    return { data, error: null };
  }
}

function createMockSupabase(database: MockDatabase) {
  return {
    from: (table: string) => {
      if (!(table in database)) {
        throw new Error(`Unexpected mock table: ${table}`);
      }

      return new MockQuery(database, table as keyof MockDatabase);
    },
  };
}

async function main() {
  const database: MockDatabase = {
    languages: [
      { code: 'en', id: 1, is_active: true, name: 'English' },
      { code: 'fr', id: 2, is_active: true, name: 'French' },
    ],
    navigation_items: [
      { id: 1, label: 'Old', language_id: 1, menu_key: 'HEADER', order: 0, url: '/old' },
      { id: 3, label: 'Ancien', language_id: 2, menu_key: 'HEADER', order: 0, url: '/ancien' },
      { id: 2, label: 'Old Footer', language_id: 1, menu_key: 'FOOTER', order: 0, url: '/old' },
    ],
    pages: [
      {
        id: 1,
        meta_description: 'CMS setup, editor blocks, and Supabase auth.',
        slug: 'docs/setup',
        status: 'published',
        title: 'Setup Guide',
      },
    ],
    posts: [
      {
        excerpt: 'Use Supabase auth with profiles and roles in NextBlock.',
        id: 1,
        meta_description: null,
        slug: 'supabase-auth-guide',
        status: 'published',
        subtitle: null,
        title: 'Supabase Auth Guide',
      },
    ],
    site_settings: [{ key: 'footer_copyright', value: { en: 'Old' } }],
  };
  const supabase = createMockSupabase(database);

  const headerResult = await executeUpdateNavigationBar(
    {
      items: [
        { label: 'Contact', url: '/contact' },
      ],
      languageCode: 'en',
      mode: 'append',
    },
    { revalidatePath: () => undefined, supabase }
  );

  assert.equal(headerResult.success, true);
  assert.equal(headerResult.insertedCount, 1);
  assert.equal(headerResult.skippedCount, 0);
  assert.equal(
    database.navigation_items.filter(
      (item) => item.menu_key === 'HEADER' && item.language_id === 1
    ).length,
    2
  );
  assert.equal(
    database.navigation_items.some((item) => item.menu_key === 'HEADER' && item.url === '/old'),
    true
  );
  assert.equal(
    database.navigation_items.some((item) => item.menu_key === 'HEADER' && item.url === '/contact'),
    true
  );

  const duplicateHeaderResult = await executeUpdateNavigationBar(
    {
      items: [
        { label: 'Contact', url: '/contact' },
      ],
      languageCode: 'en',
      mode: 'append',
    },
    { revalidatePath: () => undefined, supabase }
  );

  assert.equal(duplicateHeaderResult.success, true);
  assert.equal(duplicateHeaderResult.insertedCount, 0);
  assert.equal(duplicateHeaderResult.skippedCount, 1);

  const frenchHeaderResult = await executeUpdateNavigationBar(
    {
      items: [
        { label: 'Contact', url: 'mailto:info@nextblock.dev' },
      ],
      languageCode: 'French',
      mode: 'append',
    },
    { revalidatePath: () => undefined, supabase }
  );

  assert.equal(frenchHeaderResult.success, true);
  assert.equal(frenchHeaderResult.languageCode, 'fr');
  assert.equal(frenchHeaderResult.insertedCount, 1);
  assert.equal(
    database.navigation_items.some(
      (item) =>
        item.menu_key === 'HEADER' &&
        item.language_id === 2 &&
        item.url === 'mailto:info@nextblock.dev'
    ),
    true
  );

  const frenchRenameResult = await executeUpdateNavigationBar(
    {
      items: [
        { label: 'Nous Contacter', url: 'mailto:info@nextblock.dev' },
      ],
      languageCode: 'French',
      match: { label: 'Contact' },
      mode: 'update',
    },
    { revalidatePath: () => undefined, supabase }
  );

  assert.equal(frenchRenameResult.success, true);
  assert.equal(frenchRenameResult.languageCode, 'fr');
  assert.equal(frenchRenameResult.updatedCount, 1);
  assert.equal(
    database.navigation_items.some(
      (item) =>
        item.menu_key === 'HEADER' &&
        item.language_id === 2 &&
        item.label === 'Nous Contacter' &&
        item.url === 'mailto:info@nextblock.dev'
    ),
    true
  );
  assert.equal(
    database.navigation_items.some(
      (item) => item.menu_key === 'HEADER' && item.language_id === 2 && item.url === '/ancien'
    ),
    true
  );

  await assert.rejects(
    () =>
      executeUpdateNavigationBar(
        {
          items: [
            { label: 'Only Link', url: '/only' },
          ],
          languageCode: 'fr',
          mode: 'replace',
        },
        { revalidatePath: () => undefined, supabase }
      ),
    /Refusing destructive HEADER navigation replacement/
  );

  const footerResult = await executeUpdateFooter(
    {
      copyright: { en: '(c) {year} NextBlock. All rights reserved.' },
      languageCode: 'en',
      links: [{ label: 'Privacy', url: '/privacy' }],
    },
    { revalidatePath: () => undefined, supabase }
  );

  assert.equal(footerResult.success, true);
  assert.equal(footerResult.footerNavigation?.insertedCount, 1);
  assert.deepEqual(database.site_settings[0]?.value, {
    en: '(c) {year} NextBlock. All rights reserved.',
  });

  const searchResult = await executeSearchDocumentation(
    { limit: 2, query: 'Supabase auth' },
    { supabase }
  );

  assert.equal(searchResult.success, true);
  assert.equal(searchResult.results[0]?.title, 'Supabase Auth Guide');
  assert.equal(searchResult.results[1]?.title, 'Setup Guide');

  console.log('Cortex AI global tool verifier passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
