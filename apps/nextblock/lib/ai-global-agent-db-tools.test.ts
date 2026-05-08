import { describe, expect, it } from 'vitest';
import {
  executeDatabaseActionPlan,
  executeDatabaseMutation,
  executeDescribeDatabaseSchema,
  executeReadDatabaseRecords,
} from './ai-global-agent-db-tools';

type MockRow = Record<string, any>;
type MockDatabase = Record<string, MockRow[]>;

class MockQuery {
  private filters: Array<{ column: string; operator: string; value: unknown }> = [];
  private limitCount: number | null = null;
  private operation: 'delete' | 'insert' | 'select' | 'update' | 'upsert' = 'select';
  private orderBy: { ascending: boolean; column: string } | null = null;
  private payload: MockRow | MockRow[] | null = null;
  private rangeBounds: { from: number; to: number } | null = null;
  private selectedColumns: string[] | null = null;

  constructor(
    private readonly database: MockDatabase,
    private readonly table: string
  ) {}

  select(columns?: string) {
    if (columns) {
      this.selectedColumns = columns.split(',').map((column) => column.trim());
    }
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push({ column, operator: 'gt', value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ column, operator: 'lt', value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  ilike(column: string, value: unknown) {
    this.filters.push({ column, operator: 'ilike', value });
    return this;
  }

  in(column: string, value: unknown) {
    this.filters.push({ column, operator: 'in', value });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, operator: 'is', value });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.rangeBounds = { from, to };
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { ascending: options?.ascending ?? true, column };
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

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private matchesFilters(row: MockRow) {
    return this.filters.every((filter) => {
      const value = row[filter.column];

      switch (filter.operator) {
        case 'eq':
          return value === filter.value;
        case 'neq':
          return value !== filter.value;
        case 'gt':
          return value > filter.value;
        case 'gte':
          return value >= filter.value;
        case 'lt':
          return value < filter.value;
        case 'lte':
          return value <= filter.value;
        case 'ilike': {
          const pattern = String(filter.value).replace(/%/g, '').toLowerCase();
          return String(value).toLowerCase().includes(pattern);
        }
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(value);
        case 'is':
          return value === filter.value;
        default:
          return true;
      }
    });
  }

  private project(row: MockRow) {
    if (!this.selectedColumns) {
      return row;
    }

    return Object.fromEntries(this.selectedColumns.map((column) => [column, row[column]]));
  }

  private async execute() {
    if (!(this.table in this.database)) {
      throw new Error(`Unexpected mock table: ${this.table}`);
    }

    if (this.operation === 'insert') {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]).filter(Boolean) as MockRow[];
      const inserted = rows.map((row) => ({ ...row }));
      this.database[this.table].push(...inserted);
      return { data: inserted.map((row) => this.project(row)), error: null };
    }

    if (this.operation === 'upsert') {
      const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]).filter(Boolean) as MockRow[];

      for (const row of rows) {
        const keyColumn = 'id' in row ? 'id' : 'key' in row ? 'key' : Object.keys(row)[0];
        const existingIndex = this.database[this.table].findIndex((current) => current[keyColumn] === row[keyColumn]);

        if (existingIndex >= 0) {
          this.database[this.table][existingIndex] = { ...this.database[this.table][existingIndex], ...row };
        } else {
          this.database[this.table].push({ ...row });
        }
      }

      return { data: rows.map((row) => this.project(row)), error: null };
    }

    if (this.operation === 'update') {
      const payload = (Array.isArray(this.payload) ? this.payload[0] : this.payload) || {};
      const updated: MockRow[] = [];

      this.database[this.table] = this.database[this.table].map((row) => {
        if (!this.matchesFilters(row)) {
          return row;
        }

        const nextRow = { ...row, ...payload };
        updated.push(nextRow);
        return nextRow;
      });

      return { data: updated.map((row) => this.project(row)), error: null };
    }

    if (this.operation === 'delete') {
      const removed = this.database[this.table].filter((row) => this.matchesFilters(row));
      this.database[this.table] = this.database[this.table].filter((row) => !this.matchesFilters(row));
      return { data: removed.map((row) => this.project(row)), error: null };
    }

    let rows = this.database[this.table].filter((row) => this.matchesFilters(row));

    if (this.orderBy) {
      const { ascending, column } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        if (a[column] === b[column]) return 0;
        return (a[column] > b[column] ? 1 : -1) * (ascending ? 1 : -1);
      });
    }

    if (this.rangeBounds) {
      rows = rows.slice(this.rangeBounds.from, this.rangeBounds.to + 1);
    }

    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    return { data: rows.map((row) => this.project(row)), error: null };
  }
}

function createMockSupabase(overrides?: Partial<MockDatabase>) {
  const database: MockDatabase = {
    cortex_ai_db_mutation_audit: [],
    pages: [
      { id: 1, language_id: 1, slug: 'home', status: 'draft', title: 'Home' },
      { id: 2, language_id: 1, slug: 'about', status: 'draft', title: 'About' },
    ],
    profiles: [{ id: 'user_1', full_name: 'Admin', role: 'ADMIN' }],
    site_settings: [
      { key: 'site_name', value: { en: 'NextBlock' } },
      { key: 'cortex_ai_openrouter_api_key', value: 'sk-secret' },
    ],
    translations: [{ key: 'hello', translations: { en: 'Hello' } }],
    user_addresses: [{ id: 'addr_1', user_id: 'user_1', city: 'Montreal' }],
    ...overrides,
  };

  return {
    database,
    supabase: {
      from: (table: string) => new MockQuery(database, table),
    },
  };
}

