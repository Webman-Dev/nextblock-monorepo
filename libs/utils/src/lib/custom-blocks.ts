import { z } from 'zod';

z.config({ jitless: true });

const fieldKeyPattern = /^[a-z][a-z0-9_]*$/;
const slugPattern = /^[a-z][a-z0-9-]*$/;

export const customBlockSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(slugPattern, 'Use lowercase letters, numbers, and hyphens. Start with a letter.');

export const customBlockFieldKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(fieldKeyPattern, 'Use lowercase letters, numbers, and underscores. Start with a letter.');

const customBlockFieldBaseSchema = z.strictObject({
  description: z.string().trim().max(500).optional(),
  key: customBlockFieldKeySchema,
  label: z.string().trim().min(1).max(120),
  required: z.boolean().default(false),
});

export const customBlockTextFieldSchema = customBlockFieldBaseSchema.extend({
  default_value: z.string().max(5000).optional(),
  max_length: z.number().int().positive().max(10000).optional(),
  min_length: z.number().int().min(0).max(10000).optional(),
  placeholder: z.string().max(250).optional(),
  type: z.literal('text'),
});

export const customBlockRichTextFieldSchema = customBlockFieldBaseSchema.extend({
  default_value: z.string().max(50000).optional(),
  placeholder: z.string().max(250).optional(),
  type: z.literal('rich-text'),
});

export const customBlockImageR2FieldSchema = customBlockFieldBaseSchema.extend({
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

export const customBlockDbRelationFieldSchema = customBlockFieldBaseSchema.extend({
  default_value: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  display_column: z.string().trim().min(1).max(80).default('title'),
  filters: z.record(z.string(), z.unknown()).optional(),
  multiple: z.boolean().default(false),
  table: z.string().trim().min(1).max(80).regex(fieldKeyPattern),
  type: z.literal('db_relation'),
  value_column: z.string().trim().min(1).max(80).default('id'),
});

export const customBlockFieldSchema = z.discriminatedUnion('type', [
  customBlockTextFieldSchema,
  customBlockRichTextFieldSchema,
  customBlockImageR2FieldSchema,
  customBlockDbRelationFieldSchema,
]);

export const customBlockFieldsSchema = z.array(customBlockFieldSchema).max(80).superRefine((fields, context) => {
  const seen = new Set<string>();

  fields.forEach((field, index) => {
    if (seen.has(field.key)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate field key "${field.key}".`,
        path: [index, 'key'],
      });
    }

    seen.add(field.key);
  });
});

export type CustomBlockField = z.infer<typeof customBlockFieldSchema>;

const htmlElementSchema = z.enum([
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

const tailwindClassSchema = z.string().trim().max(4000);

export type CustomBlockLayoutNode =
  | {
      as?: z.infer<typeof htmlElementSchema>;
      children: CustomBlockLayoutNode[];
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

// Optional column override for a field_render node bound to a db_relation field:
// selects which column of the resolved related record to display, so a single
// relation field can surface several columns (e.g. a product's title and price).
const relationColumnSchema = z.string().trim().min(1).max(80);

export const customBlockLayoutNodeSchema: z.ZodType<CustomBlockLayoutNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.strictObject({
      as: htmlElementSchema.optional(),
      children: z.array(customBlockLayoutNodeSchema).max(200).default([]),
      className: tailwindClassSchema.optional(),
      type: z.literal('container'),
    }),
    z.strictObject({
      as: htmlElementSchema.optional(),
      className: tailwindClassSchema.optional(),
      column: relationColumnSchema.optional(),
      emptyFallback: z.string().max(300).optional(),
      field_key: customBlockFieldKeySchema,
      type: z.literal('field_render'),
    }),
  ])
);

export function collectCustomBlockLayoutFieldKeys(node: CustomBlockLayoutNode): string[] {
  if (node.type === 'field_render') {
    return [node.field_key];
  }

  return node.children.flatMap((child) => collectCustomBlockLayoutFieldKeys(child));
}

// Returns the fields ordered to match the layout blueprint (depth-first order of
// field_render nodes, deduped). Fields not referenced in the layout are appended
// in their original order. Tolerant of malformed/unknown layout input.
export function orderCustomBlockFieldsByLayout<T extends { key: string }>(
  fields: T[],
  layout: unknown
): T[] {
  const layoutOrder: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const candidate = node as { type?: unknown; field_key?: unknown; children?: unknown };
    if (candidate.type === 'field_render') {
      if (typeof candidate.field_key === 'string') {
        layoutOrder.push(candidate.field_key);
      }
      return;
    }
    if (candidate.type === 'container' && Array.isArray(candidate.children)) {
      for (const child of candidate.children) {
        walk(child);
      }
    }
  };
  walk(layout);

  const byKey = new Map(fields.map((field) => [field.key, field]));
  const seen = new Set<string>();
  const ordered: T[] = [];

  for (const key of layoutOrder) {
    if (seen.has(key)) continue;
    const field = byKey.get(key);
    if (field) {
      ordered.push(field);
      seen.add(key);
    }
  }

  for (const field of fields) {
    if (!seen.has(field.key)) {
      ordered.push(field);
      seen.add(field.key);
    }
  }

  return ordered;
}

function assertLayoutFieldKeysExist(
  definition: { fields: CustomBlockField[]; layout_schema: CustomBlockLayoutNode },
  context: z.RefinementCtx
) {
  const fieldKeys = new Set(definition.fields.map((field) => field.key));
  const missingFieldKeys = collectCustomBlockLayoutFieldKeys(definition.layout_schema).filter(
    (fieldKey) => !fieldKeys.has(fieldKey)
  );

  for (const fieldKey of missingFieldKeys) {
    context.addIssue({
      code: 'custom',
      message: `Layout references unknown field "${fieldKey}".`,
      path: ['layout_schema'],
    });
  }
}

export const customBlockDefinitionCreateSchema = z
  .strictObject({
    description: z.string().trim().max(1000).default(''),
    fields: customBlockFieldsSchema.default([]),
    is_original: z.boolean().default(true),
    layout_schema: customBlockLayoutNodeSchema,
    name: z.string().trim().min(1).max(160),
    slug: customBlockSlugSchema,
  })
  .superRefine(assertLayoutFieldKeysExist);

export const customBlockDefinitionUpdateSchema = z
  .strictObject({
    description: z.string().trim().max(1000).optional(),
    fields: customBlockFieldsSchema.optional(),
    is_original: z.boolean().optional(),
    layout_schema: customBlockLayoutNodeSchema.optional(),
    name: z.string().trim().min(1).max(160).optional(),
    slug: customBlockSlugSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one custom block definition field must be supplied.',
  });

export const customBlockDefinitionRowSchema = customBlockDefinitionCreateSchema.safeExtend({
  id: z.string().uuid(),
  is_original: z.boolean(),
});

export type CustomBlockDefinitionCreateInput = z.input<typeof customBlockDefinitionCreateSchema>;
export type CustomBlockDefinitionUpdateInput = z.input<typeof customBlockDefinitionUpdateSchema>;
export type CustomBlockDefinition = z.infer<typeof customBlockDefinitionRowSchema>;

export function buildCustomBlockCopySlug(sourceSlug: string, existingSlugs: Iterable<string>) {
  const existing = new Set(existingSlugs);
  const baseSlug = sourceSlug.replace(/-copy(?:-\d+)?$/, '');
  let copySlug = `${baseSlug}-copy`;
  let copyIndex = 1;

  while (existing.has(copySlug)) {
    copyIndex += 1;
    copySlug = `${baseSlug}-copy-${copyIndex}`;
  }

  return copySlug;
}
