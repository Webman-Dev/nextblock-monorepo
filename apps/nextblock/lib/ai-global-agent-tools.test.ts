import { describe, expect, it } from 'vitest';

import {
  executeReadCurrentCmsItem,
  executeSearchDocumentation,
  executeUpdateContentBlock,
  executeUpdateCurrentCmsFields,
  executeUpdateFooter,
  executeUpdateNavigationBar,
  executeUpdateSectionColumnBlock,
} from './ai-global-agent-tools';

type MockRow = Record<string, any>;

type MockDatabase = {
  blocks: MockRow[];
  languages: MockRow[];
  navigation_items: MockRow[];
  pages: MockRow[];
  posts: MockRow[];
  products: MockRow[];
  site_settings: MockRow[];
};

class MockQuery {
  private filters: Array<{ column: string; value: unknown }> = [];
  private limitCount: number | null = null;
  private operation: 'delete' | 'insert' | 'select' | 'update' | 'upsert' = 'select';
  private payload: MockRow | MockRow[] | null = null;

  constructor(
    private readonly database: MockDatabase,
    private readonly calls: MockRow[],
    private readonly table: keyof MockDatabase
  ) {}

  select(columns?: string) {
    this.calls.push({ columns, operation: 'select', table: this.table });
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
    this.calls.push({ operation: 'delete', table: this.table });
    return this;
  }

  insert(payload: MockRow | MockRow[]) {
    this.operation = 'insert';
    this.payload = payload;
    this.calls.push({ operation: 'insert', payload, table: this.table });
    return this;
  }

  update(payload: MockRow) {
    this.operation = 'update';
    this.payload = payload;
    this.calls.push({ operation: 'update', payload, table: this.table });
    return this;
  }

  upsert(payload: MockRow | MockRow[]) {
    this.operation = 'upsert';
    this.payload = payload;
    this.calls.push({ operation: 'upsert', payload, table: this.table });
    return this;
  }

  order() {
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
      const beforeCount = this.database[this.table].length;
      this.database[this.table] = this.database[this.table].filter(
        (row) => !this.matchesFilters(row)
      );

      return {
        data: null,
        error: null,
        removed: beforeCount - this.database[this.table].length,
      };
    }

    if (this.operation === 'insert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = rows.filter(Boolean).map((row) => {
        const nextId =
          this.database[this.table].reduce((max, current) => Math.max(max, Number(current.id) || 0), 0) +
          1;
        return { id: nextId, ...row };
      });

      this.database[this.table].push(...inserted);

      return {
        data: inserted,
        error: null,
      };
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

      return {
        data: updated,
        error: null,
      };
    }

    if (this.operation === 'upsert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload];

      for (const row of rows.filter(Boolean)) {
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
      }

      return {
        data: rows,
        error: null,
      };
    }

    let data = this.database[this.table].filter((row) => this.matchesFilters(row));

    if (this.limitCount !== null) {
      data = data.slice(0, this.limitCount);
    }

    return {
      data,
      error: null,
    };
  }
}

function createMockSupabase(overrides?: Partial<MockDatabase>) {
  const calls: MockRow[] = [];
  const database: MockDatabase = {
    blocks: [],
    languages: [{ code: 'en', id: 1 }],
    navigation_items: [
      { id: 1, label: 'Old', language_id: 1, menu_key: 'HEADER', order: 0, url: '/old' },
    ],
    pages: [],
    posts: [],
    products: [],
    site_settings: [],
    ...overrides,
  };

  return {
    calls,
    database,
    supabase: {
      from: (table: string) => {
        if (!(table in database)) {
          throw new Error(`Unexpected mock table: ${table}`);
        }

        return new MockQuery(database, calls, table as keyof MockDatabase);
      },
    },
  };
}