describe('Cortex AI generic database tools', () => {
  it('describes allowed schema and marks PII tables read-only', async () => {
    const result = await executeDescribeDatabaseSchema({});

    expect(result.success).toBe(true);
    expect(result.tables.some((table) => table.table === 'profiles' && table.readOnly)).toBe(true);
    expect(result.tables.some((table) => table.table === 'user_addresses' && table.readOnly)).toBe(true);
    expect(result.tables.some((table) => table.table === 'auth.users')).toBe(false);
  });

  it('reads profiles and user addresses but refuses to mutate them', async () => {
    const { supabase } = createMockSupabase();

    const profiles = await executeReadDatabaseRecords(
      { table: 'profiles', columns: ['id', 'full_name', 'role'] },
      { supabase }
    );
    const addresses = await executeReadDatabaseRecords(
      { table: 'user_addresses', columns: ['id', 'city'] },
      { supabase }
    );

    expect(profiles.rows).toEqual([{ id: 'user_1', full_name: 'Admin', role: 'ADMIN' }]);
    expect(addresses.rows).toEqual([{ id: 'addr_1', city: 'Montreal' }]);
    await expect(
      executeDatabaseMutation(
        {
          filters: [{ column: 'id', operator: 'eq', value: 'user_1' }],
          operation: 'update',
          table: 'profiles',
          values: { full_name: 'Changed' },
        },
        { supabase }
      )
    ).rejects.toThrow('read-only');
  });

  it('blocks auth tables, secret-like fields, and protected Cortex site setting reads', async () => {
    const { supabase } = createMockSupabase();

    await expect(executeReadDatabaseRecords({ table: 'auth.users' }, { supabase })).rejects.toThrow(
      'auth schema'
    );
    await expect(
      executeDatabaseMutation(
        {
          operation: 'insert',
          rows: [{ key: 'demo', api_key: 'secret' }],
          table: 'site_settings',
        },
        { supabase }
      )
    ).rejects.toThrow('Protected field');

    const settings = await executeReadDatabaseRecords({ table: 'site_settings' }, { supabase });

    expect(settings.rows).toEqual([{ key: 'site_name', value: { en: 'NextBlock' } }]);
  });

  it('previews and confirms a mutation before changing rows and writing an audit record', async () => {
    const { database, supabase } = createMockSupabase();
    const input = {
      filters: [{ column: 'id', operator: 'eq' as const, value: 1 }],
      operation: 'update' as const,
      summary: 'Publish the home page.',
      table: 'pages',
      values: { status: 'published' },
    };

    const preview = await executeDatabaseMutation(input, { actorUserId: 'user_1', supabase });

    expect(preview.requiresConfirmation).toBe(true);
    expect(database.pages[0].status).toBe('draft');

    const result = await executeDatabaseMutation(input, {
      actorUserId: 'user_1',
      latestUserMessage: preview.confirmationPhrase,
      supabase,
    });

    expect(result.success).toBe(true);
    expect(result.mutationExecuted).toBe(true);
    expect(database.pages[0].status).toBe('published');
    expect(database.cortex_ai_db_mutation_audit).toHaveLength(1);
    expect(database.cortex_ai_db_mutation_audit[0].status).toBe('success');
  });

  it('requires a fresh confirmation when update targets change', async () => {
    const { database, supabase } = createMockSupabase();
    const input = {
      filters: [{ column: 'status', operator: 'eq' as const, value: 'draft' }],
      operation: 'update' as const,
      table: 'pages',
      values: { status: 'published' },
    };
    const preview = await executeDatabaseMutation(input, { actorUserId: 'user_1', supabase });

    database.pages.pop();
    const staleResult = await executeDatabaseMutation(input, {
      actorUserId: 'user_1',
      latestUserMessage: preview.confirmationPhrase,
      supabase,
    });

    expect(staleResult.requiresConfirmation).toBe(true);
    expect(staleResult.message).toMatch(/target changed/i);
    expect(database.pages[0].status).toBe('draft');
  });

  it('confirms a multi-action database plan and writes one combined audit row', async () => {
    const { database, supabase } = createMockSupabase();
    const input = {
      actions: [
        {
          filters: [{ column: 'id', operator: 'eq' as const, value: 1 }],
          operation: 'update' as const,
          table: 'pages',
          values: { status: 'published' },
        },
        {
          operation: 'insert' as const,
          rows: [{ key: 'goodbye', translations: { en: 'Goodbye' } }],
          table: 'translations',
        },
      ],
      summary: 'Publish home and add a translation.',
    };

    const preview = await executeDatabaseActionPlan(input, { actorUserId: 'user_1', supabase });
    expect(preview.requiresConfirmation).toBe(true);

    const result = await executeDatabaseActionPlan(input, {
      actorUserId: 'user_1',
      latestUserMessage: preview.confirmationPhrase,
      supabase,
    });

    expect(result.success).toBe(true);
    expect(result.mutationExecuted).toBe(true);
    expect(database.pages[0].status).toBe('published');
    expect(database.translations.some((row) => row.key === 'goodbye')).toBe(true);
    expect(database.cortex_ai_db_mutation_audit).toHaveLength(1);
    expect(database.cortex_ai_db_mutation_audit[0].tool_name).toBe('execute_database_action_plan');
  });
});
