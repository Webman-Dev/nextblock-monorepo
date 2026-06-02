import {
  customBlockDefinitionCreateSchema,
  customBlockFieldKeySchema,
  customBlockSlugSchema,
} from '@nextblock-cms/utils';

import { z } from './zod-config';

export const CORTEX_WIDGET_ALLOWED_RELATION_TABLES = [
  'pages',
  'posts',
  'products',
  'media',
  'categories',
  'profiles',
  'languages',
] as const;

const htmlElementSchema = z
  .enum([
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
  ])
  .describe('A safe semantic element supported by the dynamic layout renderer.');

const tailwindClassSchema = z
  .string()
  .trim()
  .max(4000)
  .describe('Tailwind utility classes only. Do not include CSS, style tags, or JavaScript.');

const cortexWidgetFieldBaseSchema = z.strictObject({
  description: z.string().trim().max(500).optional(),
  key: customBlockFieldKeySchema.describe('Lowercase snake_case field key.'),
  label: z.string().trim().min(1).max(120),
  required: z.boolean().default(false),
});

export const cortexWidgetTextFieldSchema = cortexWidgetFieldBaseSchema.extend({
  default_value: z.string().max(5000).optional(),
  max_length: z.number().int().positive().max(10000).optional(),
  min_length: z.number().int().min(0).max(10000).optional(),
  placeholder: z.string().max(250).optional(),
  type: z.literal('text'),
});

export const cortexWidgetRichTextFieldSchema = cortexWidgetFieldBaseSchema.extend({
  default_value: z.string().max(50000).optional(),
  placeholder: z.string().max(250).optional(),
  type: z.literal('rich-text'),
});

export const cortexWidgetImageR2FieldSchema = cortexWidgetFieldBaseSchema.extend({
  accept: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
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
});

export const cortexWidgetDbRelationFieldSchema = cortexWidgetFieldBaseSchema.extend({
  default_value: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  display_column: z.string().trim().min(1).max(80).default('title'),
  filters: z.record(z.string(), z.unknown()).optional(),
  multiple: z.boolean().default(false),
  table: z.enum(CORTEX_WIDGET_ALLOWED_RELATION_TABLES),
  type: z.literal('db_relation'),
  value_column: z.string().trim().min(1).max(80).default('id'),
});

export const cortexWidgetFieldSchema = z
  .discriminatedUnion('type', [
    cortexWidgetTextFieldSchema,
    cortexWidgetRichTextFieldSchema,
    cortexWidgetImageR2FieldSchema,
    cortexWidgetDbRelationFieldSchema,
  ])
  .describe('A NextBlock custom block field. Allowed types: text, rich-text, image_r2, db_relation.');

export type CortexWidgetLayoutNode =
  | {
      as?: z.infer<typeof htmlElementSchema>;
      children: CortexWidgetLayoutNode[];
      className?: string;
      type: 'container';
    }
  | {
      as?: z.infer<typeof htmlElementSchema>;
      className?: string;
      emptyFallback?: string;
      field_key: string;
      type: 'field_render';
    };

export const cortexWidgetLayoutNodeSchema: z.ZodType<CortexWidgetLayoutNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.strictObject({
      as: htmlElementSchema.optional(),
      children: z.array(cortexWidgetLayoutNodeSchema).max(200).default([]),
      className: tailwindClassSchema.optional(),
      type: z.literal('container'),
    }),
    z.strictObject({
      as: htmlElementSchema.optional(),
      className: tailwindClassSchema.optional(),
      emptyFallback: z.string().max(300).optional(),
      field_key: customBlockFieldKeySchema,
      type: z.literal('field_render'),
    }),
  ])
);

export const cortexWidgetBuildRequestSchema = z.strictObject({
  context: z.string().trim().max(3000).optional(),
  modelId: z.string().trim().min(1).max(200).optional(),
  prompt: z.string().trim().min(3).max(4000),
});

export type CortexWidgetBuildRequest = z.infer<typeof cortexWidgetBuildRequestSchema>;

function collectLayoutFieldKeys(node: CortexWidgetLayoutNode): string[] {
  if (node.type === 'field_render') {
    return [node.field_key];
  }

  return node.children.flatMap((child) => collectLayoutFieldKeys(child));
}

