import type { Database, Json } from '@nextblock-cms/db/types';
import {
  customBlockDefinitionCreateSchema,
  customBlockDefinitionRowSchema,
  type CustomBlockDefinition,
} from '@nextblock-cms/utils/custom-blocks';

import type { CortexWidgetDefinition } from './cortex-widget-schema';

export const CORTEX_WIDGET_DEFINITION_SELECT =
  'id, slug, name, description, fields, layout_schema, is_original';

type CustomBlockDefinitionInsert =
  Database['public']['Tables']['custom_block_definitions']['Insert'];

type SupabaseInsertClient = {
  from: (table: string) => any;
};

export class CortexWidgetRegistryInsertError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, params?: { code?: string; status?: number }) {
    super(message);
    this.name = 'CortexWidgetRegistryInsertError';
    this.code = params?.code;
    this.status = params?.status ?? 500;
  }
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function getInsertErrorStatus(code?: string) {
  if (code === '23505') {
    return 409;
  }

  if (code === '42501') {
    return 403;
  }

  return 500;
}

export function buildCortexWidgetDefinitionInsertPayload(
  definition: CortexWidgetDefinition
): CustomBlockDefinitionInsert {
  const parsed = customBlockDefinitionCreateSchema.parse({
    ...definition,
    is_original: true,
  });

  return {
    description: parsed.description,
    fields: toJson(parsed.fields),
    is_original: true,
    layout_schema: toJson(parsed.layout_schema),
    name: parsed.name,
    slug: parsed.slug,
  };
}

export async function insertCortexWidgetDefinition(
  supabase: SupabaseInsertClient,
  definition: CortexWidgetDefinition
): Promise<CustomBlockDefinition> {
  const payload = buildCortexWidgetDefinitionInsertPayload(definition);
  const { data, error } = await supabase
    .from('custom_block_definitions')
    .insert(payload)
    .select(CORTEX_WIDGET_DEFINITION_SELECT)
    .single();

  if (error || !data) {
    throw new CortexWidgetRegistryInsertError(
      error?.message ?? 'Failed to insert Cortex custom block definition.',
      {
        code: error?.code,
        status: getInsertErrorStatus(error?.code),
      }
    );
  }

  return customBlockDefinitionRowSchema.parse(data);
}
