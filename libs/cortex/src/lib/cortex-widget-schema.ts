import {
  customBlockDefinitionCreateSchema,
  customBlockFieldKeySchema,
  customBlockSlugSchema,
} from '@nextblock-cms/utils/custom-blocks';

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
      column?: string;
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
      column: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .optional()
        .describe('For a db_relation field, the related record column to display (e.g. title, price).'),
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
    'Return ONLY one clean raw JSON object with the exact structure described in the user message. Do not include markdown fences, comments, prose, or explanatory text.',
    'Never emit TSX, JSX, React components, JavaScript, CSS blocks, style attributes, script tags, or runtime code.',
    'Use only these field types: text, rich-text, image_r2, db_relation.',
    `Use db_relation.table only from this allowlist: ${CORTEX_WIDGET_ALLOWED_RELATION_TABLES.join(', ')}.`,
    'Use lowercase kebab-case for slug and lowercase snake_case for field keys.',
    'Build layout_schema as a self-referential tree: container nodes may contain nested container or field_render nodes to any needed depth.',
    'Use Tailwind utility classes in className strings. Use responsive utilities where helpful.',
    'The "as" property of any node MUST be exactly one of: article, aside, blockquote, div, figure, figcaption, h2, h3, img, p, section, span. Never use a, button, ul, ol, li, table, or any other tag. For a call-to-action or "more info" button, use a span or p styled with button-like Tailwind classes (rounded, padded, colored background).',
    'Every field_render.field_key must match one field key exactly.',
    'For relation fields, set value_column to id and set display_column to a column that actually exists on the chosen table: use title for pages, posts, and products; sku for product_variants; full_name for profiles; name for categories and languages; file_name for media. Do not invent display columns.',
    'Entity images: when a block displays an image that belongs to a related product, page, or post (for example a product card photo or a post thumbnail), do NOT add an image_r2 upload field for it. Instead add a single db_relation field to that table (products, product_variants, pages, or posts) and add a field_render node that references it with "as": "img". The renderer automatically resolves the related record\'s primary image — a product or variant main_image/object_key, or a page/post feature image — so keep the table\'s normal display_column (for example title for a products relation).',
    'You may reference the same db_relation field from more than one field_render node: for example one node with "as": "img" for the image and another text node for its title, plus the relation value to drive a "more info" link. This builds a product/page/post card from a single relation field.',
    'To display a SPECIFIC column of a related record (its title, price, sku, etc.), set the field_render node\'s "column" property to that column name. The "column" overrides the field display_column for that one node, so a single product relation can show its image (as "img"), title (column "title"), and price (column "price") from three field_render nodes.',
    'Available record columns by table — only reference these in a node "column": products: title, sku, price, sale_price, stock, short_description, slug, status; product_variants: sku, price, sale_price, stock_quantity; pages: title, slug, status; posts: title, slug, excerpt, subtitle; profiles: full_name; categories: name, slug, description; media: file_name; languages: name, code. Use "as": "img" (no column) to show a record image.',
    'Do NOT create a standalone text field for data that lives on a related record. For example, a product price must come from a products db_relation field rendered with column "price" — never a separate "text" field the editor types by hand.',
    'Monetary columns (price, sale_price, price_adjustment) are stored in integer cents and are automatically formatted as currency on display, so reference them directly; never multiply, divide, or add currency symbols yourself.',
    'Only use image_r2 for standalone images uploaded directly by the editor that are not tied to any database record (for example a decorative banner or icon). Only use text or rich-text fields for free-form copy the editor writes, not for values that exist on a related record.',
  ].join(' ');
}

export function buildCortexWidgetBuilderPrompt(params: CortexWidgetBuildRequest) {
  return [
    'Create a NextBlock custom block definition for this request:',
    params.prompt,
    params.context ? `Additional CMS context:\n${params.context}` : null,
    [
      'Return ONLY a JSON object with EXACTLY these top-level keys:',
      '- "name": string (human-friendly block name).',
      '- "slug": lowercase kebab-case string.',
      '- "description": short string.',
      '- "is_original": true.',
      '- "fields": a non-empty array of field objects. Each field is { "key": lowercase snake_case string, "label": string, "required": boolean, "type": one of "text" | "rich-text" | "image_r2" | "db_relation" }.',
      `    For "db_relation" fields also include "table" (one of: ${CORTEX_WIDGET_ALLOWED_RELATION_TABLES.join(', ')}), "display_column" (e.g. title, name, full_name, file_name, code), "value_column": "id", and "multiple": boolean.`,
      '- "layout_schema": a single root layout node (a tree). Every node is one of:',
      '    container: { "type": "container", "as": an HTML tag like div/section/article/figure, "className": Tailwind utility classes, "children": array of nodes }.',
      '    field render: { "type": "field_render", "field_key": one of the field keys above, "as": an HTML tag like p/span/img/h2/h3/div, "className": Tailwind utility classes, "emptyFallback": optional placeholder string }.',
      '    Containers may nest other containers to any depth. Every field_render.field_key MUST match one of the fields. Render image_r2 fields with "as": "img".',
    ].join('\n'),
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
