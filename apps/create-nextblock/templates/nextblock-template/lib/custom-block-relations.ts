import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@nextblock-cms/db';

import {
  clampCustomBlockRelationLimit,
  getCustomBlockRelationTarget,
  listCustomBlockRelationTargets,
  normalizeCustomBlockRelationValue,
  resolveCustomBlockRelationColumn,
  type CustomBlockRelationTarget,
  type CustomBlockRelationTargetSummary,
} from './custom-block-relation-registry';

export type CustomBlockRelationRow = {
  description: string | null;
  label: string;
  record: Record<string, unknown>;
  table: string;
  value: string;
};

export type CustomBlockRelationSearchInput = {
  displayColumn?: string | null;
  filters?: Record<string, unknown> | null;
  limit?: number | string | null;
  query?: string | null;
  table: string;
  valueColumn?: string | null;
  values?: unknown[] | null;
};

export type CustomBlockRelationSearchResult =
  | {
      items: CustomBlockRelationRow[];
      target: CustomBlockRelationTargetSummary;
    }
  | {
      error: string;
      status: number;
    };

function buildRelationTargetSummary(
  target: CustomBlockRelationTarget,
  valueColumn: string,
  displayColumn: string
): CustomBlockRelationTargetSummary {
  return {
    descriptionColumns: [...target.descriptionColumns],
    displayColumn,
    label: target.label,
    searchableColumns: [...target.searchableColumns],
    table: target.table,
    valueColumn,
    valueType: target.valueType,
    selectColumns: [...target.selectColumns],
  };
}

function escapePostgrestSearchTerm(query: string) {
  return query.replace(/[,%]/g, ' ').replace(/_/g, '\\_').trim();
}

function describeRelationRow(target: CustomBlockRelationTarget, row: Record<string, unknown>) {
  const parts = target.descriptionColumns
    .map((column) => row[column])
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map((value) => String(value));

  return parts.length > 0 ? parts.join(' - ') : null;
}

function toRelationRows(
  target: CustomBlockRelationTarget,
  rows: Record<string, unknown>[],
  valueColumn: string,
  displayColumn: string
): CustomBlockRelationRow[] {
  return rows.flatMap((row) => {
    const value = row[valueColumn];
    if (value === null || value === undefined) {
      return [];
    }

    const record = { ...row };
    if (target.table === 'products' && Array.isArray(row.product_media)) {
      const images = row.product_media
        .map((pm: any) => pm?.media)
        .filter(Boolean);
      record.images = images;
      if (images.length > 0) {
        record.image = images[0];
        record.object_key = images[0].object_key;
        record.main_image = images[0].object_key;
      }
    } else if (target.table === 'product_variants') {
      if (row.media) {
        record.image = row.media;
        record.object_key = (row.media as any).object_key;
        record.main_image = (row.media as any).object_key;
      } else {
        const prod = Array.isArray(row.products) ? row.products[0] : row.products;
        if (prod && Array.isArray(prod.product_media)) {
          const pm = prod.product_media.find((pm: any) => pm?.media);
          if (pm?.media) {
            record.image = pm.media;
            record.object_key = pm.media.object_key;
            record.main_image = pm.media.object_key;
          }
        }
      }
    } else if ((target.table === 'pages' || target.table === 'posts') && row.media) {
      record.image = row.media;
      record.object_key = (row.media as any).object_key;
      record.main_image = (row.media as any).object_key;
    }

    let labelSource = record[displayColumn] ?? record[target.displayColumn] ?? value;
    if (target.table === 'product_variants') {
      const prod = Array.isArray(record.products) ? record.products[0] : record.products;
      if (prod?.title) {
        labelSource = `${prod.title} (${record.sku || value})`;
      }
    }

    return [
      {
        description: describeRelationRow(target, record),
        label: String(labelSource || value),
        record,
        table: target.table,
        value: String(value),
      },
    ];
  });
}

