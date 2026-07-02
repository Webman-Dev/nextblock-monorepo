import { describe, expect, it, vi } from 'vitest';

vi.mock('@nextblock-cms/utils/custom-blocks', async () => {
  const { z } = await import('zod');
  const fieldKeyPattern = /^[a-z][a-z0-9_]*$/;
  const slugPattern = /^[a-z][a-z0-9-]*$/;
  const customBlockFieldKeySchema = z.string().trim().min(1).max(80).regex(fieldKeyPattern);
  const customBlockSlugSchema = z.string().trim().min(1).max(120).regex(slugPattern);
  const fieldBaseSchema = z.strictObject({
    description: z.string().trim().max(500).optional(),
    key: customBlockFieldKeySchema,
    label: z.string().trim().min(1).max(120),
    required: z.boolean().default(false),
  });
  const fieldSchema = z.discriminatedUnion('type', [
    fieldBaseSchema.extend({
      default_value: z.string().max(5000).optional(),
      max_length: z.number().int().positive().max(10000).optional(),
      min_length: z.number().int().min(0).max(10000).optional(),
      placeholder: z.string().max(250).optional(),
      type: z.literal('text'),
    }),
    fieldBaseSchema.extend({
      default_value: z.string().max(50000).optional(),
      placeholder: z.string().max(250).optional(),
      type: z.literal('rich-text'),
    }),
    fieldBaseSchema.extend({
      accept: z.array(z.string()).max(20).optional(),
      default_value: z
        .strictObject({
          alt: z.string().max(300).optional(),
          file_name: z.string().trim().min(1).max(255).optional(),
          file_type: z.string().trim().min(1).max(120).optional(),
          height: z.number().int().positive().optional(),
          object_key: z.string().trim().min(1).max(1024),
          size_bytes: z.number().int().positive().optional(),
          url: z.string().trim().min(1).max(2048),
          width: z.number().int().positive().optional(),
        })
        .optional(),
      max_bytes: z.number().int().positive().max(50 * 1024 * 1024).optional(),
      type: z.literal('image_r2'),
    }),
    fieldBaseSchema.extend({
      default_value: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
      display_column: z.string().trim().min(1).max(80).default('title'),
      filters: z.record(z.string(), z.unknown()).optional(),
      multiple: z.boolean().default(false),
      table: z.string().trim().min(1).max(80).regex(fieldKeyPattern),
      type: z.literal('db_relation'),
      value_column: z.string().trim().min(1).max(80).default('id'),
    }),
  ]);
  const elementSchema = z.enum([
    'article',
    'aside',
    'blockquote',
    'div',
    'figure',
    'figcaption',
    'h2',
    'h3',
    'img',
    'p',
    'section',
    'span',
  ]);
  const layoutNodeSchema: any = z.lazy(() =>
    z.discriminatedUnion('type', [
      z.strictObject({
        as: elementSchema.optional(),
        children: z.array(layoutNodeSchema).max(200).default([]),
        className: z.string().trim().max(4000).optional(),
        type: z.literal('container'),
      }),
      z.strictObject({
        as: elementSchema.optional(),
        className: z.string().trim().max(4000).optional(),
        emptyFallback: z.string().max(300).optional(),
        field_key: customBlockFieldKeySchema,
        type: z.literal('field_render'),
      }),
    ])
  );
  const customBlockDefinitionCreateSchema = z.strictObject({
    description: z.string().trim().max(1000).default(''),
    fields: z.array(fieldSchema).max(80).default([]),
    is_original: z.boolean().default(true),
    layout_schema: layoutNodeSchema,
    name: z.string().trim().min(1).max(160),
    slug: customBlockSlugSchema,
  });
  const customBlockDefinitionRowSchema = customBlockDefinitionCreateSchema.safeExtend({
    id: z.string().uuid(),
    is_original: z.boolean(),
  });

  return {
    customBlockDefinitionCreateSchema,
    customBlockDefinitionRowSchema,
    customBlockFieldKeySchema,
    customBlockSlugSchema,
  };
});

import { buildCortexProfileCardVerificationDefinition } from './cortex-widget-schema';
import {
  CortexWidgetRegistryInsertError,
  buildCortexWidgetDefinitionInsertPayload,
  insertCortexWidgetDefinition,
} from './cortex-widget-registry';

class MockInsertQuery {
  payload: unknown;

  constructor(
    private readonly result: {
      data: unknown;
      error: { code?: string; message?: string } | null;
    }
  ) {}

  insert(payload: unknown) {
    this.payload = payload;
    return this;
  }

  select() {
    return this;
  }

  single() {
    return Promise.resolve(this.result);
  }
}

describe('cortex widget registry insert', () => {
  it('builds a strict atomic insert payload for custom_block_definitions', () => {
    const definition = buildCortexProfileCardVerificationDefinition();
    const payload = buildCortexWidgetDefinitionInsertPayload(definition);

    expect(payload).toMatchObject({
      description: definition.description,
      is_original: true,
      name: definition.name,
      slug: definition.slug,
    });
    expect(payload.fields).toEqual(definition.fields);
    expect(payload.layout_schema).toEqual(definition.layout_schema);
  });

  it('inserts the generated widget definition and parses the returned row', async () => {
    const definition = buildCortexProfileCardVerificationDefinition();
    const query = new MockInsertQuery({
      data: {
        ...buildCortexWidgetDefinitionInsertPayload(definition),
        id: '66666666-6666-4666-8666-666666666666',
      },
      error: null,
    });
    const supabase = {
      from: (table: string) => {
        expect(table).toBe('custom_block_definitions');
        return query;
      },
    };

    const inserted = await insertCortexWidgetDefinition(supabase as any, definition);

    expect(query.payload).toMatchObject({
      is_original: true,
      slug: 'cortex-profile-card',
    });
    expect(inserted).toMatchObject({
      id: '66666666-6666-4666-8666-666666666666',
      is_original: true,
      slug: 'cortex-profile-card',
    });
  });

  it('maps unique slug failures to a 409 registry error', async () => {
    const definition = buildCortexProfileCardVerificationDefinition();
    const query = new MockInsertQuery({
      data: null,
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      },
    });

    await expect(
      insertCortexWidgetDefinition({ from: () => query } as any, definition)
    ).rejects.toMatchObject<CortexWidgetRegistryInsertError>({
      code: '23505',
      status: 409,
    });
  });
});
