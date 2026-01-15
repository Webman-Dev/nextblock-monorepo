import { z } from 'zod';

// Product Grid Block Schema
export const ProductGridBlockSchema = z.object({
  type: z.enum(['latest', 'category']).default('latest'),
  categoryId: z.string().optional(),
  limit: z.number().min(1).max(20).default(6),
  title: z.string().optional(),
});
export type ProductGridBlockContent = z.infer<typeof ProductGridBlockSchema>;

// Featured Product Block Schema
export const FeaturedProductBlockSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  showBackground: z.boolean().default(false),
  imagePosition: z.enum(['left', 'right']).default('left'),
});
export type FeaturedProductBlockContent = z.infer<typeof FeaturedProductBlockSchema>;