function applyExactFilters(
  query: any,
  target: CustomBlockRelationTarget,
  filters?: Record<string, unknown> | null
) {
  let nextQuery = query;

  for (const filter of target.activeFilters ?? []) {
    nextQuery = nextQuery.eq(filter.column, filter.value);
  }

  if (!filters) {
    return nextQuery;
  }

  for (const [column, value] of Object.entries(filters)) {
    if (
      value === undefined ||
      value === null ||
      column === 'main_image' ||
      column === 'object_key' ||
      (column === 'language_id' && target.table === 'product_variants') ||
      !target.selectColumns.includes(column) ||
      column === target.valueColumn
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      const normalizedValues = value
        .filter((entry) => ['boolean', 'number', 'string'].includes(typeof entry))
        .map((entry) => String(entry));

      if (normalizedValues.length > 0) {
        nextQuery = nextQuery.in(column, normalizedValues);
      }
      continue;
    }

    if (['boolean', 'number', 'string'].includes(typeof value)) {
      nextQuery = nextQuery.eq(column, value);
    }
  }

  return nextQuery;
}

export async function searchCustomBlockRelationRows(
  supabase: SupabaseClient<Database>,
  input: CustomBlockRelationSearchInput
): Promise<CustomBlockRelationSearchResult> {
  const target = getCustomBlockRelationTarget(input.table);
  if (!target) {
    return { error: `Relation table "${input.table}" is not available.`, status: 400 };
  }

  const valueColumn = resolveCustomBlockRelationColumn(
    target,
    input.valueColumn,
    target.valueColumn
  );
  const displayColumn = resolveCustomBlockRelationColumn(
    target,
    input.displayColumn,
    target.displayColumn
  );

  if (!valueColumn || !displayColumn) {
    return { error: 'Requested relation columns are not available.', status: 400 };
  }

  const limit = clampCustomBlockRelationLimit(input.limit);
  const selectColumns = Array.from(new Set([valueColumn, displayColumn, ...target.selectColumns]));
  const dbSelectColumns = selectColumns.filter(col => col !== 'object_key' && col !== 'main_image');
  
  let selectQueryStr = dbSelectColumns.join(',');
  if (target.table === 'products') {
    selectQueryStr += ',product_media(media(id,object_key,file_name,file_type))';
  } else if (target.table === 'product_variants') {
    const hasLanguageFilter = input.filters && 'language_id' in input.filters;
    if (hasLanguageFilter) {
      selectQueryStr += ',products!inner(id,title,language_id,product_media(media(id,object_key,file_name,file_type)))';
    } else {
      selectQueryStr += ',products(id,title,product_media(media(id,object_key,file_name,file_type)))';
    }
    selectQueryStr += ',media(id,object_key,file_name,file_type)';
  } else if (target.table === 'pages' || target.table === 'posts') {
    selectQueryStr += ',media:feature_image_id(id,object_key,file_name,file_type)';
  }

  let query = (supabase.from(target.table as any) as any)
    .select(selectQueryStr)
    .limit(limit);

  query = applyExactFilters(query, target, input.filters);

  const values = (input.values ?? [])
    .map((value) => normalizeCustomBlockRelationValue(target, value))
    .filter((value): value is number | string => value !== null);

  if (values.length > 0) {
    query = query.in(valueColumn, values);
  } else if (input.query?.trim()) {
    const escapedQuery = escapePostgrestSearchTerm(input.query);
    if (escapedQuery) {
      let searchExpression = target.searchableColumns
        .filter((column) => target.selectColumns.includes(column))
        .map((column) => `${column}.ilike.%${escapedQuery}%`)
        .join(',');

      if (target.table === 'product_variants') {
        searchExpression = searchExpression
          ? `${searchExpression},products.title.ilike.%${escapedQuery}%`
          : `products.title.ilike.%${escapedQuery}%`;
      }

      if (searchExpression) {
        query = query.or(searchExpression);
      }
    }
  }

  if (target.table === 'product_variants' && input.filters?.language_id) {
    query = query.eq('products.language_id', input.filters.language_id);
  }

  query = query.order(target.orderBy, { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error('[Custom Block Relations] Failed to query relation rows:', error);
    return { error: 'Failed to load relation rows.', status: 500 };
  }

  return {
    items: toRelationRows(target, (data ?? []) as Record<string, unknown>[], valueColumn, displayColumn),
    target: buildRelationTargetSummary(target, valueColumn, displayColumn),
  };
}

export function getCustomBlockRelationTargetsResponse() {
  return { tables: listCustomBlockRelationTargets() };
}
