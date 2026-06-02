import 'server-only';

import { getSsgSupabaseClient } from '@nextblock-cms/db/server';
import {
  customBlockDefinitionRowSchema,
  type CustomBlockDefinition,
} from '@nextblock-cms/utils';
import { unstable_cache } from 'next/cache';

export const CUSTOM_BLOCK_DEFINITIONS_CACHE_TAG = 'custom-block-definitions';
const CUSTOM_BLOCK_SELECT = 'id, slug, name, description, fields, layout_schema, is_original';

export function getCustomBlockDefinitionCacheTag(idOrSlug: string) {
  return `${CUSTOM_BLOCK_DEFINITIONS_CACHE_TAG}:${idOrSlug}`;
}

function parseCustomBlockDefinitionRows(rows: unknown[]): CustomBlockDefinition[] {
  return rows.map((row) => customBlockDefinitionRowSchema.parse(row));
}

async function queryCustomBlockDefinitions() {
  const supabase = getSsgSupabaseClient();
  const { data, error } = await supabase
    .from('custom_block_definitions')
    .select(CUSTOM_BLOCK_SELECT)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load custom block definitions: ${error.message}`);
  }

  return parseCustomBlockDefinitionRows(data ?? []);
}

export const getCachedCustomBlockDefinitions = unstable_cache(
  queryCustomBlockDefinitions,
  [CUSTOM_BLOCK_DEFINITIONS_CACHE_TAG],
  {
    revalidate: 60,
    tags: [CUSTOM_BLOCK_DEFINITIONS_CACHE_TAG],
  }
);

const getCachedCustomBlockDefinitionBySlugInternal = unstable_cache(
  async (slug: string) => {
    const definitions = await queryCustomBlockDefinitions();
    return definitions.find((definition) => definition.slug === slug) ?? null;
  },
  [`${CUSTOM_BLOCK_DEFINITIONS_CACHE_TAG}:by-slug`],
  {
    revalidate: 60,
    tags: [CUSTOM_BLOCK_DEFINITIONS_CACHE_TAG],
  }
);

async function queryCustomBlockDefinitionBySlug(slug: string): Promise<CustomBlockDefinition | null> {
  const supabase = getSsgSupabaseClient();
  const { data, error } = await supabase
    .from('custom_block_definitions')
    .select(CUSTOM_BLOCK_SELECT)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load custom block definition "${slug}": ${error.message}`);
  }

  return data ? customBlockDefinitionRowSchema.parse(data) : null;
}

export async function getCachedCustomBlockDefinitionBySlug(slug: string) {
  const cached = await getCachedCustomBlockDefinitionBySlugInternal(slug);
  if (cached) {
    return cached;
  }

  // The cached lookup can hold a stale "not found" result for a definition that
  // was created or edited within the last revalidation window. Fall back to a
  // direct read so a freshly saved custom block renders on the front end
  // immediately instead of showing "Unsupported block type".
  try {
    return await queryCustomBlockDefinitionBySlug(slug);
  } catch (error) {
    console.error('[custom-block-definitions] Live definition fallback failed:', error);
    return null;
  }
}
