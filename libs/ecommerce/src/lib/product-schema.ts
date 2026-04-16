import { z } from 'zod';

const selectedOptionSchema = z.object({
  attribute_id: z.string().uuid(),
  attribute_name: z.string(),
  term_id: z.string().uuid(),
  term_value: z.string(),
  term_slug: z.string().optional(),
});

const variantDraftSchema = z.object({
  id: z.string().uuid().optional(),
  combination_key: z.string().min(1),
  sku: z.string().min(1, 'Variant SKU is required'),
  upc: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'Variant price must be non-negative'),
  sale_price: z.coerce.number().min(0, 'Variant sale price must be non-negative').optional().nullable(),
  stock_quantity: z.coerce.number().int().min(0, 'Variant stock must be a non-negative integer'),
  main_media_id: z.string().uuid().optional().nullable(),
  main_image_url: z.string().optional().nullable(),
  attribute_term_ids: z.array(z.string().uuid()).min(1),
  selected_options: z.array(selectedOptionSchema).min(1),
  label: z.string().min(1),
}).refine(
  (variant) => variant.sale_price === null || variant.sale_price === undefined || variant.sale_price <= variant.price,
  {
    message: 'Variant sale price cannot exceed the regular price',
    path: ['sale_price'],
  }
);

const variationAttributeSchema = z.object({
  attribute_id: z.string().uuid(),
  term_ids: z.array(z.string().uuid()),
});

export const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  sku: z.string().min(1, 'SKU is required'),
  upc: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  sale_price: z.coerce.number().min(0, 'Sale price must be non-negative').optional().nullable(),
  stock: z.coerce.number().int().min(0, 'Stock must be a non-negative integer'),
  short_description: z.string().optional(),
  description_json: z.any().optional(), // Using any for Tiptap JSON structure
  freemius_plan_id: z.string().optional(), // ID from Freemius Dashboard
  freemius_product_id: z.string().optional(), // Product or App ID from Freemius Dashboard
  media_id: z.string().optional(), // For the main product image (backward compat or single select)
  product_media: z.array(z.object({
      media_id: z.string(),
      // We can sort based on index in this array, or explicit sort_order from UI
  })).optional(),
  is_taxable: z.boolean(),
  status: z.enum(['draft', 'active', 'archived']),
  language_id: z.coerce.number().int().min(1, 'Language is required'),
  translation_group_id: z.string().uuid().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  explicitly_removed_media_ids: z.array(z.string()).optional(),
  variation_attributes: z.array(variationAttributeSchema).optional(),
  variants: z.array(variantDraftSchema).optional(),
}).refine(
  (product) =>
    product.sale_price === null ||
    product.sale_price === undefined ||
    product.sale_price <= product.price,
  {
    message: 'Sale price cannot exceed the regular price',
    path: ['sale_price'],
  }
);

export type ProductFormValues = z.infer<typeof productSchema>;
