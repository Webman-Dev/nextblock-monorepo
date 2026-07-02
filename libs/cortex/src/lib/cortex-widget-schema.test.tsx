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
  const collectKeys = (node: any): string[] =>
    node.type === 'field_render' ? [node.field_key] : node.children.flatMap(collectKeys);
  const customBlockDefinitionCreateSchema = z
    .strictObject({
      description: z.string().trim().max(1000).default(''),
      fields: z.array(fieldSchema).max(80).default([]),
      is_original: z.boolean().default(true),
      layout_schema: layoutNodeSchema,
      name: z.string().trim().min(1).max(160),
      slug: customBlockSlugSchema,
    })
    .superRefine((definition, context) => {
      const fieldKeys = new Set(definition.fields.map((field) => field.key));
      for (const fieldKey of collectKeys(definition.layout_schema)) {
        if (!fieldKeys.has(fieldKey)) {
          context.addIssue({
            code: 'custom',
            message: `Layout references unknown field "${fieldKey}".`,
            path: ['layout_schema'],
          });
        }
      }
    });

  return {
    customBlockDefinitionCreateSchema,
    customBlockFieldKeySchema,
    customBlockSlugSchema,
  };
});

import {
  buildCortexProfileCardVerificationDefinition,
  buildCortexWidgetBuilderPrompt,
  buildCortexWidgetBuilderSystemPrompt,
  cortexWidgetDefinitionSchema,
  validateCortexWidgetDefinitionOutput,
} from './cortex-widget-schema';

describe('cortex widget schema', () => {
  it('validates a recursive multi-tier profile card widget', () => {
    const definition = buildCortexProfileCardVerificationDefinition();

    expect(definition.slug).toBe('cortex-profile-card');
    expect(definition.is_original).toBe(true);
    expect(definition.fields.map((field) => field.type)).toEqual([
      'image_r2',
      'text',
      'text',
      'rich-text',
      'db_relation',
    ]);
    expect(definition.layout_schema.type).toBe('container');
    if (definition.layout_schema.type !== 'container') {
      throw new Error('Expected verification layout to be a container.');
    }
    expect(definition.layout_schema.children[0]?.type).toBe('container');
  });

  it('rejects layout fields that are not declared', () => {
    expect(() =>
      validateCortexWidgetDefinitionOutput({
        description: '',
        fields: [{ key: 'headline', label: 'Headline', required: true, type: 'text' }],
        is_original: true,
        layout_schema: {
          field_key: 'missing_field',
          type: 'field_render',
        },
        name: 'Broken Widget',
        slug: 'broken-widget',
      })
    ).toThrow(/unknown field/);
  });

  it('keeps the prompt constrained to raw JSON, Tailwind classes, and data rows', () => {
    const systemPrompt = buildCortexWidgetBuilderSystemPrompt();
    const userPrompt = buildCortexWidgetBuilderPrompt({
      prompt:
        'Synthesize a multi-tier profile card with an inner flex column housing an R2 picture asset slot and a customer list relation link.',
    });

    expect(systemPrompt).toContain('Return ONLY one clean raw JSON object');
    expect(systemPrompt).toContain('Tailwind utility classes');
    expect(systemPrompt).toContain('Never emit TSX');
    expect(userPrompt).toContain('multi-tier profile card');
  });

  it('exposes a recursive Zod layout schema for constrained decoding', () => {
    const parsed = cortexWidgetDefinitionSchema.parse(
      buildCortexProfileCardVerificationDefinition()
    );

    expect(parsed.layout_schema).toMatchObject({
      type: 'container',
      children: expect.arrayContaining([
        expect.objectContaining({
          type: 'container',
        }),
      ]),
    });
  });
});
