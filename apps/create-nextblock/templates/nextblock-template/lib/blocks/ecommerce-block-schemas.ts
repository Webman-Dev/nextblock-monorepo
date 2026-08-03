import { z } from '../zod-config';

/** Upper bound for how many categories / products a single grid can reference. */
export const PRODUCT_GRID_MAX_CATEGORIES = 20;
export const PRODUCT_GRID_MAX_PRODUCTS = 24;
export const PRODUCT_GRID_MAX_LIMIT = 48;
/** `limit: 0` means "no cap" — show every matching product on one page. */
export const PRODUCT_GRID_UNLIMITED = 0;
/** Page size applied when pagination is switched on from an unlimited grid. */
export const PRODUCT_GRID_DEFAULT_PAGE_SIZE = 12;

// Product Grid Block Schema
export const ProductGridBlockSchema = z.object({
  /**
   * Where the grid gets its products:
   * - `latest`   newest active products
   * - `category` every product in any of `categoryIds`
   * - `manual`   exactly the products in `productIds`, in that order
   */
  type: z.enum(['latest', 'category', 'manual']).default('latest'),
  /** Legacy single-category field, superseded by `categoryIds`. Still read so blocks saved before multi-select keep working. */
  categoryId: z.string().optional(),
  categoryIds: z.array(z.string()).max(PRODUCT_GRID_MAX_CATEGORIES).optional(),
  productIds: z.array(z.string()).max(PRODUCT_GRID_MAX_PRODUCTS).optional(),
  /** Products per page when paginating, otherwise the display cap. `0` means unlimited. */
  limit: z.number().min(PRODUCT_GRID_UNLIMITED).max(PRODUCT_GRID_MAX_LIMIT).default(6),
  /** Page through everything that matches instead of stopping at `limit`. */
  showPagination: z.boolean().default(false),
  title: z.string().optional(),
});
export type ProductGridBlockContent = z.infer<typeof ProductGridBlockSchema>;

/**
 * Selected categories, reading the legacy single `categoryId` when a block was
 * saved before multi-select existed.
 */
export function resolveProductGridCategoryIds(
  content: Partial<ProductGridBlockContent>
): string[] {
  const ids = (content.categoryIds ?? []).filter(Boolean);
  if (ids.length > 0) return Array.from(new Set(ids));
  return content.categoryId ? [content.categoryId] : [];
}

/** Hand-picked products, in the order the author chose them. */
export function resolveProductGridProductIds(
  content: Partial<ProductGridBlockContent>
): string[] {
  return Array.from(new Set((content.productIds ?? []).filter(Boolean)));
}

/**
 * Page size / display cap, clamped to the supported range. Returns
 * `PRODUCT_GRID_UNLIMITED` (0) when the author asked for every match.
 */
export function resolveProductGridLimit(
  content: Partial<ProductGridBlockContent>
): number {
  const raw = typeof content.limit === 'number' ? content.limit : 6;
  if (!Number.isFinite(raw) || raw < 0) return 6;
  return Math.min(Math.floor(raw), PRODUCT_GRID_MAX_LIMIT);
}

/** Pagination needs a page size, so an unlimited grid is always a single page. */
export function resolveProductGridShowPagination(
  content: Partial<ProductGridBlockContent>
): boolean {
  return Boolean(content.showPagination) && resolveProductGridLimit(content) > 0;
}

// Featured Product Block Schema
export const FeaturedProductBlockSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  showBackground: z.boolean().default(false),
  imagePosition: z.enum(['left', 'right']).default('left'),
});
export type FeaturedProductBlockContent = z.infer<typeof FeaturedProductBlockSchema>;

// Cart Block Schema
export const CartBlockSchema = z.object({});
export type CartBlockContent = z.infer<typeof CartBlockSchema>;

// Checkout Block Schema
export const CheckoutBlockSchema = z.object({});
export type CheckoutBlockContent = z.infer<typeof CheckoutBlockSchema>;

// Product Details Block Schema (Context Aware)
export const ProductDetailsBlockSchema = z.object({});
export type ProductDetailsBlockContent = z.infer<typeof ProductDetailsBlockSchema>;

