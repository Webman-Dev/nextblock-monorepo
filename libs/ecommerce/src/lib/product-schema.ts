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
  media_id: z.string().optional(), // For the main product image
  status: z.enum(['draft', 'active', 'archived']),
});

export type ProductFormValues = z.infer<typeof productSchema>;
