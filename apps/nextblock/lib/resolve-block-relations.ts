import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSsgSupabaseClient } from '@nextblock-cms/db/server';
import type { Database } from '@nextblock-cms/db';
import type { CustomBlockField } from '@nextblock-cms/utils';

import {
  getCustomBlockRelationTarget,
  normalizeCustomBlockRelationValue,
} from './custom-block-relation-registry';
import { searchCustomBlockRelationRows, type CustomBlockRelationRow } from './custom-block-relations';

type CustomBlockRelationField = Extract<CustomBlockField, { type: 'db_relation' }>;
type RelationRecord = Record<string, unknown> | null;

export type ResolvedCustomBlockRelation =
  | {
      error?: string;
      record: RelationRecord;
      table: string;
      value: string;
    }
  | Array<{
      error?: string;
      record: RelationRecord;
      table: string;
      value: string;
    }>;

export type CustomBlockInstanceWithRelations = {
  data?: Record<string, unknown> | null;
  definition?: { fields?: CustomBlockField[] | null } | null;
  fields?: CustomBlockField[] | null;
  resolved_relations?: Record<string, ResolvedCustomBlockRelation>;
  values?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type ResolveBlockRelationsOptions = {
  fields?: CustomBlockField[];
  supabase?: SupabaseClient<Database>;
};

type RelationLookup = {
  field: CustomBlockRelationField;
  instanceIndex: number;
  rawValues: unknown[];
};

type RelationGroup = {
  displayColumn: string;
  field: CustomBlockRelationField;
  lookups: RelationLookup[];
  table: string;
  valueColumn: string;
  values: Set<string>;
};

function getInstanceFields(
  instance: CustomBlockInstanceWithRelations,
  fallbackFields?: CustomBlockField[]
) {
  return instance.definition?.fields ?? instance.fields ?? fallbackFields ?? [];
}

function getInstanceData(instance: CustomBlockInstanceWithRelations) {
  return instance.data ?? instance.values ?? {};
}

function toRelationField(field: CustomBlockField): CustomBlockRelationField | null {
  return field.type === 'db_relation' ? field : null;
}

function toRawRelationValues(value: unknown, multiple: boolean) {
  if (multiple) {
    return Array.isArray(value) ? value.filter((entry) => entry !== null && entry !== '') : [];
  }

  return value === null || value === undefined || value === '' ? [] : [value];
}

function buildMissingRelation(
  table: string,
  value: unknown,
  error?: string
): Exclude<ResolvedCustomBlockRelation, unknown[]> {
  return {
    ...(error ? { error } : {}),
    record: null,
    table,
    value: String(value),
  };
}

function groupKey(table: string, valueColumn: string, displayColumn: string) {
  return `${table}:${valueColumn}:${displayColumn}`;
}

async function fetchRelationGroup(
  supabase: SupabaseClient<Database>,
  group: RelationGroup
) {
  const result = await searchCustomBlockRelationRows(supabase, {
    displayColumn: group.displayColumn,
    limit: group.values.size,
    table: group.table,
    valueColumn: group.valueColumn,
    values: Array.from(group.values),
  });

  if ('error' in result) {
    return { error: result.error, rows: new Map<string, CustomBlockRelationRow>() };
  }

  return {
    rows: new Map(result.items.map((item) => [item.value, item])),
  };
}

function resolveLookupFromGroup(
  lookup: RelationLookup,
  rowsByValue: Map<string, CustomBlockRelationRow>,
  groupError?: string
) {
  const target = getCustomBlockRelationTarget(lookup.field.table);
  if (!target) {
    const missing = lookup.rawValues.map((value) =>
      buildMissingRelation(lookup.field.table, value, 'Relation table is not available.')
    );
    return lookup.field.multiple ? missing : missing[0];
  }

  const resolved = lookup.rawValues.map((rawValue) => {
    const normalizedValue = normalizeCustomBlockRelationValue(target, rawValue);
    const stringValue = normalizedValue === null ? String(rawValue) : String(normalizedValue);
    const match = rowsByValue.get(stringValue);

    if (!match) {
      return buildMissingRelation(
        lookup.field.table,
        stringValue,
        groupError ?? 'Relation record was not found.'
      );
    }

    return {
      record: match.record,
      table: lookup.field.table,
      value: match.value,
    };
  });

  return lookup.field.multiple ? resolved : resolved[0];
}

export async function resolveBlockRelations<T extends CustomBlockInstanceWithRelations>(
  instances: T[],
  options?: ResolveBlockRelationsOptions
): Promise<T[]>;
export async function resolveBlockRelations<T extends CustomBlockInstanceWithRelations>(
  instance: T,
  options?: ResolveBlockRelationsOptions
): Promise<T>;
export async function resolveBlockRelations<T extends CustomBlockInstanceWithRelations>(
  input: T | T[],
  options: ResolveBlockRelationsOptions = {}
): Promise<T | T[]> {
  const isArrayInput = Array.isArray(input);
  const instances = (isArrayInput ? input : [input]) as T[];
  const supabase = options.supabase ?? getSsgSupabaseClient();
  const groups = new Map<string, RelationGroup>();
  const resolvedByInstance = instances.map(
    (instance) => ({ ...(instance.resolved_relations ?? {}) }) as Record<
      string,
      ResolvedCustomBlockRelation
    >
  );

  instances.forEach((instance, instanceIndex) => {
    const fields = getInstanceFields(instance, options.fields);
    const data = getInstanceData(instance);

    fields.forEach((field) => {
      const relationField = toRelationField(field);
      if (!relationField) {
        return;
      }

      const rawValues = toRawRelationValues(data[relationField.key], relationField.multiple);
      if (rawValues.length === 0) {
        return;
      }

      const target = getCustomBlockRelationTarget(relationField.table);
      if (!target) {
        const missing = rawValues.map((value) =>
          buildMissingRelation(relationField.table, value, 'Relation table is not available.')
        );
        resolvedByInstance[instanceIndex][relationField.key] = relationField.multiple
          ? missing
          : missing[0];
        return;
      }

      const valueColumn = target.selectColumns.includes(relationField.value_column)
        ? relationField.value_column
        : target.valueColumn;
      const displayColumn = target.selectColumns.includes(relationField.display_column)
        ? relationField.display_column
        : target.displayColumn;
      const key = groupKey(target.table, valueColumn, displayColumn);
      const group =
        groups.get(key) ??
        ({
          displayColumn,
          field: relationField,
          lookups: [],
          table: target.table,
          valueColumn,
          values: new Set<string>(),
        } satisfies RelationGroup);

      group.lookups.push({ field: relationField, instanceIndex, rawValues });

      rawValues.forEach((rawValue) => {
        const normalized = normalizeCustomBlockRelationValue(target, rawValue);
        if (normalized !== null) {
          group.values.add(String(normalized));
        }
      });

      groups.set(key, group);
    });
  });

  for (const group of groups.values()) {
    const { error, rows } = await fetchRelationGroup(supabase, group);

    for (const lookup of group.lookups) {
      resolvedByInstance[lookup.instanceIndex][lookup.field.key] = resolveLookupFromGroup(
        lookup,
        rows,
        error
      );
    }
  }

  const hydrated = instances.map((instance, index) => ({
    ...instance,
    resolved_relations: resolvedByInstance[index],
  }));

  return isArrayInput ? hydrated : hydrated[0];
}