describe('Cortex AI global agent tool executors', () => {
  it('replaces the header navigation menu for the selected locale', async () => {
    const revalidated: string[] = [];
    const { database, supabase } = createMockSupabase();

    const result = await executeUpdateNavigationBar(
      {
        items: [
          {
            children: [{ label: 'Team', url: '/about/team' }],
            label: 'About',
            url: '/about',
          },
          { label: 'Contact', target: '_self', url: '/contact' },
        ],
        languageCode: 'en',
      },
      {
        revalidatePath: (path) => revalidated.push(path),
        supabase,
      }
    );

    expect(result).toEqual({
      insertedCount: 3,
      languageCode: 'en',
      menuKey: 'HEADER',
      mode: 'replace',
      skippedCount: 0,
      success: true,
    });
    expect(database.navigation_items).toEqual([
      {
        id: 1,
        label: 'About',
        language_id: 1,
        menu_key: 'HEADER',
        order: 0,
        page_id: null,
        parent_id: null,
        url: '/about',
      },
      {
        id: 2,
        label: 'Team',
        language_id: 1,
        menu_key: 'HEADER',
        order: 0,
        page_id: null,
        parent_id: 1,
        url: '/about/team',
      },
      {
        id: 3,
        label: 'Contact',
        language_id: 1,
        menu_key: 'HEADER',
        order: 1,
        page_id: null,
        parent_id: null,
        url: '/contact',
      },
    ]);
    expect(revalidated).toEqual(['/', '/cms/navigation']);
  });

  it('appends header navigation items without clearing existing links', async () => {
    const { database, supabase } = createMockSupabase({
      navigation_items: [
        { id: 1, label: 'Home', language_id: 1, menu_key: 'HEADER', order: 0, url: '/' },
        { id: 2, label: 'Articles', language_id: 1, menu_key: 'HEADER', order: 1, url: '/articles' },
      ],
    });

    const result = await executeUpdateNavigationBar(
      {
        items: [{ label: 'Contact', url: '/contact' }],
        languageCode: 'en',
        mode: 'append',
      },
      { revalidatePath: () => undefined, supabase }
    );

    expect(result).toEqual({
      insertedCount: 1,
      languageCode: 'en',
      menuKey: 'HEADER',
      mode: 'append',
      skippedCount: 0,
      success: true,
    });
    expect(database.navigation_items).toEqual([
      { id: 1, label: 'Home', language_id: 1, menu_key: 'HEADER', order: 0, url: '/' },
      { id: 2, label: 'Articles', language_id: 1, menu_key: 'HEADER', order: 1, url: '/articles' },
      {
        id: 3,
        label: 'Contact',
        language_id: 1,
        menu_key: 'HEADER',
        order: 2,
        page_id: null,
        parent_id: null,
        url: '/contact',
      },
    ]);
  });

  it('resolves language names when appending header navigation items', async () => {
    const { database, supabase } = createMockSupabase({
      languages: [
        { code: 'en', id: 1, is_active: true, name: 'English' },
        { code: 'fr', id: 2, is_active: true, name: 'French' },
      ],
      navigation_items: [
        { id: 1, label: 'Home', language_id: 1, menu_key: 'HEADER', order: 0, url: '/' },
        { id: 2, label: 'Accueil', language_id: 2, menu_key: 'HEADER', order: 0, url: '/' },
      ],
    });

    const result = await executeUpdateNavigationBar(
      {
        items: [{ label: 'Contact', target: '_self', url: 'mailto:info@nextblock.dev' }],
        languageCode: 'French',
        mode: 'append',
      },
      { revalidatePath: () => undefined, supabase }
    );

    expect(result).toEqual({
      insertedCount: 1,
      languageCode: 'fr',
      menuKey: 'HEADER',
      mode: 'append',
      skippedCount: 0,
      success: true,
    });
    expect(database.navigation_items).toContainEqual({
      id: 3,
      label: 'Contact',
      language_id: 2,
      menu_key: 'HEADER',
      order: 1,
      page_id: null,
      parent_id: null,
      url: 'mailto:info@nextblock.dev',
    });
  });

  it('updates a single existing header navigation item without replacing the menu', async () => {
    const { database, supabase } = createMockSupabase({
      languages: [
        { code: 'en', id: 1, is_active: true, name: 'English' },
        { code: 'fr', id: 2, is_active: true, name: 'French' },
      ],
      navigation_items: [
        { id: 1, label: 'Accueil', language_id: 2, menu_key: 'HEADER', order: 0, url: '/' },
        {
          id: 2,
          label: 'Contact',
          language_id: 2,
          menu_key: 'HEADER',
          order: 1,
          url: 'mailto:info@nextblock.dev',
        },
        { id: 3, label: 'Articles', language_id: 2, menu_key: 'HEADER', order: 2, url: '/articles' },
      ],
    });

    const result = await executeUpdateNavigationBar(
      {
        items: [
          {
            label: 'Nous Contacter',
            target: '_self',
            url: 'mailto:info@nextblock.dev',
          },
        ],
        languageCode: 'French',
        match: { label: 'Contact' },
        mode: 'update',
      },
      { revalidatePath: () => undefined, supabase }
    );

    expect(result).toEqual({
      insertedCount: 0,
      languageCode: 'fr',
      menuKey: 'HEADER',
      mode: 'update',
      skippedCount: 0,
      success: true,
      updatedCount: 1,
    });
    expect(database.navigation_items).toEqual([
      { id: 1, label: 'Accueil', language_id: 2, menu_key: 'HEADER', order: 0, url: '/' },
      {
        id: 2,
        label: 'Nous Contacter',
        language_id: 2,
        menu_key: 'HEADER',
        order: 1,
        url: 'mailto:info@nextblock.dev',
      },
      { id: 3, label: 'Articles', language_id: 2, menu_key: 'HEADER', order: 2, url: '/articles' },
    ]);
  });

  it('refuses destructive partial header navigation replacements', async () => {
    const { database, supabase } = createMockSupabase({
      navigation_items: [
        { id: 1, label: 'Home', language_id: 1, menu_key: 'HEADER', order: 0, url: '/' },
        { id: 2, label: 'Articles', language_id: 1, menu_key: 'HEADER', order: 1, url: '/articles' },
        {
          id: 3,
          label: 'Contact',
          language_id: 1,
          menu_key: 'HEADER',
          order: 2,
          url: 'mailto:info@nextblock.dev',
        },
      ],
    });

    await expect(
      executeUpdateNavigationBar(
        {
          items: [{ label: 'Nous Contacter', url: 'mailto:info@nextblock.dev' }],
          languageCode: 'en',
          mode: 'replace',
        },
        { revalidatePath: () => undefined, supabase }
      )
    ).rejects.toThrow('Refusing destructive HEADER navigation replacement');

    expect(database.navigation_items).toEqual([
      { id: 1, label: 'Home', language_id: 1, menu_key: 'HEADER', order: 0, url: '/' },
      { id: 2, label: 'Articles', language_id: 1, menu_key: 'HEADER', order: 1, url: '/articles' },
      {
        id: 3,
        label: 'Contact',
        language_id: 1,
        menu_key: 'HEADER',
        order: 2,
        url: 'mailto:info@nextblock.dev',
      },
    ]);
  });

  it('skips duplicate header navigation append requests by URL', async () => {
    const { database, supabase } = createMockSupabase({
      navigation_items: [
        { id: 1, label: 'Home', language_id: 1, menu_key: 'HEADER', order: 0, url: '/' },
        {
          id: 2,
          label: 'Contact',
          language_id: 1,
          menu_key: 'HEADER',
          order: 1,
          url: 'mailto:info@nextblock.dev',
        },
      ],
    });

    const result = await executeUpdateNavigationBar(
      {
        items: [{ label: 'Contact', target: '_self', url: 'mailto:info@nextblock.dev' }],
        languageCode: 'en',
        mode: 'append',
      },
      { revalidatePath: () => undefined, supabase }
    );

    expect(result).toEqual({
      insertedCount: 0,
      languageCode: 'en',
      menuKey: 'HEADER',
      mode: 'append',
      skippedCount: 1,
      success: true,
    });
    expect(database.navigation_items).toEqual([
      { id: 1, label: 'Home', language_id: 1, menu_key: 'HEADER', order: 0, url: '/' },
      {
        id: 2,
        label: 'Contact',
        language_id: 1,
        menu_key: 'HEADER',
        order: 1,
        url: 'mailto:info@nextblock.dev',
      },
    ]);
  });

  it('updates footer links and copyright settings', async () => {
    const { database, supabase } = createMockSupabase({
      navigation_items: [
        { id: 10, label: 'Old Footer', language_id: 1, menu_key: 'FOOTER', order: 0, url: '/old' },
      ],
      site_settings: [{ key: 'footer_copyright', value: { en: 'Old' } }],
    });

    const result = await executeUpdateFooter(
      {
        copyright: { en: '(c) {year} NextBlock. All rights reserved.' },
        languageCode: 'en',
        links: [{ label: 'Privacy', url: '/privacy' }],
      },
      { revalidatePath: () => undefined, supabase }
    );

    expect(result).toMatchObject({
      copyrightUpdated: true,
      footerNavigation: {
        insertedCount: 1,
        languageCode: 'en',
        menuKey: 'FOOTER',
      },
      success: true,
    });
    expect(database.navigation_items).toEqual([
      {
        id: 1,
        label: 'Privacy',
        language_id: 1,
        menu_key: 'FOOTER',
        order: 0,
        page_id: null,
        parent_id: null,
        url: '/privacy',
      },
    ]);
    expect(database.site_settings).toEqual([
      {
        key: 'footer_copyright',
        value: { en: '(c) {year} NextBlock. All rights reserved.' },
      },
    ]);
  });

  it('searches published documentation-like pages and posts', async () => {
    const { supabase } = createMockSupabase({
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
        {
          excerpt: 'Draft content should not be returned.',
          id: 2,
          slug: 'draft',
          status: 'draft',
          title: 'Draft',
        },
      ],
    });

    const result = await executeSearchDocumentation(
      { limit: 2, query: 'Supabase auth' },
      { supabase }
    );

    expect(result).toEqual({
      query: 'Supabase auth',
      results: [
        {
          excerpt: 'Use Supabase auth with profiles and roles in NextBlock.',
          source: 'post',
          title: 'Supabase Auth Guide',
          url: '/article/supabase-auth-guide',
        },
        {
          excerpt: 'CMS setup, editor blocks, and Supabase auth.',
          source: 'page',
          title: 'Setup Guide',
          url: '/docs/setup',
        },
      ],
      success: true,
    });
  });

  it('reads the current page context with block summaries', async () => {
    const { supabase } = createMockSupabase({
      blocks: [
        {
          block_type: 'text',
          content: { html_content: '<p>Hello</p>' },
          id: 11,
          language_id: 1,
          order: 2,
          page_id: 7,
          post_id: null,
        },
        {
          block_type: 'heading',
          content: { level: 2, text_content: 'Intro' },
          id: 10,
          language_id: 1,
          order: 1,
          page_id: 7,
          post_id: null,
        },
      ],
      pages: [
        {
          id: 7,
          language_id: 1,
          meta_description: null,
          slug: 'home',
          status: 'published',
          title: 'Home',
        },
      ],
    });

    const result = await executeReadCurrentCmsItem(
      { includeBlockContent: false, includeBlocks: true },
      {
        pageContext: { contentType: 'page', entityId: 7, slug: 'home', title: 'Home' },
        supabase,
      }
    );

    expect(result.success).toBe(true);
    expect(result.item.title).toBe('Home');
    expect(result.blocks).toEqual([
      {
        blockType: 'heading',
        content: undefined,
        id: 10,
        languageId: 1,
        order: 1,
        pageId: 7,
        postId: null,
      },
      {
        blockType: 'text',
        content: undefined,
        id: 11,
        languageId: 1,
        order: 2,
        pageId: 7,
        postId: null,
      },
    ]);
  });

  it('updates validated product fields including description_json', async () => {
    const revalidated: string[] = [];
    const { database, supabase } = createMockSupabase({
      products: [
        {
          description_json: null,
          id: 'prod_1',
          language_id: 1,
          meta_description: null,
          meta_title: null,
          short_description: 'Old short copy',
          slug: 'studio-tee',
          status: 'draft',
          title: 'Studio Tee',
        },
      ],
    });
    const descriptionJson = {
      content: [
        {
          content: [{ text: 'NextBlock tee description.', type: 'text' }],
          type: 'paragraph',
        },
      ],
      type: 'doc',
    };

    const result = await executeUpdateCurrentCmsFields(
      {
        fields: {
          description_json: descriptionJson,
          short_description: 'Soft cotton tee for builders.',
          status: 'active',
        },
      },
      {
        pageContext: {
          contentType: 'product',
          entityId: 'prod_1',
          slug: 'studio-tee',
          title: 'Studio Tee',
        },
        revalidatePath: (path) => revalidated.push(path),
        supabase,
      }
    );

    expect(result).toMatchObject({
      contentType: 'product',
      entityId: 'prod_1',
      slug: 'studio-tee',
      success: true,
      updatedFields: ['description_json', 'short_description', 'status'],
    });
    expect(database.products[0]).toMatchObject({
      description_json: descriptionJson,
      short_description: 'Soft cotton tee for builders.',
      status: 'active',
    });
    expect(revalidated).toEqual([
      '/cms/products/prod_1/edit',
      '/product/studio-tee',
      '/cms/products',
    ]);
  });

  it('updates only blocks that belong to the current page context', async () => {
    const { database, supabase } = createMockSupabase({
      blocks: [
        {
          block_type: 'text',
          content: { html_content: '<p>Old</p>' },
          id: 12,
          language_id: 1,
          order: 0,
          page_id: 7,
          post_id: null,
        },
      ],
    });

    await expect(
      executeUpdateContentBlock(
        {
          blockId: 12,
          blockType: 'text',
          content: { html_content: '<p>Wrong page</p>' },
        },
        {
          pageContext: { contentType: 'page', entityId: 8 },
          supabase,
        }
      )
    ).rejects.toThrow('does not belong to the current page');

    const result = await executeUpdateContentBlock(
      {
        blockId: 12,
        blockType: 'text',
        content: { html_content: '<p>Updated</p>' },
      },
      {
        pageContext: { contentType: 'page', entityId: 7, slug: 'docs/setup' },
        revalidatePath: () => undefined,
        supabase,
      }
    );

    expect(result).toMatchObject({
      blockId: 12,
      blockType: 'text',
      contentUpdated: true,
      success: true,
    });
    expect(database.blocks[0].content).toEqual({ html_content: '<p>Updated</p>' });
  });

  it('updates a validated nested section column block', async () => {
    const sectionContent = {
      background: { type: 'none' },
      column_blocks: [
        [
          {
            block_type: 'text',
            content: { html_content: '<p>Old nested copy</p>' },
          },
        ],
      ],
      column_gap: 'md',
      container_type: 'container',
      padding: { bottom: 'md', top: 'md' },
      responsive_columns: { desktop: 1, mobile: 1, tablet: 1 },
    };
    const { database, supabase } = createMockSupabase({
      blocks: [
        {
          block_type: 'section',
          content: sectionContent,
          id: 20,
          language_id: 1,
          order: 0,
          page_id: 7,
          post_id: null,
        },
      ],
    });

    const result = await executeUpdateSectionColumnBlock(
      {
        blockIndex: 0,
        blockType: 'text',
        columnIndex: 0,
        content: { html_content: '<p>New nested copy</p>' },
        parentBlockId: 20,
      },
      {
        pageContext: { contentType: 'page', entityId: 7, slug: 'home' },
        revalidatePath: () => undefined,
        supabase,
      }
    );

    expect(result).toMatchObject({
      blockIndex: 0,
      columnIndex: 0,
      nestedBlockType: 'text',
      parentBlockId: 20,
      parentBlockType: 'section',
      success: true,
    });
    expect(database.blocks[0].content.column_blocks[0][0].content).toEqual({
      html_content: '<p>New nested copy</p>',
    });
  });
});