function assertCortexWidgetFieldKeys(
  definition: {
    fields: Array<{ key: string }>;
    layout_schema: CortexWidgetLayoutNode;
  },
  context: z.RefinementCtx
) {
  const seenFieldKeys = new Set<string>();

  definition.fields.forEach((field, index) => {
    if (seenFieldKeys.has(field.key)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate field key "${field.key}".`,
        path: ['fields', index, 'key'],
      });
    }

    seenFieldKeys.add(field.key);
  });

  for (const fieldKey of collectLayoutFieldKeys(definition.layout_schema)) {
    if (!seenFieldKeys.has(fieldKey)) {
      context.addIssue({
        code: 'custom',
        message: `Layout references unknown field "${fieldKey}".`,
        path: ['layout_schema'],
      });
    }
  }
}

export const cortexWidgetDefinitionSchema = z
  .strictObject({
    description: z.string().trim().max(1000).default(''),
    fields: z.array(cortexWidgetFieldSchema).min(1).max(80),
    is_original: z.boolean().default(true),
    layout_schema: cortexWidgetLayoutNodeSchema,
    name: z.string().trim().min(1).max(160),
    slug: customBlockSlugSchema.describe('Lowercase kebab-case slug.'),
  })
  .superRefine(assertCortexWidgetFieldKeys)
  .describe('A complete NextBlock custom block definition stored as database JSONB.');

export type CortexWidgetDefinition = z.infer<typeof customBlockDefinitionCreateSchema>;

export function validateCortexWidgetDefinitionOutput(value: unknown): CortexWidgetDefinition {
  const parsed = cortexWidgetDefinitionSchema.parse(value);

  return customBlockDefinitionCreateSchema.parse({
    ...parsed,
    is_original: true,
  });
}

export function buildCortexWidgetBuilderSystemPrompt() {
  return [
    'You are NextBlock Cortex, an expert web platform engineer building database-rendered custom CMS widgets.',
    'Return ONLY one clean raw JSON object matching the supplied schema. Do not include markdown fences, comments, prose, or explanatory text.',
    'Never emit TSX, JSX, React components, JavaScript, CSS blocks, style attributes, script tags, or runtime code.',
    'Use only these field types: text, rich-text, image_r2, db_relation.',
    `Use db_relation.table only from this allowlist: ${CORTEX_WIDGET_ALLOWED_RELATION_TABLES.join(', ')}.`,
    'Use lowercase kebab-case for slug and lowercase snake_case for field keys.',
    'Build layout_schema as a self-referential tree: container nodes may contain nested container or field_render nodes to any needed depth.',
    'Use Tailwind utility classes in className strings. Use responsive utilities where helpful.',
    'Every field_render.field_key must match one field key exactly.',
    'For image_r2 fields, create an upload slot field; do not invent a media table row.',
    'For relation fields, set value_column to id and choose a real display_column such as title, name, full_name, file_name, or code.',
  ].join(' ');
}

export function buildCortexWidgetBuilderPrompt(params: CortexWidgetBuildRequest) {
  return [
    'Create a NextBlock custom block definition for this request:',
    params.prompt,
    params.context ? `Additional CMS context:\n${params.context}` : null,
    'The returned JSON must contain slug, name, description, fields, layout_schema, and is_original.',
    'Set is_original to true.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function buildCortexProfileCardVerificationDefinition(): CortexWidgetDefinition {
  return validateCortexWidgetDefinitionOutput({
    description:
      'A multi-tier profile card with an R2 image asset slot and a live customer relation list.',
    fields: [
      {
        accept: ['image/png', 'image/jpeg', 'image/webp'],
        key: 'profile_photo',
        label: 'Profile Photo',
        max_bytes: 10485760,
        required: false,
        type: 'image_r2',
      },
      {
        key: 'profile_name',
        label: 'Profile Name',
        placeholder: 'Ada Lovelace',
        required: true,
        type: 'text',
      },
      {
        key: 'profile_role',
        label: 'Profile Role',
        placeholder: 'Principal Architect',
        required: false,
        type: 'text',
      },
      {
        key: 'profile_summary',
        label: 'Profile Summary',
        placeholder: '<p>Short profile biography.</p>',
        required: false,
        type: 'rich-text',
      },
      {
        display_column: 'full_name',
        key: 'customer_list',
        label: 'Customer List',
        multiple: true,
        required: false,
        table: 'profiles',
        type: 'db_relation',
        value_column: 'id',
      },
    ],
    is_original: true,
    layout_schema: {
      as: 'article',
      children: [
        {
          as: 'div',
          children: [
            {
              as: 'div',
              children: [
                {
                  as: 'div',
                  children: [
                    {
                      as: 'img',
                      className:
                        'h-24 w-24 rounded-full border object-cover shadow-sm',
                      emptyFallback: 'Upload profile photo',
                      field_key: 'profile_photo',
                      type: 'field_render',
                    },
                    {
                      as: 'span',
                      className:
                        'rounded-full bg-muted px-3 py-1 text-center text-xs font-medium text-muted-foreground',
                      emptyFallback: 'No customers linked',
                      field_key: 'customer_list',
                      type: 'field_render',
                    },
                  ],
                  className: 'flex flex-col items-center gap-4 md:w-48',
                  type: 'container',
                },
                {
                  as: 'div',
                  children: [
                    {
                      as: 'div',
                      children: [
                        {
                          as: 'h2',
                          className: 'text-2xl font-semibold leading-tight',
                          emptyFallback: 'Untitled profile',
                          field_key: 'profile_name',
                          type: 'field_render',
                        },
                        {
                          as: 'p',
                          className: 'text-sm font-medium text-muted-foreground',
                          emptyFallback: 'Role pending',
                          field_key: 'profile_role',
                          type: 'field_render',
                        },
                      ],
                      className: 'flex flex-col gap-1',
                      type: 'container',
                    },
                    {
                      as: 'div',
                      children: [
                        {
                          as: 'div',
                          className: 'prose prose-sm max-w-none text-muted-foreground',
                          emptyFallback: '<p>Add a concise profile summary.</p>',
                          field_key: 'profile_summary',
                          type: 'field_render',
                        },
                      ],
                      className: 'rounded-md border bg-muted/30 p-4',
                      type: 'container',
                    },
                  ],
                  className: 'flex min-w-0 flex-1 flex-col gap-4',
                  type: 'container',
                },
              ],
              className: 'flex flex-col gap-6 md:flex-row',
              type: 'container',
            },
          ],
          className: 'rounded-lg border bg-background p-6 shadow-sm',
          type: 'container',
        },
      ],
      className: 'mx-auto max-w-3xl p-4',
      type: 'container',
    },
    name: 'Cortex Profile Card',
    slug: 'cortex-profile-card',
  });
}
