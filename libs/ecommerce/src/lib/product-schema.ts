import { z } from 'zod';

export const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  sku: z.string().min(1, 'SKU is required'),
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
  status: z.enum(['draft', 'active', 'archived']),
  explicitly_removed_media_ids: z.array(z.string()).optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
